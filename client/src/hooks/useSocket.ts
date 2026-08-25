import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useGameStore } from '../store/gameStore';
import { useLangStore } from '../store/langStore';
import { fr, en } from '../i18n';
import type { Translations } from '../i18n';
import type { GameEvent, PublicGameState } from '../types';

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
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 5000,
    });
  }
  return socket;
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
  } = useGameStore();

  // Référence à l'état courant pour les handlers (sans re-subscribe)
  const stateRef = useRef<PublicGameState | null>(null);

  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const s = getSocket();
    console.log('[useSocket] init — connected:', s.connected, 'id:', s.id);

    s.on('connect', () => {
      console.log('[useSocket] CONNECTE — id:', s.id);
    });

    s.on('connect_error', (err) => {
      console.error('[useSocket] ERREUR CONNEXION:', err.message);
      console.error('👉 Le serveur est-il lancé ? → cd yumi-app/server && npm run dev');
    });

    // Connexion initiale
    if (!s.connected && !s.active) s.connect();

    s.on('disconnect', (reason) => {
      console.warn('[useSocket] DECONNECTE — raison:', reason);
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
          if (card.type === 'positive') ruleHint = t.history.socket.ruleGreenWins;
          else if (card.type === 'negative') ruleHint = t.history.socket.ruleRedWins;
        }
        pushEvent({
          ...base,
          kind: 'TRICK_START',
          scoreCard: card ?? undefined,
          message: t.history.socket.trickCard(state.currentTrick, (card?.displayValue ?? '?') + ruleHint),
        });
      }

      // --- Résultat de mène : gagnant de la carte Score ---
      // Déclenché quand la phase passe à TRICK_END (ou SPECIAL_EFFECT)
      // et qu'un lastTrickSummary est disponible
      const trickJustResolved =
        (state.phase === 'TRICK_END' || state.phase === 'SPECIAL_EFFECT') &&
        lastPhase !== 'TRICK_END' && lastPhase !== 'SPECIAL_EFFECT' &&
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
            message: t.history.socket.scoreDiscarded(summary.scoreCard.displayValue),
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
            message: t.history.socket.scoreWon(winner?.pseudo ?? '?', summary.scoreCard.displayValue),
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
              kind: 'FLUX_RECHARGE_STARS',
              message: t.history.socket.rechargeAllDiscard,
              rechargedPlayers: summary.rechargedPlayerIds.map(id => {
                const p = state.players.find(pl => pl.id === id);
                return { pseudo: p?.pseudo ?? '?', color: p?.color ?? 'red' };
              }),
              rechargeStarWinners: [],
            });
          } else if (summary.rechargeStarWinners.length > 0) {
            // Au moins un gagnant d'étoile
            const winners = summary.rechargeStarWinners
              .map(id => {
                const p = state.players.find(pl => pl.id === id);
                // Retrouver la valeur jouée par ce joueur
                const cardValue = summary.playedCards[id] ?? 0;
                return { pseudo: p?.pseudo ?? '?', color: p?.color ?? 'red' as const, cardValue };
              });
            const winnerNames = winners.map(w => w.pseudo).join(', ');
            pushEvent({
              ...base,
              kind: 'FLUX_RECHARGE_STARS',
              message: t.history.socket.rechargeStars(rechargers, winnerNames),
              rechargedPlayers: summary.rechargedPlayerIds.map(id => {
                const p = state.players.find(pl => pl.id === id);
                return { pseudo: p?.pseudo ?? '?', color: p?.color ?? 'red' };
              }),
              rechargeStarWinners: winners,
            });
          } else {
            // Recharge mais aucun gagnant (tous en doublon)
            const winnerNames = '';
            pushEvent({
              ...base,
              kind: 'FLUX_RECHARGE_STARS',
              message: t.history.socket.rechargeStarsNoWinner(rechargers),
              rechargedPlayers: summary.rechargedPlayerIds.map(id => {
                const p = state.players.find(pl => pl.id === id);
                return { pseudo: p?.pseudo ?? '?', color: p?.color ?? 'red' };
              }),
              rechargeStarWinners: [],
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
        if (summary.specialEffect === 'STEAL' && summary.stolenFrom && summary.winnerId) {
          const thief = state.players.find(p => p.id === summary.winnerId);
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
      }

      // --- Demande SWAP / VOL (annonce dans le journal) ---
      if (state.phase === 'SPECIAL_EFFECT' && lastPhase !== 'SPECIAL_EFFECT') {
        const t2 = getT();
        if (state.stealRequestPlayerId) {
          const actor = state.players.find(p => p.id === state.stealRequestPlayerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_STEAL',
            playerId: state.stealRequestPlayerId,
            pseudo: actor?.pseudo,
            color: actor?.color,
            message: t2.history.socket.stealChoosing(actor?.pseudo ?? '?'),
          });
        } else if (state.swapRequestPlayerId) {
          const actor = state.players.find(p => p.id === state.swapRequestPlayerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_SWAP',
            playerId: state.swapRequestPlayerId,
            pseudo: actor?.pseudo,
            color: actor?.color,
            message: t2.history.socket.swapChoosing(actor?.pseudo ?? '?'),
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
        .map(c => `${c.pseudo} : ${c.value}${c.cancelled ? ' (annulé)' : ''}`)
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

    s.on('error', ({ message }) => {
      console.error('[Socket Error]', message);
    });

    return () => {
      // Ne pas déconnecter ici pour garder la connexion entre les pages
    };
  }, []);

  return getSocket();
}
