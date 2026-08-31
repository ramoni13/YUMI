import {
  Player,
  PublicGameState,
  PublicPlayer,
  GamePhase,
  ScoreCard,
  TrickSummary,
  RoundEndSummary,
  FinalScore,
  GameOptions,
  DEFAULT_GAME_OPTIONS,
  GAME_CONFIGS,
  PLAYER_COLORS,
  PlayerColor,
} from '../types';

import {
  buildPlayerHand,
  drawMysteryCard,
  drawScoreCards,
  prepareScoreDeck,
  shuffle,
} from './deck';

import { resolveTrick } from './resolver';
import {
  applyDouble,
  applySwap,
  canApplyDouble,
  computeBonusStars,
  computeFinalScores,
} from './scoring';

// ============================================================
// État interne complet du jeu (côté serveur)
// ============================================================
export interface InternalGameState {
  phase: GamePhase;
  currentRound: number;
  totalRounds: number;
  currentTrick: number;
  scoreDeck: ScoreCard[];
  scoreColumn: ScoreCard[];          // Cartes Score de la manche (ordonnées)
  scoreColumnRevealed: boolean[];    // true = face visible
  currentScoreCard: ScoreCard | null;
  players: Player[];
  playedCards: Record<string, number | null>;
  mysteryCards: Record<string, number>;      // joueur_id (voisin de droite) → valeur de la carte vue
  mysteryCardOwners: Record<string, string>;  // joueur_id (voisin de droite) → pseudo du joueur pioché
  missingCards: Record<string, number>;       // joueur_id (pioché) → valeur de la carte manquante
  trickWinnerId: string | null;
  cancelledValues: number[];
  scoreCardDiscarded: boolean;
  memorizeTimer: number | null;
  // SWAP : le gagnant choisit 2 joueurs dont on échange les cartes du sommet
  swapRequestPlayerId: string | null;   // joueur qui doit choisir (gagnant du pli)
  swapEligibleTargets: string[];        // joueurs ayant une carte score (pour SWAP et STEAL)
  swapChosenA: string | null;           // 1er joueur choisi pour le SWAP
  // STEAL : le gagnant choisit 1 adversaire dont il vole la carte du sommet
  stealRequestPlayerId: string | null;  // joueur qui doit choisir la cible du VOL
  stealEligibleTargets: string[];       // adversaires ayant au moins 1 carte score
  lastTrickSummary: TrickSummary | null;
  roundEndSummary: RoundEndSummary | null;
  finalScores: FinalScore[] | null;
  swapTimeout: ReturnType<typeof setTimeout> | null;
  memorizeInterval: ReturnType<typeof setInterval> | null;
  gameOptions: GameOptions;
}

// ============================================================
// Initialisation d'une nouvelle partie
// ============================================================
export function initGame(
  players: { id: string; pseudo: string }[],
  onStateChange: (state: InternalGameState) => void,
  gameOptions: GameOptions = DEFAULT_GAME_OPTIONS
): InternalGameState {
  const playerCount = players.length;
  const config = GAME_CONFIGS[playerCount];
  if (!config) throw new Error(`Nombre de joueurs invalide : ${playerCount}`);

  const colors = shuffle([...PLAYER_COLORS]).slice(0, playerCount) as PlayerColor[];

  const gamePlayers: Player[] = players.map((p, i) => ({
    id: p.id,
    pseudo: p.pseudo,
    color: colors[i],
    hand: buildPlayerHand(playerCount),
    playedHistory: [],
    scorePile: [],
    stars: 0,
    bonusPoints: 0,
    deferred: { forcedRecharge: false, forcedCard: null, lockedHighCard: false, lockedLowCard: false, mustPlayMysteryCard: false },
    isReady: true,
    isConnected: true,
  }));

  const scoreDeck = prepareScoreDeck(playerCount);

  const state: InternalGameState = {
    phase: 'SETUP',
    currentRound: 0,
    totalRounds: config.totalRounds,
    currentTrick: 0,
    scoreDeck,
    scoreColumn: [],
    scoreColumnRevealed: [],
    currentScoreCard: null,
    players: gamePlayers,
    playedCards: {},
    mysteryCards: {},
    mysteryCardOwners: {},
    missingCards: {},
    trickWinnerId: null,
    cancelledValues: [],
    scoreCardDiscarded: false,
    memorizeTimer: null,
    swapRequestPlayerId: null,
    swapEligibleTargets: [],
    swapChosenA: null,
    stealRequestPlayerId: null,
    stealEligibleTargets: [],
    lastTrickSummary: null,
    roundEndSummary: null,
    finalScores: null,
    swapTimeout: null,
    memorizeInterval: null,
    gameOptions,
  };

  return state;
}

