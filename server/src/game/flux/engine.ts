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
} from '../deck';

import { resolveTrick } from '../resolver';
import {
  applyDouble,
  applySwap,
  canApplyDouble,
  computeFinalScores,
  applyTaxe,
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
  // Effets différés globaux
  nextTrickInverted: boolean;      // INVERSION active pour la prochaine mène
  mysteryTrickActive: boolean;     // MYSTÈRE actif pour la prochaine mène
  revealedUpcoming: ScoreCard[];   // Cartes révélées par DÉVOILEMENT
  // Effets spéciaux en attente (SWAP, STEAL existants)
  swapRequestPlayerId: string | null;
  swapEligibleTargets: string[];
  swapChosenA: string | null;
  stealRequestPlayerId: string | null;
  stealEligibleTargets: string[];
  // Nouveaux effets spéciaux en attente
  eclipseRequestPlayerId: string | null;
  eclipseEligibleTargets: string[];
  piocheRequestPlayerId: string | null;
  piocheEligibleTargets: string[];
  surchargeRequestPlayerId: string | null;  // séparé de pioche
  surchargeEligibleTargets: string[];
  verrouRequestPlayerId: string | null;
  verrouEligibleTargets: string[];
  revelationRequestPlayerId: string | null;
  revelationEligibleTargets: string[];
  taxeRequestPlayerId: string | null;
  taxeEligibleTargets: string[];
  // Résumés
  lastTrickSummary: TrickSummary | null;
  finalScores: FinalScore[] | null;
  rechargedPlayerIds: string[];
  bonusPointWinners: string[];
  swapTimeout: ReturnType<typeof setTimeout> | null;
  gameOptions: GameOptions;
}

// ============================================================
// Génère une main complète 1 à 8 + carte YUMI (mode flux)
// La carte YUMI (valeur 9) est incluse dans la main initiale
// mais n'est PAS restituée lors d'une Recharge.
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

  const scoreDeck = shuffle(buildFullScoreDeck());

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
    nextTrickInverted: false,
    mysteryTrickActive: false,
    revealedUpcoming: [],
    swapRequestPlayerId: null,
    swapEligibleTargets: [],
    swapChosenA: null,
    stealRequestPlayerId: null,
    stealEligibleTargets: [],
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
    lastTrickSummary: null,
    finalScores: null,
    rechargedPlayerIds: [],
    bonusPointWinners: [],
    swapTimeout: null,
    gameOptions,
  };
}

// ============================================================
// Début d'une mène flux
// ============================================================
export function startFluxTrick(state: FluxGameState): FluxGameState {
  if (state.scoreDeck.length === 0) {
    state.finalScores = computeFinalScores(state.players);
    state.phase = 'GAME_OVER';
    return state;
  }

  state.currentTrick += 1;
  state.playedCards = {};
  state.trickWinnerId = null;
  state.cancelledValues = [];
  state.scoreCardDiscarded = false;
  state.rechargedPlayerIds = [];
  state.bonusPointWinners = [];
  state.lastTrickSummary = null;
  // NE PAS effacer revealedUpcoming ici : les cartes DEVOILEMENT restent visibles
  // jusqu'à ce qu'elles soient toutes jouées (retirées au fur et à mesure dans startFluxTrick).
  // Réinitialiser les effets spéciaux en attente
  state.swapRequestPlayerId = null;
  state.swapEligibleTargets = [];
  state.swapChosenA = null;
  state.stealRequestPlayerId = null;
  state.stealEligibleTargets = [];
  state.eclipseRequestPlayerId = null;
  state.eclipseEligibleTargets = [];
  state.piocheRequestPlayerId = null;
  state.piocheEligibleTargets = [];
  state.surchargeRequestPlayerId = null;
  state.surchargeEligibleTargets = [];
  state.verrouRequestPlayerId = null;
  state.verrouEligibleTargets = [];
  state.revelationRequestPlayerId = null;
  state.revelationEligibleTargets = [];
  state.taxeRequestPlayerId = null;
  state.taxeEligibleTargets = [];

  // Piocher la carte Score active
  state.currentScoreCard = state.scoreDeck.splice(0, 1)[0];
  // Si cette carte faisait partie des cartes révélées par DEVOILEMENT, la retirer de la liste
  if (state.revealedUpcoming.length > 0) {
    state.revealedUpcoming = state.revealedUpcoming.filter(
      c => c.id !== state.currentScoreCard!.id
    );
  }
  state.phase = 'CARD_SELECTION';
  return state;
}

