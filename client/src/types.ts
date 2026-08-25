// ============================================================
// YUMI — Types partagés client / serveur
// ============================================================

// ----------------------------
// Couleurs des joueurs
// ----------------------------
export type PlayerColor =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'purple'
  | 'orange';

export const PLAYER_COLORS: PlayerColor[] = [
  'red', 'blue', 'green', 'yellow', 'purple', 'orange',
];

// ----------------------------
// Cartes Score
// ----------------------------
export type ScoreCardType = 'positive' | 'negative' | 'special';
export type SpecialEffect = 'STEAL' | 'DOUBLE' | 'SWAP' | null;

export interface ScoreCard {
  id: number;             // 1 à 30
  value: number;          // Valeur numérique (0 pour les spéciales)
  type: ScoreCardType;    // 'positive' (verte) | 'negative' (rouge) | 'special'
  specialEffect: SpecialEffect;
  displayValue: string;   // Ex: "+3", "-2", "🦅", "×2", "⇄"
  appliedDouble: boolean; // Si le ×2 a déjà été appliqué sur cette carte
  bonusStars: number;     // Étoiles immédiatement gagnées (0 pour la plupart, 1 pour -1, 2 pour -2)
}

// ----------------------------
// Joueur
// ----------------------------
export interface Player {
  id: string;
  pseudo: string;
  color: PlayerColor;
  hand: number[];           // Cartes en main (valeurs 1 à 8)
  scorePile: ScoreCard[];   // Pile de cartes Score gagnées
  stars: number;            // Étoiles cartes Score (majorité uniquement, pas de +1 pt)
  rechargeStars: number;    // Étoiles Recharge (majorité + +1 pt chacune)
  isReady: boolean;
  isConnected: boolean;
}

// Vue publique d'un joueur (sans les cartes en main)
export interface PublicPlayer {
  id: string;
  pseudo: string;
  color: PlayerColor;
  handCount: number;        // Nombre de cartes en main (sans les valeurs)
  topScoreCard: ScoreCard | null; // Dernière carte Score visible
  scorePileCount: number;
  stars: number;            // Étoiles cartes Score (majorité uniquement)
  rechargeStars: number;    // Étoiles Recharge (majorité + +1 pt)
  isReady: boolean;
  isConnected: boolean;
  hasPlayedCard: boolean;
}

// ----------------------------
// Mode de jeu
// ----------------------------
export type GameMode = 'classic' | 'flux';

// Valeur réservée pour la carte Recharge (mode flux)
export const RECHARGE_CARD_VALUE = 0;

// ----------------------------
// Phases de jeu
// ----------------------------
export type GamePhase =
  // Phases communes
  | 'LOBBY'
  | 'SETUP'
  | 'CARD_SELECTION'
  | 'REVEAL'
  | 'RESOLUTION'
  | 'SPECIAL_EFFECT'
  | 'TRICK_END'
  | 'GAME_OVER'
  // Phases mode classic uniquement
  | 'ROUND_START'
  | 'MEMORIZATION'
  | 'TRICK_START'
  | 'ROUND_END'
  | 'BONUS_STAR'
  // Phases mode flux uniquement
  | 'FLUX_TRICK_START'
  | 'FLUX_RECHARGE';

// ----------------------------
// État du jeu (version publique envoyée aux clients)
// ----------------------------
export interface PublicGameState {
  phase: GamePhase;
  gameMode: GameMode;
  currentRound: number;
  totalRounds: number;
  currentTrick: number;
  totalTricks: number;
  scoreColumn: (ScoreCard | null)[];
  currentScoreCard: ScoreCard | null;
  scoreDeckCount: number;
  players: PublicPlayer[];
  trickWinnerId: string | null;
  cancelledValues: number[];
  scoreCardDiscarded: boolean;
  memorizeTimer: number | null;
  swapRequestPlayerId: string | null;
  swapEligibleTargets: string[];
  swapChosenA: string | null;
  stealRequestPlayerId: string | null;
  stealEligibleTargets: string[];
  lastTrickSummary: TrickSummary | null;
  roundEndSummary: RoundEndSummary | null;
  finalScores: FinalScore[] | null;
  gameOptions: GameOptions;
  // Champs spécifiques mode flux
  rechargedPlayerIds: string[];
  rechargeStarWinners: string[];
}

// ----------------------------
// Informations privées (envoyées uniquement au joueur concerné)
// ----------------------------
export interface PrivateInfo {
  hand: number[];               // Cartes en main du joueur
  mysteryCard?: number;         // Carte mystère vue par le voisin de droite
  mysteryCardOwner?: string;    // Pseudo du joueur à qui appartient la carte mystère
  missingCardValue?: number;    // Valeur de la carte manquante (pour le joueur pioché)
}

