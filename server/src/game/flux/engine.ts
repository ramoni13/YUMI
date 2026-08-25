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
} from '../../types';

import {
  buildFullScoreDeck,
  drawMysteryCard,
  shuffle,
} from '../deck';

import { resolveTrick } from '../resolver';
import {
  applyDouble,
  applySwap,
  canApplyDouble,
  computeFinalScores,
} from '../scoring';

// ============================================================
// Constantes mode flux
// ============================================================

// Toutes les cartes valeur de 1 à 8 (identique pour tous les joueurs)
const FLUX_MAX_CARD = 8;

// ============================================================
// État interne complet du jeu flux (côté serveur)
// ============================================================
export interface FluxGameState {
  phase: GamePhase;
  currentTrick: number;         // Numéro de la mène en cours (total depuis le début)
  scoreDeck: ScoreCard[];       // Pioche Score (flux continu)
  currentScoreCard: ScoreCard | null;
  players: Player[];
  playedCards: Record<string, number | null>; // 0 = Recharge
  // Carte mystère : rattachée à chaque Recharge individuelle
  mysteryCards: Record<string, number>;       // joueur_id (voisin de droite) → valeur vue
  mysteryCardOwners: Record<string, string>;  // joueur_id (voisin de droite) → pseudo du joueur pioché
  missingCards: Record<string, number>;       // joueur_id (pioché) → valeur manquante
  trickWinnerId: string | null;
  cancelledValues: number[];
  scoreCardDiscarded: boolean;
  // Recharge
  rechargedPlayerIds: string[];   // Joueurs ayant joué Recharge cette mène
  rechargeStarWinners: string[];  // Joueurs ayant gagné une étoile (carte non annulée)
  // Effets spéciaux
  swapRequestPlayerId: string | null;
  swapEligibleTargets: string[];
  swapChosenA: string | null;
  stealRequestPlayerId: string | null;
  stealEligibleTargets: string[];
  lastTrickSummary: TrickSummary | null;
  finalScores: FinalScore[] | null;
  swapTimeout: ReturnType<typeof setTimeout> | null;
  gameOptions: GameOptions;
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

  // Construire les mains initiales avec carte mystère dès le début
  // Chaque joueur repart avec 1–8 amputé d'une carte (voisin de droite la voit)
  const mysteryCards: Record<string, number> = {};
  const mysteryCardOwners: Record<string, string> = {};
  const missingCards: Record<string, number> = {};

  // Créer d'abord les joueurs avec leur pseudo/couleur
  const gamePlayers: Player[] = players.map((p, i) => ({
    id: p.id,
    pseudo: p.pseudo,
    color: colors[i],
    hand: [],   // rempli juste après
    scorePile: [],
    stars: 0,          // Étoiles cartes Score (majorité uniquement)
    rechargeStars: 0,  // Étoiles Recharge (majorité + +1 pt chacune)
    isReady: true,
    isConnected: true,
  }));

  // Appliquer la carte mystère initiale pour chaque joueur
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

  // Paquet Score complet mélangé (30 cartes, aucune écartée en mode flux)
  const scoreDeck = shuffle(buildFullScoreDeck());

  const state: FluxGameState = {
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
    rechargedPlayerIds: [],
    rechargeStarWinners: [],
    swapRequestPlayerId: null,
    swapEligibleTargets: [],
    swapChosenA: null,
    stealRequestPlayerId: null,
    stealEligibleTargets: [],
    lastTrickSummary: null,
    finalScores: null,
    swapTimeout: null,
    gameOptions,
  };

  return state;
}

// ============================================================
// Génère une main complète 1 à 8 (mode flux)
// ============================================================
export function buildFluxHand(): number[] {
  const hand: number[] = [];
  for (let i = 1; i <= FLUX_MAX_CARD; i++) {
    hand.push(i);
  }
  return hand;
}

