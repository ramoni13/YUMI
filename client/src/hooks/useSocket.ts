import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import { useLangStore } from '../store/langStore';
import { fr, en } from '../i18n';
import type { Translations } from '../i18n';
import type { GameEvent, PublicGameState } from '../types';
import { YUMI_CARD_VALUE } from '../types';

function getT(): Translations {
  const lang = useLangStore.getState().lang;
  return lang === 'en' ? en : fr;
}

const SOCKET_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:3001';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      // Reconnexion illimitée avec backoff exponentiel plafonné
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      // Timeout de connexion initiale
      timeout: 10000,
      // Démarrer en polling HTTP (compatible avec tous les reverse proxies dont Render.com)
      // puis Socket.IO upgarde automatiquement vers WebSocket une fois la session établie.
      // NE PAS mettre 'websocket' en premier : Render bloque les WS à froid sans handshake HTTP.
      transports: ['polling', 'websocket'],
    });
  }
  return socket;
}

// ============================================================
// Session persistante : sauvegarde / restauration dans localStorage
// ============================================================
const SESSION_KEY = 'yumi_session';

export interface YumiSession {
  playerId: string;
  roomCode: string;
  pseudo: string;
}

export function saveSession(session: YumiSession) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadSession(): YumiSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as YumiSession) : null;
  } catch {
    return null;
  }
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

/** Connecte le socket si ce n'est pas déjà fait, puis appelle cb() */
export function ensureConnected(cb: () => void) {
  const s = getSocket();
  if (s.connected) {
    cb();
  } else {
    s.once('connect', cb);
    s.once('connect_error', (err) => {
      console.error('[Socket] Impossible de se connecter au serveur :', err.message);
      console.error('👉 Vérifiez que le serveur tourne bien sur http://localhost:3001');
      console.error('   → cd yumi-app/server && npm run dev');
    });
    if (!s.active) s.connect();
  }
}