// ============================================================
// Jouer une carte (valeur 1-8) ou Recharge (valeur 0)
// Gère les effets différés : forcedCard, forcedRecharge, mustPlayMysteryCard
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

  const deferred = player.deferred;

  // --- Effets différés prioritaires ---

  // MYSTÈRE : doit jouer sa carte mystère
  if (deferred.mustPlayMysteryCard) {
    const mysteryVal = state.missingCards[playerId];
    if (mysteryVal === undefined) return { ok: false, error: 'Carte mystère introuvable', state };
    state.playedCards[playerId] = mysteryVal;
    // La carte mystère n'est pas retirée de la main (elle n'y est pas)
    player.deferred = { ...deferred, mustPlayMysteryCard: false };
    return checkAllPlayed(state);
  }

  // SURCHARGE : doit jouer Recharge
  if (deferred.forcedRecharge) {
    if (cardValue !== RECHARGE_CARD_VALUE) {
      return { ok: false, error: 'Vous devez jouer Recharge (effet SURCHARGE)', state };
    }
    state.playedCards[playerId] = RECHARGE_CARD_VALUE;
    player.deferred = { ...deferred, forcedRecharge: false };
    return checkAllPlayed(state);
  }

  // PIOCHE : doit jouer la carte piochée par l'adversaire
  if (deferred.forcedCard !== null) {
    if (cardValue !== deferred.forcedCard) {
      return { ok: false, error: `Vous devez jouer la carte ${deferred.forcedCard} (effet PIOCHE)`, state };
    }
    if (!player.hand.includes(cardValue)) {
      return { ok: false, error: 'Carte non disponible', state };
    }
    player.hand = player.hand.filter(c => c !== cardValue);
    player.playedHistory.push(cardValue);
    state.playedCards[playerId] = cardValue;
    player.deferred = { ...deferred, forcedCard: null };
    return checkAllPlayed(state);
  }

  // VERROU haute : doit jouer sa carte la plus haute
  // La YUMI compte comme la plus haute (valeur effective 9 en gain+)
  if (deferred.lockedHighCard) {
    const maxCard = Math.max(...player.hand); // YUMI_CARD_VALUE=9 sera naturellement le max
    if (cardValue !== maxCard) {
      return { ok: false, error: `Vous devez jouer votre carte la plus haute : ${maxCard === YUMI_CARD_VALUE ? 'YUMI' : maxCard} (effet VERROU)`, state };
    }
    player.hand = player.hand.filter(c => c !== cardValue);
    if (cardValue !== YUMI_CARD_VALUE) player.playedHistory.push(cardValue);
    state.playedCards[playerId] = cardValue;
    player.deferred = { ...deferred, lockedHighCard: false };
    return checkAllPlayed(state);
  }

  // VERROU basse : doit jouer sa carte la plus basse
  // La YUMI ne compte PAS comme la plus basse (elle vaut 0 en gain- mais c'est une valeur spéciale)
  // On exclut YUMI du calcul du minimum pour le VERROU bas
  if (deferred.lockedLowCard) {
    const nonYumiCards = player.hand.filter(c => c !== YUMI_CARD_VALUE);
    const minCard = nonYumiCards.length > 0 ? Math.min(...nonYumiCards) : YUMI_CARD_VALUE;
    if (cardValue !== minCard) {
      return { ok: false, error: `Vous devez jouer votre carte la plus basse : ${minCard} (effet VERROU)`, state };
    }
    player.hand = player.hand.filter(c => c !== cardValue);
    if (cardValue !== YUMI_CARD_VALUE) player.playedHistory.push(cardValue);
    state.playedCards[playerId] = cardValue;
    player.deferred = { ...deferred, lockedLowCard: false };
    return checkAllPlayed(state);
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

  const result = resolveTrick(valuePlays, state.gameOptions, scoreCard.gain, state.nextTrickInverted);
  state.trickWinnerId = result.winnerId;
  state.cancelledValues = result.cancelledValues;
  state.scoreCardDiscarded = result.discarded;
  state.nextTrickInverted = false;

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
  if (scoreCard.bonusStars > 0) { winner.stars += scoreCard.bonusStars; if (state.lastTrickSummary) state.lastTrickSummary.bonusStarsAwarded = scoreCard.bonusStars; }
  if (scoreCard.bonusPoints > 0) { winner.bonusPoints += scoreCard.bonusPoints; if (state.lastTrickSummary) state.lastTrickSummary.bonusPointsAwarded = scoreCard.bonusPoints; }

  switch (scoreCard.specialEffect) {
    case 'DOUBLE':
      if (canApplyDouble(winner.scorePile)) winner.scorePile = applyDouble(winner.scorePile);
      winner.scorePile.push({ ...scoreCard }); // la carte X2 reste dans la pile
      state.phase = 'TRICK_END'; break;
    case 'STEAL': {
      // La carte VOL va TOUJOURS dans la pile du gagnant, effet applicable ou non
      winner.scorePile.push({ ...scoreCard });
      const el = state.players.filter(p => p.id !== winnerId && p.scorePile.length > 0);
      if (el.length > 0) { state.stealRequestPlayerId = winnerId; state.stealEligibleTargets = el.map(p => p.id); state.phase = 'SPECIAL_EFFECT'; }
      else state.phase = 'TRICK_END'; break; // Personne à voler, carte dans la pile quand même
    }
    case 'SWAP': {
      // La carte SWAP va TOUJOURS dans la pile du gagnant, effet applicable ou non
      winner.scorePile.push({ ...scoreCard });
      const el = state.players.filter(p => p.scorePile.length > 0);
      if (el.length >= 2) { state.swapRequestPlayerId = winnerId; state.swapEligibleTargets = el.map(p => p.id); state.swapChosenA = null; state.phase = 'SPECIAL_EFFECT'; }
      else state.phase = 'TRICK_END'; break; // Pas assez de joueurs avec des cartes, carte dans la pile quand même
    }
    case 'PIOCHE': {
      winner.scorePile.push({ ...scoreCard }); // toujours dans la pile du gagnant
      // Cible éligible : a au moins une carte piochaôble (hors YUMI)
      const el = state.players.filter(p => p.id !== winnerId && p.hand.some(c => c !== YUMI_CARD_VALUE));
      if (el.length > 0) { state.piocheRequestPlayerId = winnerId; state.piocheEligibleTargets = el.map(p => p.id); state.phase = 'SPECIAL_PIOCHE'; }
      else state.phase = 'TRICK_END'; break;
    }
    case 'VERROU': {
      winner.scorePile.push({ ...scoreCard }); // toujours dans la pile du gagnant
      // Cible éligible : a au moins 2 cartes (dont au moins une non-YUMI pour le verrou bas)
      const el = state.players.filter(p => p.id !== winnerId && p.hand.length >= 2);
      if (el.length > 0) { state.verrouRequestPlayerId = winnerId; state.verrouEligibleTargets = el.map(p => p.id); state.phase = 'SPECIAL_VERROU'; }
      else state.phase = 'TRICK_END'; break;
    }
    case 'REVELATION': {
      winner.scorePile.push({ ...scoreCard }); // toujours dans la pile du gagnant
      const el = state.players.filter(p => p.id !== winnerId);
      if (el.length > 0) { state.revelationRequestPlayerId = winnerId; state.revelationEligibleTargets = el.map(p => p.id); state.phase = 'SPECIAL_REVELATION'; }
      else state.phase = 'TRICK_END'; break;
    }
    case 'MYSTERE':
      state.mysteryTrickActive = true;
      winner.scorePile.push({ ...scoreCard }); state.phase = 'TRICK_END'; break;
    case 'SURCHARGE': {
      // La carte SURCHARGE va TOUJOURS dans la pile du gagnant
      winner.scorePile.push({ ...scoreCard });
      const el = state.players.filter(p => p.id !== winnerId);
      if (el.length > 0) {
        state.surchargeRequestPlayerId = winnerId;
        state.surchargeEligibleTargets = el.map(p => p.id);
        state.phase = 'SPECIAL_EFFECT';
      } else {
        state.phase = 'TRICK_END'; // Pas d'adversaire à surcharger (impossible en pratique)
      }
      break;
    }
    case 'INVERSION':
      state.nextTrickInverted = true;
      winner.scorePile.push({ ...scoreCard }); state.phase = 'TRICK_END'; break;
    case 'CONSTELLATION':
      winner.scorePile.push({ ...scoreCard }); // reste dans la pile
      state.phase = 'TRICK_END'; break;
    case 'ECLIPSE': {
      // ECLIPSE : le gagnant donne la carte à une cible (peut être lui-même).
      // Tous les joueurs sont éligibles, donc l'effet est toujours applicable.
      // Si par impossible aucun joueur n'était éligible, la carte va dans la pile du gagnant.
      const eclipseEl = state.players.map(p => p.id);
      if (eclipseEl.length > 0) {
        state.eclipseRequestPlayerId = winnerId;
        state.eclipseEligibleTargets = eclipseEl;
        state.phase = 'SPECIAL_ECLIPSE';
      } else {
        winner.scorePile.push({ ...scoreCard });
        state.phase = 'TRICK_END';
      }
      break;
    }
    case 'JACKPOT':
      winner.scorePile.push({ ...scoreCard }); // reste dans la pile
      state.phase = 'TRICK_END'; break;
    case 'TAXE': {
      // La carte TAXE va TOUJOURS dans la pile du gagnant, effet applicable ou non
      winner.scorePile.push({ ...scoreCard });
      const el = state.players.filter(p => p.id !== winnerId && p.bonusPoints > 0);
      if (el.length > 0) { state.taxeRequestPlayerId = winnerId; state.taxeEligibleTargets = el.map(p => p.id); state.phase = 'SPECIAL_TAXE'; }
      else state.phase = 'TRICK_END'; break; // Personne à taxer, carte dans la pile quand même
    }
    case 'ORACLE':
      winner.scorePile.push({ ...scoreCard }); state.phase = 'SPECIAL_ORACLE'; break;
    case 'DEVOILEMENT':
      state.revealedUpcoming = state.scoreDeck.slice(0, 3);
      winner.scorePile.push({ ...scoreCard }); state.phase = 'SPECIAL_DEVOILEMENT'; break;
    default:
      winner.scorePile.push({ ...scoreCard }); state.phase = 'TRICK_END'; break;
  }
}

