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

/**
 * GainType : condition de victoire du pli, INDÉPENDANTE de la valeur.
 * '+' (vert)  → la plus GRANDE valeur sans doublon gagne.
 * '-' (rouge) → la plus PETITE valeur sans doublon gagne.
 */
export type GainType = '+' | '-';

export type SpecialEffect =
  | 'DOUBLE'
  | 'STEAL'
  | 'SWAP'
  | 'PIOCHE'
  | 'VERROU'
  | 'REVELATION'
  | 'MYSTERE'
  | 'SURCHARGE'
  | 'INVERSION'
  | 'CONSTELLATION'
  | 'ECLIPSE'
  | 'JACKPOT'
  | 'TAXE'
  | 'ORACLE'
  | 'DEVOILEMENT'
  | null;

export interface ScoreCard {
  id: number;             // 1 à 48
  value: number;          // Valeur score cumulée en fin de partie
  gain: GainType;         // '+' = vert (plus grande gagne) | '-' = rouge (plus petite gagne)
  specialEffect: SpecialEffect;
  displayName: string;    // Nom affiché : "+5", "-3", "VOL", "MYSTÈRE"…
  appliedDouble: boolean;
  bonusPoints: number;    // Points Bonus remportés immédiatement
  bonusStars: number;     // Étoiles remportées immédiatement
}

// ----------------------------
// Effets différés (s'appliquent à la mène suivante)
// ----------------------------
export interface DeferredEffects {
  forcedRecharge: boolean;
  forcedCard: number | null;
  lockedHighCard: boolean;
  lockedLowCard: boolean;
  mustPlayMysteryCard: boolean;
}

export function emptyDeferredEffects(): DeferredEffects {
  return { forcedRecharge: false, forcedCard: null, lockedHighCard: false, lockedLowCard: false, mustPlayMysteryCard: false };
}

// ----------------------------
// Joueur
// ----------------------------
export interface Player {
  id: string;
  pseudo: string;
  color: PlayerColor;
  hand: number[];
  playedHistory: number[];    // Cartes déjà jouées (visible par tous)
  scorePile: ScoreCard[];
  stars: number;
  bonusPoints: number;
  deferred: DeferredEffects;
  isReady: boolean;
  isConnected: boolean;
}

export interface PublicPlayer {
  id: string;
  pseudo: string;
  color: PlayerColor;
  handCount: number;
  playedHistory: number[];        // Cartes déjà jouées (visible par tous)
  topScoreCard: ScoreCard | null;
  scorePileCount: number;
  stars: number;
  bonusPoints: number;
  victoryPoints: number;          // Points de victoire accumulés
  deferred: DeferredEffects;
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

// Valeur réservée pour la carte YUMI (mode flux)
// En jeu elle vaut 9 (gain+) ou 0 (gain-) — résolue dans le resolver
export const YUMI_CARD_VALUE = 9;

// Bonus de majorité d'étoiles en fin de partie (ancien système, conservé pour compatibilité flux)
export const STAR_MAJORITY_BONUS = 5;

// Points de victoire nécessaires pour gagner la partie (mode classic)
export const VICTORY_POINTS_TO_WIN = 3;

// Nombre de cartes Score par manche (mode classic, fixe)
export const SCORE_CARDS_PER_ROUND_CLASSIC = 20;

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
  | 'FLUX_RECHARGE'
  | 'SPECIAL_ECLIPSE'
  | 'SPECIAL_PIOCHE'
  | 'SPECIAL_VERROU'
  | 'SPECIAL_REVELATION'
  | 'SPECIAL_TAXE'
  | 'SPECIAL_ORACLE'
  | 'SPECIAL_DEVOILEMENT';

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
  // Effets spéciaux flux
  eclipseRequestPlayerId: string | null;
  eclipseEligibleTargets: string[];
  piocheRequestPlayerId: string | null;
  piocheEligibleTargets: string[];
  surchargeRequestPlayerId: string | null;
  surchargeEligibleTargets: string[];
  verrouRequestPlayerId: string | null;
  verrouEligibleTargets: string[];
  revelationRequestPlayerId: string | null;
  revelationEligibleTargets: string[];
  taxeRequestPlayerId: string | null;
  taxeEligibleTargets: string[];
  // État global différé
  nextTrickInverted: boolean;
  mysteryTrickActive: boolean;
  revealedUpcoming: ScoreCard[];
  lastTrickSummary: TrickSummary | null;
  roundEndSummary: RoundEndSummary | null;
  finalScores: FinalScore[] | null;
  gameOptions: GameOptions;
  // Champs spécifiques mode flux
  rechargedPlayerIds: string[];
  bonusPointWinners: string[];
}

// ----------------------------
// Informations privées (envoyées uniquement au joueur concerné)
// ----------------------------
export interface PrivateInfo {
  hand: number[];
  mysteryCard?: number;
  mysteryCardOwner?: string;
  missingCardValue?: number;
  oracleCards?: ScoreCard[];    // Cartes vues par ORACLE (privé)
}

