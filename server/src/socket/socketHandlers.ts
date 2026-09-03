import { Server, Socket } from 'socket.io';
import { BotProfile, GameMode, GameOptions, PrivateInfo } from '../types';
import {
  createRoom,
  createSoloRoom,
  joinRoom,
  rejoinRoom,
  setPlayerReady,
  startGame,
  startFluxGame,
  getRoom,
  getRoomByPlayerId,
  getBotProfile,
  handleDisconnect,
  toPublicRoom,
  gameModeFromCode,
  addBotToRoom,
  removeBotFromRoom,
  Room,
} from '../rooms/roomManager';
import {
  startRound,
  startTrick,
  playCard,
  resolveTrickPhase,
  resolveSteal,
  resolveSwapChooseA,
  resolveSwapChooseB,
  endTrick,
  endRound,
  nextRoundOrGameOver,
  toPublicState,
  InternalGameState,
} from '../game/engine';
import {
  startFluxTrick,
  playFluxCard,
  resolveFluxTrick,
  resolveFluxSteal,
  resolveFluxSwapChooseA,
  resolveFluxSwapChooseB,
  resolveFluxSurcharge,
  resolveFluxVerrou,
  resolveFluxPioche,
  resolveFluxEclipse,
  resolveFluxRevelation,
  resolveFluxTaxe,
  endFluxTrick,
  nextFluxRoundOrGameOver,
  toFluxPublicState,
  FluxGameState,
} from '../game/flux/engine';
import { decideBotCard, decideBotStealTarget, decideBotSwapTargets } from '../game/bot';
import { decideBotFluxCard } from '../game/flux/bot';

const SWAP_TIMEOUT = 15000;
const BOT_PLAY_DELAY = 800;
const REVEAL_DELAY = 1500;
const NEXT_TRICK_DELAY = 1500;
const ROUND_END_DELAY = 2000;
const NEXT_ROUND_DELAY = 1000;

// ============================================================
// Broadcast — mode classic
// ============================================================
function broadcastGameState(io: Server, roomCode: string, state: InternalGameState) {
  const publicState = toPublicState(state);
  io.to(roomCode).emit('game_state_updated', publicState);

  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];
    const privateInfo: PrivateInfo = { hand: player.hand };
    if (state.mysteryCards[player.id] !== undefined) {
      privateInfo.mysteryCard = state.mysteryCards[player.id];
      privateInfo.mysteryCardOwner = state.mysteryCardOwners[player.id];
    }
    if (state.missingCards[player.id] !== undefined) {
      privateInfo.missingCardValue = state.missingCards[player.id];
    }
    io.to(player.id).emit('private_info', privateInfo);
  }
}

// ============================================================
// Broadcast — mode flux
// ============================================================
function broadcastFluxState(io: Server, roomCode: string, state: FluxGameState) {
  const publicState = toFluxPublicState(state);
  io.to(roomCode).emit('game_state_updated', publicState);

  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];
    const privateInfo: PrivateInfo = { hand: player.hand };
    // Carte mystère rattachée à la dernière Recharge
    if (state.mysteryCards[player.id] !== undefined) {
      privateInfo.mysteryCard = state.mysteryCards[player.id];
      privateInfo.mysteryCardOwner = state.mysteryCardOwners[player.id];
    }
    if (state.missingCards[player.id] !== undefined) {
      privateInfo.missingCardValue = state.missingCards[player.id];
    }
    io.to(player.id).emit('private_info', privateInfo);
  }
}

// ============================================================
// Faire jouer tous les bots — mode classic
// ============================================================
function scheduleBotPlays(
  io: Server,
  roomCode: string,
  state: InternalGameState,
  room: Room
) {
  // Identifier les bots qui n'ont pas encore joué
  const botsToPlay = room.bots.filter(
    b => state.playedCards[b.id] === undefined && state.players.find(p => p.id === b.id)
  );

  if (botsToPlay.length === 0) return;

  // Chaque bot joue avec un léger décalage aléatoire
  botsToPlay.forEach((bot, index) => {
    const delay = BOT_PLAY_DELAY + index * 300 + Math.floor(Math.random() * 400);
    setTimeout(() => {
      const currentRoom = getRoom(roomCode);
      if (!currentRoom?.gameState) return;
      if (currentRoom.gameState.phase !== 'CARD_SELECTION') return;
      if (currentRoom.gameState.playedCards[bot.id] !== undefined) return;

      try {
        const cardValue = decideBotCard(currentRoom.gameState, bot.id, bot.profile);
        const result = playCard(currentRoom.gameState, bot.id, cardValue);
        if (!result.ok) {
          console.error(`[Bot Classic ${bot.id}] playCard rejeté (carte=${cardValue}) :`, result.error);
          return;
        }

        // Notifier que le bot a joué (face cachée)
        io.to(roomCode).emit('card_played', { playerId: bot.id, isHidden: true });
        broadcastGameState(io, roomCode, result.state);

        // Si tous ont joué → révélation
        if (result.state.phase === 'REVEAL') {
          triggerRevealAndResolve(io, roomCode, result.state, currentRoom);
        }
      } catch (err) {
        console.error(`[Bot ${bot.id}] Erreur lors du jeu :`, err);
      }
    }, delay);
  });
}