// ============================================================
// Résolveurs d'effets spéciaux
// ============================================================

export function resolveFluxSteal(
  state: FluxGameState, targetId: string
): { ok: boolean; error?: string; state: FluxGameState } {
  if (!state.stealRequestPlayerId || !state.stealEligibleTargets.includes(targetId))
    return { ok: false, error: 'Cible non éligible', state };
  const thief = state.players.find(p => p.id === state.stealRequestPlayerId)!;
  const victim = state.players.find(p => p.id === targetId)!;
  if (victim.scorePile.length === 0) return { ok: false, error: 'Pas de carte Score', state };
  const stolen = victim.scorePile.pop()!;
  thief.scorePile.push({ ...stolen });
  if (state.lastTrickSummary) state.lastTrickSummary.stolenFrom = victim.id;
  state.stealRequestPlayerId = null; state.stealEligibleTargets = [];
  state.phase = 'TRICK_END';
  return { ok: true, state };
}

export function resolveFluxSwapChooseA(
  state: FluxGameState, playerAId: string
): { ok: boolean; error?: string; state: FluxGameState } {
  if (!state.swapRequestPlayerId || !state.swapEligibleTargets.includes(playerAId))
    return { ok: false, error: 'Joueur A non éligible', state };
  state.swapChosenA = playerAId;
  return { ok: true, state };
}

