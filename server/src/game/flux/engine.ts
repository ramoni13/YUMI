import {
  Player,
  PublicGameState,
  PublicPlayer,
  GamePhase,
  ScoreCard,
  TrickSummary,
  FinalScore,
  GameOptions,
  DEFAULT_GAME_OPTIONS,
  PLAYER_COLORS,
  PlayerColor,
  RECHARGE_CARD_VALUE,
  YUMI_CARD_VALUE,
  DeferredEffects,
  emptyDeferredEffects,
} from '../../types';

import {
  buildFullScoreDeck,
  drawMysteryCard,
  shuffle,
  prepareScoreDeck,
} from '../deck';

import { resolveTrick } from '../resolver';
import {
  applyDouble,
  applyInversion,
  canApplyDouble,
  canApplyInversion,
  computeFinalScores,
  computeRoundVictoryPoints,
  checkGameOver,
} from '../scoring';

// ============================================================
// Constantes mode flux
// ============================================================
const FLUX_MAX_CARD = 8;

// ============================================================
// État interne complet du jeu flux
// ============================================================
export interface FluxGameState {
  phase: GamePhase;
  currentTrick: number;
  scoreDeck: ScoreCard[];
  currentScoreCard: ScoreCard | null;
  players: Player[];
  playedCards: Record<string, number | null>;
  mysteryCards: Record<string, number>;       // voisin_id → valeur vue
  mysteryCardOwners: Record<string, string>;  // voisin_id → pseudo du joueur pioché
  missingCards: Record<string, number>;       // joueur_id → valeur manquante
  trickWinnerId: string | null;
  cancelledValues: number[];
  scoreCardDiscarded: boolean;
  // Effets spéciaux en attente (VOL uniquement nécessite un choix de cible)
  stealRequestPlayerId: string | null;
  stealEligibleTargets: string[];
  // Résumés
  lastTrickSummary: TrickSummary | null;
  roundEndSummary: import('../../types').RoundEndSummary | null;
  finalScores: FinalScore[] | null;
  rechargedPlayerIds: string[];
  bonusPointWinners: string[];
  swapTimeout: ReturnType<typeof setTimeout> | null;
  gameOptions: GameOptions;
}

// ============================================================
// Génère une main complète 1 à 8 + carte YUMI (mode flux)
// Utilisée à l'init et en début de nouvelle manche.
// Lors d'une Recharge, le pool est reconstruit dynamiquement
// dans applyRecharge (YUMI incluse si pas encore jouée).
// ============================================================
export function buildFluxHand(): number[] {
  const hand: number[] = [];
  for (let i = 1; i <= FLUX_MAX_CARD; i++) hand.push(i);
  hand.push(YUMI_CARD_VALUE); // carte YUMI
  return hand;
}

