import { Player, PublicRoom, RoomStatus, BotProfile, BotSlot, BOT_PROFILES_INFO, GameOptions, DEFAULT_GAME_OPTIONS } from '../types';
import { InternalGameState, initGame } from '../game/engine';
import { BOT_PROFILES } from '../game/bot';

// ============================================================
// Structure interne d'une salle
// ============================================================
export interface Room {
  id: string;
  hostId: string;
  players: Player[];
  bots: Array<{ id: string; profile: BotProfile }>; // Bots avec leur ID interne
  status: RoomStatus;
  gameState: InternalGameState | null;
  createdAt: Date;
  isSoloMode: boolean;
  gameOptions: GameOptions;
}

// ============================================================
// Stockage en mémoire des salles actives
// ============================================================
const rooms = new Map<string, Room>();

// ============================================================
// Génération d'un code de salle unique (6 caractères)
// ============================================================
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = Array.from({ length: 6 }, () =>
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
  } while (rooms.has(code));
  return code;
}

// ============================================================
// Créer une salle multijoueur classique
// ============================================================
export function createRoom(hostId: string, pseudo: string): Room {
  const code = generateRoomCode();
  const host: Player = {
    id: hostId,
    pseudo,
    color: 'red', // sera réattribué au démarrage
    hand: [],
    scorePile: [],
    stars: 0,
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
    createdAt: new Date(),
    isSoloMode: false,
    gameOptions: { ...DEFAULT_GAME_OPTIONS },
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
  botProfiles: BotProfile[]
): Room {
  if (botProfiles.length < 2 || botProfiles.length > 5) {
    throw new Error('Il faut entre 2 et 5 bots pour une partie solo');
  }

  const code = generateRoomCode();
  const host: Player = {
    id: hostId,
    pseudo,
    color: 'red',
    hand: [],
    scorePile: [],
    stars: 0,
    isReady: true, // L'hôte est automatiquement prêt en mode solo
    isConnected: true,
  };

  // Créer les joueurs bots
  const botPlayers: Player[] = botProfiles.map((profile, i) => {
    const config = BOT_PROFILES[profile];
    return {
      id: `bot_${code}_${i}`,
      pseudo: `${config.emoji} ${config.name}`,
      color: 'blue', // sera réattribué au démarrage
      hand: [],
      scorePile: [],
      stars: 0,
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
    createdAt: new Date(),
    isSoloMode: true,
    gameOptions: { ...DEFAULT_GAME_OPTIONS },
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
    color: 'blue', // sera réattribué au démarrage
    hand: [],
    scorePile: [],
    stars: 0,
    isReady: false,
    isConnected: true,
  };

  room.players.push(player);
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
// Démarrer la partie
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

  // Appliquer les options si fournies
  if (gameOptions) room.gameOptions = { ...DEFAULT_GAME_OPTIONS, ...gameOptions };

  const gameState = initGame(
    room.players.map(p => ({ id: p.id, pseudo: p.pseudo })),
    onStateChange,
    room.gameOptions
  );

  // Synchroniser les joueurs avec l'état du jeu
  for (const gp of gameState.players) {
    const rp = room.players.find(p => p.id === gp.id);
    if (rp) {
      rp.color = gp.color;
      rp.hand = gp.hand;
    }
  }

  room.gameState = gameState;
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
  };
}