export function resolveFluxSwapChooseB(
  state: FluxGameState, playerBId: string
): { ok: boolean; error?: string; state: FluxGameState } {
  if (!state.swapRequestPlayerId || !state.swapChosenA || !state.swapEligibleTargets.includes(playerBId))
    return { ok: false, error: 'Phase incorrecte', state };
  if (state.swapChosenA === playerBId) return { ok: false, error: 'Choisissez deux joueurs différents', state };
  const pA = state.players.find(p => p.id === state.swapChosenA)!;
  const pB = state.players.find(p => p.id === playerBId)!;
  const { newPileA, newPileB } = applySwap(pA.scorePile, pB.scorePile);
  pA.scorePile = newPileA; pB.scorePile = newPileB;
  if (state.lastTrickSummary) state.lastTrickSummary.swapBetween = [pA.id, pB.id];
  state.swapRequestPlayerId = null; state.swapEligibleTargets = []; state.swapChosenA = null;
  state.phase = 'TRICK_END';
  return { ok: true, state };
}

export function resolveFluxEclipse(
  state: FluxGameState, targetId: string
): { ok: boolean; error?: string; state: FluxGameState } {
  if (!state.eclipseRequestPlayerId || !state.eclipseEligibleTargets.includes(targetId))
    return { ok: false, error: 'Cible non éligible', state };
  const scoreCard = state.currentScoreCard!;
  const target = state.players.find(p => p.id === targetId)!;
  // La carte ECLIPSE va dans la pile de la cible (score +1, -3 étoiles)
  target.scorePile.push({ ...scoreCard });
  target.stars = Math.max(0, target.stars + scoreCard.bonusStars); // bonusStars = -3
  if (state.lastTrickSummary) state.lastTrickSummary.eclipseGivenTo = targetId;
  state.eclipseRequestPlayerId = null; state.eclipseEligibleTargets = [];
  state.phase = 'TRICK_END';
  return { ok: true, state };
}