// ============================================================
// Initialisation d'une nouvelle partie flux
// ============================================================
export function initFluxGame(
  players: { id: string; pseudo: string }[],
  gameOptions: GameOptions = DEFAULT_GAME_OPTIONS
): FluxGameState {
  const playerCount = players.length;
  if (playerCount < 3 || playerCount > 6) {
    throw new Error(`Nombre de joueurs invalide : ${playerCount}`);
  }

  const colors = shuffle([...PLAYER_COLORS]).slice(0, playerCount) as PlayerColor[];

  const mysteryCards: Record<string, number> = {};
  const mysteryCardOwners: Record<string, string> = {};
  const missingCards: Record<string, number> = {};

  const gamePlayers: Player[] = players.map((p, i) => ({
    id: p.id,
    pseudo: p.pseudo,
    color: colors[i],
    hand: [],
    playedHistory: [],
    scorePile: [],
    stars: 0,
    bonusPoints: 0,
    victoryPoints: 0,
    deferred: emptyDeferredEffects(),
    isReady: true,
    isConnected: true,
  }));

  // Carte mystère initiale pour chaque joueur
  for (let i = 0; i < gamePlayers.length; i++) {
    const player = gamePlayers[i];
    const rightNeighborIndex = (i + 1) % gamePlayers.length;
    const rightNeighbor = gamePlayers[rightNeighborIndex];

    const { newHand, mysteryCard } = drawMysteryCard(buildFluxHand());
    player.hand = newHand;

    mysteryCards[rightNeighbor.id] = mysteryCard;
    mysteryCardOwners[rightNeighbor.id] = player.pseudo;
    missingCards[player.id] = mysteryCard;
  }

  // 20 cartes Score aléatoires pour la manche (même règle que le mode classic)
  const scoreDeck = prepareScoreDeck().slice(0, 20);

  return {
    phase: 'SETUP',
    currentTrick: 0,
    scoreDeck,
    currentScoreCard: null,
    players: gamePlayers,
    playedCards: {},
    mysteryCards,
    mysteryCardOwners,
    missingCards,
    trickWinnerId: null,
    cancelledValues: [],
    scoreCardDiscarded: false,
    stealRequestPlayerId: null,
    stealEligibleTargets: [],
    lastTrickSummary: null,
    roundEndSummary: null,
    finalScores: null,
    rechargedPlayerIds: [],
    bonusPointWinners: [],
    swapTimeout: null,
    gameOptions,
  };
}

// ============================================================
// Fin de manche flux — calcul des PV (appelé quand le deck est vide)
// ============================================================
export function endFluxRound(state: FluxGameState): FluxGameState {
  // Attribution des points de victoire (3 catégories)
  const { starsVPWinner, cardScoreVPWinner, bonusVPWinner } =
    computeRoundVictoryPoints(state.players);

  if (starsVPWinner) {
    const p = state.players.find(pl => pl.id === starsVPWinner);
    if (p) p.victoryPoints += 1;
  }
  if (cardScoreVPWinner) {
    const p = state.players.find(pl => pl.id === cardScoreVPWinner);
    if (p) p.victoryPoints += 1;
  }
  if (bonusVPWinner) {
    const p = state.players.find(pl => pl.id === bonusVPWinner);
    if (p) p.victoryPoints += 1;
  }

  // Snapshot pour l'affichage
  const scores: import('../../types').RoundEndSummary['scores'] = {};
  const stars: import('../../types').RoundEndSummary['stars'] = {};
  const bonusPointsMap: import('../../types').RoundEndSummary['bonusPointsMap'] = {};
  const victoryPoints: import('../../types').RoundEndSummary['victoryPoints'] = {};
  for (const player of state.players) {
    scores[player.id] = player.scorePile.reduce((t, c) => t + c.value, 0);
    stars[player.id] = player.stars;
    bonusPointsMap[player.id] = player.bonusPoints;
    victoryPoints[player.id] = player.victoryPoints;
  }

  state.roundEndSummary = {
    lastCards: {},           // pas de dernière carte en flux
    bonusStarWinners: [],
    scores,
    stars,
    bonusPointsMap,
    starsVPWinner,
    cardScoreVPWinner,
    bonusVPWinner,
    victoryPoints,
  };

  state.phase = 'BONUS_STAR';
  return state;
}