// ----------------------------
// Événements de jeu (flux historique côté client)
// ----------------------------
export type GameEventKind =
  | 'ROUND_START'        // Début de manche
  | 'TRICK_START'        // Carte Score retournée
  | 'CARD_PLAYED'        // Un joueur pose sa carte (face cachée)
  | 'REVEAL'             // Toutes les cartes retournées
  | 'TRICK_RESULT'       // Résultat du pli (gagnant / défausse)
  | 'SCORE_WON'          // Ligne explicite : "X a remporté la carte Score Y"
  | 'SPECIAL_STEAL'      // Effet VOL
  | 'SPECIAL_DOUBLE'     // Effet ×2
  | 'SPECIAL_SWAP'       // Effet échange
  | 'BONUS_STAR'         // Étoile bonus fin de manche
  | 'FLUX_RECHARGE_STARS' // Étoiles gagnées lors d'une Recharge (mode flux)
  | 'ROUND_END'          // Fin de manche (dernières cartes + bonus étoile)
  | 'ROUND_WINNER'       // Classement de la manche
  | 'GAME_OVER';         // Fin de partie

export interface GameEvent {
  id: number;            // Identifiant séquentiel
  kind: GameEventKind;
  timestamp: number;     // Date.now()
  round: number;
  trick: number;
  // Champs optionnels selon le type
  playerId?: string;
  pseudo?: string;
  color?: PlayerColor;
  cardValue?: number;
  scoreCard?: ScoreCard;
  cancelledValues?: number[];
  discarded?: boolean;
  winnerId?: string;
  winnerPseudo?: string;
  winnerColor?: PlayerColor;
  allCards?: Array<{ playerId: string; pseudo: string; color: PlayerColor; value: number; cancelled: boolean }>;
  swapPlayerA?: string;
  swapPlayerB?: string;
  stolenFromPseudo?: string;
  stolenCard?: ScoreCard;
  bonusWinners?: Array<{ pseudo: string; color: PlayerColor; cardValue: number; hasBonus?: boolean }>;
  roundScores?: Array<{ pseudo: string; color: PlayerColor; scoreFromCards: number; stars: number; total: number }>;
  doubledValue?: number;
  previousValue?: number;
  message?: string;
  // Champs spécifiques mode flux — étoiles Recharge
  rechargeStarWinners?: Array<{ pseudo: string; color: PlayerColor; cardValue: number }>;
  rechargedPlayers?: Array<{ pseudo: string; color: PlayerColor }>;
}

// ----------------------------
// Résumés
// ----------------------------
export interface TrickSummary {
  playedCards: Record<string, number>; // joueur_id → valeur jouée (0 = Recharge)
  cancelledValues: number[];
  winnerId: string | null;
  scoreCard: ScoreCard;
  discarded: boolean;
  specialEffect: SpecialEffect;
  doubleAppliedTo: string | null;
  swapBetween: [string, string] | null;
  stolenFrom: string | null;
  bonusStarsAwarded: number;
  // Champs spécifiques mode flux
  rechargedPlayerIds: string[];
  rechargeStarWinners: string[];  // joueurs ayant gagné des étoiles (carte valeur unique)
  rechargeStarCount: number;      // nb d'étoiles gagnées par chaque gagnant (= nb de rechargeurs)
}

export interface RoundEndSummary {
  lastCards: Record<string, number>;   // joueur_id → dernière carte
  bonusStarWinners: string[];          // IDs des joueurs ayant une valeur unique
  scores: Record<string, number>;      // joueur_id → score total actuel
  stars: Record<string, number>;       // joueur_id → étoiles totales
}

export interface FinalScore {
  playerId: string;
  pseudo: string;
  color: PlayerColor;
  scoreFromCards: number;
  stars: number;            // Étoiles cartes Score (pour la majorité)
  rechargeStars: number;    // Étoiles Recharge (+1 pt chacune + pour la majorité)
  totalStars: number;       // stars + rechargeStars (pour déterminer le majoritaire)
  starBonus: number;        // +5 pts pour le joueur majoritaire en étoiles
  totalScore: number;       // scoreFromCards + rechargeStars + starBonus
  rank: number;
}

// ----------------------------
// Options de partie
// ----------------------------
export interface GameOptions {
  /** Si true : cartes vertes (positives) gagnées par la plus grande valeur sans doublon,
   *            cartes rouges (négatives) gagnées par la plus petite valeur sans doublon. */
  colorRule: boolean;
}

export const DEFAULT_GAME_OPTIONS: GameOptions = {
  colorRule: true,
};

// ----------------------------
// Bots
// ----------------------------
export type BotProfile = 'LOGIQUE' | 'KAMIKAZE' | 'HASARD' | 'PRUDENT' | 'SABOTEUR';

// Informations statiques d'un profil de bot (sans id de salle)
export interface BotSlotInfo {
  profile: BotProfile;
  name: string;        // Nom du bot (ex: ARIA, BLITZ…)
  emoji: string;       // Emoji du bot
  description: string; // Description courte
}

// Vue publique d'un bot dans une salle (avec id unique)
export interface BotSlot extends BotSlotInfo {
  id: string;          // Identifiant unique du bot dans la salle
}