// ----------------------------
// Événements de jeu (flux historique côté client)
// ----------------------------
export type GameEventKind =
  | 'ROUND_START'
  | 'TRICK_START'
  | 'CARD_PLAYED'
  | 'REVEAL'
  | 'TRICK_RESULT'
  | 'SCORE_WON'
  | 'SPECIAL_STEAL'
  | 'SPECIAL_DOUBLE'
  | 'SPECIAL_SWAP'
  | 'SPECIAL_PIOCHE'
  | 'SPECIAL_VERROU'
  | 'SPECIAL_REVELATION'
  | 'SPECIAL_MYSTERE'
  | 'SPECIAL_SURCHARGE'
  | 'SPECIAL_INVERSION'
  | 'SPECIAL_CONSTELLATION'
  | 'SPECIAL_ECLIPSE'
  | 'SPECIAL_JACKPOT'
  | 'SPECIAL_TAXE'
  | 'SPECIAL_ORACLE'
  | 'SPECIAL_DEVOILEMENT'
  | 'FLUX_RECHARGE_BONUS'
  | 'ROUND_END'
  | 'ROUND_WINNER'
  | 'GAME_OVER';

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
  roundScores?: Array<{ pseudo: string; color: PlayerColor; scoreFromCards: number; stars: number; bonusPoints: number; total: number }>;
  doubledValue?: number;
  previousValue?: number;
  message?: string;
  targetPseudo?: string;
  targetColor?: PlayerColor;
  revealedCards?: ScoreCard[];
  bonusPointWinners?: Array<{ pseudo: string; color: PlayerColor; cardValue: number }>;
  rechargedPlayers?: Array<{ pseudo: string; color: PlayerColor }>;
}

// ----------------------------
// Résumés
// ----------------------------
export interface TrickSummary {
  playedCards: Record<string, number>;
  cancelledValues: number[];
  winnerId: string | null;
  scoreCard: ScoreCard;
  discarded: boolean;
  specialEffect: SpecialEffect;
  doubleAppliedTo: string | null;
  swapBetween: [string, string] | null;
  stolenFrom: string | null;
  bonusStarsAwarded: number;
  bonusPointsAwarded: number;
  eclipseGivenTo: string | null;
  piocheTargetId: string | null;
  piocheCardValue: number | null;
  surchargeTargetId: string | null;   // SURCHARGE : joueur forcé à Recharger
  verrouTargetId: string | null;       // VERROU : joueur verrouillé
  taxeTargetId: string | null;         // TAXE : joueur taxé
  revelationTargetId: string | null;
  revelationCardValue: number | null;
  mysteryCardsPlayed: Record<string, number> | null;
  rechargedPlayerIds: string[];
  bonusPointWinners: string[];
  bonusPointCount: number;
}

export interface RoundEndSummary {
  lastCards: Record<string, number>;   // joueur_id → dernière carte
  bonusStarWinners: string[];          // IDs des joueurs ayant une valeur unique
  scores: Record<string, number>;      // joueur_id → score cartes actuel
  stars: Record<string, number>;       // joueur_id → étoiles totales
  bonusPointsMap: Record<string, number>; // joueur_id → points bonus actuels
  // Résultats des 3 catégories de points de victoire
  starsVPWinner: string | null;        // ID du gagnant du point de victoire étoiles (null si annulation)
  cardScoreVPWinner: string | null;    // ID du gagnant du point de victoire cartes
  bonusVPWinner: string | null;        // ID du gagnant du point de victoire bonus
  victoryPoints: Record<string, number>; // joueur_id → points de victoire totaux après cette manche
}

export interface FinalScore {
  playerId: string;
  pseudo: string;
  color: PlayerColor;
  scoreFromCards: number;
  bonusPoints: number;
  stars: number;
  starBonus: number;        // conservé pour compatibilité (0 en mode classic)
  totalScore: number;       // scoreFromCards + bonusPoints + starBonus (ancien système)
  victoryPoints: number;    // Points de victoire accumulés (nouveau système)
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
  name: string;
  emoji: string;
  description: string;
  id?: string;         // Identifiant unique du bot dans la salle (optionnel côté client)
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
  eclipse_target: (payload: { targetPlayerId: string }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  pioche_target: (payload: { targetPlayerId: string }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  surcharge_target: (payload: { targetPlayerId: string }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  verrou_target: (payload: { targetPlayerId: string }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  revelation_target: (payload: { targetPlayerId: string }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
  taxe_target: (payload: { targetPlayerId: string }, callback: (res: { ok: boolean } | { error: string }) => void) => void;
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
  oracle_info: (payload: { cards: ScoreCard[] }) => void;
  mystery_revealed: (payload: { targetId: string; targetPseudo: string; mysteryCard: number }) => void;
  upcoming_revealed: (payload: { cards: ScoreCard[] }) => void;
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
  // scoreCardsPerRound = 20 (fixe, nouveau système)
  // totalRounds = 0 signifie « jusqu'à 3 points de victoire » — géré dynamiquement
  3: { playerCount: 3, maxCardValue: 5, scoreCardsPerRound: 20, totalRounds: 0, scoreCardsUsed: 0, scoreCardsDiscarded: 0 },
  4: { playerCount: 4, maxCardValue: 6, scoreCardsPerRound: 20, totalRounds: 0, scoreCardsUsed: 0, scoreCardsDiscarded: 0 },
  5: { playerCount: 5, maxCardValue: 7, scoreCardsPerRound: 20, totalRounds: 0, scoreCardsUsed: 0, scoreCardsDiscarded: 0 },
  6: { playerCount: 6, maxCardValue: 8, scoreCardsPerRound: 20, totalRounds: 0, scoreCardsUsed: 0, scoreCardsDiscarded: 0 },
};