// ============================================================
// Début d'une mène flux
// ============================================================
export function startFluxTrick(state: FluxGameState): FluxGameState {
  if (state.scoreDeck.length === 0) {
    // Plus de cartes → fin de partie
    state.phase = 'GAME_OVER';
    state.finalScores = computeFinalScores(state.players);
    return state;
  }

  state.currentTrick += 1;
  state.playedCards = {};
  state.trickWinnerId = null;
  state.cancelledValues = [];
  state.scoreCardDiscarded = false;
  state.rechargedPlayerIds = [];
  state.rechargeStarWinners = [];
  state.lastTrickSummary = null;
  state.swapRequestPlayerId = null;
  state.swapEligibleTargets = [];
  state.swapChosenA = null;
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

  if (cardValue === RECHARGE_CARD_VALUE) {
    // Jouer la carte Recharge — toujours autorisé
    state.playedCards[playerId] = RECHARGE_CARD_VALUE;
  } else {
    // Jouer une carte valeur — doit être en main
    if (!player.hand.includes(cardValue)) {
      return { ok: false, error: 'Carte non disponible', state };
    }
    // Retirer la carte de la main
    player.hand = player.hand.filter(c => c !== cardValue);
    state.playedCards[playerId] = cardValue;
  }

  // Vérifier si tous les joueurs ont joué
  const allPlayed = state.players.every(p => state.playedCards[p.id] !== undefined);
  if (allPlayed) {
    state.phase = 'REVEAL';
  }

  return { ok: true, state };
}

// ============================================================
// Résolution d'une mène flux
// ============================================================
export function resolveFluxTrick(state: FluxGameState): FluxGameState {
  const allPlayed = state.playedCards as Record<string, number>;

  // Séparer les joueurs qui rechargent de ceux qui jouent une carte valeur
  const rechargedIds: string[] = [];
  const valuePlays: Record<string, number> = {};

  for (const [pid, val] of Object.entries(allPlayed)) {
    if (val === RECHARGE_CARD_VALUE) {
      rechargedIds.push(pid);
    } else {
      valuePlays[pid] = val;
    }
  }

  state.rechargedPlayerIds = rechargedIds;

  // --- Cas : tout le monde recharge ---
  if (rechargedIds.length === state.players.length) {
    state.scoreCardDiscarded = true;
    state.trickWinnerId = null;
    state.cancelledValues = [];
    state.rechargeStarWinners = [];

    // Tout le monde recharge quand même
    for (const pid of rechargedIds) {
      applyRecharge(state, pid);
    }

    state.lastTrickSummary = buildTrickSummary(state, allPlayed, [], null, true);
    state.phase = 'TRICK_END';
    return state;
  }

  // --- Cas normal : au moins un joueur joue une carte valeur ---

  // 1. Résoudre le pli entre les cartes valeur uniquement
  const result = resolveTrick(valuePlays, state.gameOptions, state.currentScoreCard?.type);
  state.trickWinnerId = result.winnerId;
  state.cancelledValues = result.cancelledValues;
  state.scoreCardDiscarded = result.discarded;

  // 2. Étoiles Recharge :
  //    Les joueurs ayant joué une carte VALEUR UNIQUE (non annulée) gagnent
  //    autant d'étoiles Recharge qu'il y a de joueurs ayant joué Recharge ce tour.
  //    Ex : 2 joueurs rechargent + Alice joue un 7 unique → Alice gagne 2 étoiles.
  //    Ces étoiles vont dans rechargeStars (majorité + +1 pt chacune au score final)
  const starWinners: string[] = [];
  const rechargeStarCount = rechargedIds.length; // nb d'étoiles à distribuer par gagnant (= nb rechargeurs)
  if (rechargedIds.length > 0) {
    // Compter les occurrences de chaque valeur jouée
    const valueCounts = new Map<number, number>();
    for (const val of Object.values(valuePlays)) {
      valueCounts.set(val, (valueCounts.get(val) ?? 0) + 1);
    }
    for (const [pid, val] of Object.entries(valuePlays)) {
      // Étoile(s) uniquement si la valeur est unique (pas en doublon)
      if ((valueCounts.get(val) ?? 0) === 1) {
        const player = state.players.find(p => p.id === pid);
        if (player) {
          player.rechargeStars += rechargeStarCount; // autant d'étoiles que de rechargeurs
          starWinners.push(pid);
        }
      }
    }
  }
  state.rechargeStarWinners = starWinners;

  // 3. Appliquer les Recharges
  for (const pid of rechargedIds) {
    applyRecharge(state, pid);
  }

  // 4. Résumé de base
  state.lastTrickSummary = buildTrickSummary(
    state, allPlayed, result.cancelledValues, result.winnerId, result.discarded, rechargeStarCount
  );

  const scoreCard = state.currentScoreCard!;

  // 5. Attribution de la carte Score au gagnant
  if (result.winnerId && !result.discarded) {
    const winner = state.players.find(p => p.id === result.winnerId)!;

    // Étoiles bonus immédiates (cartes -1⭐ et -2⭐⭐)
    // → vont dans stars (majorité uniquement, pas de +1 pt)
    if (scoreCard.bonusStars > 0) {
      winner.stars += scoreCard.bonusStars; // ← stars, pas rechargeStars
      state.lastTrickSummary.bonusStarsAwarded = scoreCard.bonusStars;
    }

    if (scoreCard.specialEffect === 'DOUBLE') {
      if (canApplyDouble(winner.scorePile)) {
        winner.scorePile = applyDouble(winner.scorePile);
      }
      state.phase = 'TRICK_END';

    } else if (scoreCard.specialEffect === 'STEAL') {
      const eligible = state.players.filter(
        p => p.id !== result.winnerId && p.scorePile.length > 0
      );
      if (eligible.length > 0) {
        state.stealRequestPlayerId = result.winnerId;
        state.stealEligibleTargets = eligible.map(p => p.id);
        state.phase = 'SPECIAL_EFFECT';
      } else {
        state.phase = 'TRICK_END';
      }

    } else if (scoreCard.specialEffect === 'SWAP') {
      const eligible = state.players.filter(p => p.scorePile.length > 0);
      if (eligible.length >= 2) {
        state.swapRequestPlayerId = result.winnerId;
        state.swapEligibleTargets = eligible.map(p => p.id);
        state.swapChosenA = null;
        state.phase = 'SPECIAL_EFFECT';
      } else {
        state.phase = 'TRICK_END';
      }

    } else {
      // Carte numérique → pile du gagnant
      winner.scorePile.push({ ...scoreCard });
      state.phase = 'TRICK_END';
    }
  } else {
    state.phase = 'TRICK_END';
  }

  return state;
}