// ============================================================
// Faire jouer tous les bots — mode flux
// ============================================================
function scheduleFluxBotPlays(
  io: Server,
  roomCode: string,
  state: FluxGameState,
  room: Room
) {
  const botsToPlay = room.bots.filter(
    b => state.playedCards[b.id] === undefined && state.players.find(p => p.id === b.id)
  );
  if (botsToPlay.length === 0) return;

  botsToPlay.forEach((bot, index) => {
    const delay = BOT_PLAY_DELAY + index * 300 + Math.floor(Math.random() * 400);
    setTimeout(() => {
      const currentRoom = getRoom(roomCode);
      if (!currentRoom?.fluxGameState) return;
      if (currentRoom.fluxGameState.phase !== 'CARD_SELECTION') return;
      if (currentRoom.fluxGameState.playedCards[bot.id] !== undefined) return;

      try {
        const cardValue = decideBotFluxCard(currentRoom.fluxGameState, bot.id, bot.profile);
        const result = playFluxCard(currentRoom.fluxGameState, bot.id, cardValue);
        if (!result.ok) {
          // Ne jamais rester bloqué silencieusement : logger l'erreur pour diagnostic
          console.error(`[Bot Flux ${bot.id}] playFluxCard rejeté (carte=${cardValue}) :`, result.error);
          return;
        }

        io.to(roomCode).emit('card_played', { playerId: bot.id, isHidden: true });
        broadcastFluxState(io, roomCode, result.state);

        if (result.state.phase === 'REVEAL') {
          triggerFluxRevealAndResolve(io, roomCode, result.state, currentRoom);
        }
      } catch (err) {
        console.error(`[Bot Flux ${bot.id}] Erreur :`, err);
      }
    }, delay);
  });
}

// ============================================================
// Révélation + résolution flux
// ============================================================
function triggerFluxRevealAndResolve(
  io: Server,
  roomCode: string,
  state: FluxGameState,
  room: Room
) {
  setTimeout(() => {
    io.to(roomCode).emit('reveal', {
      playedCards: state.playedCards as Record<string, number>,
    });

    let resolvedState = resolveFluxTrick(state);
    broadcastFluxState(io, roomCode, resolvedState);

    // Phases nécessitant une décision du gagnant
    const specialPhases = ['SPECIAL_EFFECT', 'SPECIAL_ECLIPSE', 'SPECIAL_PIOCHE',
      'SPECIAL_VERROU', 'SPECIAL_REVELATION', 'SPECIAL_TAXE',
      'SPECIAL_ORACLE', 'SPECIAL_DEVOILEMENT'];

    if (specialPhases.includes(resolvedState.phase)) {
      // Déterminer l'acteur
      const actorId = resolvedState.stealRequestPlayerId
        ?? resolvedState.swapRequestPlayerId
        ?? resolvedState.surchargeRequestPlayerId
        ?? resolvedState.eclipseRequestPlayerId
        ?? resolvedState.piocheRequestPlayerId
        ?? resolvedState.verrouRequestPlayerId
        ?? resolvedState.revelationRequestPlayerId
        ?? resolvedState.taxeRequestPlayerId
        ?? resolvedState.trickWinnerId; // ORACLE / DEVOILEMENT : auto
      const botProfile = actorId ? getBotProfile(room, actorId) : null;

      // DEVOILEMENT est automatique (info publique, pas de choix)
      if (resolvedState.phase === 'SPECIAL_DEVOILEMENT') {
        const s = endFluxTrick(resolvedState);
        broadcastFluxState(io, roomCode, s);
        advanceAfterFluxTrick(io, roomCode, s, room);

        // ORACLE : envoyer les 3 cartes en privé au gagnant, attendre son OK
      } else if (resolvedState.phase === 'SPECIAL_ORACLE') {
        const oracleWinnerId = resolvedState.trickWinnerId;
        if (oracleWinnerId) {
          const oracleCards = resolvedState.scoreDeck.slice(0, 3);
          // Envoyer uniquement au gagnant (socket privé)
          io.to(oracleWinnerId).emit('oracle_info', { cards: oracleCards });

          const botOracleProfile = getBotProfile(room, oracleWinnerId);
          if (botOracleProfile) {
            // Bot : pas besoin d'attendre, continuer immédiatement après un court délai
            setTimeout(() => {
              const currentRoom = getRoom(roomCode);
              if (!currentRoom?.fluxGameState) return;
              const s = endFluxTrick(currentRoom.fluxGameState);
              broadcastFluxState(io, roomCode, s);
              advanceAfterFluxTrick(io, roomCode, s, currentRoom);
            }, BOT_PLAY_DELAY);
          }
          // Humain : on attend l'événement 'oracle_ok' du client (voir handler plus bas)
          // Un timeout de sécurité est géré côté client (bouton OK obligatoire)
        } else {
          // Pas de gagnant (ne devrait pas arriver) : continuer
          const s = endFluxTrick(resolvedState);
          broadcastFluxState(io, roomCode, s);
          advanceAfterFluxTrick(io, roomCode, s, room);
        }

      } else if (botProfile && actorId) {
        setTimeout(() => {
          const currentRoom = getRoom(roomCode);
          if (!currentRoom?.fluxGameState) return;
          const gs = currentRoom.fluxGameState;

          const pickRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

          if (gs.stealRequestPlayerId) {
            const targetId = decideBotStealTarget(gs as any, actorId, botProfile);
            if (!targetId) { gs.stealRequestPlayerId = null; gs.stealEligibleTargets = []; gs.phase = 'TRICK_END'; }
            else { const r = resolveFluxSteal(gs, targetId); if (r.ok) broadcastFluxState(io, roomCode, r.state); }
          } else if (gs.swapRequestPlayerId) {
            const [idA, idB] = decideBotSwapTargets(gs as any, actorId, botProfile);
            if (!idA || !idB) { gs.swapRequestPlayerId = null; gs.swapEligibleTargets = []; gs.swapChosenA = null; gs.phase = 'TRICK_END'; }
            else {
              const rA = resolveFluxSwapChooseA(gs, idA);
              if (!rA.ok) return;
              const rB = resolveFluxSwapChooseB(rA.state, idB);
              if (rB.ok) broadcastFluxState(io, roomCode, rB.state);
            }
          } else if (gs.surchargeRequestPlayerId) {
            const targetId = pickRandom(gs.surchargeEligibleTargets);
            const r = resolveFluxSurcharge(gs, targetId);
            if (r.ok) broadcastFluxState(io, roomCode, r.state);
          } else if (gs.verrouRequestPlayerId) {
            const targetId = pickRandom(gs.verrouEligibleTargets);
            const r = resolveFluxVerrou(gs, targetId);
            if (r.ok) broadcastFluxState(io, roomCode, r.state);
          } else if (gs.piocheRequestPlayerId) {
            const targetId = pickRandom(gs.piocheEligibleTargets);
            const r = resolveFluxPioche(gs, targetId);
            // Broadcaster l'état en TRICK_END avec le summary complet (piocheTargetId rempli)
            // pour que le client puisse logger le bon message dans le journal (piocheJustResolved)
            if (r.ok) broadcastFluxState(io, roomCode, r.state);
          } else if (gs.eclipseRequestPlayerId) {
            // Bot donne ECLIPSE à l'adversaire avec le plus d'étoiles
            const eligible = gs.eclipseEligibleTargets.filter(id => id !== actorId);
            const targetId = eligible.length > 0 ? eligible[Math.floor(Math.random() * eligible.length)] : actorId;
            const r = resolveFluxEclipse(gs, targetId);
            if (r.ok) broadcastFluxState(io, roomCode, r.state);
          } else if (gs.revelationRequestPlayerId) {
            const targetId = pickRandom(gs.revelationEligibleTargets);
            const r = resolveFluxRevelation(gs, targetId);
            if (r.ok) broadcastFluxState(io, roomCode, r.state);
          } else if (gs.taxeRequestPlayerId) {
            const targetId = pickRandom(gs.taxeEligibleTargets);
            const r = resolveFluxTaxe(gs, targetId);
            if (r.ok) broadcastFluxState(io, roomCode, r.state);
          }

          // Broadcaster l'état TRICK_END avec le summary complet avant de passer à la mène suivante.
          // Un délai est ajouté pour que le client ait le temps d'afficher le résumé de mène
          // (carte gagnante visible dans la pile du gagnant) avant que la mène suivante commence.
          const stateAfterEffect = currentRoom.fluxGameState;
          // S'assurer que la phase est bien TRICK_END avant de broadcaster
          if (stateAfterEffect.phase !== 'TRICK_END') {
            stateAfterEffect.phase = 'TRICK_END';
          }
          broadcastFluxState(io, roomCode, stateAfterEffect);

          setTimeout(() => {
            const roomAfterDelay = getRoom(roomCode);
            if (!roomAfterDelay?.fluxGameState) return;
            const s = endFluxTrick(roomAfterDelay.fluxGameState);
            broadcastFluxState(io, roomCode, s);
            advanceAfterFluxTrick(io, roomCode, s, roomAfterDelay);
          }, NEXT_TRICK_DELAY);
        }, BOT_PLAY_DELAY + 500);
      } else {
        // Humain : timeout automatique
        const swapTimer = setTimeout(() => {
          const currentRoom = getRoom(roomCode);
          if (!currentRoom?.fluxGameState) return;
          const gs = currentRoom.fluxGameState;
          gs.swapRequestPlayerId = null; gs.swapEligibleTargets = []; gs.swapChosenA = null;
          gs.stealRequestPlayerId = null; gs.stealEligibleTargets = [];
          gs.surchargeRequestPlayerId = null; gs.surchargeEligibleTargets = [];
          gs.verrouRequestPlayerId = null; gs.verrouEligibleTargets = [];
          gs.piocheRequestPlayerId = null; gs.piocheEligibleTargets = [];
          gs.eclipseRequestPlayerId = null; gs.eclipseEligibleTargets = [];
          gs.revelationRequestPlayerId = null; gs.revelationEligibleTargets = [];
          gs.taxeRequestPlayerId = null; gs.taxeEligibleTargets = [];
          gs.phase = 'TRICK_END';
          const s = endFluxTrick(gs);
          broadcastFluxState(io, roomCode, s);
          advanceAfterFluxTrick(io, roomCode, s, currentRoom);
        }, SWAP_TIMEOUT);
        resolvedState.swapTimeout = swapTimer;
      }
    } else {
      const s = endFluxTrick(resolvedState);
      broadcastFluxState(io, roomCode, s);
      advanceAfterFluxTrick(io, roomCode, s, room);
    }
  }, REVEAL_DELAY);
}

