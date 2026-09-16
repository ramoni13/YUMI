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
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
      timeout: 10000,
      transports: ['polling', 'websocket'],
    });
  }
  return socket;
}

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

export function ensureConnected(cb: () => void) {
  const s = getSocket();
  if (s.connected) {
    cb();
  } else {
    s.once('connect', cb);
    s.once('connect_error', (err) => {
      console.error('[Socket] Impossible de se connecter au serveur :', err.message);
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

  const stateRef = useRef<PublicGameState | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const s = getSocket();

    let isFirstConnect = true;

    s.on('connect', () => {
      if (isFirstConnect) {
        isFirstConnect = false;
        return;
      }
      const session = loadSession();
      if (session) {
        s.emit(
          'rejoin_room',
          { roomCode: session.roomCode, oldPlayerId: session.playerId },
          (res: { ok?: boolean; playerId?: string; gameMode?: string; error?: string }) => {
            if (res.error) {
              clearSession();
              useGameStore.getState().reset();
            } else if (res.playerId) {
              useGameStore.getState().setPlayerId(res.playerId);
              saveSession({ ...session, playerId: res.playerId });
            }
          }
        );
      }
    });

    s.on('connect_error', (err) => {
      console.error('[useSocket] ERREUR CONNEXION:', err.message);
    });

    if (!s.connected && !s.active) s.connect();

    s.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') s.connect();
    });

    s.on('room_updated', (room) => {
      setRoom(room);
      if (room.gameMode) setSelectedGameMode(room.gameMode);
    });

    let lastPhase = '';
    let lastRound = 0;
    let lastTrick = 0;

    s.on('game_state_updated', (state: PublicGameState) => {
      setGameState(state);
      stateRef.current = state;

      const now = Date.now();
      const base = { timestamp: now, round: state.currentRound, trick: state.currentTrick };

      // Debut de manche
      if (state.phase === 'TRICK_START' && lastRound !== state.currentRound) {
        lastRound = state.currentRound;
        lastTrick = 0;
        pushEvent({
          ...base,
          kind: 'ROUND_START',
          message: getT().history.socket.roundSep(state.currentRound, state.totalRounds),
        });
      }

      // Debut de mene
      if (state.phase === 'CARD_SELECTION' && lastTrick !== state.currentTrick) {
        lastTrick = state.currentTrick;
        clearLastReveal();
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

      // Resultat de mene
      const resolutionPhases = ['TRICK_END', 'SPECIAL_EFFECT'];
      const trickJustResolved =
        resolutionPhases.includes(state.phase) &&
        !resolutionPhases.includes(lastPhase) &&
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

        // Recharge bonus (mode flux)
        if (summary.rechargedPlayerIds.length > 0) {
          const rechargers = summary.rechargedPlayerIds
            .map(id => state.players.find(p => p.id === id)?.pseudo ?? '?')
            .join(', ');
          if (summary.rechargedPlayerIds.length === state.players.length) {
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
            const winners = summary.bonusPointWinners.map(id => {
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

        // Effet VOL
        if (summary.specialEffect === 'STEAL' && summary.winnerId) {
          const thief = state.players.find(p => p.id === summary.winnerId);
          if (summary.stolenFrom) {
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
            pushEvent({
              ...base,
              kind: 'SPECIAL_STEAL',
              playerId: summary.winnerId,
              pseudo: thief?.pseudo,
              color: thief?.color,
              message: t.history.socket.stealNoTarget(thief?.pseudo ?? '?'),
            });
          }
        }

        // Effet DOUBLE (X2)
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

        // Effet INVERSION
        if (summary.specialEffect === 'INVERSION' && summary.inversionApplied && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_INVERSION',
            playerId: summary.winnerId,
            pseudo: winner?.pseudo,
            color: winner?.color,
            message: t.history.socket.inversionActive,
          });
        }

        // Effet YUMI
        if (summary.specialEffect === 'YUMI' && summary.yumiRecovered && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_YUMI' as any,
            playerId: summary.winnerId,
            pseudo: winner?.pseudo,
            color: winner?.color,
            message: t.history.socket.yumiRecovered(winner?.pseudo ?? '?'),
          });
        }

        // Effet RECYCLAGE
        if (summary.specialEffect === 'RECYCLAGE' && summary.recyclageApplied && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_RECYCLAGE' as any,
            playerId: summary.winnerId,
            pseudo: winner?.pseudo,
            color: winner?.color,
            message: t.history.socket.recyclageApplied(winner?.pseudo ?? '?'),
          });
        }

        // Effet JACKPOT
        if (summary.specialEffect === 'JACKPOT' && summary.bonusPointsAwarded > 0 && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_JACKPOT',
            playerId: summary.winnerId,
            pseudo: winner?.pseudo,
            color: winner?.color,
            message: t.history.socket.jackpotResult(winner?.pseudo ?? '?', summary.bonusPointsAwarded),
          });
        }

        // Effet CONSTELLATION
        if (summary.specialEffect === 'CONSTELLATION' && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_CONSTELLATION',
            playerId: summary.winnerId,
            pseudo: winner?.pseudo,
            color: winner?.color,
            message: t.history.socket.constellationResult(winner?.pseudo ?? '?', summary.scoreCard.bonusStars),
          });
        }

        // Effet FIFTY_FIFTY
        if (summary.specialEffect === 'FIFTY_FIFTY' && summary.winnerId) {
          const winner = state.players.find(p => p.id === summary.winnerId);
          pushEvent({
            ...base,
            kind: 'SPECIAL_FIFTY_FIFTY' as any,
            playerId: summary.winnerId,
            pseudo: winner?.pseudo,
            color: winner?.color,
            message: t.history.socket.fiftyFiftyResult(winner?.pseudo ?? '?', summary.scoreCard.bonusPoints, summary.scoreCard.bonusStars),
          });
        }
      }

      // Demande VOL (annonce dans le journal)
      if (state.phase === 'SPECIAL_EFFECT' && lastPhase !== 'SPECIAL_EFFECT') {
        const t2 = getT();
        if (state.stealRequestPlayerId) {
          const actor = state.players.find(p => p.id === state.stealRequestPlayerId);
          pushEvent({
            ...base, kind: 'SPECIAL_STEAL', playerId: state.stealRequestPlayerId, pseudo: actor?.pseudo, color: actor?.color,
            message: t2.history.socket.stealChoosing(actor?.pseudo ?? '?')
          });
        }
      }

      // Fin de manche
      if (state.phase === 'BONUS_STAR' && lastPhase !== 'BONUS_STAR' && state.roundEndSummary) {
        const t3 = getT();
        const bonusIds = new Set(state.roundEndSummary.bonusStarWinners);
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

        const summary = state.roundEndSummary;
        const starsWinner = summary.starsVPWinner ? state.players.find(p => p.id === summary.starsVPWinner)?.pseudo ?? '?' : null;
        const cardsWinner = summary.cardScoreVPWinner ? state.players.find(p => p.id === summary.cardScoreVPWinner)?.pseudo ?? '?' : null;
        const bonusWinner = summary.bonusVPWinner ? state.players.find(p => p.id === summary.bonusVPWinner)?.pseudo ?? '?' : null;
        const cancelled = t3.history.socket.vpCancelled;
        const vpLines = t3.history.socket.vpRoundSummary(starsWinner ?? cancelled, cardsWinner ?? cancelled, bonusWinner ?? cancelled);
        const vpRanking = state.players.slice().sort((a, b) => (summary.victoryPoints[b.id] ?? 0) - (summary.victoryPoints[a.id] ?? 0));
        const vpLeader = vpRanking[0];
        pushEvent({
          ...base,
          kind: 'ROUND_WINNER',
          winnerPseudo: vpLeader?.pseudo,
          winnerColor: vpLeader?.color,
          roundScores: state.players.map(p => ({
            pseudo: p.pseudo, color: p.color,
            scoreFromCards: summary.scores[p.id] ?? 0,
            stars: summary.stars[p.id] ?? 0,
            bonusPoints: summary.bonusPointsMap?.[p.id] ?? 0,
            total: summary.victoryPoints[p.id] ?? 0,
          })),
          message: t3.history.socket.vpRoundMessage(vpLines),
        });
      }

      // Fin de partie
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
      const scoreGain = state.currentScoreCard?.gain;
      const yumiLabel = (val: number): string => {
        if (val !== YUMI_CARD_VALUE) return String(val);
        const effective = scoreGain === '-' ? 0 : YUMI_CARD_VALUE;
        return `YUMI(=${effective})`;
      };
      const allCards = Object.entries(playedCards as Record<string, number>).map(([pid, value]) => {
        const p = state.players.find(pl => pl.id === pid)!;
        return { playerId: pid, pseudo: p?.pseudo ?? pid, color: p?.color ?? 'red' as const, value, cancelled: state.cancelledValues?.includes(value) ?? false };
      });
      const lines = allCards.map(c => `${c.pseudo} : ${yumiLabel(c.value)}${c.cancelled ? ' (annule)' : ''}`).join(' - ');
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

    return () => {};
  }, []);

  return getSocket();
}