// ============================================================
// Après le résumé de manche flux : continuer ou fin de partie
// ============================================================
export function nextFluxRoundOrGameOver(state: FluxGameState): FluxGameState {
  if (checkGameOver(state.players)) {
    state.finalScores = computeFinalScores(state.players);
    state.phase = 'GAME_OVER';
  } else {
    // Réinitialiser pour la nouvelle manche
    for (const player of state.players) {
      player.scorePile = [];
      player.stars = 0;
      player.bonusPoints = 0;
      // Réinitialiser les effets différés
      player.deferred = { yumiRecovered: false };
    }
    // Nouveau deck de 20 cartes
    state.scoreDeck = prepareScoreDeck().slice(0, 20);
    state.roundEndSummary = null;
    state.currentTrick = 0;
    // Redistribuer les mains et cartes mystères
    const mysteryCards: Record<string, number> = {};
    const mysteryCardOwners: Record<string, string> = {};
    const missingCards: Record<string, number> = {};
    for (let i = 0; i < state.players.length; i++) {
      const player = state.players[i];
      const rightNeighborIndex = (i + 1) % state.players.length;
      const rightNeighbor = state.players[rightNeighborIndex];
      const { newHand, mysteryCard } = drawMysteryCard(buildFluxHand());
      player.hand = newHand;
      player.playedHistory = [];
      mysteryCards[rightNeighbor.id] = mysteryCard;
      mysteryCardOwners[rightNeighbor.id] = player.pseudo;
      missingCards[player.id] = mysteryCard;
    }
    state.mysteryCards = mysteryCards;
    state.mysteryCardOwners = mysteryCardOwners;
    state.missingCards = missingCards;
    state.phase = 'FLUX_TRICK_START';
  }
  return state;
}

// ============================================================
// Début d'une mène flux
// ============================================================
export function startFluxTrick(state: FluxGameState): FluxGameState {
  if (state.scoreDeck.length === 0) {
    // Fin de manche : calculer les PV et afficher le résumé (même logique que endFluxTrick)
    return endFluxRound(state);
  }

  state.currentTrick += 1;
  state.playedCards = {};
  state.trickWinnerId = null;
  state.cancelledValues = [];
  state.scoreCardDiscarded = false;
  state.rechargedPlayerIds = [];
  state.bonusPointWinners = [];
  state.lastTrickSummary = null;
  // Réinitialiser les effets spéciaux en attente
  state.stealRequestPlayerId = null;
  state.stealEligibleTargets = [];

  // Piocher la carte Score active
  state.currentScoreCard = state.scoreDeck.splice(0, 1)[0];
  state.phase = 'CARD_SELECTION';
  return state;
}

// ============================================================
// Jouer une carte (valeur 1-8) ou Recharge (valeur 0)
// ============================================================
export function playFluxCard(
  state: FluxGameState,
  playerId: string,
  cardValue: number
): { ok: boolean; error?: string; state: FluxGameState } {
  if (state.phase !== 'CARD_SELECTION') {
    return { ok: false, error: 'Phase incorrecte', state };
  }
  const player = state.players.find(p => p.id === playerId);
  if (!player) return { ok: false, error: 'Joueur introuvable', state };
  if (state.playedCards[playerId] !== undefined) {
    return { ok: false, error: 'Carte déjà jouée', state };
  }

  // --- Jeu normal ---
  if (cardValue === RECHARGE_CARD_VALUE) {
    state.playedCards[playerId] = RECHARGE_CARD_VALUE;
  } else {
    if (!player.hand.includes(cardValue)) {
      return { ok: false, error: 'Carte non disponible', state };
    }
    player.hand = player.hand.filter(c => c !== cardValue);
    // La carte YUMI est écartée définitivement : elle n'est PAS ajoutée à playedHistory
    // (pas récupérable à la Recharge, jouée une seule fois)
    if (cardValue !== YUMI_CARD_VALUE) player.playedHistory.push(cardValue);
    state.playedCards[playerId] = cardValue;
  }

  return checkAllPlayed(state);
}

function checkAllPlayed(state: FluxGameState): { ok: boolean; state: FluxGameState } {
  const allPlayed = state.players.every(p => state.playedCards[p.id] !== undefined);
  if (allPlayed) state.phase = 'REVEAL';
  return { ok: true, state };
}