// ============================================================
// Avancer après la fin d'une mène flux
// ============================================================
function advanceAfterFluxTrick(
  io: Server,
  roomCode: string,
  state: FluxGameState,
  room: Room
) {
  if (state.phase === 'FLUX_TRICK_START') {
    setTimeout(() => {
      const currentRoom = getRoom(roomCode);
      if (!currentRoom?.fluxGameState) return;
      const newState = startFluxTrick(currentRoom.fluxGameState);
      broadcastFluxState(io, roomCode, newState);
      if (currentRoom.bots.length > 0) {
        scheduleFluxBotPlays(io, roomCode, newState, currentRoom);
      }
    }, NEXT_TRICK_DELAY);
  } else if (state.phase === 'BONUS_STAR') {
    // Fin de manche flux : afficher le résumé des PV, attendre next_phase
    // (les bots passent automatiquement après un délai)
    broadcastFluxState(io, roomCode, state);
    if (room.bots.length > 0 && room.players.every(p => room.bots.some(b => b.id === p.id) || !p.isConnected)) {
      // Partie 100% bots : passer automatiquement
      setTimeout(() => {
        const currentRoom = getRoom(roomCode);
        if (!currentRoom?.fluxGameState) return;
        const next = nextFluxRoundOrGameOver(currentRoom.fluxGameState);
        broadcastFluxState(io, roomCode, next);
        advanceAfterFluxTrick(io, roomCode, next, currentRoom);
      }, ROUND_END_DELAY * 2);
    }
    // Humain présent : on attend le next_phase du client
  } else if (state.phase === 'GAME_OVER') {
    io.to(roomCode).emit('game_over', {
      finalScores: state.finalScores,
      winnerId: state.finalScores?.[0]?.playerId ?? null,
    });
  }
}

