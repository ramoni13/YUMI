import { Server, Socket } from 'socket.io';
import { BotProfile, GameOptions, PrivateInfo } from '../types';
import {
  createRoom,
  createSoloRoom,
  joinRoom,
  setPlayerReady,
  startGame,
  getRoom,
  getRoomByPlayerId,
  getBotProfile,
  handleDisconnect,
  toPublicRoom,
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
import { decideBotCard, decideBotStealTarget, decideBotSwapTargets } from '../game/bot';

const SWAP_TIMEOUT = 15000;   // ms
const BOT_PLAY_DELAY = 800;   // ms de délai avant qu'un bot joue (pour l'animation)
const REVEAL_DELAY = 1500;    // ms entre la dernière carte jouée et la révélation
const NEXT_TRICK_DELAY = 1500; // ms entre la fin d'une mène et la suivante
const ROUND_END_DELAY = 2000; // ms pour afficher le résumé de fin de manche
const NEXT_ROUND_DELAY = 1000; // ms avant de démarrer la manche suivante

// ============================================================
// Broadcast de l'état du jeu à tous les joueurs de la salle
// ============================================================
function broadcastGameState(io: Server, roomCode: string, state: InternalGameState) {
  const publicState = toPublicState(state);
  io.to(roomCode).emit('game_state_updated', publicState);

  // Envoyer les infos privées à chaque joueur
  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];
    const privateInfo: PrivateInfo = { hand: player.hand };

    // Ce joueur a vu la carte mystère d'un autre joueur
    if (state.mysteryCards[player.id] !== undefined) {
      privateInfo.mysteryCard = state.mysteryCards[player.id];
      privateInfo.mysteryCardOwner = state.mysteryCardOwners[player.id]; // pseudo direct, sans calcul d'index
    }
    if (state.missingCards[player.id] !== undefined) {
      privateInfo.missingCardValue = state.missingCards[player.id];
    }
    io.to(player.id).emit('private_info', privateInfo);
  }
}

// ============================================================
// Faire jouer tous les bots de la salle (phase CARD_SELECTION)
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
        if (!result.ok) return;

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
// Révélation + résolution (factorisé pour humains et bots)
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
  // Créer une salle classique
  // ----------------------------------------------------------
  socket.on('create_room', ({ pseudo }, callback) => {
    try {
      const room = createRoom(socket.id, pseudo);
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
  socket.on('create_solo_room', ({ pseudo, bots, gameOptions }, callback) => {
    try {
      if (!pseudo?.trim()) return callback({ error: 'Entrez un pseudo' });
      if (!bots || bots.length < 2 || bots.length > 5) {
        return callback({ error: 'Choisissez entre 2 et 5 bots' });
      }

      const room = createSoloRoom(socket.id, pseudo.trim(), bots as BotProfile[]);
      socket.join(room.id);
      socket.data.roomCode = room.id;
      socket.data.pseudo = pseudo.trim();

      // Répondre au client d'abord, puis démarrer la partie dans le tick suivant
      callback({ roomCode: room.id, playerId: socket.id });

      setImmediate(() => {
        try {
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
  // Rejoindre une salle
  // ----------------------------------------------------------
  socket.on('join_room', ({ roomCode, pseudo }, callback) => {
    try {
      const result = joinRoom(roomCode.toUpperCase(), socket.id, pseudo);
      if (!result.ok || !result.room) {
        return callback({ error: result.error ?? 'Erreur inconnue' });
      }
      socket.join(result.room.id);
      socket.data.roomCode = result.room.id;
      socket.data.pseudo = pseudo;
      callback({ playerId: socket.id });
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
  // Lancer la partie
  // ----------------------------------------------------------
  socket.on('start_game', ({ gameOptions } = {} as any, callback) => {
    try {
      const roomCode = socket.data.roomCode;

      const result = startGame(roomCode, socket.id, (state) => {
        broadcastGameState(io, roomCode, state);
      }, gameOptions as GameOptions | undefined);

      if (!result.ok || !result.room) {
        return callback({ error: result.error ?? 'Erreur' });
      }

      callback({ ok: true });
      io.to(roomCode).emit('room_updated', toPublicRoom(result.room));

      // Démarrer la première manche
      const room = result.room;
      if (room.gameState) {
        let state = startRound(room.gameState, () => { });
        broadcastGameState(io, roomCode, state);
        // Démarrer directement la première mène (pas de mémorisation)
        state = startTrick(state);
        broadcastGameState(io, roomCode, state);
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
      if (!room?.gameState) return callback({ error: 'Partie introuvable' });

      const result = playCard(room.gameState, socket.id, cardValue);
      if (!result.ok) return callback({ error: result.error });

      callback({ ok: true });

      // Notifier que le joueur a joué (face cachée)
      io.to(roomCode).emit('card_played', { playerId: socket.id, isHidden: true });
      broadcastGameState(io, roomCode, result.state);

      // Si tous ont joué → révélation
      if (result.state.phase === 'REVEAL') {
        triggerRevealAndResolve(io, roomCode, result.state, room);
      } else if (room.isSoloMode && result.state.phase === 'CARD_SELECTION') {
        // En mode solo : faire jouer les bots qui n'ont pas encore joué
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
      if (!room?.gameState) return callback({ error: 'Partie introuvable' });
      if (room.gameState.stealRequestPlayerId !== socket.id)
        return callback({ error: 'Ce n\'est pas votre tour de voler' });

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
      if (!room?.gameState) return callback({ error: 'Partie introuvable' });
      if (room.gameState.swapRequestPlayerId !== socket.id)
        return callback({ error: 'Ce n\'est pas votre tour d\'échanger' });

      const gs = room.gameState;

      if (!gs.swapChosenA) {
        // Étape 1 : choisir le joueur A
        const rA = resolveSwapChooseA(gs, targetPlayerId);
        if (!rA.ok) return callback({ error: rA.error });
        callback({ ok: true });
        broadcastGameState(io, roomCode, rA.state); // informe le client que A est choisi
      } else {
        // Étape 2 : choisir le joueur B → exécute l'échange
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
      if (currentRoom.isSoloMode) {
        scheduleBotPlays(io, roomCode, newState, currentRoom);
      }
    }, NEXT_TRICK_DELAY);
  } else if (state.phase === 'ROUND_END') {
    // Fin de manche : afficher le résumé puis enchaîner
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
            if (r.isSoloMode) {
              scheduleBotPlays(io, roomCode, newState, r);
            }
          }, NEXT_ROUND_DELAY);
        } else if (newState.phase === 'GAME_OVER') {
          io.to(roomCode).emit('game_over', {
            finalScores: newState.finalScores,
            winnerId: newState.finalScores?.[0]?.playerId ?? null,
          });
        }
      }, ROUND_END_DELAY);
    }, ROUND_END_DELAY);
  }
}