// ============================================================
// Résolution d'une mène flux
// ============================================================
export function resolveFluxTrick(state: FluxGameState): FluxGameState {
  const allPlayed = state.playedCards as Record<string, number>;
  const scoreCard = state.currentScoreCard!;

  const rechargedIds: string[] = [];
  const valuePlays: Record<string, number> = {};
  for (const [pid, val] of Object.entries(allPlayed)) {
    if (val === RECHARGE_CARD_VALUE) rechargedIds.push(pid);
    else valuePlays[pid] = val;
  }
  state.rechargedPlayerIds = rechargedIds;

  for (const pid of rechargedIds) applyRecharge(state, pid);

  if (rechargedIds.length === state.players.length) {
    state.scoreCardDiscarded = true;
    state.trickWinnerId = null;
    state.cancelledValues = [];
    state.bonusPointWinners = [];
    state.lastTrickSummary = buildTrickSummary(state, allPlayed, [], null, true);
    state.phase = 'TRICK_END';
    return state;
  }

  const result = resolveTrick(valuePlays, state.gameOptions, scoreCard.gain);
  state.trickWinnerId = result.winnerId;
  state.cancelledValues = result.cancelledValues;
  state.scoreCardDiscarded = result.discarded;

  // Points bonus Recharge : valeur unique parmi les joueurs non-rechargeurs
  const bonusWinners: string[] = [];
  if (rechargedIds.length > 0) {
    const valueCounts = new Map<number, number>();
    for (const val of Object.values(valuePlays)) valueCounts.set(val, (valueCounts.get(val) ?? 0) + 1);
    for (const [pid, val] of Object.entries(valuePlays)) {
      if ((valueCounts.get(val) ?? 0) === 1) {
        const p = state.players.find(pl => pl.id === pid);
        if (p) { p.bonusPoints += rechargedIds.length; bonusWinners.push(pid); }
      }
    }
  }
  state.bonusPointWinners = bonusWinners;
  state.lastTrickSummary = buildTrickSummary(state, allPlayed, result.cancelledValues, result.winnerId, result.discarded);

  if (result.winnerId && !result.discarded) {
    applyScoreCardEffect(state, result.winnerId, scoreCard);
  } else {
    state.phase = 'TRICK_END';
  }
  return state;
}

function applyScoreCardEffect(state: FluxGameState, winnerId: string, scoreCard: ScoreCard): void {
  const winner = state.players.find(p => p.id === winnerId)!;

  // 1. Points bonus immédiats au gagnant (toujours, même si l'effet est impossible)
  if (scoreCard.bonusPoints > 0) {
    winner.bonusPoints += scoreCard.bonusPoints;
    if (state.lastTrickSummary) state.lastTrickSummary.bonusPointsAwarded = scoreCard.bonusPoints;
  }

  // 1b. Étoiles immédiates au gagnant (CONSTELLATION, FIFTY_FIFTY, cartes numériques avec bonusStars)
  if (scoreCard.bonusStars > 0) {
    winner.stars += scoreCard.bonusStars;
  }

  // 2. La carte est toujours posée dans la pile du gagnant
  winner.scorePile.push({ ...scoreCard });

  // 3. Application de l'effet spécial
  switch (scoreCard.specialEffect) {
    case 'DOUBLE': {
      // Ajouter la X2 dans la pile, puis doubler l'avant-dernière carte
      // (applyDouble cible pile[length-2], soit la carte précédente)
      if (canApplyDouble(winner.scorePile)) {
        const { newPile, extraStars } = applyDouble(winner.scorePile);
        winner.scorePile = newPile;
        // Créditer les étoiles supplémentaires (déjà créditées une fois au gain)
        if (extraStars > 0) winner.stars += extraStars;
        if (state.lastTrickSummary) state.lastTrickSummary.doubleAppliedTo = winnerId;
      }
      state.phase = 'TRICK_END';
      break;
    }
    case 'STEAL': {
      // VOL : le gagnant choisit un adversaire et prend sa dernière carte
      const eligibleTargets = state.players.filter(p => p.id !== winnerId && p.scorePile.length > 0);
      if (eligibleTargets.length > 0) {
        state.stealRequestPlayerId = winnerId;
        state.stealEligibleTargets = eligibleTargets.map(p => p.id);
        state.phase = 'SPECIAL_EFFECT';
      } else {
        state.phase = 'TRICK_END'; // Personne à voler, carte dans la pile quand même
      }
      break;
    }
    case 'YUMI': {
      // YUMI : récupère sa carte YUMI en main si elle a déjà été jouée
      const yumiAlreadyPlayed = !winner.hand.includes(YUMI_CARD_VALUE)
        && state.missingCards[winnerId] !== YUMI_CARD_VALUE;
      if (yumiAlreadyPlayed) {
        winner.hand.push(YUMI_CARD_VALUE);
        if (state.lastTrickSummary) state.lastTrickSummary.yumiRecovered = true;
      }
      state.phase = 'TRICK_END';
      break;
    }
    case 'RECYCLAGE': {
      // RECYCLAGE : recharge immédiate du gagnant
      applyRecharge(state, winnerId);
      if (state.lastTrickSummary) state.lastTrickSummary.recyclageApplied = true;
      state.phase = 'TRICK_END';
      break;
    }
    case 'INVERSION': {
      // INVERSION : négate la value (×-1) de la dernière carte gagnee
      if (canApplyInversion(winner.scorePile)) {
        winner.scorePile = applyInversion(winner.scorePile);
        if (state.lastTrickSummary) state.lastTrickSummary.inversionApplied = true;
      }
      state.phase = 'TRICK_END';
      break;
    }
    case 'FIFTY_FIFTY':
    case 'JACKPOT':
    case 'CONSTELLATION':
    default:
      // Effets purement passifs (bonus déjà appliqués ci-dessus)
      state.phase = 'TRICK_END';
      break;
  }
}