// ============================================================
// Début d'une manche
// ============================================================
export function startRound(
  state: InternalGameState,
  onStateChange: (state: InternalGameState) => void
): InternalGameState {
  const playerCount = state.players.length;
  const config = GAME_CONFIGS[playerCount];

  state.currentRound += 1;
  state.currentTrick = 0;
  state.lastTrickSummary = null;
  state.roundEndSummary = null;

  // 1. Reconstruire les mains (les joueurs gardent leur scorePile d'une manche à l'autre)
  //    puis piocher la carte mystère
  state.mysteryCards = {};
  state.mysteryCardOwners = {};
  state.missingCards = {};

  // Reconstruire toutes les mains d'abord (sans piocher)
  for (const player of state.players) {
    player.hand = buildPlayerHand(playerCount);
  }

  // Puis piocher les cartes mystères
  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];
    const rightNeighborIndex = (i + 1) % state.players.length;
    const rightNeighbor = state.players[rightNeighborIndex];

    const { newHand, mysteryCard } = drawMysteryCard(player.hand);
    player.hand = newHand;

    // Le voisin de droite (rightNeighbor) a vu la carte mystère du joueur i
    // On stocke directement la valeur ET le pseudo du propriétaire
    state.mysteryCards[rightNeighbor.id] = mysteryCard;
    state.mysteryCardOwners[rightNeighbor.id] = player.pseudo; // pseudo du joueur pioché
    // Le joueur i sait quelle carte lui manque
    state.missingCards[player.id] = mysteryCard;
  }

  // 2. Piocher les cartes Score de la manche — toutes visibles dès le départ
  state.scoreColumn = drawScoreCards(state.scoreDeck, config.scoreCardsPerRound);
  state.scoreColumnRevealed = new Array(state.scoreColumn.length).fill(true);

  // Pas de phase de mémorisation : on passe directement à TRICK_START
  state.memorizeTimer = null;
  state.phase = 'TRICK_START';

  return state;
}

// ============================================================
// Début d'une mène
// ============================================================
export function startTrick(state: InternalGameState): InternalGameState {
  state.currentTrick += 1;
  state.playedCards = {};
  state.trickWinnerId = null;
  state.cancelledValues = [];
  state.scoreCardDiscarded = false;
  state.lastTrickSummary = null;
  state.swapRequestPlayerId = null;
  state.swapEligibleTargets = [];
  state.swapChosenA = null;
  state.stealRequestPlayerId = null;
  state.stealEligibleTargets = [];

  // Pointer la carte Score active (toutes sont déjà visibles)
  const trickIndex = state.currentTrick - 1;
  state.currentScoreCard = state.scoreColumn[trickIndex];

  state.phase = 'CARD_SELECTION';
  return state;
}

// ============================================================
// Jouer une carte
// ============================================================
export function playCard(
  state: InternalGameState,
  playerId: string,
  cardValue: number
): { ok: boolean; error?: string; state: InternalGameState } {
  if (state.phase !== 'CARD_SELECTION') {
    return { ok: false, error: 'Phase incorrecte', state };
  }

  const player = state.players.find(p => p.id === playerId);
  if (!player) return { ok: false, error: 'Joueur introuvable', state };
  if (!player.hand.includes(cardValue)) {
    return { ok: false, error: 'Carte non disponible', state };
  }
  if (state.playedCards[playerId] !== undefined) {
    return { ok: false, error: 'Carte déjà jouée', state };
  }

  // Retirer la carte de la main
  player.hand = player.hand.filter(c => c !== cardValue);
  state.playedCards[playerId] = cardValue;

  // Vérifier si tous les joueurs ont joué
  const allPlayed = state.players.every(
    p => state.playedCards[p.id] !== undefined
  );
  if (allPlayed) {
    state.phase = 'REVEAL';
  }

  return { ok: true, state };
}