// ============================================================
// Révélation + résolution classic (factorisé pour humains et bots)
// ============================================================
function triggerRevealAndResolve(
  io: Server,
  roomCode: string,
  state: InternalGameState,
  room: Room
) {
  setTimeout(() => {
    io.to(roomCode).emit('reveal', {
      playedCards: state.playedCards as Record<string, number>,
    });

    let resolvedState = resolveTrickPhase(state);
    broadcastGameState(io, roomCode, resolvedState);

    if (resolvedState.phase === 'SPECIAL_EFFECT') {
      const actorId = resolvedState.stealRequestPlayerId ?? resolvedState.swapRequestPlayerId;
      const botProfile = actorId ? getBotProfile(room, actorId) : null;

      if (botProfile && actorId) {
        // Bot : résoudre automatiquement l'effet spécial
        setTimeout(() => {
          const currentRoom = getRoom(roomCode);
          if (!currentRoom?.gameState) return;
          const gs = currentRoom.gameState;

          if (gs.stealRequestPlayerId) {
            // VOL : le bot choisit une cible
            const targetId = decideBotStealTarget(gs, actorId, botProfile);
            if (!targetId) { gs.stealRequestPlayerId = null; gs.stealEligibleTargets = []; gs.phase = 'TRICK_END'; }
            else {
              const r = resolveSteal(gs, targetId);
              if (!r.ok) return;
              broadcastGameState(io, roomCode, r.state);
            }
          } else if (gs.swapRequestPlayerId) {
            // SWAP : le bot choisit 2 joueurs
            const [idA, idB] = decideBotSwapTargets(gs, actorId, botProfile);
            if (!idA || !idB) { gs.swapRequestPlayerId = null; gs.swapEligibleTargets = []; gs.swapChosenA = null; gs.phase = 'TRICK_END'; }
            else {
              const rA = resolveSwapChooseA(gs, idA);
              if (!rA.ok) return;
              const rB = resolveSwapChooseB(rA.state, idB);
              if (!rB.ok) return;
              broadcastGameState(io, roomCode, rB.state);
            }
          }

          const s = endTrick(currentRoom.gameState);
          broadcastGameState(io, roomCode, s);
          advanceAfterTrick(io, roomCode, s, currentRoom);
        }, BOT_PLAY_DELAY + 500);
      } else {
        // Humain : timeout automatique si pas de réponse
        const swapTimer = setTimeout(() => {
          const currentRoom = getRoom(roomCode);
          if (!currentRoom?.gameState) return;
          const gs = currentRoom.gameState;
          gs.swapRequestPlayerId = null; gs.swapEligibleTargets = []; gs.swapChosenA = null;
          gs.stealRequestPlayerId = null; gs.stealEligibleTargets = [];
          gs.phase = 'TRICK_END';
          let s = endTrick(gs);
          broadcastGameState(io, roomCode, s);
          advanceAfterTrick(io, roomCode, s, currentRoom);
        }, SWAP_TIMEOUT);
        resolvedState.swapTimeout = swapTimer;
      }
    } else {
      let s = endTrick(resolvedState);
      broadcastGameState(io, roomCode, s);
      advanceAfterTrick(io, roomCode, s, room);
    }
  }, REVEAL_DELAY);
}