// ============================================================
// Résolution du VOL (STEAL) — identique au mode classic
// ============================================================
export function resolveFluxSteal(
  state: FluxGameState,
  targetPlayerId: string
): { ok: boolean; error?: string; state: FluxGameState } {
  if (state.phase !== 'SPECIAL_EFFECT' || !state.stealRequestPlayerId) {
    return { ok: false, error: 'Phase incorrecte', state };
  }
  if (!state.stealEligibleTargets.includes(targetPlayerId)) {
    return { ok: false, error: 'Cible non éligible', state };
  }

  const thief = state.players.find(p => p.id === state.stealRequestPlayerId)!;
  const victim = state.players.find(p => p.id === targetPlayerId)!;

  if (victim.scorePile.length === 0) {
    return { ok: false, error: "Cet adversaire n'a pas de carte Score", state };
  }

  const stolenCard = victim.scorePile[victim.scorePile.length - 1];
  victim.scorePile = victim.scorePile.slice(0, -1);
  thief.scorePile.push({ ...stolenCard });

  if (state.lastTrickSummary) {
    state.lastTrickSummary.stolenFrom = victim.id;
  }

  state.stealRequestPlayerId = null;
  state.stealEligibleTargets = [];
  state.phase = 'TRICK_END';

  return { ok: true, state };
}

// ============================================================
// Résolution du SWAP — étape A puis étape B
// ============================================================
export function resolveFluxSwapChooseA(
  state: FluxGameState,
  playerAId: string
): { ok: boolean; error?: string; state: FluxGameState } {
  if (state.phase !== 'SPECIAL_EFFECT' || !state.swapRequestPlayerId) {
    return { ok: false, error: 'Phase incorrecte', state };
  }
  if (!state.swapEligibleTargets.includes(playerAId)) {
    return { ok: false, error: 'Joueur A non éligible', state };
  }
  state.swapChosenA = playerAId;
  return { ok: true, state };
}