// ============================================================
// Résolution du pli
// ============================================================
export function resolveTrickPhase(
  state: InternalGameState
): InternalGameState {
  const played = state.playedCards as Record<string, number>;
  const result = resolveTrick(played, state.gameOptions, state.currentScoreCard?.gain);

  state.trickWinnerId = result.winnerId;
  state.cancelledValues = result.cancelledValues;
  state.scoreCardDiscarded = result.discarded;

  const scoreCard = state.currentScoreCard!;

  // Résumé de base (complété plus bas)
  state.lastTrickSummary = {
    playedCards: played,
    cancelledValues: result.cancelledValues,
    winnerId: result.winnerId,
    scoreCard,
    discarded: result.discarded,
    specialEffect: scoreCard.specialEffect,
    doubleAppliedTo: null,
    swapBetween: null,
    stolenFrom: null,
    bonusStarsAwarded: 0,
    bonusPointsAwarded: 0,
    eclipseGivenTo: null,
    piocheTargetId: null,
    piocheCardValue: null,
    surchargeTargetId: null,
    verrouTargetId: null,
    taxeTargetId: null,
    revelationTargetId: null,
    revelationCardValue: null,
    mysteryCardsPlayed: null,
    rechargedPlayerIds: [],
    bonusPointWinners: [],
    bonusPointCount: 0,
  };

  if (result.winnerId && !result.discarded) {
    const winner = state.players.find(p => p.id === result.winnerId)!;

    // Étoiles bonus immédiates (cartes -1 et -2)
    if (scoreCard.bonusStars > 0) {
      winner.stars += scoreCard.bonusStars;
      if (state.lastTrickSummary) {
        state.lastTrickSummary.bonusStarsAwarded = scoreCard.bonusStars;
      }
    }

    if (scoreCard.specialEffect === 'DOUBLE') {
      // La carte ×2 est défaussée (ne va pas dans la pile)
      // On applique le doublement sur la dernière carte numérique de la pile
      if (canApplyDouble(winner.scorePile)) {
        winner.scorePile = applyDouble(winner.scorePile);
      }
      winner.scorePile.push({ ...scoreCard }); // la carte X2 reste dans la pile
      state.phase = 'TRICK_END';

    } else if (scoreCard.specialEffect === 'STEAL') {
      // La carte VOL va TOUJOURS dans la pile du gagnant, effet applicable ou non
      winner.scorePile.push({ ...scoreCard });
      const eligible = state.players.filter(
        p => p.id !== result.winnerId && p.scorePile.length > 0
      );
      if (eligible.length > 0) {
        state.stealRequestPlayerId = result.winnerId;
        state.stealEligibleTargets = eligible.map(p => p.id);
        state.phase = 'SPECIAL_EFFECT';
      } else {
        state.phase = 'TRICK_END'; // Personne à voler, mais la carte est dans la pile
      }

    } else if (scoreCard.specialEffect === 'SWAP') {
      // La carte SWAP va TOUJOURS dans la pile du gagnant, effet applicable ou non
      winner.scorePile.push({ ...scoreCard });
      const eligible = state.players.filter(p => p.scorePile.length > 0);
      if (eligible.length >= 2) {
        state.swapRequestPlayerId = result.winnerId;
        state.swapEligibleTargets = eligible.map(p => p.id);
        state.swapChosenA = null;
        state.phase = 'SPECIAL_EFFECT';
      } else {
        state.phase = 'TRICK_END'; // Pas assez de joueurs avec des cartes, mais la carte est dans la pile
      }

    } else {
      // Carte numérique normale : va dans la pile
      winner.scorePile.push({ ...scoreCard });
      state.phase = 'TRICK_END';
    }
  } else {
    // Carte défaussée
    state.phase = 'TRICK_END';
  }

  return state;
}

