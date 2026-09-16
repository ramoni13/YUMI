import { ScoreCard, GainType, SpecialEffect, GAME_CONFIGS } from '../types';

// ============================================================
// Génération du paquet Score complet (48 cartes)
// 30 cartes numériques + 18 cartes spéciales
// Colonnes : id | value | gain | specialEffect | displayName | bonusPoints | bonusStars
// ============================================================

function card(
  id: number,
  value: number,
  gain: GainType,
  specialEffect: SpecialEffect,
  displayName: string,
  bonusPoints: number = 0,
  bonusStars: number = 0
): ScoreCard {
  return { id, value, gain, specialEffect, displayName, appliedDouble: false, bonusPoints, bonusStars };
}

export function buildFullScoreDeck(): ScoreCard[] {
  const deck: ScoreCard[] = [];

  // -------------------------------------------------------
  // Cartes numériques — 30 cartes
  // N° | Nom  | Score | Bonus | Étoile | Gain | Nb exemplaires
  // -------------------------------------------------------
  // IDs 1-10 : gain '-'
  // IDs 11-20 : gain '+'
  // Nb exemplaires : +5×1, +4×1, +3×1, +2×3, +1×3, -1×2, -2×1, -3×1, -4×1, -5×1

  const numericCards: Array<[number, number, GainType, string, number, number, number]> = [
    // id, value, gain, displayName, bonusPoints, bonusStars, nbExemplaires
    [1, +5, '-', '+5', 0, 0, 1],
    [2, +4, '-', '+4', 0, 0, 1],
    [3, +3, '-', '+3', 0, 0, 1],
    [4, +2, '-', '+2', 0, 1, 3],
    [5, +1, '-', '+1', 0, 2, 3],
    [6, -1, '-', '-1', 0, 2, 2],
    [7, -2, '-', '-2', 0, 2, 1],
    [8, -3, '-', '-3', 0, 3, 1],
    [9, -4, '-', '-4', 0, 3, 1],
    [10, -5, '-', '-5', 0, 3, 1],
    [11, +5, '+', '+5', 0, 0, 1],
    [12, +4, '+', '+4', 0, 0, 1],
    [13, +3, '+', '+3', 0, 0, 1],
    [14, +2, '+', '+2', 0, 1, 3],
    [15, +1, '+', '+1', 0, 2, 3],
    [16, -1, '+', '-1', 0, 2, 2],
    [17, -2, '+', '-2', 0, 2, 1],
    [18, -3, '+', '-3', 0, 2, 1],
    [19, -4, '+', '-4', 0, 3, 1],
    [20, -5, '+', '-5', 0, 3, 1],
  ];

  for (const [id, value, gain, displayName, bonusPoints, bonusStars, nb] of numericCards) {
    for (let i = 0; i < nb; i++) {
      deck.push(card(id, value, gain, null, displayName, bonusPoints, bonusStars));
    }
  }

  // -------------------------------------------------------
  // Cartes spéciales — 18 cartes
  // N° | Nom         | Score | Bonus | Étoile | Gain | Nb exemplaires
  // -------------------------------------------------------
  // ID 21 : X2          score 0  2pts bonus  0⭐  gain-  ×1
  // ID 22 : X2          score 0  2pts bonus  0⭐  gain+  ×2
  // ID 23 : VOL         score 0  2pts bonus  0⭐  gain-  ×1
  // ID 24 : VOL         score 0  2pts bonus  0⭐  gain+  ×2
  // ID 25 : YUMI        score 0  2pts bonus  0⭐  gain-  ×1
  // ID 26 : YUMI        score 0  2pts bonus  0⭐  gain+  ×2
  // ID 27 : RECYCLAGE   score 0  2pts bonus  0⭐  gain-  ×1
  // ID 28 : RECYCLAGE   score 0  2pts bonus  0⭐  gain+  ×2
  // ID 29 : INVERSION   score 0  2pts bonus  0⭐  gain-  ×1
  // ID 30 : INVERSION   score 0  2pts bonus  0⭐  gain+  ×2
  // ID 31 : FIFTY-FIFTY score 0  2pts bonus  3⭐  gain-  ×1
  // ID 32 : JACKPOT     score 0  5pts bonus  0⭐  gain+  ×1
  // ID 33 : CONSTELLATION score 0  0pts bonus  5⭐  gain-  ×1
  // -------------------------------------------------------
  deck.push(card(21, 0, '-', 'DOUBLE', 'X2', 2, 0));  // ×1
  deck.push(card(22, 0, '+', 'DOUBLE', 'X2', 2, 0));  // ×2
  deck.push(card(22, 0, '+', 'DOUBLE', 'X2', 2, 0));  // ×2
  deck.push(card(23, 0, '-', 'STEAL', 'VOL', 2, 0));  // ×1
  deck.push(card(24, 0, '+', 'STEAL', 'VOL', 2, 0));  // ×2
  deck.push(card(24, 0, '+', 'STEAL', 'VOL', 2, 0));  // ×2
  deck.push(card(25, 0, '-', 'YUMI', 'YUMI', 2, 0));  // ×1
  deck.push(card(26, 0, '+', 'YUMI', 'YUMI', 2, 0));  // ×2
  deck.push(card(26, 0, '+', 'YUMI', 'YUMI', 2, 0));  // ×2
  deck.push(card(27, 0, '-', 'RECYCLAGE', 'RECYCLAGE', 2, 0));  // ×1
  deck.push(card(28, 0, '+', 'RECYCLAGE', 'RECYCLAGE', 2, 0));  // ×2
  deck.push(card(28, 0, '+', 'RECYCLAGE', 'RECYCLAGE', 2, 0));  // ×2
  deck.push(card(29, 0, '-', 'INVERSION', 'INVERSION', 2, 0));  // ×1
  deck.push(card(30, 0, '+', 'INVERSION', 'INVERSION', 2, 0));  // ×2
  deck.push(card(30, 0, '+', 'INVERSION', 'INVERSION', 2, 0));  // ×2
  deck.push(card(31, 0, '-', 'FIFTY_FIFTY', 'FIFTY-FIFTY', 2, 3));  // ×1
  deck.push(card(32, 0, '+', 'JACKPOT', 'JACKPOT', 5, 0));  // ×1
  deck.push(card(33, 0, '-', 'CONSTELLATION', 'CONSTELLATION', 0, 5));  // ×1

  return deck;
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
// Prépare le paquet Score pour une manche (20 cartes aléatoires)
// Le deck complet (48 cartes) est mélangé et on prend les 20 premières cartes.
// ============================================================
export function prepareScoreDeck(_playerCount?: number): ScoreCard[] {
  const full = shuffle(buildFullScoreDeck());
  // On retourne le deck entier mélangé ; drawScoreCards en piochera 20
  return full;
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
