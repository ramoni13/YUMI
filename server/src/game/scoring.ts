import { ScoreCard, FinalScore, Player } from '../types';

// ============================================================
// Calcul du score d'un joueur à partir de sa pile de cartes Score
// Les effets ×2 ont déjà été appliqués (appliedDouble = true)
// ============================================================
export function computeScoreFromPile(pile: ScoreCard[]): number {
  return pile.reduce((total, card) => {
    if (card.specialEffect !== null) return total; // spéciales = 0 pts
    return total + card.value;
  }, 0);
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
// Bonus étoile de fin de manche
// Retourne les IDs des joueurs ayant une valeur unique
// ============================================================
export function computeBonusStars(
  lastCards: Record<string, number>
): string[] {
  // Compter les occurrences de chaque valeur
  const valueCounts = new Map<number, number>();
  for (const value of Object.values(lastCards)) {
    valueCounts.set(value, (valueCounts.get(value) ?? 0) + 1);
  }

  // Joueurs avec une valeur unique
  return Object.entries(lastCards)
    .filter(([, value]) => valueCounts.get(value) === 1)
    .map(([playerId]) => playerId);
}

const STAR_BONUS = 5; // Bonus pour le joueur majoritaire en étoiles

// ============================================================
// Calcul du classement final
//
// Règles étoiles :
//   stars         = étoiles cartes Score (-1⭐, -2⭐⭐, VOL)
//                   → comptent pour la majorité uniquement (pas de +1 pt)
//   rechargeStars = étoiles Recharge
//                   → comptent pour la majorité ET +1 pt chacune
//   totalStars    = stars + rechargeStars → détermine le majoritaire
//   starBonus     = +5 pts pour le joueur avec le plus de totalStars
//   totalScore    = scoreFromCards + rechargeStars + starBonus
// ============================================================
export function computeFinalScores(players: Player[]): FinalScore[] {
  // 1. Calculer le total d'étoiles de chaque joueur (les deux sources)
  const totals = players.map(p => p.stars + p.rechargeStars);
  const maxTotalStars = Math.max(...totals);

  // 2. Joueurs majoritaires (peuvent être plusieurs en cas d'égalité)
  const starBonusWinners = new Set(
    players
      .filter(p => (p.stars + p.rechargeStars) === maxTotalStars)
      .map(p => p.id)
  );

  // 3. Calculer les scores
  const scores: FinalScore[] = players.map(player => {
    const scoreFromCards = computeScoreFromPile(player.scorePile);
    const totalStars = player.stars + player.rechargeStars;
    const starBonus = starBonusWinners.has(player.id) ? STAR_BONUS : 0;
    // rechargeStars valent +1 pt chacune ; stars cartes ne valent rien
    const totalScore = scoreFromCards + player.rechargeStars + starBonus;
    return {
      playerId: player.id,
      pseudo: player.pseudo,
      color: player.color,
      scoreFromCards,
      stars: player.stars,
      rechargeStars: player.rechargeStars,
      totalStars,
      starBonus,
      totalScore,
      rank: 0,
    };
  });

  // 4. Trier par score total décroissant, puis par totalStars en cas d'égalité
  scores.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return b.totalStars - a.totalStars;
  });

  // 5. Attribuer les rangs (ex-aequo possible)
  let rank = 1;
  for (let i = 0; i < scores.length; i++) {
    if (i > 0) {
      const prev = scores[i - 1];
      const curr = scores[i];
      if (curr.totalScore === prev.totalScore && curr.totalStars === prev.totalStars) {
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