// ============================================================
// Enregistrement des handlers pour un socket
// ============================================================
export function registerSocketHandlers(io: Server, socket: Socket) {
  // ----------------------------------------------------------
  // Créer une salle
  // ----------------------------------------------------------
  socket.on('create_room', ({ pseudo, gameMode }, callback) => {
    try {
      const room = createRoom(socket.id, pseudo, (gameMode as GameMode) ?? 'flux');
      socket.join(room.id);
      socket.data.roomCode = room.id;
      socket.data.pseudo = pseudo;
      callback({ roomCode: room.id, playerId: socket.id });
      io.to(room.id).emit('room_updated', toPublicRoom(room));
    } catch (e: any) {
      callback({ error: e.message });
    }
  });

  // ----------------------------------------------------------
  // Créer une salle solo (1 humain + bots)
  // ----------------------------------------------------------
  socket.on('create_solo_room', ({ pseudo, bots, gameOptions, gameMode }, callback) => {
    try {
      if (!pseudo?.trim()) return callback({ error: 'Entrez un pseudo' });
      if (!bots || bots.length < 2 || bots.length > 5) {
        return callback({ error: 'Choisissez entre 2 et 5 bots' });
      }

      const room = createSoloRoom(socket.id, pseudo.trim(), bots as BotProfile[], (gameMode as GameMode) ?? 'flux');
      socket.join(room.id);
      socket.data.roomCode = room.id;
      socket.data.pseudo = pseudo.trim();

      callback({ roomCode: room.id, playerId: socket.id });

      setImmediate(() => {
        try {
          // ---- Mode flux ----
          if (room.gameMode === 'flux') {
            const startResult = startFluxGame(room.id, socket.id, gameOptions as GameOptions | undefined);
            if (!startResult.ok || !startResult.room) {
              console.error('[Solo Flux] startFluxGame échoué :', startResult.error);
              return;
            }
            io.to(room.id).emit('room_updated', toPublicRoom(startResult.room));
            const gameRoom = startResult.room;
            if (gameRoom.fluxGameState) {
              const state = startFluxTrick(gameRoom.fluxGameState);
              broadcastFluxState(io, room.id, state);
              scheduleFluxBotPlays(io, room.id, state, gameRoom);
            }
            return;
          }

          // ---- Mode classic ----
          const startResult = startGame(room.id, socket.id, (state) => {
            broadcastGameState(io, room.id, state);
          }, gameOptions as GameOptions | undefined);

          if (!startResult.ok || !startResult.room) {
            console.error('[Solo] startGame échoué :', startResult.error);
            return;
          }

          io.to(room.id).emit('room_updated', toPublicRoom(startResult.room));

          const gameRoom = startResult.room;
          if (gameRoom.gameState) {
            let state = startRound(gameRoom.gameState, () => { });
            broadcastGameState(io, room.id, state);
            state = startTrick(state);
            broadcastGameState(io, room.id, state);
            scheduleBotPlays(io, room.id, state, gameRoom);
          }
        } catch (err: any) {
          console.error('[Solo] Erreur au démarrage :', err.message, err.stack);
        }
      });
    } catch (e: any) {
      console.error('[Solo] Erreur catch externe :', e.message);
      callback({ error: e.message });
    }
  });

  // ----------------------------------------------------------
  // Rejoindre une partie EN COURS après déconnexion (nouveau socket.id)
  // Le client envoie son ancien playerId stocké en localStorage
  // ----------------------------------------------------------
  socket.on('rejoin_room', ({ roomCode, oldPlayerId }, callback) => {
    try {
      const result = rejoinRoom(roomCode, oldPlayerId, socket.id);
      if (!result.ok || !result.room) {
        return callback({ error: result.error ?? 'Impossible de rejoindre' });
      }
      const room = result.room;
      socket.join(room.id);
      socket.data.roomCode = room.id;
      socket.data.pseudo = room.players.find(p => p.id === socket.id)?.pseudo ?? '';

      // Confirmer avec le nouveau playerId
      callback({ ok: true, playerId: socket.id, gameMode: room.gameMode });

      // Remettre à jour tout le monde
      io.to(room.id).emit('room_updated', toPublicRoom(room));

      // Renvoyer l'état de jeu complet au joueur reconnecté
      if (room.gameMode === 'flux' && room.fluxGameState) {
        broadcastFluxState(io, room.id, room.fluxGameState);
      } else if (room.gameState) {
        broadcastGameState(io, room.id, room.gameState);
      }

      console.log(`[Rejoin] ${socket.id} a repris le slot de ${oldPlayerId} dans ${room.id}`);
    } catch (e: any) {
      callback({ error: e.message });
    }
  });

  // ----------------------------------------------------------
  // Rejoindre une salle
  // ----------------------------------------------------------
  socket.on('join_room', ({ roomCode, pseudo }, callback) => {
    try {
      const code = roomCode.toUpperCase();
      const result = joinRoom(code, socket.id, pseudo);
      if (!result.ok || !result.room) {
        return callback({ error: result.error ?? 'Erreur inconnue' });
      }
      socket.join(result.room.id);
      socket.data.roomCode = result.room.id;
      socket.data.pseudo = pseudo;
      // Renvoyer le gameMode déduit du code au client
      callback({ playerId: socket.id, gameMode: gameModeFromCode(code) });
      io.to(result.room.id).emit('room_updated', toPublicRoom(result.room));
    } catch (e: any) {
      callback({ error: e.message });
    }
  });

  // ----------------------------------------------------------
  // Joueur prêt
  // ----------------------------------------------------------
  socket.on('player_ready', (callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const result = setPlayerReady(roomCode, socket.id);
      if (!result.ok || !result.room) {
        return callback({ error: result.error ?? 'Erreur' });
      }
      callback({ ok: true });
      io.to(roomCode).emit('room_updated', toPublicRoom(result.room));
    } catch (e: any) {
      callback({ error: e.message });
    }
  });

  // ----------------------------------------------------------
  // Ajouter un bot dans la salle (hôte uniquement, salle d'attente)
  // ----------------------------------------------------------
  socket.on('add_bot', ({ profile }, callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const result = addBotToRoom(roomCode, socket.id, profile as BotProfile);
      if (!result.ok || !result.room) return callback({ error: result.error ?? 'Erreur' });
      callback({ ok: true });
      io.to(roomCode).emit('room_updated', toPublicRoom(result.room));
    } catch (e: any) {
      callback({ error: e.message });
    }
  });

  // ----------------------------------------------------------
  // Retirer un bot de la salle (hôte uniquement, salle d'attente)
  // ----------------------------------------------------------
  socket.on('remove_bot', ({ botId }, callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const result = removeBotFromRoom(roomCode, socket.id, botId);
      if (!result.ok || !result.room) return callback({ error: result.error ?? 'Erreur' });
      callback({ ok: true });
      io.to(roomCode).emit('room_updated', toPublicRoom(result.room));
    } catch (e: any) {
      callback({ error: e.message });
    }
  });

  // ----------------------------------------------------------
  // Lancer la partie
  // ----------------------------------------------------------
  socket.on('start_game', ({ gameOptions } = {} as any, callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const room = getRoom(roomCode);
      if (!room) return callback({ error: 'Salle introuvable' });

      // ---- Mode flux ----
      if (room.gameMode === 'flux') {
        const result = startFluxGame(roomCode, socket.id, gameOptions as GameOptions | undefined);
        if (!result.ok || !result.room) return callback({ error: result.error ?? 'Erreur' });
        callback({ ok: true });
        io.to(roomCode).emit('room_updated', toPublicRoom(result.room));
        if (result.room.fluxGameState) {
          const state = startFluxTrick(result.room.fluxGameState);
          broadcastFluxState(io, roomCode, state);
          // Déclencher les bots si la salle en contient (solo OU multi+bots)
          if (result.room.bots.length > 0) {
            scheduleFluxBotPlays(io, roomCode, state, result.room);
          }
        }
        return;
      }

      // ---- Mode classic ----
      const result = startGame(roomCode, socket.id, (state) => {
        broadcastGameState(io, roomCode, state);
      }, gameOptions as GameOptions | undefined);

      if (!result.ok || !result.room) {
        return callback({ error: result.error ?? 'Erreur' });
      }

      callback({ ok: true });
      io.to(roomCode).emit('room_updated', toPublicRoom(result.room));

      if (result.room.gameState) {
        let state = startRound(result.room.gameState, () => { });
        broadcastGameState(io, roomCode, state);
        state = startTrick(state);
        broadcastGameState(io, roomCode, state);
        // Déclencher les bots si la salle en contient (solo OU multi+bots)
        if (result.room.bots.length > 0) {
          scheduleBotPlays(io, roomCode, state, result.room);
        }
      }
    } catch (e: any) {
      callback({ error: e.message });
    }
  });

  // ----------------------------------------------------------
  // Jouer une carte
  // ----------------------------------------------------------
  socket.on('play_card', ({ cardValue }, callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const room = getRoom(roomCode);
      if (!room) return callback({ error: 'Partie introuvable' });

      // ---- Mode flux ----
      if (room.gameMode === 'flux') {
        if (!room.fluxGameState) return callback({ error: 'Partie introuvable' });
        const result = playFluxCard(room.fluxGameState, socket.id, cardValue);
        if (!result.ok) return callback({ error: result.error });
        callback({ ok: true });
        io.to(roomCode).emit('card_played', { playerId: socket.id, isHidden: true });
        broadcastFluxState(io, roomCode, result.state);
        if (result.state.phase === 'REVEAL') {
          triggerFluxRevealAndResolve(io, roomCode, result.state, room);
        } else if (room.bots.length > 0 && result.state.phase === 'CARD_SELECTION') {
          scheduleFluxBotPlays(io, roomCode, result.state, room);
        }
        return;
      }

      // ---- Mode classic ----
      if (!room.gameState) return callback({ error: 'Partie introuvable' });
      const result = playCard(room.gameState, socket.id, cardValue);
      if (!result.ok) return callback({ error: result.error });
      callback({ ok: true });
      io.to(roomCode).emit('card_played', { playerId: socket.id, isHidden: true });
      broadcastGameState(io, roomCode, result.state);
      if (result.state.phase === 'REVEAL') {
        triggerRevealAndResolve(io, roomCode, result.state, room);
      } else if (room.bots.length > 0 && result.state.phase === 'CARD_SELECTION') {
        scheduleBotPlays(io, roomCode, result.state, room);
      }
    } catch (e: any) {
      callback({ error: e.message });
    }
  });

  // ----------------------------------------------------------
  // VOL : choisir la cible
  // ----------------------------------------------------------
  socket.on('steal_target', ({ targetPlayerId }, callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const room = getRoom(roomCode);
      if (!room) return callback({ error: 'Partie introuvable' });

      // ---- Mode flux ----
      if (room.gameMode === 'flux') {
        if (!room.fluxGameState) return callback({ error: 'Partie introuvable' });
        if (room.fluxGameState.stealRequestPlayerId !== socket.id)
          return callback({ error: "Ce n'est pas votre tour de voler" });
        if (room.fluxGameState.swapTimeout) { clearTimeout(room.fluxGameState.swapTimeout); room.fluxGameState.swapTimeout = null; }
        const result = resolveFluxSteal(room.fluxGameState, targetPlayerId);
        if (!result.ok) return callback({ error: result.error });
        callback({ ok: true });
        broadcastFluxState(io, roomCode, result.state);
        const s = endFluxTrick(result.state);
        broadcastFluxState(io, roomCode, s);
        advanceAfterFluxTrick(io, roomCode, s, room);
        return;
      }

      // ---- Mode classic ----
      if (!room.gameState) return callback({ error: 'Partie introuvable' });
      if (room.gameState.stealRequestPlayerId !== socket.id)
        return callback({ error: "Ce n'est pas votre tour de voler" });
      if (room.gameState.swapTimeout) { clearTimeout(room.gameState.swapTimeout); room.gameState.swapTimeout = null; }
      const result = resolveSteal(room.gameState, targetPlayerId);
      if (!result.ok) return callback({ error: result.error });
      callback({ ok: true });
      broadcastGameState(io, roomCode, result.state);
      let state = endTrick(result.state);
      broadcastGameState(io, roomCode, state);
      advanceAfterTrick(io, roomCode, state, room);
    } catch (e: any) { callback({ error: e.message }); }
  });

  // ----------------------------------------------------------
  // SWAP : choisir le joueur A puis le joueur B
  // ----------------------------------------------------------
  socket.on('swap_target', ({ targetPlayerId }, callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const room = getRoom(roomCode);
      if (!room) return callback({ error: 'Partie introuvable' });

      // ---- Mode flux ----
      if (room.gameMode === 'flux') {
        if (!room.fluxGameState) return callback({ error: 'Partie introuvable' });
        if (room.fluxGameState.swapRequestPlayerId !== socket.id)
          return callback({ error: "Ce n'est pas votre tour d'échanger" });
        const gs = room.fluxGameState;
        if (!gs.swapChosenA) {
          const rA = resolveFluxSwapChooseA(gs, targetPlayerId);
          if (!rA.ok) return callback({ error: rA.error });
          callback({ ok: true });
          broadcastFluxState(io, roomCode, rA.state);
        } else {
          if (gs.swapTimeout) { clearTimeout(gs.swapTimeout); gs.swapTimeout = null; }
          const rB = resolveFluxSwapChooseB(gs, targetPlayerId);
          if (!rB.ok) return callback({ error: rB.error });
          callback({ ok: true });
          broadcastFluxState(io, roomCode, rB.state);
          const s = endFluxTrick(rB.state);
          broadcastFluxState(io, roomCode, s);
          advanceAfterFluxTrick(io, roomCode, s, room);
        }
        return;
      }

      // ---- Mode classic ----
      if (!room.gameState) return callback({ error: 'Partie introuvable' });
      if (room.gameState.swapRequestPlayerId !== socket.id)
        return callback({ error: "Ce n'est pas votre tour d'échanger" });
      const gs = room.gameState;
      if (!gs.swapChosenA) {
        const rA = resolveSwapChooseA(gs, targetPlayerId);
        if (!rA.ok) return callback({ error: rA.error });
        callback({ ok: true });
        broadcastGameState(io, roomCode, rA.state);
      } else {
        if (room.gameState.swapTimeout) { clearTimeout(room.gameState.swapTimeout); room.gameState.swapTimeout = null; }
        const rB = resolveSwapChooseB(gs, targetPlayerId);
        if (!rB.ok) return callback({ error: rB.error });
        callback({ ok: true });
        broadcastGameState(io, roomCode, rB.state);
        let state = endTrick(rB.state);
        broadcastGameState(io, roomCode, state);
        advanceAfterTrick(io, roomCode, state, room);
      }
    } catch (e: any) { callback({ error: e.message }); }
  });

  // ----------------------------------------------------------
  // VERROU : choisir la cible (humain)
  // ----------------------------------------------------------
  socket.on('verrou_target', ({ targetPlayerId }, callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const room = getRoom(roomCode);
      if (!room?.fluxGameState) return callback({ error: 'Partie introuvable' });
      const gs = room.fluxGameState;
      if (gs.verrouRequestPlayerId !== socket.id)
        return callback({ error: "Ce n'est pas votre tour" });
      if (gs.swapTimeout) { clearTimeout(gs.swapTimeout); gs.swapTimeout = null; }
      const result = resolveFluxVerrou(gs, targetPlayerId);
      if (!result.ok) return callback({ error: result.error });
      callback({ ok: true });
      broadcastFluxState(io, roomCode, result.state);
      const s = endFluxTrick(result.state);
      broadcastFluxState(io, roomCode, s);
      advanceAfterFluxTrick(io, roomCode, s, room);
    } catch (e: any) { callback({ error: e.message }); }
  });

  // ----------------------------------------------------------
  // PIOCHE : choisir la cible (humain)
  // ----------------------------------------------------------
  socket.on('pioche_target', ({ targetPlayerId }, callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const room = getRoom(roomCode);
      if (!room?.fluxGameState) return callback({ error: 'Partie introuvable' });
      const gs = room.fluxGameState;
      if (gs.piocheRequestPlayerId !== socket.id)
        return callback({ error: "Ce n'est pas votre tour" });
      if (gs.swapTimeout) { clearTimeout(gs.swapTimeout); gs.swapTimeout = null; }
      const result = resolveFluxPioche(gs, targetPlayerId);
      if (!result.ok) return callback({ error: result.error });
      callback({ ok: true });
      broadcastFluxState(io, roomCode, result.state);
      const s = endFluxTrick(result.state);
      broadcastFluxState(io, roomCode, s);
      advanceAfterFluxTrick(io, roomCode, s, room);
    } catch (e: any) { callback({ error: e.message }); }
  });

  // ----------------------------------------------------------
  // ECLIPSE : choisir la cible (humain)
  // ----------------------------------------------------------
  socket.on('eclipse_target', ({ targetPlayerId }, callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const room = getRoom(roomCode);
      if (!room?.fluxGameState) return callback({ error: 'Partie introuvable' });
      const gs = room.fluxGameState;
      if (gs.eclipseRequestPlayerId !== socket.id)
        return callback({ error: "Ce n'est pas votre tour" });
      if (gs.swapTimeout) { clearTimeout(gs.swapTimeout); gs.swapTimeout = null; }
      const result = resolveFluxEclipse(gs, targetPlayerId);
      if (!result.ok) return callback({ error: result.error });
      callback({ ok: true });
      broadcastFluxState(io, roomCode, result.state);
      const s = endFluxTrick(result.state);
      broadcastFluxState(io, roomCode, s);
      advanceAfterFluxTrick(io, roomCode, s, room);
    } catch (e: any) { callback({ error: e.message }); }
  });

  // ----------------------------------------------------------
  // REVELATION : choisir la cible (humain)
  // ----------------------------------------------------------
  socket.on('revelation_target', ({ targetPlayerId }, callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const room = getRoom(roomCode);
      if (!room?.fluxGameState) return callback({ error: 'Partie introuvable' });
      const gs = room.fluxGameState;
      if (gs.revelationRequestPlayerId !== socket.id)
        return callback({ error: "Ce n'est pas votre tour" });
      if (gs.swapTimeout) { clearTimeout(gs.swapTimeout); gs.swapTimeout = null; }
      const result = resolveFluxRevelation(gs, targetPlayerId);
      if (!result.ok) return callback({ error: result.error });
      callback({ ok: true });
      // Envoyer la carte mystère révélée à tous
      const target = gs.players.find(p => p.id === targetPlayerId);
      if (target) {
        io.to(roomCode).emit('mystery_revealed', {
          targetId: targetPlayerId,
          targetPseudo: target.pseudo,
          mysteryCard: gs.missingCards[targetPlayerId] ?? 0,
        });
      }
      broadcastFluxState(io, roomCode, result.state);
      const s = endFluxTrick(result.state);
      broadcastFluxState(io, roomCode, s);
      advanceAfterFluxTrick(io, roomCode, s, room);
    } catch (e: any) { callback({ error: e.message }); }
  });

  // ----------------------------------------------------------
  // TAXE : choisir la cible (humain)
  // ----------------------------------------------------------
  socket.on('taxe_target', ({ targetPlayerId }, callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const room = getRoom(roomCode);
      if (!room?.fluxGameState) return callback({ error: 'Partie introuvable' });
      const gs = room.fluxGameState;
      if (gs.taxeRequestPlayerId !== socket.id)
        return callback({ error: "Ce n'est pas votre tour" });
      if (gs.swapTimeout) { clearTimeout(gs.swapTimeout); gs.swapTimeout = null; }
      const result = resolveFluxTaxe(gs, targetPlayerId);
      if (!result.ok) return callback({ error: result.error });
      callback({ ok: true });
      broadcastFluxState(io, roomCode, result.state);
      const s = endFluxTrick(result.state);
      broadcastFluxState(io, roomCode, s);
      advanceAfterFluxTrick(io, roomCode, s, room);
    } catch (e: any) { callback({ error: e.message }); }
  });

  // ----------------------------------------------------------
  // SURCHARGE : choisir la cible (humain)
  // ----------------------------------------------------------
  socket.on('surcharge_target', ({ targetPlayerId }, callback) => {
    try {
      const roomCode = socket.data.roomCode;
      const room = getRoom(roomCode);
      if (!room?.fluxGameState) return callback({ error: 'Partie introuvable' });
      const gs = room.fluxGameState;
      if (gs.surchargeRequestPlayerId !== socket.id)
        return callback({ error: "Ce n'est pas votre tour" });
      if (gs.swapTimeout) { clearTimeout(gs.swapTimeout); gs.swapTimeout = null; }
      const result = resolveFluxSurcharge(gs, targetPlayerId);
      if (!result.ok) return callback({ error: result.error });
      callback({ ok: true });
      broadcastFluxState(io, roomCode, result.state);
      const s = endFluxTrick(result.state);
      broadcastFluxState(io, roomCode, s);
      advanceAfterFluxTrick(io, roomCode, s, room);
    } catch (e: any) { callback({ error: e.message }); }
  });

  // ----------------------------------------------------------
  // ORACLE : le joueur a vu les cartes et clique OK pour continuer
  // ----------------------------------------------------------
  socket.on('oracle_ok', (callback?: Function) => {
    try {
      const roomCode = socket.data.roomCode;
      const room = getRoom(roomCode);
      if (!room?.fluxGameState) return;
      const gs = room.fluxGameState;
      // Vérifier que c'est bien le gagnant ORACLE qui confirme
      if (gs.phase !== 'SPECIAL_ORACLE') return;
      if (gs.trickWinnerId !== socket.id) return;
      if (callback) callback({ ok: true });
      const s = endFluxTrick(gs);
      broadcastFluxState(io, roomCode, s);
      advanceAfterFluxTrick(io, roomCode, s, room);
    } catch (e: any) {
      if (callback) callback({ error: e.message });
    }
  });

  // ----------------------------------------------------------
  // next_phase : bouton "Manche suivante" en fin de manche flux
  // ----------------------------------------------------------
  socket.on('next_phase', () => {
    try {
      const roomCode = socket.data.roomCode;
      const room = getRoom(roomCode);
      if (!room?.fluxGameState) return;
      const gs = room.fluxGameState;
      if (gs.phase !== 'BONUS_STAR') return;
      const next = nextFluxRoundOrGameOver(gs);
      broadcastFluxState(io, roomCode, next);
      if (next.phase === 'FLUX_TRICK_START') {
        advanceAfterFluxTrick(io, roomCode, next, room);
      } else if (next.phase === 'GAME_OVER') {
        io.to(roomCode).emit('game_over', {
          finalScores: next.finalScores,
          winnerId: next.finalScores?.[0]?.playerId ?? null,
        });
      }
    } catch (e: any) {
      console.error('[next_phase]', e.message);
    }
  });

  // ----------------------------------------------------------
  // Déconnexion
  // ----------------------------------------------------------
  socket.on('disconnect', () => {
    const room = handleDisconnect(socket.id);
    if (room) {
      io.to(room.id).emit('room_updated', toPublicRoom(room));
      if (room.gameState) {
        broadcastGameState(io, room.id, room.gameState);
      }
    }
  });
}

