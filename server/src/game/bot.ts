import { InternalGameState } from './engine';
import { GameOptions, ScoreCard } from '../types';

// ============================================================
// Profils de bots disponibles
// ============================================================
export type BotProfile =
  | 'LOGIQUE'      // Joue de façon optimale (évite les doublons, vise les grosses cartes)
  | 'KAMIKAZE'     // Risque tout : joue toujours sa carte la plus haute
  | 'HASARD'       // Joue complètement au hasard
  | 'PRUDENT'      // Joue toujours sa carte la plus basse pour éviter les risques
  | 'SABOTEUR';    // Essaie de faire annuler les cartes des autres (joue les mêmes valeurs)

export interface BotConfig {
  profile: BotProfile;
  name: string;
  emoji: string;
  description: string;
}

export const BOT_PROFILES: Record<BotProfile, BotConfig> = {
  LOGIQUE: {
    profile: 'LOGIQUE',
    name: 'ARIA',
    emoji: '🤖',
    description: 'Joue de façon calculée. Évite les doublons et vise les meilleures cartes Score.',
  },
  KAMIKAZE: {
    profile: 'KAMIKAZE',
    name: 'BLITZ',
    emoji: '💥',
    description: 'Fonce tête baissée ! Joue toujours sa carte la plus haute, quoi qu\'il arrive.',
  },
  HASARD: {
    profile: 'HASARD',
    name: 'DINGO',
    emoji: '🎲',
    description: 'Complètement imprévisible. Joue n\'importe quelle carte au hasard.',
  },
  PRUDENT: {
    profile: 'PRUDENT',
    name: 'FELIX',
    emoji: '🐢',
    description: 'Joue toujours sa carte la plus basse. Préfère ne pas gagner plutôt que de perdre.',
  },
  SABOTEUR: {
    profile: 'SABOTEUR',
    name: 'LOKI',
    emoji: '😈',
    description: 'Cherche à annuler les cartes des autres en jouant les mêmes valeurs.',
  },
};

// ============================================================
// Décision du bot : quelle carte jouer ?
// ============================================================
export function decideBotCard(
  state: InternalGameState,
  botId: string,
  profile: BotProfile
): number {
  const bot = state.players.find(p => p.id === botId);
  if (!bot || bot.hand.length === 0) {
    throw new Error(`Bot ${botId} introuvable ou main vide`);
  }

  const hand = [...bot.hand];
  const alreadyPlayed = Object.values(state.playedCards).filter(v => v !== undefined) as number[];
  const scoreCard = state.currentScoreCard;

  const options = state.gameOptions;

  switch (profile) {
    case 'LOGIQUE':
      return playLogique(hand, alreadyPlayed, scoreCard, options);
    case 'KAMIKAZE':
      return playKamikaze(hand, scoreCard, options);
    case 'HASARD':
      return playHasard(hand);
    case 'PRUDENT':
      return playPrudent(hand, alreadyPlayed, scoreCard, options);
    case 'SABOTEUR':
      return playSaboteur(hand, alreadyPlayed);
    default:
      return playHasard(hand);
  }
}

// ============================================================
// Décision du bot pour le VOL (STEAL) : quelle cible voler ?
// ============================================================
export function decideBotStealTarget(
  state: InternalGameState,
  botId: string,
  profile: BotProfile
): string | null {
  const eligibleIds = state.stealEligibleTargets;
  if (eligibleIds.length === 0) return null;

  // Helper : valeur de la carte du sommet d'un joueur
  const topValue = (id: string) => {
    const p = state.players.find(pl => pl.id === id);
    if (!p || p.scorePile.length === 0) return -Infinity;
    return p.scorePile[p.scorePile.length - 1].value;
  };

  switch (profile) {
    case 'LOGIQUE':
    case 'KAMIKAZE':
    case 'SABOTEUR':
      // Voler la carte du sommet la plus valuable
      return eligibleIds.reduce((best, id) => topValue(id) > topValue(best) ? id : best, eligibleIds[0]);
    case 'PRUDENT':
      // Voler la carte la moins négative (minimiser le risque)
      return eligibleIds.reduce((best, id) => topValue(id) > topValue(best) ? id : best, eligibleIds[0]);
    case 'HASARD':
    default:
      return eligibleIds[Math.floor(Math.random() * eligibleIds.length)];
  }
}