// ============================================================
// Résolveur d'effet VOL (seul effet nécessitant un choix de cible)
// ============================================================
export function resolveFluxSteal(
  state: FluxGameState, targetId: string
): { ok: boolean; error?: string; state: FluxGameState } {
  if (!state.stealRequestPlayerId || !state.stealEligibleTargets.includes(targetId))
    return { ok: false, error: 'Cible non éligible', state };
  const thief = state.players.find(p => p.id === state.stealRequestPlayerId)!;
  const victim = state.players.find(p => p.id === targetId)!;
  if (victim.scorePile.length === 0) return { ok: false, error: 'Pas de carte Score', state };
  // Le voleur prend la dernière carte de la pile de la victime
  const stolen = victim.scorePile.pop()!;
  thief.scorePile.push({ ...stolen });

  // Transférer les étoiles liées à la carte volée :
  // les bonusStars ont été crédités sur victim.stars au moment du gain,
  // ils doivent changer de propriétaire avec la carte.
  // Les bonusPoints en revanche sont immédiats et définitifs : ils restent
  // acquis par le joueur qui a gagné la carte, indépendamment du vol.
  if (stolen.bonusStars > 0) {
    victim.stars = Math.max(0, victim.stars - stolen.bonusStars);
    thief.stars += stolen.bonusStars;
  }

  if (state.lastTrickSummary) state.lastTrickSummary.stolenFrom = victim.id;
  state.stealRequestPlayerId = null;
  state.stealEligibleTargets = [];
  state.phase = 'TRICK_END';
  return { ok: true, state };
}

// ============================================================
// Fin de mène flux → mène suivante ou fin de partie
// ============================================================
export function endFluxTrick(state: FluxGameState): FluxGameState {
  if (state.scoreDeck.length === 0) {
    // Fin de manche : calculer les PV et afficher le résumé
    return endFluxRound(state);
  } else {
    state.phase = 'FLUX_TRICK_START';
  }
  return state;
}