export function resolveFluxSwapChooseB(
  state: FluxGameState,
  playerBId: string
): { ok: boolean; error?: string; state: FluxGameState } {
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
// Fin de mène flux → mène suivante ou fin de partie
// ============================================================
export function endFluxTrick(state: FluxGameState): FluxGameState {
  if (state.scoreDeck.length === 0) {
    // Plus de cartes Score → fin de partie
    state.finalScores = computeFinalScores(state.players);
    state.phase = 'GAME_OVER';
  } else {
    state.phase = 'FLUX_TRICK_START';
  }
  return state;
}

// ============================================================
// Sérialisation vers la vue publique (filtrée)
// ============================================================
export function toFluxPublicState(state: FluxGameState): PublicGameState {
  const publicPlayers: PublicPlayer[] = state.players.map(p => ({
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
    hasPlayedCard: state.playedCards[p.id] !== undefined,
  }));

  return {
    phase: state.phase,
    gameMode: 'flux',
    currentRound: 1,           // Pas de manches en mode flux
    totalRounds: 1,
    currentTrick: state.currentTrick,
    totalTricks: 30,           // 30 cartes Score au total
    scoreColumn: [],           // Pas de colonne Score en mode flux
    currentScoreCard: state.currentScoreCard,
    scoreDeckCount: state.scoreDeck.length,
    players: publicPlayers,
    trickWinnerId: state.trickWinnerId,
    cancelledValues: state.cancelledValues,
    scoreCardDiscarded: state.scoreCardDiscarded,
    memorizeTimer: null,
    swapRequestPlayerId: state.swapRequestPlayerId,
    swapEligibleTargets: state.swapEligibleTargets,
    swapChosenA: state.swapChosenA,
    stealRequestPlayerId: state.stealRequestPlayerId,
    stealEligibleTargets: state.stealEligibleTargets,
    lastTrickSummary: state.lastTrickSummary,
    roundEndSummary: null,     // Pas de fin de manche en mode flux
    finalScores: state.finalScores,
    gameOptions: state.gameOptions,
    rechargedPlayerIds: state.rechargedPlayerIds,
    rechargeStarWinners: state.rechargeStarWinners,
  };
}

// ============================================================
// Helpers privés
// ============================================================

/**
 * Applique la Recharge pour un joueur :
 * - Récupère toutes ses cartes valeur défaussées (repart avec 1 à 8)
 * - Le voisin de droite écarte secrètement 1 carte (nouvelle carte mystère)
 */
function applyRecharge(state: FluxGameState, playerId: string): void {
  const playerIndex = state.players.findIndex(p => p.id === playerId);
  if (playerIndex === -1) return;

  const player = state.players[playerIndex];

  // Reconstruire la main complète
  const fullHand = buildFluxHand();

  // Piocher la carte mystère (voisin de droite)
  const rightNeighborIndex = (playerIndex + 1) % state.players.length;
  const rightNeighbor = state.players[rightNeighborIndex];

  const { newHand, mysteryCard } = drawMysteryCard(fullHand);
  player.hand = newHand;

  // Stocker la carte mystère
  state.mysteryCards[rightNeighbor.id] = mysteryCard;
  state.mysteryCardOwners[rightNeighbor.id] = player.pseudo;
  state.missingCards[player.id] = mysteryCard;
}

/**
 * Construit le TrickSummary pour la mène en cours
 */
function buildTrickSummary(
  state: FluxGameState,
  allPlayed: Record<string, number>,
  cancelledValues: number[],
  winnerId: string | null,
  discarded: boolean,
  rechargeStarCount = 0
): TrickSummary {
  return {
    playedCards: allPlayed,
    cancelledValues,
    winnerId,
    scoreCard: state.currentScoreCard!,
    discarded,
    specialEffect: state.currentScoreCard?.specialEffect ?? null,
    doubleAppliedTo: null,
    swapBetween: null,
    stolenFrom: null,
    bonusStarsAwarded: 0,
    rechargedPlayerIds: state.rechargedPlayerIds,
    rechargeStarWinners: state.rechargeStarWinners,
    rechargeStarCount,
  };
}
