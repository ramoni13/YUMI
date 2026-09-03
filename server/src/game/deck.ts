import { ScoreCard, GainType, SpecialEffect, GAME_CONFIGS } from '../types';

// ============================================================
// Génération du paquet Score complet (48 cartes)
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
  return [
    // -------------------------------------------------------
    // Cartes numériques — 20 cartes
    // N° | Nom  | Score | Bonus | Étoile | Gain
    // -------------------------------------------------------
    card(1, +5, '+', null, '+5'),          // +5  —  —  +
    card(2, +4, '-', null, '+4'),          // +4  —  —  -
    card(3, +3, '+', null, '+3'),          // +3  —  —  +
    card(4, +2, '-', null, '+2', 0, 1),   // +2  —  1⭐ -
    card(5, +1, '+', null, '+1', 0, 2),   // +1  —  2⭐ +
    card(6, -1, '-', null, '-1', 0, 2),   // -1  —  2⭐ -
    card(7, -2, '+', null, '-2', 0, 2),   // -2  —  2⭐ +
    card(8, -3, '-', null, '-3', 0, 3),   // -3  —  3⭐ -
    card(9, -4, '+', null, '-4', 0, 3),   // -4  —  3⭐ +
    card(10, -5, '-', null, '-5', 0, 3),   // -5  —  3⭐ -
    card(11, +5, '-', null, '+5'),          // +5  —  —  -
    card(12, +4, '+', null, '+4'),          // +4  —  —  +
    card(13, +3, '-', null, '+3'),          // +3  —  —  -
    card(14, +2, '+', null, '+2', 0, 1),   // +2  —  1⭐ +
    card(15, +1, '-', null, '+1', 0, 2),   // +1  —  2⭐ -
    card(16, -1, '+', null, '-1', 0, 2),   // -1  —  2⭐ +
    card(17, -2, '-', null, '-2', 0, 2),   // -2  —  2⭐ -
    card(18, -3, '-', null, '-3', 0, 2),   // -3  —  2⭐ -
    card(19, -4, '-', null, '-4', 0, 3),   // -4  —  3⭐ -
    card(20, -5, '+', null, '-5', 0, 3),   // -5  —  3⭐ +
    // -------------------------------------------------------
    // Cartes numériques supplémentaires — 10 cartes (IDs 39-48)
    // 4× +1 (2 gain+, 2 gain-) | 4× +2 (2 gain+, 2 gain-) | 2× -1 (1 gain+, 1 gain-)
    // -------------------------------------------------------
    card(39, +1, '+', null, '+1', 0, 2),   // +1  —  2⭐ +
    card(40, +1, '+', null, '+1', 0, 2),   // +1  —  2⭐ +
    card(41, +1, '-', null, '+1', 0, 2),   // +1  —  2⭐ -
    card(42, +1, '-', null, '+1', 0, 2),   // +1  —  2⭐ -
    card(43, +2, '+', null, '+2', 0, 1),   // +2  —  1⭐ +
    card(44, +2, '+', null, '+2', 0, 1),   // +2  —  1⭐ +
    card(45, +2, '-', null, '+2', 0, 1),   // +2  —  1⭐ -
    card(46, +2, '-', null, '+2', 0, 1),   // +2  —  1⭐ -
    card(47, -1, '+', null, '-1', 0, 2),   // -1  —  2⭐ +
    card(48, -1, '-', null, '-1', 0, 2),   // -1  —  2⭐ -
    // -------------------------------------------------------
    // Cartes spéciales — 18 cartes
    // -------------------------------------------------------
    card(21, 0, '-', 'DOUBLE', 'X2', 0, 1),  // X2       score 0  1⭐  -
    card(22, 0, '+', 'DOUBLE', 'X2', 0, 1),  // X2       score 0  1⭐  +
    card(23, 0, '-', 'STEAL', 'VOL', 0, 1),  // VOL      score 0  1⭐  -
    card(24, 0, '+', 'STEAL', 'VOL', 0, 1),  // VOL      score 0  1⭐  +
    card(25, 0, '-', 'SWAP', 'SWAP', 0, 1),  // SWAP     score 0  1⭐  -
    card(26, 0, '+', 'SWAP', 'SWAP', 0, 1),  // SWAP     score 0  1⭐  +
    card(27, +1, '-', 'PIOCHE', 'PIOCHE', 0, 3),  // PIOCHE   score+1  3⭐  -
    card(28, +2, '+', 'VERROU', 'VERROU', 0, 2),  // VERROU   score+2  2⭐  +
    card(29, +3, '-', 'REVELATION', 'RÉVÉLATION', 0, 1),  // RÉVÉL.   score+3  1⭐  -
    card(30, -1, '+', 'MYSTERE', 'MYSTÈRE', 0, 0),  // MYSTÈRE  score-1  0⭐  +
    card(31, -2, '-', 'SURCHARGE', 'SURCHARGE', 0, 2),  // SURCHARG score-2  2⭐  -
    card(32, -3, '+', 'INVERSION', 'INVERSION', 0, 3),  // INVERS.  score-3  3⭐  +
    card(33, 0, '-', 'CONSTELLATION', 'CONSTELLATION', 0, 5), // CONSTEL. score 0  5⭐  -
    card(34, +1, '+', 'ECLIPSE', 'ECLIPSE', 0, -3),  // ECLIPSE  score+1 -3⭐  + (donné à un adversaire)
    card(35, 0, '-', 'JACKPOT', 'JACKPOT', 3, 0),  // JACKPOT  score 0  +3bonus -
    card(36, 0, '+', 'TAXE', 'TAXE', 2, 0),  // TAXE     score 0  0⭐  + (vole 2 bonus)
    card(37, +1, '-', 'ORACLE', 'ORACLE', 0, 0),  // ORACLE   score+1  0⭐  -
    card(38, -2, '+', 'DEVOILEMENT', 'DÉVOILEMENT', 0, 3),  // DÉVOI.   score-2  3⭐  +
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
// Prépare le paquet Score pour une manche (20 cartes aléatoires)
// Le deck complet est mélangé et on prend les 20 premières cartes.
// Si le deck complet a moins de 20 cartes (impossible avec 48),
// on prend tout ce qui reste.
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
