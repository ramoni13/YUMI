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
  endFluxTrick,
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
        if (!result.ok) return;

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

    if (resolvedState.phase === 'SPECIAL_EFFECT') {
      const actorId = resolvedState.stealRequestPlayerId ?? resolvedState.swapRequestPlayerId;
      const botProfile = actorId ? getBotProfile(room, actorId) : null;

      if (botProfile && actorId) {
        setTimeout(() => {
          const currentRoom = getRoom(roomCode);
          if (!currentRoom?.fluxGameState) return;
          const gs = currentRoom.fluxGameState;

          if (gs.stealRequestPlayerId) {
            const targetId = decideBotStealTarget(gs as any, actorId, botProfile);
            if (!targetId) { gs.stealRequestPlayerId = null; gs.stealEligibleTargets = []; gs.phase = 'TRICK_END'; }
            else {
              const r = resolveFluxSteal(gs, targetId);
              if (!r.ok) return;
              broadcastFluxState(io, roomCode, r.state);
            }
          } else if (gs.swapRequestPlayerId) {
            const [idA, idB] = decideBotSwapTargets(gs as any, actorId, botProfile);
            if (!idA || !idB) { gs.swapRequestPlayerId = null; gs.swapEligibleTargets = []; gs.swapChosenA = null; gs.phase = 'TRICK_END'; }
            else {
              const rA = resolveFluxSwapChooseA(gs, idA);
              if (!rA.ok) return;
              const rB = resolveFluxSwapChooseB(rA.state, idB);
              if (!rB.ok) return;
              broadcastFluxState(io, roomCode, rB.state);
            }
          }

          const s = endFluxTrick(currentRoom.fluxGameState);
          broadcastFluxState(io, roomCode, s);
          advanceAfterFluxTrick(io, roomCode, s, currentRoom);
        }, BOT_PLAY_DELAY + 500);
      } else {
        // Humain : timeout automatique
        const swapTimer = setTimeout(() => {
          const currentRoom = getRoom(roomCode);
          if (!currentRoom?.fluxGameState) return;
          const gs = currentRoom.fluxGameState;
          gs.swapRequestPlayerId = null; gs.swapEligibleTargets = []; gs.swapChosenA = null;
          gs.stealRequestPlayerId = null; gs.stealEligibleTargets = [];
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
            if (r.bots.length > 0) {
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
