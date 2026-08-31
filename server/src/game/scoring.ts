import { ScoreCard, FinalScore, Player, STAR_MAJORITY_BONUS } from '../types';

// ============================================================
// Calcul du score d'un joueur à partir de sa pile de cartes Score
// Toutes les cartes ont une valeur (y compris les spéciales)
// Les effets ×2 ont déjà été appliqués en cours de partie
// ============================================================
export function computeScoreFromPile(pile: ScoreCard[]): number {
  return pile.reduce((total, card) => total + card.value, 0);
}

// ============================================================
// Applique l'effet ×2 sur la carte au sommet de la pile
// (la dernière carte Score gagnee AVANT le ×2).
// Si cette carte est spéciale ou déjà doublée → effet perdu.
// ============================================================
/**
 * Applique l'effet ×2 sur la dernière carte numérique de la pile
 * (en remontant depuis le sommet, en ignorant les cartes spéciales).
 * C'est la dernière carte Score numérique gagnee AVANT le ×2.
 * Un second ×2 sur une carte déjà doublée est autorisé (×2 sur ×2 = ×4).
 */
export function applyDouble(pile: ScoreCard[]): ScoreCard[] {
  if (pile.length === 0) return pile;
  const newPile = [...pile];
  // Remonter depuis le sommet pour trouver la dernière carte numérique
  for (let i = newPile.length - 1; i >= 0; i--) {
    if (newPile[i].specialEffect === null) {
      newPile[i] = {
        ...newPile[i],
        value: newPile[i].value * 2,
        appliedDouble: true,
      };
      return newPile;
    }
  }
  // Aucune carte numérique dans la pile → effet perdu
  return newPile;
}

/**
 * Vérifie si le ×2 peut s'appliquer :
 * la pile doit contenir au moins une carte numérique (non spéciale).
 */
export function canApplyDouble(pile: ScoreCard[]): boolean {
  return pile.some(c => c.specialEffect === null);
}

// ============================================================
// Échange les dernières cartes Score visibles entre deux joueurs
// Retourne les deux piles modifiées.
// ============================================================
export function applySwap(
  pileA: ScoreCard[],
  pileB: ScoreCard[]
): { newPileA: ScoreCard[]; newPileB: ScoreCard[] } {
  if (pileA.length === 0 || pileB.length === 0) {
    return { newPileA: pileA, newPileB: pileB };
  }
  const newPileA = [...pileA];
  const newPileB = [...pileB];
  const topA = newPileA[newPileA.length - 1];
  const topB = newPileB[newPileB.length - 1];
  newPileA[newPileA.length - 1] = topB;
  newPileB[newPileB.length - 1] = topA;
  return { newPileA, newPileB };
}

// ============================================================
// Bonus étoile de fin de manche (mode classic)
// Retourne les IDs des joueurs ayant une valeur unique
// ============================================================
export function computeBonusStars(
  lastCards: Record<string, number>
): string[] {
  const valueCounts = new Map<number, number>();
  for (const value of Object.values(lastCards)) {
    valueCounts.set(value, (valueCounts.get(value) ?? 0) + 1);
  }
  return Object.entries(lastCards)
    .filter(([, value]) => valueCounts.get(value) === 1)
    .map(([playerId]) => playerId);
}

// ============================================================
// Applique la TAXE : vole jusqu'à 2 points bonus à une cible
// Retourne le nombre réellement volé
// ============================================================
export function applyTaxe(
  thief: Player,
  victim: Player,
  amount: number = 2
): number {
  const stolen = Math.min(amount, victim.bonusPoints);
  victim.bonusPoints -= stolen;
  thief.bonusPoints += stolen;
  return stolen;
}

// ============================================================
// Calcul du classement final
//
// Score total = scoreFromCards + bonusPoints + starBonus
//   scoreFromCards = somme des valeurs de la pile Score
//   bonusPoints    = jetons bonus cumulés en cours de partie
//   starBonus      = +5 pts pour le joueur avec le plus d'étoiles
//                    (en cas d'égalité d'étoiles, tous les ex-aequo reçoivent le bonus)
// ============================================================
export function computeFinalScores(players: Player[]): FinalScore[] {
  // 1. Trouver le maximum d'étoiles
  const maxStars = Math.max(...players.map(p => p.stars));

  // 2. Joueurs majoritaires (tous ceux à égalité au maximum)
  const starBonusWinners = new Set(
    players.filter(p => p.stars === maxStars).map(p => p.id)
  );

  // 3. Calculer les scores
  const scores: FinalScore[] = players.map(player => {
    const scoreFromCards = computeScoreFromPile(player.scorePile);
    const starBonus = starBonusWinners.has(player.id) ? STAR_MAJORITY_BONUS : 0;
    const totalScore = scoreFromCards + player.bonusPoints + starBonus;
    return {
      playerId: player.id,
      pseudo: player.pseudo,
      color: player.color,
      scoreFromCards,
      bonusPoints: player.bonusPoints,
      stars: player.stars,
      starBonus,
      totalScore,
      rank: 0,
    };
  });

  // 4. Trier par score total décroissant, puis par étoiles en cas d'égalité
  scores.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return b.stars - a.stars;
  });

  // 5. Attribuer les rangs (ex-aequo possible)
  let rank = 1;
  for (let i = 0; i < scores.length; i++) {
    if (i > 0) {
      const prev = scores[i - 1];
      const curr = scores[i];
      if (curr.totalScore === prev.totalScore && curr.stars === prev.stars) {
        scores[i].rank = prev.rank;
      } else {
        rank = i + 1;
        scores[i].rank = rank;
      }
    } else {
      scores[i].rank = rank;
    }
  }

  return scores;
}