// ============================================================
// Résolution du VOL (STEAL)
// Le gagnant vole la carte du sommet d'un adversaire
// ============================================================
export function resolveSteal(
  state: InternalGameState,
  targetPlayerId: string
): { ok: boolean; error?: string; state: InternalGameState } {
  if (state.phase !== 'SPECIAL_EFFECT' || !state.stealRequestPlayerId) {
    return { ok: false, error: 'Phase incorrecte', state };
  }
  if (!state.stealEligibleTargets.includes(targetPlayerId)) {
    return { ok: false, error: 'Cible non éligible', state };
  }

  const thief = state.players.find(p => p.id === state.stealRequestPlayerId)!;
  const victim = state.players.find(p => p.id === targetPlayerId)!;

  if (victim.scorePile.length === 0) {
    return { ok: false, error: 'Cet adversaire n\'a pas de carte Score', state };
  }

  // Voler la carte du sommet de la pile de la victime
  const stolenCard = victim.scorePile[victim.scorePile.length - 1];
  victim.scorePile = victim.scorePile.slice(0, -1);
  thief.scorePile.push({ ...stolenCard });
  // Note : la carte VOL elle-même a déjà été ajoutée à la pile du gagnant
  // dans resolveTrickPhase (avant l'appel à resolveSteal).

  if (state.lastTrickSummary) {
    state.lastTrickSummary.stolenFrom = victim.id;
  }

  state.stealRequestPlayerId = null;
  state.stealEligibleTargets = [];
  state.phase = 'TRICK_END';

  return { ok: true, state };
}

// ============================================================
// Résolution de l'échange (SWAP)
// Le gagnant choisit 2 joueurs (peut être lui-même) et échange
// leurs cartes du sommet. Se fait en 2 étapes :
//   1. resolveSwapChooseA : choisir le joueur A
//   2. resolveSwapChooseB : choisir le joueur B → exécute l'échange
// ============================================================
export function resolveSwapChooseA(
  state: InternalGameState,
  playerAId: string
): { ok: boolean; error?: string; state: InternalGameState } {
  if (state.phase !== 'SPECIAL_EFFECT' || !state.swapRequestPlayerId) {
    return { ok: false, error: 'Phase incorrecte', state };
  }
  if (!state.swapEligibleTargets.includes(playerAId)) {
    return { ok: false, error: 'Joueur A non éligible', state };
  }
  state.swapChosenA = playerAId;
  return { ok: true, state };
}

export function resolveSwapChooseB(
  state: InternalGameState,
  playerBId: string
): { ok: boolean; error?: string; state: InternalGameState } {
  if (state.phase !== 'SPECIAL_EFFECT' || !state.swapRequestPlayerId || !state.swapChosenA) {
    return { ok: false, error: 'Phase incorrecte', state };
  }
  if (!state.swapEligibleTargets.includes(playerBId)) {
    return { ok: false, error: 'Joueur B non éligible', state };
  }
  if (state.swapChosenA === playerBId) {
    return { ok: false, error: 'Choisissez deux joueurs différents', state };
  }

  const playerA = state.players.find(p => p.id === state.swapChosenA)!;
  const playerB = state.players.find(p => p.id === playerBId)!;

  const { newPileA, newPileB } = applySwap(playerA.scorePile, playerB.scorePile);
  playerA.scorePile = newPileA;
  playerB.scorePile = newPileB;

  if (state.lastTrickSummary) {
    state.lastTrickSummary.swapBetween = [playerA.id, playerB.id];
  }

  state.swapRequestPlayerId = null;
  state.swapEligibleTargets = [];
  state.swapChosenA = null;
  state.phase = 'TRICK_END';

  return { ok: true, state };
}

// ============================================================
// Fin de mène → préparer la suivante ou fin de manche
// ============================================================
export function endTrick(state: InternalGameState): InternalGameState {
  const config = GAME_CONFIGS[state.players.length];

  if (state.currentTrick < config.scoreCardsPerRound) {
    // Mène suivante
    state.phase = 'TRICK_START';
  } else {
    // Fin de manche → bonus étoile
    state.phase = 'ROUND_END';
  }

  return state;
}