// ============================================================
// Décision du bot pour le SWAP : quels 2 joueurs échanger ?
// Retourne [idA, idB] ou [null, null] si impossible
// ============================================================
export function decideBotSwapTargets(
  state: InternalGameState,
  botId: string,
  profile: BotProfile
): [string | null, string | null] {
  const eligibleIds = state.swapEligibleTargets;
  if (eligibleIds.length < 2) return [null, null];

  const bot = state.players.find(p => p.id === botId);
  if (!bot) return [null, null];

  const topValue = (id: string) => {
    const p = state.players.find(pl => pl.id === id);
    if (!p || p.scorePile.length === 0) return 0;
    return p.scorePile[p.scorePile.length - 1].value;
  };

  // Trier les éligibles par valeur du sommet
  const sorted = [...eligibleIds].sort((a, b) => topValue(b) - topValue(a));

  switch (profile) {
    case 'LOGIQUE':
    case 'KAMIKAZE': {
      // Si le bot est éligible : échanger sa carte (la pire) avec la meilleure adverse
      if (eligibleIds.includes(botId)) {
        const best = sorted.find(id => id !== botId) ?? sorted[1];
        return [botId, best];
      }
      // Sinon : échanger le meilleur avec le pire (pour perturber)
      return [sorted[0], sorted[sorted.length - 1]];
    }
    case 'SABOTEUR': {
      // Échanger le leader (meilleur score) avec le dernier
      return [sorted[0], sorted[sorted.length - 1]];
    }
    case 'PRUDENT': {
      // Si le bot a une carte négative : l'échanger avec la meilleure carte adverse
      if (eligibleIds.includes(botId) && topValue(botId) < 0) {
        const best = sorted.find(id => id !== botId) ?? sorted[1];
        return [botId, best];
      }
      // Sinon : échanger les deux adversaires avec les valeurs extrêmes
      return [sorted[0], sorted[sorted.length - 1]];
    }
    case 'HASARD':
    default: {
      const shuffled = [...eligibleIds].sort(() => Math.random() - 0.5);
      return [shuffled[0], shuffled[1]];
    }
  }
}

// ============================================================
// Stratégies internes
// ============================================================

/**
 * Retourne true si, avec les options actives, cette carte Score est désirable
 * (on veut la gagner) ou indésirable (on veut l'éviter).
 *
 * Règle standard  : positive = désirable, négative = indésirable
 * colorRule actif : positive = désirable (inchangé), négative = désirable aussi
 *                   (on veut la gagner avec la plus petite carte)
 */
function isDesirable(scoreCard: ScoreCard, options: GameOptions): boolean {
  if (scoreCard.specialEffect) return true; // spéciales : toujours intéressantes
  if (scoreCard.value > 0) return true;     // positive : toujours désirable
  if (scoreCard.value < 0) {
    // Négative : indésirable en règle standard, désirable avec colorRule
    return options.colorRule;
  }
  return false;
}

/**
 * Avec colorRule actif, une carte négative se gagne avec la PLUS PETITE valeur.
 * Retourne true si le bot doit jouer BAS pour gagner cette carte.
 */
function smallestWins(scoreCard: ScoreCard, options: GameOptions): boolean {
  return options.colorRule && scoreCard.type === 'negative';
}

/**
 * ARIA — Logique :
 * - Carte désirable + plus grande gagne  → joue haut (sans doublon)
 * - Carte désirable + plus petite gagne → joue bas  (sans doublon)
 * - Carte indésirable + plus grande gagne → joue bas  (sans doublon) pour éviter
 * - Carte indésirable + plus petite gagne → joue haut (sans doublon) pour éviter
 * - Carte spéciale → joue la médiane
 */