export function resolveFluxPioche(
  state: FluxGameState, targetId: string
): { ok: boolean; error?: string; state: FluxGameState } {
  if (!state.piocheRequestPlayerId || !state.piocheEligibleTargets.includes(targetId))
    return { ok: false, error: 'Cible non éligible', state };
  const target = state.players.find(p => p.id === targetId)!;
  // Exclure la carte YUMI de la pioche (elle ne peut pas être forcée)
  const piochableCards = target.hand.filter(c => c !== YUMI_CARD_VALUE);
  if (piochableCards.length === 0) return { ok: false, error: 'Aucune carte piochaôble', state };
  // Piocher une carte au hasard dans la main de la cible (hors YUMI)
  const idx = Math.floor(Math.random() * piochableCards.length);
  const pickedCard = piochableCards[idx];
  // Forcer la cible à jouer cette carte à la prochaine mène
  target.deferred = { ...target.deferred, forcedCard: pickedCard };
  // Stocker dans le TrickSummary pour le journal
  if (state.lastTrickSummary) {
    state.lastTrickSummary.piocheTargetId = targetId;
    state.lastTrickSummary.piocheCardValue = pickedCard;
  }
  // La carte PIOCHE est déjà dans la pile du gagnant (ajoutée dans applyScoreCardEffect)
  state.piocheRequestPlayerId = null; state.piocheEligibleTargets = [];
  state.phase = 'TRICK_END';
  return { ok: true, state };
}

export function resolveFluxVerrou(
  state: FluxGameState, targetId: string
): { ok: boolean; error?: string; state: FluxGameState } {
  if (!state.verrouRequestPlayerId || !state.verrouEligibleTargets.includes(targetId))
    return { ok: false, error: 'Cible non éligible', state };
  const target = state.players.find(p => p.id === targetId)!;
  const nextCard = state.scoreDeck[0]; // prochaine carte Score
  // Gain '+' (vert) → doit jouer la plus haute. Gain '-' (rouge) → doit jouer la plus basse.
  if (nextCard && nextCard.gain === '-') {
    target.deferred = { ...target.deferred, lockedLowCard: true };
  } else {
    target.deferred = { ...target.deferred, lockedHighCard: true };
  }
  // Stocker la cible dans le TrickSummary pour le journal
  if (state.lastTrickSummary) {
    state.lastTrickSummary.verrouTargetId = targetId;
  }
  // La carte VERROU est déjà dans la pile du gagnant (ajoutée dans applyScoreCardEffect)
  state.verrouRequestPlayerId = null; state.verrouEligibleTargets = [];
  state.phase = 'TRICK_END';
  return { ok: true, state, targetPseudo: target.pseudo } as any;
}

export function resolveFluxRevelation(
  state: FluxGameState, targetId: string
): { ok: boolean; error?: string; state: FluxGameState } {
  if (!state.revelationRequestPlayerId || !state.revelationEligibleTargets.includes(targetId))
    return { ok: false, error: 'Cible non éligible', state };
  // Stocker dans le TrickSummary pour le journal
  const revealedCard = state.missingCards[targetId];
  if (state.lastTrickSummary) {
    state.lastTrickSummary.revelationTargetId = targetId;
    state.lastTrickSummary.revelationCardValue = revealedCard ?? null;
  }
  // La carte REVELATION est déjà dans la pile du gagnant (ajoutée dans applyScoreCardEffect)
  state.revelationRequestPlayerId = null; state.revelationEligibleTargets = [];
  state.phase = 'TRICK_END';
  return { ok: true, state };
}

export function resolveFluxTaxe(
  state: FluxGameState, targetId: string
): { ok: boolean; error?: string; state: FluxGameState } {
  if (!state.taxeRequestPlayerId || !state.taxeEligibleTargets.includes(targetId))
    return { ok: false, error: 'Cible non éligible', state };
  const thief = state.players.find(p => p.id === state.taxeRequestPlayerId)!;
  const victim = state.players.find(p => p.id === targetId)!;
  applyTaxe(thief, victim, 2);
  // Stocker la cible dans le TrickSummary pour le journal
  if (state.lastTrickSummary) {
    state.lastTrickSummary.taxeTargetId = targetId;
  }
  state.taxeRequestPlayerId = null; state.taxeEligibleTargets = [];
  state.phase = 'TRICK_END';
  return { ok: true, state };
}

