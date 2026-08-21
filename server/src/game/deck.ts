import { ScoreCard, ScoreCardType, SpecialEffect, GAME_CONFIGS } from '../types';

// ============================================================
// Génération du paquet Score complet (30 cartes)
// ============================================================

function makeScoreCard(
  id: number,
  value: number,
  specialEffect: SpecialEffect,
  displayValue: string,
  bonusStars: number = 0,
  forceType?: ScoreCardType
): ScoreCard {
  const type: ScoreCardType = forceType ??
    (specialEffect !== null ? 'special' : value >= 0 ? 'positive' : 'negative');
  return { id, value, type, specialEffect, displayValue, appliedDouble: false, bonusStars };
}

export function buildFullScoreDeck(): ScoreCard[] {
  return [
    // --- Cartes positives (+) ---
    makeScoreCard(1, 5, null, '+5'),
    makeScoreCard(2, 5, null, '+5'),
    makeScoreCard(3, 4, null, '+4'),
    makeScoreCard(4, 4, null, '+4'),
    makeScoreCard(5, 3, null, '+3'),
    makeScoreCard(6, 3, null, '+3'),
    makeScoreCard(7, 3, null, '+3'),
    makeScoreCard(8, 2, null, '+2'),
    makeScoreCard(9, 2, null, '+2'),
    makeScoreCard(10, 2, null, '+2'),
    makeScoreCard(11, 2, null, '+2'),
    makeScoreCard(12, 1, null, '+1'),
    makeScoreCard(13, 1, null, '+1'),
    makeScoreCard(14, 1, null, '+1'),
    makeScoreCard(15, 1, null, '+1'),
    // --- Cartes négatives (-) avec étoiles bonus ---
    makeScoreCard(16, -1, null, '-1⭐', 1), // -1 pt + 1 étoile immédiate
    makeScoreCard(17, -1, null, '-1⭐', 1),
    makeScoreCard(18, -1, null, '-1⭐', 1),
    makeScoreCard(19, -1, null, '-1⭐', 1),
    makeScoreCard(20, -2, null, '-2⭐⭐', 2), // -2 pts + 2 étoiles immédiates
    makeScoreCard(21, -2, null, '-2⭐⭐', 2),
    makeScoreCard(22, -2, null, '-2⭐⭐', 2),
    makeScoreCard(23, -3, null, '-3'),
    makeScoreCard(24, -5, null, '-5'),
    // --- Cartes spéciales : 1 verte + 1 rouge chacune ---
    // VOL : défausse la carte, donne 2 étoiles immédiates, vole 1 carte score chez un adversaire
    makeScoreCard(25, 0, 'STEAL', '🦅', 2, 'positive'), // verte
    makeScoreCard(26, 0, 'STEAL', '🦅', 2, 'negative'), // rouge
    // DOUBLE (×2) : multiplie la dernière carte score gagnée
    makeScoreCard(27, 0, 'DOUBLE', '×2', 0, 'positive'), // verte
    makeScoreCard(28, 0, 'DOUBLE', '×2', 0, 'negative'), // rouge
    // SWAP (⇄) : défausse la carte, choisit 2 joueurs et échange leurs cartes du sommet
    makeScoreCard(29, 0, 'SWAP', '⇄', 0, 'positive'), // verte
    makeScoreCard(30, 0, 'SWAP', '⇄', 0, 'negative'), // rouge
  ];
}

// ============================================================
// Mélange (Fisher-Yates)
// ============================================================
export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// Prépare le paquet Score pour une partie
// Mélange + écarte aléatoirement les cartes non utilisées
// ============================================================
export function prepareScoreDeck(playerCount: number): ScoreCard[] {
  const config = GAME_CONFIGS[playerCount];
  if (!config) throw new Error(`Nombre de joueurs invalide : ${playerCount}`);

  const full = shuffle(buildFullScoreDeck());
  // Écarter les N premières cartes (aléatoire car déjà mélangé)
  return full.slice(config.scoreCardsDiscarded);
}

// ============================================================
// Génère la main d'un joueur selon le nombre de joueurs
// ============================================================
export function buildPlayerHand(playerCount: number): number[] {
  const config = GAME_CONFIGS[playerCount];
  if (!config) throw new Error(`Nombre de joueurs invalide : ${playerCount}`);

  const hand: number[] = [];
  for (let i = 1; i <= config.maxCardValue; i++) {
    hand.push(i);
  }
  return hand;
}

// ============================================================
// Mélange la main d'un joueur et retire la carte mystère
// Retourne { shuffledHand, mysteryCard }
// ============================================================
export function drawMysteryCard(hand: number[]): {
  newHand: number[];
  mysteryCard: number;
} {
  const shuffled = shuffle(hand);
  const mysteryCard = shuffled[0];
  const newHand = shuffled.slice(1);
  return { newHand, mysteryCard };
}

// ============================================================
// Pioche N cartes Score depuis le paquet (modifie le tableau)
// ============================================================
export function drawScoreCards(deck: ScoreCard[], count: number): ScoreCard[] {
  if (deck.length < count) {
    throw new Error(`Pas assez de cartes Score : ${deck.length} < ${count}`);
  }
  return deck.splice(0, count);
}