function playLogique(
  hand: number[],
  alreadyPlayed: number[],
  scoreCard: ScoreCard | null,
  options: GameOptions
): number {
  const sorted = [...hand].sort((a, b) => a - b);

  if (!scoreCard) return playHasard(hand);

  // Cartes "sûres" = pas encore jouées par un autre (pas de risque de doublon)
  const safe = sorted.filter(c => !alreadyPlayed.includes(c));
  const pool = safe.length > 0 ? safe : sorted;

  if (scoreCard.specialEffect) {
    // Carte spéciale → jouer la médiane
    return pool[Math.floor(pool.length / 2)];
  }

  const wantToWin = isDesirable(scoreCard, options);
  const needSmall = smallestWins(scoreCard, options);

  if (wantToWin) {
    // On veut gagner cette carte
    return needSmall
      ? pool[0]                  // plus petite gagne → jouer bas
      : pool[pool.length - 1];   // plus grande gagne → jouer haut
  } else {
    // On veut éviter cette carte
    return needSmall
      ? pool[pool.length - 1]    // plus petite gagne → jouer haut pour éviter
      : pool[0];                 // plus grande gagne → jouer bas pour éviter
  }
}

/**
 * BLITZ — Kamikaze :
 * Veut toujours gagner la carte Score, quoi qu'il arrive.
 * - Plus grande gagne → joue la carte la plus haute
 * - Plus petite gagne (colorRule + négative) → joue la carte la plus basse
 */
function playKamikaze(hand: number[], scoreCard: ScoreCard | null, options: GameOptions): number {
  if (scoreCard && smallestWins(scoreCard, options)) {
    return Math.min(...hand);
  }
  return Math.max(...hand);
}

/**
 * DINGO — Hasard :
 * Pioche une carte aléatoire.
 */
function playHasard(hand: number[]): number {
  return hand[Math.floor(Math.random() * hand.length)];
}

/**
 * FELIX — Prudent :
 * Veut toujours éviter de gagner la carte Score (sauf si elle est positive).
 * - Carte désirable (positive) → joue bas pour ne pas prendre de risque
 * - Carte indésirable + plus grande gagne → joue bas pour éviter
 * - Carte indésirable + plus petite gagne (colorRule + négative) → joue HAUT pour éviter
 */
function playPrudent(
  hand: number[],
  alreadyPlayed: number[],
  scoreCard: ScoreCard | null,
  options: GameOptions
): number {
  const sorted = [...hand].sort((a, b) => a - b);
  const safe = sorted.filter(c => !alreadyPlayed.includes(c));
  const pool = safe.length > 0 ? safe : sorted;

  if (!scoreCard) return pool[0];

  if (scoreCard.specialEffect) {
    // Spéciale : jouer bas (prudent par défaut)
    return pool[0];
  }

  const wantToAvoid = !isDesirable(scoreCard, options);
  const needSmall = smallestWins(scoreCard, options);

  if (wantToAvoid) {
    // On veut éviter : jouer à l'opposé de ce qui gagne
    return needSmall
      ? pool[pool.length - 1]  // plus petite gagne → jouer haut pour éviter
      : pool[0];               // plus grande gagne → jouer bas pour éviter
  }

  // Carte positive (désirable) : PRUDENT reste prudent, joue bas
  return pool[0];
}

/**
 * LOKI — Saboteur :
 * Cherche une carte qui annule une carte déjà jouée (même valeur).
 * Si aucune opportunité, joue au hasard.
 */
function playSaboteur(hand: number[], alreadyPlayed: number[]): number {
  // Chercher une carte qui double une valeur déjà jouée
  for (const played of alreadyPlayed) {
    if (hand.includes(played)) {
      return played;
    }
  }
  // Sinon jouer au hasard
  return playHasard(hand);
}