export function useSocket() {
  const {
    setRoom,
    setGameState,
    setSelectedGameMode,
    setLastReveal,
    clearLastReveal,
    pushEvent,
    clearEventLog,
    mergePrivateInfo,
    setOracleCards,
  } = useGameStore();

  // Référence à l'état courant pour les handlers (sans re-subscribe)
  const stateRef = useRef<PublicGameState | null>(null);

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const s = getSocket();
    console.log('[useSocket] init — connected:', s.connected, 'id:', s.id);

    // Flag pour distinguer la 1ère connexion des reconnexions
    let isFirstConnect = true;

    s.on('connect', () => {
      console.log('[useSocket] CONNECTE — id:', s.id, '| firstConnect:', isFirstConnect);

      if (isFirstConnect) {
        // Première connexion : pas de rejoin à tenter
        isFirstConnect = false;
        return;
      }

      // ✅ Reconnexion : s.id est maintenant le nouveau id définitif
      // C'est ici (et non dans 'reconnect') qu'on tente le rejoin
      const session = loadSession();
      if (session) {
        console.log(`[useSocket] Reconnexion détectée — tentative de rejoin: room=${session.roomCode} oldId=${session.playerId} newId=${s.id}`);
        s.emit(
          'rejoin_room',
          { roomCode: session.roomCode, oldPlayerId: session.playerId },
          (res: { ok?: boolean; playerId?: string; gameMode?: string; error?: string }) => {
            if (res.error) {
              console.warn('[useSocket] Rejoin échoué:', res.error, '— session effacée');
              clearSession();
              useGameStore.getState().reset();
            } else if (res.playerId) {
              console.log('[useSocket] Rejoin réussi — nouveau playerId:', res.playerId);
              useGameStore.getState().setPlayerId(res.playerId);
              saveSession({ ...session, playerId: res.playerId });
            }
          }
        );
      }
    });

    s.on('connect_error', (err) => {
      console.error('[useSocket] ERREUR CONNEXION:', err.message);
      console.error('👉 Le serveur est-il lancé ? → cd yumi-app/server && npm run dev');
    });

    // Connexion initiale
    if (!s.connected && !s.active) s.connect();

    s.on('disconnect', (reason) => {
      console.warn('[useSocket] DECONNECTE — raison:', reason);
      if (reason === 'io server disconnect') {
        s.connect();
      }
    });

    s.on('reconnect', (attempt) => {
      // NOTE : à ce stade s.id n'est PAS encore le nouveau id — ne pas émettre ici
      console.log(`[useSocket] Reconnexion réussie après ${attempt} tentative(s) — en attente de 'connect'`);
    });

    s.on('reconnect_attempt', (attempt) => {
      console.log(`[useSocket] Tentative de reconnexion #${attempt}...`);
    });

    s.on('reconnect_error', (err) => {
      console.warn('[useSocket] Échec reconnexion:', err.message);
    });

    s.on('reconnect_failed', () => {
      console.error('[useSocket] Reconnexion définitivement échouée');
    });

    s.on('room_updated', (room) => {
      console.log('[useSocket] room_updated — status:', room.status, 'players:', room.players.length);
      setRoom(room);
      // Synchroniser le mode de jeu pour tous les joueurs (y compris ceux qui rejoignent)
      if (room.gameMode) {
        setSelectedGameMode(room.gameMode);
      }
    });

    // Suivi des phases déjà traitées pour éviter les doublons
    let lastPhase = '';
    let lastRound = 0;
    let lastTrick = 0;

    s.on('game_state_updated', (state: PublicGameState) => {
      console.log('[useSocket] game_state_updated — phase:', state.phase, 'round:', state.currentRound);
      setGameState(state);
      stateRef.current = state;

      const now = Date.now();
      const base = { timestamp: now, round: state.currentRound, trick: state.currentTrick };

      // --- Début de manche (détecté sur TRICK_START manche 1) ---
      if (state.phase === 'TRICK_START' && lastRound !== state.currentRound) {
        lastRound = state.currentRound;
        lastTrick = 0;
        pushEvent({
          ...base,
          kind: 'ROUND_START',
          message: getT().history.socket.roundSep(state.currentRound, state.totalRounds),
        });
      }

      // --- Début de mène ---
      if (state.phase === 'CARD_SELECTION' && lastTrick !== state.currentTrick) {
        lastTrick = state.currentTrick;
        clearLastReveal(); // fix bug : cartes de la mène précédente affichées
        const card = state.currentScoreCard;
        const colorRule = state.gameOptions?.colorRule;
        const t = getT();
        let ruleHint = '';
        if (colorRule && card) {
          if (card.gain === '+') ruleHint = t.history.socket.ruleGreenWins;
          else if (card.gain === '-') ruleHint = t.history.socket.ruleRedWins;
        }
        pushEvent({
          ...base,
          kind: 'TRICK_START',
          scoreCard: card ?? undefined,
          message: t.history.socket.trickCard(state.currentTrick, (card?.displayName ?? '?') + ruleHint),
        });
      }

      // --- Résultat de mène : gagnant de la carte Score ---
      // Déclenché quand la phase passe à TRICK_END (ou SPECIAL_EFFECT)
      // et qu'un lastTrickSummary est disponible
      // Toutes les phases qui suivent immédiatement la résolution d'un pli
      const resolutionPhases = [
        'TRICK_END', 'SPECIAL_EFFECT',
        'SPECIAL_ECLIPSE', 'SPECIAL_PIOCHE', 'SPECIAL_VERROU',
        'SPECIAL_REVELATION', 'SPECIAL_TAXE', 'SPECIAL_ORACLE', 'SPECIAL_DEVOILEMENT',
      ];
      const trickJustResolved =
        resolutionPhases.includes(state.phase) &&
        !resolutionPhases.includes(lastPhase) &&
        state.lastTrickSummary !== null;

      // Cas spécial PIOCHE résolue par un bot : la phase passe de SPECIAL_PIOCHE → TRICK_END
      // avec le summary maintenant complet (piocheTargetId rempli).
      // On logue le message PIOCHE complet à ce moment-là.
      const piocheJustResolved =
        state.phase === 'TRICK_END' &&
        lastPhase === 'SPECIAL_PIOCHE' &&
        state.lastTrickSummary?.specialEffect === 'PIOCHE' &&
        state.lastTrickSummary?.piocheTargetId !== null &&
        state.lastTrickSummary !== null;

      // Cas SURCHARGE résolue (bot ou humain) : la phase passe de SPECIAL_EFFECT → TRICK_END
      // avec surchargeTargetId rempli dans le summary.
      const surchargeJustResolved =
        state.phase === 'TRICK_END' &&
        lastPhase === 'SPECIAL_EFFECT' &&
        state.lastTrickSummary?.specialEffect === 'SURCHARGE' &&
        (state.lastTrickSummary as any)?.surchargeTargetId !== null &&
        (state.lastTrickSummary as any)?.surchargeTargetId !== undefined &&
        state.lastTrickSummary !== null;

      // Cas VERROU résolu (bot ou humain) : la phase passe de SPECIAL_VERROU → TRICK_END
      // avec verrouTargetId rempli dans le summary.
      const verrouJustResolved =
        state.phase === 'TRICK_END' &&
        lastPhase === 'SPECIAL_VERROU' &&
        state.lastTrickSummary?.specialEffect === 'VERROU' &&
        (state.lastTrickSummary as any)?.verrouTargetId !== null &&
        (state.lastTrickSummary as any)?.verrouTargetId !== undefined &&
        state.lastTrickSummary !== null;

      // Cas REVELATION résolue (bot ou humain) : la phase passe de SPECIAL_REVELATION → TRICK_END
      // avec revelationTargetId rempli dans le summary.
      const revelationJustResolved =
        state.phase === 'TRICK_END' &&
        lastPhase === 'SPECIAL_REVELATION' &&
        state.lastTrickSummary?.specialEffect === 'REVELATION' &&
        state.lastTrickSummary?.revelationTargetId !== null &&
        state.lastTrickSummary !== null;

      // Cas TAXE résolue (bot ou humain) : la phase passe de SPECIAL_TAXE → TRICK_END
      // avec taxeTargetId rempli dans le summary.
      const taxeJustResolved =
        state.phase === 'TRICK_END' &&
        lastPhase === 'SPECIAL_TAXE' &&
        state.lastTrickSummary?.specialEffect === 'TAXE' &&
        (state.lastTrickSummary as any)?.taxeTargetId !== null &&
        (state.lastTrickSummary as any)?.taxeTargetId !== undefined &&
        state.lastTrickSummary !== null;

      if (trickJustResolved && state.lastTrickSummary) {
        const summary = state.lastTrickSummary;
        const t = getT();
        if (summary.discarded) {
          pushEvent({
            ...base,
            kind: 'SCORE_WON',
            discarded: true,
            scoreCard: summary.scoreCard,
            message: t.history.socket.scoreDiscarded(summary.scoreCard.displayName),
          });
        } else {
          const winner = state.players.find(p => p.id === summary.winnerId);
          pushEvent({
            ...base,
            kind: 'SCORE_WON',
            discarded: false,
            scoreCard: summary.scoreCard,
            winnerId: summary.winnerId ?? undefined,
            winnerPseudo: winner?.pseudo,
            winnerColor: winner?.color,
            message: t.history.socket.scoreWon(winner?.pseudo ?? '?', summary.scoreCard.displayName),
          });
        }

        // Étoiles Recharge (mode flux) — au moins un joueur a rechargé
        if (summary.rechargedPlayerIds.length > 0) {
          const t = getT();
          const rechargers = summary.rechargedPlayerIds
            .map(id => state.players.find(p => p.id === id)?.pseudo ?? '?')
            .join(', ');

          if (summary.rechargedPlayerIds.length === state.players.length) {
            // Tout le monde a rechargé → carte défaussée
            pushEvent({
              ...base,
              kind: 'FLUX_RECHARGE_BONUS',
              message: t.history.socket.rechargeAllDiscard,
              rechargedPlayers: summary.rechargedPlayerIds.map(id => {
                const p = state.players.find(pl => pl.id === id);
                return { pseudo: p?.pseudo ?? '?', color: p?.color ?? 'red' };
              }),
              bonusPointWinners: [],
            });
          } else if (summary.bonusPointWinners.length > 0) {
            const bonusCount = summary.bonusPointCount ?? 1;
            const winners = summary.bonusPointWinners
              .map(id => {
                const p = state.players.find(pl => pl.id === id);
                const cardValue = summary.playedCards[id] ?? 0;
                return { pseudo: p?.pseudo ?? '?', color: p?.color ?? 'red' as const, cardValue };
              });
            const winnerNames = winners.map(w => w.pseudo).join(', ');
            pushEvent({
              ...base,
              kind: 'FLUX_RECHARGE_BONUS',
              message: t.history.socket.rechargeStars(rechargers, winnerNames, bonusCount),
              rechargedPlayers: summary.rechargedPlayerIds.map(id => {
                const p = state.players.find(pl => pl.id === id);
                return { pseudo: p?.pseudo ?? '?', color: p?.color ?? 'red' };
              }),
              bonusPointWinners: winners,
            });
          } else {
            pushEvent({
              ...base,
              kind: 'FLUX_RECHARGE_BONUS',
              message: t.history.socket.rechargeStarsNoWinner(rechargers),
              rechargedPlayers: summary.rechargedPlayerIds.map(id => {
                const p = state.players.find(pl => pl.id === id);
                return { pseudo: p?.pseudo ?? '?', color: p?.color ?? 'red' };
              }),
              bonusPointWinners: [],
            });
          }
        }

        // Étoiles bonus immédiates (cartes -1/-2)
        if (summary.bonusStarsAwarded > 0 && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_STEAL', // réutilisé pour les étoiles bonus
            playerId: summary.winnerId,
            pseudo: winner?.pseudo,
            color: winner?.color,
            message: t.history.socket.bonusStars(winner?.pseudo ?? '?', summary.bonusStarsAwarded),
          });
        }
        // Effet VOL
        if (summary.specialEffect === 'STEAL' && summary.winnerId) {
          const thief = state.players.find(p => p.id === summary.winnerId);
          if (summary.stolenFrom) {
            // Vol effectif : quelqu'un a été volé
            const victim = state.players.find(p => p.id === summary.stolenFrom);
            pushEvent({
              ...base,
              kind: 'SPECIAL_STEAL',
              playerId: summary.winnerId,
              pseudo: thief?.pseudo,
              color: thief?.color,
              stolenFromPseudo: victim?.pseudo,
              message: t.history.socket.steal(thief?.pseudo ?? '?', victim?.pseudo ?? '?'),
            });
          } else {
            // Personne à voler : effet inapplicable, mais la carte VOL est quand même dans la pile
            pushEvent({
              ...base,
              kind: 'SPECIAL_STEAL',
              playerId: summary.winnerId,
              pseudo: thief?.pseudo,
              color: thief?.color,
              message: `🦥 ${thief?.pseudo ?? '?'} remporte VOL — aucun adversaire à voler (effet sans cible)`,
            });
          }
        }
        // Effet DOUBLE
        if (summary.specialEffect === 'DOUBLE' && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_DOUBLE',
            playerId: summary.winnerId,
            pseudo: winner?.pseudo,
            color: winner?.color,
            message: t.history.socket.double(winner?.pseudo ?? '?'),
          });
        }
        // Effet SWAP
        if (summary.specialEffect === 'SWAP' && summary.swapBetween) {
          const [idA, idB] = summary.swapBetween;
          const pA = state.players.find(p => p.id === idA);
          const pB = state.players.find(p => p.id === idB);
          pushEvent({
            ...base,
            kind: 'SPECIAL_SWAP',
            swapPlayerA: pA?.pseudo,
            swapPlayerB: pB?.pseudo,
            message: t.history.socket.swap(pA?.pseudo ?? '?', pB?.pseudo ?? '?'),
          });
        }
        // Effet ECLIPSE
        if (summary.specialEffect === 'ECLIPSE' && summary.eclipseGivenTo && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          const target = state.players.find(p => p.id === summary.eclipseGivenTo);
          pushEvent({
            ...base,
            kind: 'SPECIAL_ECLIPSE',
            playerId: summary.winnerId,
            pseudo: winner?.pseudo,
            color: winner?.color,
            targetPseudo: target?.pseudo,
            message: `☄️ ${winner?.pseudo ?? '?'} donne ECLIPSE à ${target?.pseudo ?? '?'} (-3⭐, +1 pt)`,
          });
        }
        // Effet INVERSION
        if (summary.specialEffect === 'INVERSION' && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_INVERSION',
            playerId: summary.winnerId,
            pseudo: winner?.pseudo,
            color: winner?.color,
            message: `🌀 INVERSION active — la prochaine carte Score a sa condition inversée !`,
          });
        }
        // Effet MYSTERE
        if (summary.specialEffect === 'MYSTERE' && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_MYSTERE',
            playerId: summary.winnerId,
            pseudo: winner?.pseudo,
            color: winner?.color,
            message: `🎭 MYSTÈRE — à la prochaine mène, tout le monde joue sa carte mystère !`,
          });
        }
        // Effet PIOCHE — afficher qui a été ciblé et quelle carte a été piochée
        // Si piocheTargetId est déjà rempli (humain qui vient de choisir), on logue le message complet.
        // Si piocheTargetId est null (bot pas encore résolu), on logue un message partiel ;
        // le message complet sera loggé via piocheJustResolved quand le bot aura choisi.
        if (summary.specialEffect === 'PIOCHE' && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          if (summary.piocheTargetId) {
            // Cible déjà connue (humain) : message complet immédiat
            const target = state.players.find(p => p.id === summary.piocheTargetId);
            pushEvent({
              ...base,
              kind: 'SPECIAL_PIOCHE',
              playerId: summary.winnerId,
              pseudo: winner?.pseudo,
              color: winner?.color,
              targetPseudo: target?.pseudo,
              message: `🎰 ${winner?.pseudo ?? '?'} pioche le ${summary.piocheCardValue} dans la main de ${target?.pseudo ?? '?'} — ${target?.pseudo ?? '?'} devra jouer cette carte !`,
            });
          }
          // Si piocheTargetId est null (bot), on n'affiche rien ici :
          // le message complet sera loggé par piocheJustResolved ci-dessous.
        }
        // Effet REVELATION — logé via revelationJustResolved ci-dessous (même pattern que VERROU)
        // Effet SURCHARGE — le message sera logé via la phase SPECIAL_EFFECT (avec la cible)
        // Effet JACKPOT
        if (summary.specialEffect === 'JACKPOT' && summary.bonusPointsAwarded > 0 && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_JACKPOT',
            playerId: summary.winnerId,
            pseudo: winner?.pseudo,
            color: winner?.color,
            message: `💰 JACKPOT ! ${winner?.pseudo ?? '?'} gagne +${summary.bonusPointsAwarded} points bonus`,
          });
        }
        // Effet CONSTELLATION
        if (summary.specialEffect === 'CONSTELLATION' && summary.bonusStarsAwarded > 0 && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_CONSTELLATION',
            playerId: summary.winnerId,
            pseudo: winner?.pseudo,
            color: winner?.color,
            message: `🌟 CONSTELLATION ! ${winner?.pseudo ?? '?'} gagne +${summary.bonusStarsAwarded}⭐`,
          });
        }
        // Effet DEVOILEMENT (auto)
        if (summary.specialEffect === 'DEVOILEMENT' && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_DEVOILEMENT',
            playerId: summary.winnerId,
            pseudo: winner?.pseudo,
            color: winner?.color,
            message: `📢 DÉVOILEMENT — les 3 prochaines cartes Score sont révélées à tous !`,
          });
        }
        // Effet ORACLE (auto)
        if (summary.specialEffect === 'ORACLE' && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_ORACLE',
            playerId: summary.winnerId,
            pseudo: winner?.pseudo,
            color: winner?.color,
            message: `👁️ ${winner?.pseudo ?? '?'} consulte secrètement les 3 prochaines cartes Score`,
          });
        }
      }

      // --- PIOCHE résolue par un bot : logger le message complet avec la cible ---
      // Déclenché quand la phase passe de SPECIAL_PIOCHE → TRICK_END avec piocheTargetId rempli.
      if (piocheJustResolved && state.lastTrickSummary) {
        const summary = state.lastTrickSummary;
        const winner = state.players.find(p => p.id === summary.winnerId);
        const target = state.players.find(p => p.id === summary.piocheTargetId);
        pushEvent({
          ...base,
          kind: 'SPECIAL_PIOCHE',
          playerId: summary.winnerId ?? undefined,
          pseudo: winner?.pseudo,
          color: winner?.color,
          targetPseudo: target?.pseudo,
          message: `🎰 ${winner?.pseudo ?? '?'} pioche le ${summary.piocheCardValue} dans la main de ${target?.pseudo ?? '?'} — ${target?.pseudo ?? '?'} devra jouer cette carte !`,
        });
      }

      // --- SURCHARGE résolue (bot ou humain) : logger le message complet avec la cible ---
      // Déclenché quand la phase passe de SPECIAL_EFFECT → TRICK_END avec surchargeTargetId rempli.
      if (surchargeJustResolved && state.lastTrickSummary) {
        const summary = state.lastTrickSummary as any;
        const winner = state.players.find(p => p.id === summary.winnerId);
        const target = state.players.find(p => p.id === summary.surchargeTargetId);
        pushEvent({
          ...base,
          kind: 'SPECIAL_SURCHARGE',
          playerId: summary.winnerId ?? undefined,
          pseudo: winner?.pseudo,
          color: winner?.color,
          targetPseudo: target?.pseudo,
          message: `⚡ ${winner?.pseudo ?? '?'} force ${target?.pseudo ?? '?'} à Recharger à la prochaine mène !`,
        });
      }

      // --- VERROU résolu (bot ou humain) : logger le message complet avec la cible ---
      // Déclenché quand la phase passe de SPECIAL_VERROU → TRICK_END avec verrouTargetId rempli.
      if (verrouJustResolved && state.lastTrickSummary) {
        const summary = state.lastTrickSummary as any;
        const winner = state.players.find(p => p.id === summary.winnerId);
        const target = state.players.find(p => p.id === summary.verrouTargetId);
        // Déterminer le type de verrou selon la prochaine carte Score
        const lockType = summary.scoreCard?.gain === '-' ? 'sa carte la plus basse' : 'sa carte la plus haute';
        pushEvent({
          ...base,
          kind: 'SPECIAL_VERROU',
          playerId: summary.winnerId ?? undefined,
          pseudo: winner?.pseudo,
          color: winner?.color,
          targetPseudo: target?.pseudo,
          message: `🔒 ${winner?.pseudo ?? '?'} verrouille ${target?.pseudo ?? '?'} — devra jouer ${lockType} à la prochaine mène !`,
        });
      }

      // --- TAXE résolue (bot ou humain) : logger le message complet avec la cible ---
      if (taxeJustResolved && state.lastTrickSummary) {
        const summary = state.lastTrickSummary as any;
        const winner = state.players.find(p => p.id === summary.winnerId);
        const target = state.players.find(p => p.id === summary.taxeTargetId);
        pushEvent({
          ...base,
          kind: 'SPECIAL_TAXE',
          playerId: summary.winnerId ?? undefined,
          pseudo: winner?.pseudo,
          color: winner?.color,
          targetPseudo: target?.pseudo,
          message: `🧹 ${winner?.pseudo ?? '?'} taxe ${target?.pseudo ?? '?'} — lui vole 2 points bonus !`,
        });
      }

      // --- REVELATION résolue (bot ou humain) : logger le message complet avec la cible ---
      // Déclenché quand la phase passe de SPECIAL_REVELATION → TRICK_END avec revelationTargetId rempli.
      if (revelationJustResolved && state.lastTrickSummary) {
        const summary = state.lastTrickSummary;
        const winner = state.players.find(p => p.id === summary.winnerId);
        const target = state.players.find(p => p.id === summary.revelationTargetId);
        pushEvent({
          ...base,
          kind: 'SPECIAL_REVELATION',
          playerId: summary.winnerId ?? undefined,
          pseudo: winner?.pseudo,
          color: winner?.color,
          targetPseudo: target?.pseudo,
          message: `🕵️ ${winner?.pseudo ?? '?'} révèle la carte mystère de ${target?.pseudo ?? '?'} : c’est le ${summary.revelationCardValue ?? '?'} !`,
        });
      }

      // --- Demande d'effets spéciaux (annonce dans le journal quand une phase d'attente commence) ---
      const specialWaitPhases = ['SPECIAL_EFFECT', 'SPECIAL_ECLIPSE', 'SPECIAL_PIOCHE', 'SPECIAL_VERROU', 'SPECIAL_REVELATION', 'SPECIAL_TAXE'];
      if (specialWaitPhases.includes(state.phase) && !specialWaitPhases.includes(lastPhase)) {
        const t2 = getT();
        if (state.stealRequestPlayerId) {
          const actor = state.players.find(p => p.id === state.stealRequestPlayerId);
          pushEvent({
            ...base, kind: 'SPECIAL_STEAL', playerId: state.stealRequestPlayerId, pseudo: actor?.pseudo, color: actor?.color,
            message: t2.history.socket.stealChoosing(actor?.pseudo ?? '?')
          });
        } else if (state.swapRequestPlayerId) {
          const actor = state.players.find(p => p.id === state.swapRequestPlayerId);
          pushEvent({
            ...base, kind: 'SPECIAL_SWAP', playerId: state.swapRequestPlayerId, pseudo: actor?.pseudo, color: actor?.color,
            message: t2.history.socket.swapChoosing(actor?.pseudo ?? '?')
          });
        } else if (state.eclipseRequestPlayerId) {
          const actor = state.players.find(p => p.id === state.eclipseRequestPlayerId);
          pushEvent({
            ...base, kind: 'SPECIAL_ECLIPSE', playerId: state.eclipseRequestPlayerId, pseudo: actor?.pseudo, color: actor?.color,
            message: `☄️ ${actor?.pseudo ?? '?'} choisit à qui donner ECLIPSE...`
          });
        } else if (state.piocheRequestPlayerId) {
          // Ce message n'est affiché que pour un joueur humain en attente de choix.
          // Pour un bot, la résolution est immédiate : le message complet sera loggé
          // via piocheJustResolved quand SPECIAL_PIOCHE → TRICK_END avec la cible remplie.
          // On vérifie donc que l'acteur n'est PAS un bot (piocheEligibleTargets non vide = humain en attente).
          const actor = state.players.find(p => p.id === state.piocheRequestPlayerId);
          // Afficher uniquement si la phase vient de changer (transition vers SPECIAL_PIOCHE)
          pushEvent({
            ...base, kind: 'SPECIAL_PIOCHE', playerId: state.piocheRequestPlayerId, pseudo: actor?.pseudo, color: actor?.color,
            message: `🎰 ${actor?.pseudo ?? '?'} choisit une carte à piocher dans la main d'un adversaire…`
          });
        } else if (state.verrouRequestPlayerId) {
          // Message d'attente pour l'humain pendant qu'il choisit sa cible.
          // Le message complet (avec la cible) sera loggé via verrouJustResolved.
          // Pour un bot : la résolution est immédiate, verrouJustResolved gère tout.
          const actor = state.players.find(p => p.id === state.verrouRequestPlayerId);
          pushEvent({
            ...base, kind: 'SPECIAL_VERROU', playerId: state.verrouRequestPlayerId, pseudo: actor?.pseudo, color: actor?.color,
            message: `🔒 ${actor?.pseudo ?? '?'} désigne un adversaire à verrouiller…`
          });
        } else if (state.revelationRequestPlayerId) {
          const actor = state.players.find(p => p.id === state.revelationRequestPlayerId);
          pushEvent({
            ...base, kind: 'SPECIAL_REVELATION', playerId: state.revelationRequestPlayerId, pseudo: actor?.pseudo, color: actor?.color,
            message: `🕵️ ${actor?.pseudo ?? '?'} choisit une carte mystère à révéler...`
          });
        } else if ((state as any).surchargeRequestPlayerId) {
          // Pour un humain : afficher un message d'attente pendant qu'il choisit sa cible.
          // Le message complet (avec la cible) sera loggé via surchargeJustResolved.
          // Pour un bot : la résolution est immédiate, surchargeJustResolved gère tout.
          const actor = state.players.find(p => p.id === (state as any).surchargeRequestPlayerId);
          pushEvent({
            ...base, kind: 'SPECIAL_SURCHARGE', playerId: (state as any).surchargeRequestPlayerId, pseudo: actor?.pseudo, color: actor?.color,
            message: `⚡ ${actor?.pseudo ?? '?'} choisit qui forcer à Recharger…`
          });
        } else if (state.taxeRequestPlayerId) {
          // Message d'attente pour l'humain. Le message complet (avec la cible) sera loggé via taxeJustResolved.
          const actor = state.players.find(p => p.id === state.taxeRequestPlayerId);
          pushEvent({
            ...base, kind: 'SPECIAL_TAXE', playerId: state.taxeRequestPlayerId, pseudo: actor?.pseudo, color: actor?.color,
            message: `🧹 ${actor?.pseudo ?? '?'} choisit qui taxer…`
          });
        }
      }

      // --- Fin de manche (bonus étoile + classement) ---
      if (state.phase === 'BONUS_STAR' && lastPhase !== 'BONUS_STAR' && state.roundEndSummary) {
        const t3 = getT();
        const bonusIds = new Set(state.roundEndSummary.bonusStarWinners);

        // Événement 1 : dernières cartes + bonus étoile
        const allLastCards = Object.entries(state.roundEndSummary.lastCards).map(([id, cardValue]) => {
          const p = state.players.find(pl => pl.id === id)!;
          return { pseudo: p.pseudo, color: p.color, cardValue, hasBonus: bonusIds.has(id) };
        });
        pushEvent({
          ...base,
          kind: 'ROUND_END',
          bonusWinners: allLastCards,
          message: bonusIds.size > 0
            ? t3.history.socket.bonusStarWinners([...bonusIds].map(id => state.players.find(p => p.id === id)?.pseudo ?? '?').join(', '))
            : t3.history.socket.noBonusStar,
        });

        // Événement 2 : classement de la manche (scores cumulés)
        const roundScores = state.players
          .map(p => ({
            pseudo: p.pseudo,
            color: p.color,
            scoreFromCards: state.roundEndSummary!.scores[p.id] ?? 0,
            stars: state.roundEndSummary!.stars[p.id] ?? 0,
            bonusPoints: p.bonusPoints ?? 0,
            total: (state.roundEndSummary!.scores[p.id] ?? 0) + (state.roundEndSummary!.stars[p.id] ?? 0),
          }))
          .sort((a, b) => b.total - a.total);
        const leader = roundScores[0];
        pushEvent({
          ...base,
          kind: 'ROUND_WINNER',
          winnerPseudo: leader?.pseudo,
          winnerColor: leader?.color,
          roundScores,
          message: t3.history.socket.roundRank(leader?.pseudo ?? '?', leader?.total ?? 0),
        });
      }

      // --- Fin de partie ---
      if (state.phase === 'GAME_OVER' && lastPhase !== 'GAME_OVER') {
        const t4 = getT();
        const winner = state.finalScores?.[0];
        pushEvent({
          ...base,
          kind: 'GAME_OVER',
          winnerId: winner?.playerId,
          winnerPseudo: winner?.pseudo,
          winnerColor: winner?.color,
          message: winner ? t4.history.socket.gameOver(winner.pseudo) : t4.history.socket.gameOverFallback,
        });
      }

      lastPhase = state.phase;
    });

    s.on('private_info', (info) => {
      mergePrivateInfo(info);
    });

    s.on('card_played', ({ playerId }) => {
      const state = stateRef.current;
      const player = state?.players.find(p => p.id === playerId);
      pushEvent({
        timestamp: Date.now(),
        round: state?.currentRound ?? 0,
        trick: state?.currentTrick ?? 0,
        kind: 'CARD_PLAYED',
        playerId,
        pseudo: player?.pseudo,
        color: player?.color,
        message: getT().history.socket.cardPlayed(player?.pseudo ?? '?'),
      });
    });

    s.on('reveal', ({ playedCards }) => {
      setLastReveal(playedCards);
      const state = stateRef.current;
      if (!state) return;

      // Helper : convertit la valeur brute en label affichable
      // La YUMI (valeur 9) affiche sa valeur effective selon le gain de la carte Score active
      const scoreGain = state.currentScoreCard?.gain;
      const yumiLabel = (val: number): string => {
        if (val !== YUMI_CARD_VALUE) return String(val);
        // gain '+' (grande gagne) → YUMI vaut 9 | gain '-' (petite gagne) → YUMI vaut 0
        const effective = scoreGain === '-' ? 0 : YUMI_CARD_VALUE;
        return `YUMI(=${effective})`;
      };

      const allCards = Object.entries(playedCards as Record<string, number>).map(([pid, value]) => {
        const p = state.players.find(pl => pl.id === pid)!;
        return {
          playerId: pid,
          pseudo: p?.pseudo ?? pid,
          color: p?.color ?? 'red' as const,
          value,
          cancelled: state.cancelledValues?.includes(value) ?? false,
        };
      });
      const lines = allCards
        .map(c => `${c.pseudo} : ${yumiLabel(c.value)}${c.cancelled ? ' (annulé)' : ''}`)
        .join(' • ');
      pushEvent({
        timestamp: Date.now(),
        round: state.currentRound,
        trick: state.currentTrick,
        kind: 'REVEAL',
        allCards,
        message: lines,
      });
    });

    // Cartes ORACLE : reçues uniquement par le gagnant
    s.on('oracle_info', ({ cards }) => {
      setOracleCards(cards);
    });

    s.on('error', ({ message }) => {
      console.error('[Socket Error]', message);
    });

    return () => {
      // Ne pas déconnecter ici pour garder la connexion entre les pages
    };
  }, []);

  return getSocket();
}