// ============================================================
// Fin de manche — bonus étoile
// ============================================================
export function endRound(state: InternalGameState): InternalGameState {
  // Révéler les dernières cartes
  const lastCards: Record<string, number> = {};
  for (const player of state.players) {
    // La dernière carte en main (il en reste 1 après la manche)
    if (player.hand.length > 0) {
      lastCards[player.id] = player.hand[0];
    }
  }

  const bonusWinners = computeBonusStars(lastCards);
  for (const playerId of bonusWinners) {
    const player = state.players.find(p => p.id === playerId);
    if (player) player.stars += 1;
  }

  // Les mains seront reconstruites au début de la prochaine manche (startRound)
  // Les scorePiles sont conservées d'une manche à l'autre

  // Score intermédiaire (cartes Score uniquement, sans étoiles — pour affichage)
  const scores: Record<string, number> = {};
  const stars: Record<string, number> = {};
  for (const player of state.players) {
    scores[player.id] = player.scorePile.reduce(
      (t, c) => t + (c.specialEffect ? 0 : c.value),
      0
    );
    stars[player.id] = player.stars;
  }

  state.roundEndSummary = {
    lastCards,
    bonusStarWinners: bonusWinners,
    scores,
    stars,
  };

  state.phase = 'BONUS_STAR';
  return state;
}

// ============================================================
// Passer à la manche suivante ou fin de partie
// ============================================================
export function nextRoundOrGameOver(
  state: InternalGameState
): InternalGameState {
  if (state.currentRound >= state.totalRounds) {
    // Fin de partie
    state.finalScores = computeFinalScores(state.players);
    state.phase = 'GAME_OVER';
  } else {
    state.phase = 'ROUND_START';
  }
  return state;
}

// ============================================================
// Sérialisation vers la vue publique (filtrée)
// ============================================================
export function toPublicState(state: InternalGameState): PublicGameState {
  const config = GAME_CONFIGS[state.players.length];

  const publicPlayers: PublicPlayer[] = state.players.map(p => ({
    id: p.id,
    pseudo: p.pseudo,
    color: p.color,
    handCount: p.hand.length,
    playedHistory: p.playedHistory,
    topScoreCard: p.scorePile.length > 0 ? p.scorePile[p.scorePile.length - 1] : null,
    scorePileCount: p.scorePile.length,
    stars: p.stars,
    bonusPoints: p.bonusPoints,
    deferred: p.deferred,
    isReady: p.isReady,
    isConnected: p.isConnected,
    hasPlayedCard: state.playedCards[p.id] !== undefined,
  }));

  // Colonne Score : masquer les cartes face cachée
  const scoreColumn = state.scoreColumn.map((card, i) =>
    state.scoreColumnRevealed[i] ? card : null
  );

  return {
    phase: state.phase,
    gameMode: 'classic',
    currentRound: state.currentRound,
    totalRounds: state.totalRounds,
    currentTrick: state.currentTrick,
    totalTricks: config?.scoreCardsPerRound ?? 0,
    scoreColumn,
    currentScoreCard: state.currentScoreCard,
    scoreDeckCount: state.scoreDeck.length,
    players: publicPlayers,
    trickWinnerId: state.trickWinnerId,
    cancelledValues: state.cancelledValues,
    scoreCardDiscarded: state.scoreCardDiscarded,
    memorizeTimer: state.memorizeTimer,
    swapRequestPlayerId: state.swapRequestPlayerId,
    swapEligibleTargets: state.swapEligibleTargets,
    swapChosenA: state.swapChosenA,
    stealRequestPlayerId: state.stealRequestPlayerId,
    stealEligibleTargets: state.stealEligibleTargets,
    lastTrickSummary: state.lastTrickSummary,
    roundEndSummary: state.roundEndSummary,
    finalScores: state.finalScores,
    gameOptions: state.gameOptions,
    rechargedPlayerIds: [],
    bonusPointWinners: [],
    eclipseRequestPlayerId: null,
    eclipseEligibleTargets: [],
    piocheRequestPlayerId: null,
    piocheEligibleTargets: [],
    surchargeRequestPlayerId: null,
    surchargeEligibleTargets: [],
    verrouRequestPlayerId: null,
    verrouEligibleTargets: [],
    revelationRequestPlayerId: null,
    revelationEligibleTargets: [],
    taxeRequestPlayerId: null,
    taxeEligibleTargets: [],
    nextTrickInverted: false,
    mysteryTrickActive: false,
    revealedUpcoming: [],
  };
}
