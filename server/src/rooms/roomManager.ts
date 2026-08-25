import { Player, PublicRoom, RoomStatus, BotProfile, BotSlot, BOT_PROFILES_INFO, GameOptions, DEFAULT_GAME_OPTIONS, GameMode } from '../types';
import { InternalGameState, initGame } from '../game/engine';
import { FluxGameState, initFluxGame } from '../game/flux/engine';
import { BOT_PROFILES } from '../game/bot';

// ============================================================
// Structure interne d'une salle
// ============================================================
export interface Room {
  id: string;
  hostId: string;
  players: Player[];
  bots: Array<{ id: string; profile: BotProfile }>;
  status: RoomStatus;
  gameState: InternalGameState | null;     // Mode classic
  fluxGameState: FluxGameState | null;     // Mode flux
  createdAt: Date;
  isSoloMode: boolean;
  gameOptions: GameOptions;
  gameMode: GameMode;
}

// ============================================================
// Stockage en mémoire des salles actives
// ============================================================
const rooms = new Map<string, Room>();

// ============================================================
// Génération d'un code de salle unique (6 caractères)
// Le 1er caractère encode le mode : F = flux, C = classic
// ============================================================
function generateRoomCode(gameMode: GameMode): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const prefix = gameMode === 'flux' ? 'F' : 'C';
  let code = '';
  do {
    const suffix = Array.from({ length: 5 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    code = prefix + suffix;
  } while (rooms.has(code));
  return code;
}

// ============================================================
// Déduire le mode de jeu depuis le code de salle
// ============================================================
export function gameModeFromCode(roomCode: string): GameMode {
  return roomCode.startsWith('F') ? 'flux' : 'classic';
}

// ============================================================
// Créer une salle multijoueur classique
// ============================================================
export function createRoom(hostId: string, pseudo: string, gameMode: GameMode = 'flux'): Room {
  const code = generateRoomCode(gameMode);
  const host: Player = {
    id: hostId,
    pseudo,
    color: 'red',
    hand: [],
    scorePile: [],
    stars: 0,
    rechargeStars: 0,
    isReady: false,
    isConnected: true,
  };

  const room: Room = {
    id: code,
    hostId,
    players: [host],
    bots: [],
    status: 'waiting',
    gameState: null,
    fluxGameState: null,
    createdAt: new Date(),
    isSoloMode: false,
    gameOptions: { ...DEFAULT_GAME_OPTIONS },
    gameMode,
  };

  rooms.set(code, room);
  return room;
}

// ============================================================
// Créer une salle solo (1 humain + N bots)
// ============================================================
export function createSoloRoom(
  hostId: string,
  pseudo: string,
  botProfiles: BotProfile[],
  gameMode: GameMode = 'flux'
): Room {
  if (botProfiles.length < 2 || botProfiles.length > 5) {
    throw new Error('Il faut entre 2 et 5 bots pour une partie solo');
  }

  const code = generateRoomCode(gameMode);
  const host: Player = {
    id: hostId,
    pseudo,
    color: 'red',
    hand: [],
    scorePile: [],
    stars: 0,
    rechargeStars: 0,
    isReady: true,
    isConnected: true,
  };

  // Créer les joueurs bots
  const botPlayers: Player[] = botProfiles.map((profile, i) => {
    const config = BOT_PROFILES[profile];
    return {
      id: `bot_${code}_${i}`,
      pseudo: `${config.emoji} ${config.name}`,
      color: 'blue',
      hand: [],
      scorePile: [],
      stars: 0,
      rechargeStars: 0,
      isReady: true,
      isConnected: true,
    };
  });

  const room: Room = {
    id: code,
    hostId,
    players: [host, ...botPlayers],
    bots: botProfiles.map((profile, i) => ({
      id: `bot_${code}_${i}`,
      profile,
    })),
    status: 'waiting',
    gameState: null,
    fluxGameState: null,
    createdAt: new Date(),
    isSoloMode: true,
    gameOptions: { ...DEFAULT_GAME_OPTIONS },
    gameMode,
  };

  rooms.set(code, room);
  return room;
}

// ============================================================
// Vérifier si un joueur est un bot
// ============================================================
export function getBotProfile(room: Room, playerId: string): BotProfile | null {
  const bot = room.bots.find(b => b.id === playerId);
  return bot ? bot.profile : null;
}

// ============================================================
// Rejoindre une salle
// ============================================================
export function joinRoom(
  roomCode: string,
  playerId: string,
  pseudo: string
): { ok: boolean; error?: string; room?: Room } {
  const room = rooms.get(roomCode);
  if (!room) return { ok: false, error: 'Salle introuvable' };
  if (room.status !== 'waiting') return { ok: false, error: 'Partie déjà en cours' };
  if (room.players.length >= 6) return { ok: false, error: 'Salle pleine (max 6 joueurs)' };
  if (room.players.some(p => p.id === playerId)) {
    return { ok: true, room }; // Reconnexion
  }

  const player: Player = {
    id: playerId,
    pseudo,
    color: 'blue',
    hand: [],
    scorePile: [],
    stars: 0,
    rechargeStars: 0,
    isReady: false,
    isConnected: true,
  };

  room.players.push(player);
  return { ok: true, room };
}

// ============================================================
// Rejoindre une partie EN COURS après déconnexion
// Le client fournit son ancien playerId (stocké côté client).
// On remplace l'ancien socket.id par le nouveau dans toute la salle.
// ============================================================
export function rejoinRoom(
  roomCode: string,
  oldPlayerId: string,
  newSocketId: string
): { ok: boolean; error?: string; room?: Room } {
  const room = rooms.get(roomCode);
  if (!room) return { ok: false, error: 'Salle introuvable' };

  const player = room.players.find(p => p.id === oldPlayerId);
  if (!player) return { ok: false, error: 'Joueur introuvable dans cette salle' };

  // Mettre à jour l'id du joueur partout dans la salle
  player.id = newSocketId;
  player.isConnected = true;

  // Si c'était l'hôte, mettre à jour hostId
  if (room.hostId === oldPlayerId) {
    room.hostId = newSocketId;
  }

  // Mettre à jour les références dans gameState (classic)
  if (room.gameState) {
    const gs = room.gameState;
    const gp = gs.players.find(p => p.id === oldPlayerId);
    if (gp) gp.id = newSocketId;
    // playedCards
    if (oldPlayerId in gs.playedCards) {
      gs.playedCards[newSocketId] = gs.playedCards[oldPlayerId];
      delete gs.playedCards[oldPlayerId];
    }
    // mysteryCards
    if (oldPlayerId in gs.mysteryCards) {
      gs.mysteryCards[newSocketId] = gs.mysteryCards[oldPlayerId];
      delete gs.mysteryCards[oldPlayerId];
    }
    if (oldPlayerId in gs.mysteryCardOwners) {
      gs.mysteryCardOwners[newSocketId] = gs.mysteryCardOwners[oldPlayerId];
      delete gs.mysteryCardOwners[oldPlayerId];
    }
    if (oldPlayerId in gs.missingCards) {
      gs.missingCards[newSocketId] = gs.missingCards[oldPlayerId];
      delete gs.missingCards[oldPlayerId];
    }
    // stealRequest / swapRequest
    if (gs.stealRequestPlayerId === oldPlayerId) gs.stealRequestPlayerId = newSocketId;
    if (gs.swapRequestPlayerId === oldPlayerId) gs.swapRequestPlayerId = newSocketId;
    if (gs.swapChosenA === oldPlayerId) gs.swapChosenA = newSocketId;
    gs.stealEligibleTargets = gs.stealEligibleTargets.map(id => id === oldPlayerId ? newSocketId : id);
    gs.swapEligibleTargets = gs.swapEligibleTargets.map(id => id === oldPlayerId ? newSocketId : id);
  }

  // Mettre à jour les références dans fluxGameState (flux)
  if (room.fluxGameState) {
    const gs = room.fluxGameState;
    const gp = gs.players.find(p => p.id === oldPlayerId);
    if (gp) gp.id = newSocketId;
    if (oldPlayerId in gs.playedCards) {
      gs.playedCards[newSocketId] = gs.playedCards[oldPlayerId];
      delete gs.playedCards[oldPlayerId];
    }
    if (oldPlayerId in gs.mysteryCards) {
      gs.mysteryCards[newSocketId] = gs.mysteryCards[oldPlayerId];
      delete gs.mysteryCards[oldPlayerId];
    }
    if (oldPlayerId in gs.mysteryCardOwners) {
      gs.mysteryCardOwners[newSocketId] = gs.mysteryCardOwners[oldPlayerId];
      delete gs.mysteryCardOwners[oldPlayerId];
    }
    if (oldPlayerId in gs.missingCards) {
      gs.missingCards[newSocketId] = gs.missingCards[oldPlayerId];
      delete gs.missingCards[oldPlayerId];
    }
    if (gs.stealRequestPlayerId === oldPlayerId) gs.stealRequestPlayerId = newSocketId;
    if (gs.swapRequestPlayerId === oldPlayerId) gs.swapRequestPlayerId = newSocketId;
    if (gs.swapChosenA === oldPlayerId) gs.swapChosenA = newSocketId;
    gs.stealEligibleTargets = gs.stealEligibleTargets.map(id => id === oldPlayerId ? newSocketId : id);
    gs.swapEligibleTargets = gs.swapEligibleTargets.map(id => id === oldPlayerId ? newSocketId : id);
  }

  return { ok: true, room };
}

// ============================================================
// Marquer un joueur comme prêt
// ============================================================
export function setPlayerReady(
  roomCode: string,
  playerId: string
): { ok: boolean; error?: string; room?: Room } {
  const room = rooms.get(roomCode);
  if (!room) return { ok: false, error: 'Salle introuvable' };

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { ok: false, error: 'Joueur introuvable' };

  player.isReady = !player.isReady; // Toggle
  return { ok: true, room };
}

// ============================================================
// Démarrer la partie (mode classic)
// ============================================================
export function startGame(
  roomCode: string,
  hostId: string,
  onStateChange: (state: InternalGameState) => void,
  gameOptions?: GameOptions
): { ok: boolean; error?: string; room?: Room } {
  const room = rooms.get(roomCode);
  if (!room) return { ok: false, error: 'Salle introuvable' };
  if (room.hostId !== hostId) return { ok: false, error: 'Seul le créateur peut lancer la partie' };
  if (room.players.length < 3) return { ok: false, error: 'Il faut au moins 3 joueurs' };
  if (room.players.length > 6) return { ok: false, error: 'Maximum 6 joueurs' };
  if (!room.isSoloMode && !room.players.every(p => p.isReady)) {
    return { ok: false, error: 'Tous les joueurs doivent être prêts' };
  }

  if (gameOptions) room.gameOptions = { ...DEFAULT_GAME_OPTIONS, ...gameOptions };

  const gameState = initGame(
    room.players.map(p => ({ id: p.id, pseudo: p.pseudo })),
    onStateChange,
    room.gameOptions
  );

  for (const gp of gameState.players) {
    const rp = room.players.find(p => p.id === gp.id);
    if (rp) {
      rp.color = gp.color;
      rp.hand = gp.hand;
    }
  }

  room.gameState = gameState;
  room.gameMode = 'classic';
  room.status = 'playing';

  return { ok: true, room };
}

// ============================================================
// Démarrer la partie (mode flux)
// ============================================================
export function startFluxGame(
  roomCode: string,
  hostId: string,
  gameOptions?: GameOptions
): { ok: boolean; error?: string; room?: Room } {
  const room = rooms.get(roomCode);
  if (!room) return { ok: false, error: 'Salle introuvable' };
  if (room.hostId !== hostId) return { ok: false, error: 'Seul le créateur peut lancer la partie' };
  if (room.players.length < 3) return { ok: false, error: 'Il faut au moins 3 joueurs' };
  if (room.players.length > 6) return { ok: false, error: 'Maximum 6 joueurs' };
  if (!room.isSoloMode && !room.players.every(p => p.isReady)) {
    return { ok: false, error: 'Tous les joueurs doivent être prêts' };
  }

  if (gameOptions) room.gameOptions = { ...DEFAULT_GAME_OPTIONS, ...gameOptions };

  const fluxState = initFluxGame(
    room.players.map(p => ({ id: p.id, pseudo: p.pseudo })),
    room.gameOptions
  );

  for (const gp of fluxState.players) {
    const rp = room.players.find(p => p.id === gp.id);
    if (rp) {
      rp.color = gp.color;
      rp.hand = gp.hand;
    }
  }

  room.fluxGameState = fluxState;
  room.gameMode = 'flux';
  room.status = 'playing';

  return { ok: true, room };
}

// ============================================================
// Récupérer une salle
// ============================================================
export function getRoom(roomCode: string): Room | undefined {
  return rooms.get(roomCode);
}

// ============================================================
// Trouver la salle d'un joueur
// ============================================================
export function getRoomByPlayerId(playerId: string): Room | undefined {
  for (const room of rooms.values()) {
    if (room.players.some(p => p.id === playerId)) return room;
  }
  return undefined;
}

// ============================================================
// Gérer la déconnexion d'un joueur
// ============================================================
export function handleDisconnect(playerId: string): Room | undefined {
  const room = getRoomByPlayerId(playerId);
  if (!room) return undefined;

  const player = room.players.find(p => p.id === playerId);
  if (player) player.isConnected = false;

  // Si en attente et que le joueur se déconnecte → le retirer
  if (room.status === 'waiting') {
    room.players = room.players.filter(p => p.id !== playerId);
    // Si c'était l'hôte, transférer à un autre joueur
    if (room.hostId === playerId && room.players.length > 0) {
      room.hostId = room.players[0].id;
    }
    // Supprimer la salle si vide
    if (room.players.length === 0) {
      rooms.delete(room.id);
      return undefined;
    }
  }

  return room;
}

// ============================================================
// Reconnecter un joueur
// ============================================================
export function reconnectPlayer(
  roomCode: string,
  playerId: string
): Room | undefined {
  const room = rooms.get(roomCode);
  if (!room) return undefined;

  const player = room.players.find(p => p.id === playerId);
  if (player) player.isConnected = true;

  return room;
}

// ============================================================
// Sérialisation vers la vue publique
// ============================================================
export function toPublicRoom(room: Room): PublicRoom {
  const botSlots: BotSlot[] = room.bots.map(b => ({
    ...BOT_PROFILES_INFO[b.profile],
  }));

  return {
    id: room.id,
    hostId: room.hostId,
    players: room.players.map(p => ({
      id: p.id,
      pseudo: p.pseudo,
      color: p.color,
      handCount: p.hand.length,
      topScoreCard: p.scorePile.length > 0 ? p.scorePile[p.scorePile.length - 1] : null,
      scorePileCount: p.scorePile.length,
      stars: p.stars,
      rechargeStars: p.rechargeStars,
      isReady: p.isReady,
      isConnected: p.isConnected,
      hasPlayedCard: false,
    })),
    bots: botSlots,
    status: room.status,
    playerCount: room.players.length,
    maxPlayers: 6,
    isSoloMode: room.isSoloMode,
    gameOptions: room.gameOptions,
    gameMode: room.gameMode,
  };
}
