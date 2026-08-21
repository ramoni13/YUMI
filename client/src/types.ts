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
  stars: number;            // Nombre de jetons étoile
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
  stars: number;
  isReady: boolean;
  isConnected: boolean;
  hasPlayedCard: boolean;   // A-t-il joué sa carte cette mène ?
}

// ----------------------------
// Phases de jeu
// ----------------------------
export type GamePhase =
  | 'LOBBY'
  | 'SETUP'
  | 'ROUND_START'
  | 'MEMORIZATION'
  | 'TRICK_START'
  | 'CARD_SELECTION'
  | 'REVEAL'
  | 'RESOLUTION'
  | 'SPECIAL_EFFECT'
  | 'TRICK_END'
  | 'ROUND_END'
  | 'BONUS_STAR'
  | 'GAME_OVER';

// ----------------------------
// État du jeu (version publique envoyée aux clients)
// ----------------------------
export interface PublicGameState {
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  currentTrick: number;
  totalTricks: number;          // = nombre de joueurs
  scoreColumn: (ScoreCard | null)[]; // null = face cachée
  currentScoreCard: ScoreCard | null;
  scoreDeckCount: number;       // Nombre de cartes Score restantes
  players: PublicPlayer[];      // Tous les joueurs (vue publique)
  trickWinnerId: string | null;
  cancelledValues: number[];
  scoreCardDiscarded: boolean;
  memorizeTimer: number | null; // Secondes restantes (ou null)
  swapRequestPlayerId: string | null; // Joueur qui doit choisir les 2 joueurs à échanger
  swapEligibleTargets: string[];      // IDs des joueurs éligibles (SWAP et STEAL)
  swapChosenA: string | null;         // 1er joueur déjà choisi pour le SWAP
  stealRequestPlayerId: string | null; // Joueur qui doit choisir la cible du VOL
  stealEligibleTargets: string[];      // IDs des adversaires éligibles pour le VOL
  lastTrickSummary: TrickSummary | null;
  roundEndSummary: RoundEndSummary | null;
  finalScores: FinalScore[] | null;
  gameOptions: GameOptions;     // Options de la partie
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
  swapPlayerA?: string;  // pseudo joueur A de l'échange
  swapPlayerB?: string;  // pseudo joueur B de l'échange
  stolenFromPseudo?: string;  // pseudo de la victime du VOL
  stolenCard?: ScoreCard;     // carte volée
  bonusWinners?: Array<{ pseudo: string; color: PlayerColor; cardValue: number; hasBonus?: boolean }>;
  roundScores?: Array<{ pseudo: string; color: PlayerColor; scoreFromCards: number; stars: number; total: number }>;
  doubledValue?: number; // valeur après ×2
  previousValue?: number;
  message?: string;      // Message libre
}

// ----------------------------
// Résumés
// ----------------------------
export interface TrickSummary {
  playedCards: Record<string, number>; // joueur_id → valeur jouée
  cancelledValues: number[];
  winnerId: string | null;
  scoreCard: ScoreCard;
  discarded: boolean;
  specialEffect: SpecialEffect;
  doubleAppliedTo: string | null;       // joueur_id dont la carte a été doublée
  swapBetween: [string, string] | null; // [joueur_id_A, joueur_id_B] échangés
  stolenFrom: string | null;            // joueur_id victime du VOL
  bonusStarsAwarded: number;            // étoiles bonus données au gagnant (cartes -1/-2)
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
  stars: number;
  starBonus: number;    // +5 pts pour le joueur avec le plus d'étoiles (0 sinon)
  totalScore: number;
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

export interface BotSlot {
  profile: BotProfile;
  name: string;        // Nom du bot (ex: ARIA, BLITZ…)
  emoji: string;       // Emoji du bot
  description: string; // Description courte
}

export const BOT_PROFILES_INFO: Record<BotProfile, BotSlot> = {
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
  bots: BotSlot[];     // Bots configurés dans la salle
  status: RoomStatus;
  playerCount: number;
  maxPlayers: number;
  isSoloMode: boolean; // true = partie solo contre des bots
  gameOptions: GameOptions;
}

// ----------------------------
// Événements WebSocket — Client → Serveur
// ----------------------------
export interface ClientEvents {
  create_room: (payload: { pseudo: string; gameOptions?: GameOptions }, callback: (res: { roomCode: string; playerId: string } | { error: string }) => void) => void;
  create_solo_room: (payload: { pseudo: string; bots: BotProfile[]; gameOptions?: GameOptions }, callback: (res: { roomCode: string; playerId: string } | { error: string }) => void) => void;
  join_room: (payload: { roomCode: string; pseudo: string }, callback: (res: { playerId: string } | { error: string }) => void) => void;
  player_ready: (callback: (res: { ok: boolean } | { error: string }) => void) => void;
  start_game: (payload: { gameOptions?: GameOptions }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  yumi_shout: (payload: { clientTimestamp: number }) => void;
  play_card: (payload: { cardValue: number }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  swap_target: (payload: { targetPlayerId: string }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  steal_target: (payload: { targetPlayerId: string }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  swap_choose_players: (payload: { playerAId: string; playerBId: string }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  next_phase: () => void;
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