// ============================================================
// Recharge : reconstruit la main d'un joueur + nouvelle carte mystère
// ============================================================
function applyRecharge(state: FluxGameState, playerId: string): void {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return;
  const player = state.players[playerIndex];
  const rightNeighborIndex = (playerIndex + 1) % state.players.length;
  const rightNeighbor = state.players[rightNeighborIndex];

  // Construire le pool de tirage pour la nouvelle carte mystère :
  // cartes 1-8 toujours présentes, + YUMI si elle n'a pas encore été jouée
  // (elle est en main OU elle était la carte mystère précédente).
  const yumiNotYetPlayed =
    player.hand.includes(YUMI_CARD_VALUE) ||
    state.missingCards[playerId] === YUMI_CARD_VALUE;

  const baseHand: number[] = [];
  for (let i = 1; i <= FLUX_MAX_CARD; i++) baseHand.push(i);
  if (yumiNotYetPlayed) baseHand.push(YUMI_CARD_VALUE);

  // drawMysteryCard mélange le pool et retire la carte mystère :
  // si YUMI est tirée → elle repart en mystère ; sinon → elle revient en main.
  const { newHand, mysteryCard } = drawMysteryCard(baseHand);
  player.hand = newHand; // contient la YUMI si elle n'a pas été tirée comme mystère
  player.playedHistory = []; // réinitialiser l'historique après recharge

  state.mysteryCards[rightNeighbor.id] = mysteryCard;
  state.mysteryCardOwners[rightNeighbor.id] = player.pseudo;
  state.missingCards[player.id] = mysteryCard;
}

// ============================================================
// Construction du TrickSummary
// ============================================================
function buildTrickSummary(
  state: FluxGameState,
  allPlayed: Record<string, number>,
  cancelledValues: number[],
  winnerId: string | null,
  discarded: boolean
): TrickSummary {
  return {
    playedCards: allPlayed,
    cancelledValues,
    winnerId,
    scoreCard: state.currentScoreCard!,
    discarded,
    specialEffect: state.currentScoreCard?.specialEffect ?? null,
    doubleAppliedTo: null,
    stolenFrom: null,
    bonusPointsAwarded: 0,
    yumiRecovered: false,
    recyclageApplied: false,
    inversionApplied: false,
    rechargedPlayerIds: state.rechargedPlayerIds,
    bonusPointWinners: state.bonusPointWinners,
    bonusPointCount: state.rechargedPlayerIds.length,
  };
}

// ============================================================
// Sérialisation vers la vue publique
// ============================================================
export function toFluxPublicState(state: FluxGameState): PublicGameState {
  const publicPlayers: PublicPlayer[] = state.players.map(p => ({
    id: p.id,
    pseudo: p.pseudo,
    color: p.color,
    handCount: p.hand.length,
    playedHistory: p.playedHistory,
    topScoreCard: p.scorePile.length > 0 ? p.scorePile[p.scorePile.length - 1] : null,
    scorePileCount: p.scorePile.length,
    scoreFromCards: p.scorePile.reduce((sum, c) => sum + c.value, 0),
    stars: p.stars,
    bonusPoints: p.bonusPoints,
    victoryPoints: p.victoryPoints,
    deferred: p.deferred,
    isReady: p.isReady,
    isConnected: p.isConnected,
    hasPlayedCard: state.playedCards[p.id] !== undefined,
  }));

  return {
    phase: state.phase,
    gameMode: 'flux',
    currentRound: 1,
    totalRounds: 1,
    currentTrick: state.currentTrick,
    totalTricks: 38,
    scoreColumn: [],
    currentScoreCard: state.currentScoreCard,
    // Cartes restantes dans la manche (hors carte active déjà au centre)
    // La carte active a déjà été retirée du deck par splice dans startFluxTrick
    scoreDeckCount: state.scoreDeck.length,
    players: publicPlayers,
    trickWinnerId: state.trickWinnerId,
    cancelledValues: state.cancelledValues,
    scoreCardDiscarded: state.scoreCardDiscarded,
    memorizeTimer: null,
    stealRequestPlayerId: state.stealRequestPlayerId,
    stealEligibleTargets: state.stealEligibleTargets,
    nextTrickInverted: false,
    lastTrickSummary: state.lastTrickSummary,
    roundEndSummary: state.roundEndSummary,
    finalScores: state.finalScores,
    gameOptions: state.gameOptions,
    rechargedPlayerIds: state.rechargedPlayerIds,
    bonusPointWinners: state.bonusPointWinners,
  };
}