export const BOT_PROFILES_INFO: Record<BotProfile, BotSlotInfo> = {
  LOGIQUE: { profile: 'LOGIQUE', name: 'ARIA', emoji: '🤖', description: 'Joue de façon calculée. Évite les doublons et vise les meilleures cartes Score.' },
  KAMIKAZE: { profile: 'KAMIKAZE', name: 'BLITZ', emoji: '💥', description: 'Fonce tête baissée ! Joue toujours sa carte la plus haute, quoi qu\'il arrive.' },
  HASARD: { profile: 'HASARD', name: 'DINGO', emoji: '🎲', description: 'Complètement imprévisible. Joue n\'importe quelle carte au hasard.' },
  PRUDENT: { profile: 'PRUDENT', name: 'FELIX', emoji: '🐢', description: 'Joue toujours sa carte la plus basse. Préfère ne pas gagner plutôt que de perdre.' },
  SABOTEUR: { profile: 'SABOTEUR', name: 'LOKI', emoji: '😈', description: 'Cherche à annuler les cartes des autres en jouant les mêmes valeurs.' },
};

// ----------------------------
// Salle
// ----------------------------
export type RoomStatus = 'waiting' | 'playing' | 'finished';

export interface PublicRoom {
  id: string;
  hostId: string;
  players: PublicPlayer[];
  bots: BotSlot[];
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  isSoloMode: boolean;
  gameOptions: GameOptions;
  gameMode: GameMode;
}

// ----------------------------
// Événements WebSocket — Client → Serveur
// ----------------------------
export interface ClientEvents {
  create_room: (payload: { pseudo: string; gameOptions?: GameOptions; gameMode?: GameMode }, callback: (res: { roomCode: string; playerId: string } | { error: string }) => void) => void;
  create_solo_room: (payload: { pseudo: string; bots: BotProfile[]; gameOptions?: GameOptions; gameMode?: GameMode }, callback: (res: { roomCode: string; playerId: string } | { error: string }) => void) => void;
  join_room: (payload: { roomCode: string; pseudo: string }, callback: (res: { playerId: string; gameMode: GameMode } | { error: string }) => void) => void;
  rejoin_room: (payload: { roomCode: string; oldPlayerId: string }, callback: (res: { ok: boolean; playerId: string; gameMode: GameMode } | { error: string }) => void) => void;
  player_ready: (callback: (res: { ok: boolean } | { error: string }) => void) => void;
  start_game: (payload: { gameOptions?: GameOptions }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  yumi_shout: (payload: { clientTimestamp: number }) => void;
  play_card: (payload: { cardValue: number }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  swap_target: (payload: { targetPlayerId: string }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  steal_target: (payload: { targetPlayerId: string }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  swap_choose_players: (payload: { playerAId: string; playerBId: string }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  next_phase: () => void;
  add_bot: (payload: { profile: BotProfile }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  remove_bot: (payload: { botId: string }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
}

// ----------------------------
// Événements WebSocket — Serveur → Client
// ----------------------------
export interface ServerEvents {
  room_updated: (room: PublicRoom) => void;
  game_state_updated: (state: PublicGameState) => void;
  private_info: (info: PrivateInfo) => void;
  card_played: (payload: { playerId: string; isHidden: boolean }) => void;
  reveal: (payload: { playedCards: Record<string, number> }) => void;
  trick_resolved: (summary: TrickSummary) => void;
  special_effect: (payload: { effect: SpecialEffect; winnerId: string }) => void;
  swap_request: (payload: { eligibleTargets: PublicPlayer[] }) => void;
  round_end: (summary: RoundEndSummary) => void;
  game_over: (payload: { finalScores: FinalScore[]; winnerId: string }) => void;
  error: (payload: { message: string }) => void;
}

// ----------------------------
// Configuration du jeu selon le nombre de joueurs
// ----------------------------
export interface GameConfig {
  playerCount: number;
  maxCardValue: number;       // = playerCount + 2
  scoreCardsPerRound: number; // = playerCount
  totalRounds: number;
  scoreCardsUsed: number;
  scoreCardsDiscarded: number;
}

export const GAME_CONFIGS: Record<number, GameConfig> = {
  3: { playerCount: 3, maxCardValue: 5, scoreCardsPerRound: 3, totalRounds: 9, scoreCardsUsed: 27, scoreCardsDiscarded: 3 },
  4: { playerCount: 4, maxCardValue: 6, scoreCardsPerRound: 4, totalRounds: 7, scoreCardsUsed: 28, scoreCardsDiscarded: 2 },
  5: { playerCount: 5, maxCardValue: 7, scoreCardsPerRound: 5, totalRounds: 6, scoreCardsUsed: 30, scoreCardsDiscarded: 0 },
  6: { playerCount: 6, maxCardValue: 8, scoreCardsPerRound: 6, totalRounds: 5, scoreCardsUsed: 30, scoreCardsDiscarded: 0 },
};