// ORACLE et DEVOILEMENT sont auto (pas de choix du joueur)
export function resolveFluxOracle(state: FluxGameState): ScoreCard[] {
  // Retourne les 3 prochaines cartes (privé — envoyé uniquement au gagnant)
  const cards = state.scoreDeck.slice(0, 3);
  state.phase = 'TRICK_END';
  return cards;
}

export function resolveFluxDevoilement(state: FluxGameState): void {
  // revealedUpcoming déjà rempli dans applyScoreCardEffect
  state.phase = 'TRICK_END';
}

// SURCHARGE : le gagnant choisit la cible, qui sera forcée à Recharger
export function resolveFluxSurcharge(
  state: FluxGameState, targetId: string
): { ok: boolean; error?: string; state: FluxGameState; targetPseudo?: string } {
  if (!state.surchargeRequestPlayerId || !state.surchargeEligibleTargets.includes(targetId))
    return { ok: false, error: 'Cible non éligible', state };
  const target = state.players.find(p => p.id === targetId)!;
  target.deferred = { ...target.deferred, forcedRecharge: true };
  const targetPseudo = target.pseudo;
  // Stocker la cible dans le TrickSummary pour le journal
  if (state.lastTrickSummary) {
    state.lastTrickSummary.surchargeTargetId = targetId;
  }
  state.surchargeRequestPlayerId = null; state.surchargeEligibleTargets = [];
  state.phase = 'TRICK_END';
  return { ok: true, state, targetPseudo };
}

// ============================================================
// Fin de mène flux → mène suivante ou fin de partie
// ============================================================
export function endFluxTrick(state: FluxGameState): FluxGameState {
  // Appliquer MYSTÈRE si actif : tout le monde jouera sa carte mystère
  if (state.mysteryTrickActive) {
    for (const player of state.players) {
      player.deferred = { ...player.deferred, mustPlayMysteryCard: true };
    }
    state.mysteryTrickActive = false;
  }

  if (state.scoreDeck.length === 0) {
    state.finalScores = computeFinalScores(state.players);
    state.phase = 'GAME_OVER';
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

  // Mémoriser si le joueur avait encore sa YUMI avant la recharge
  const hadYumi = player.hand.includes(YUMI_CARD_VALUE);

  // La Recharge donne les cartes 1-8 uniquement — la YUMI n'est PAS restituée automatiquement
  const baseHand: number[] = [];
  for (let i = 1; i <= FLUX_MAX_CARD; i++) baseHand.push(i);

  const { newHand, mysteryCard } = drawMysteryCard(baseHand);
  // Si le joueur avait encore sa YUMI, elle reste dans sa nouvelle main
  player.hand = hadYumi ? [...newHand, YUMI_CARD_VALUE] : newHand;
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
    stars: p.stars,
    bonusPoints: p.bonusPoints,
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
    eclipseRequestPlayerId: state.eclipseRequestPlayerId,
    eclipseEligibleTargets: state.eclipseEligibleTargets,
    piocheRequestPlayerId: state.piocheRequestPlayerId,
    piocheEligibleTargets: state.piocheEligibleTargets,
    surchargeRequestPlayerId: state.surchargeRequestPlayerId,
    surchargeEligibleTargets: state.surchargeEligibleTargets,
    verrouRequestPlayerId: state.verrouRequestPlayerId,
    verrouEligibleTargets: state.verrouEligibleTargets,
    revelationRequestPlayerId: state.revelationRequestPlayerId,
    revelationEligibleTargets: state.revelationEligibleTargets,
    taxeRequestPlayerId: state.taxeRequestPlayerId,
    taxeEligibleTargets: state.taxeEligibleTargets,
    nextTrickInverted: state.nextTrickInverted,
    mysteryTrickActive: state.mysteryTrickActive,
    revealedUpcoming: state.revealedUpcoming,
    lastTrickSummary: state.lastTrickSummary,
    roundEndSummary: null,
    finalScores: state.finalScores,
    gameOptions: state.gameOptions,
    rechargedPlayerIds: state.rechargedPlayerIds,
    bonusPointWinners: state.bonusPointWinners,
  };
}