// ============================================================
// Avancer après la fin d'une mène
// ============================================================
function advanceAfterTrick(
  io: Server,
  roomCode: string,
  state: InternalGameState,
  room?: Room
) {
  if (state.phase === 'TRICK_START') {
    // Mène suivante
    setTimeout(() => {
      const currentRoom = getRoom(roomCode);
      if (!currentRoom?.gameState) return;
      const newState = startTrick(currentRoom.gameState);
      broadcastGameState(io, roomCode, newState);
      if (currentRoom.bots.length > 0) {
        scheduleBotPlays(io, roomCode, newState, currentRoom);
      }
    }, NEXT_TRICK_DELAY);
  } else if (state.phase === 'ROUND_END') {
    // Fin de manche : calculer les points de victoire, afficher le résumé puis enchaîner
    setTimeout(() => {
      const currentRoom = getRoom(roomCode);
      if (!currentRoom?.gameState) return;
      let newState = endRound(currentRoom.gameState);
      broadcastGameState(io, roomCode, newState);

      setTimeout(() => {
        newState = nextRoundOrGameOver(newState);
        broadcastGameState(io, roomCode, newState);

        if (newState.phase === 'ROUND_START') {
          // Nouvelle manche — démarrer immédiatement
          setTimeout(() => {
            const r = getRoom(roomCode);
            if (!r) return;
            newState = startRound(newState, () => { });
            broadcastGameState(io, roomCode, newState);
            newState = startTrick(newState);
            broadcastGameState(io, roomCode, newState);
            if (r.bots.length > 0) {
              scheduleBotPlays(io, roomCode, newState, r);
            }
          }, NEXT_ROUND_DELAY);
        } else if (newState.phase === 'GAME_OVER') {
          // Le vainqueur est le premier joueur du classement (tri par points de victoire)
          io.to(roomCode).emit('game_over', {
            finalScores: newState.finalScores,
            winnerId: newState.finalScores?.[0]?.playerId ?? null,
          });
        }
      }, ROUND_END_DELAY);
    }, ROUND_END_DELAY);
  }
}
