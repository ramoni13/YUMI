import { ScoreCard, FinalScore, Player, VICTORY_POINTS_TO_WIN } from '../types';

// ============================================================
// Calcul du score d'un joueur à partir de sa pile de cartes Score
// Toutes les cartes ont une valeur (y compris les spéciales)
// Les effets ×2 ont déjà été appliqués en cours de partie
// ============================================================
export function computeScoreFromPile(pile: ScoreCard[]): number {
  return pile.reduce((total, card) => total + card.value, 0);
}

// ============================================================
// X2 : double la value ET les bonusStars de la dernière carte
// gagnee (= l'avant-dernière de la pile, juste avant la X2).
// Si cette carte est spéciale → effet perdu.
// Retourne extraStars = bonusStars originaux à créditer en plus
// sur player.stars (déjà crédités une fois au gain de la cible).
// ============================================================
export function applyDouble(pile: ScoreCard[]): { newPile: ScoreCard[]; extraStars: number } {
  if (pile.length < 2) return { newPile: [...pile], extraStars: 0 };
  const newPile = [...pile];
  const targetIdx = newPile.length - 2;
  const target = newPile[targetIdx];
  if (target.specialEffect !== null) return { newPile, extraStars: 0 };
  const originalStars = target.bonusStars;
  newPile[targetIdx] = {
    ...target,
    value: target.value * 2,
    bonusStars: target.bonusStars * 2,
    appliedDouble: true,
  };
  return { newPile, extraStars: originalStars };
}

/** X2 applicable : pile ≥ 2 cartes ET l'avant-dernière est numérique. */
export function canApplyDouble(pile: ScoreCard[]): boolean {
  if (pile.length < 2) return false;
  return pile[pile.length - 2].specialEffect === null;
}

// ============================================================
// INVERSION : négate la value (×-1) de la dernière carte gagnee
// (= l'avant-dernière de la pile, juste avant l'INVERSION).
// Si cette carte est spéciale → effet perdu.
// Les bonusStars et bonusPoints ne sont PAS modifiés.
// ============================================================
export function applyInversion(pile: ScoreCard[]): ScoreCard[] {
  if (pile.length < 2) return [...pile];
  const newPile = [...pile];
  const targetIdx = newPile.length - 2;
  const target = newPile[targetIdx];
  if (target.specialEffect !== null) return newPile;
  newPile[targetIdx] = { ...target, value: target.value * -1 };
  return newPile;
}

/** INVERSION applicable : pile ≥ 2 cartes ET l'avant-dernière est numérique. */
export function canApplyInversion(pile: ScoreCard[]): boolean {
  if (pile.length < 2) return false;
  return pile[pile.length - 2].specialEffect === null;
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
// Règle d'annulation pour les points de victoire :
// Si 2 joueurs ou plus sont à égalité en tête, ils s'annulent
// et le point de victoire va au joueur suivant (3ème valeur).
// Retourne l'ID du gagnant du point de victoire, ou null si
// tous les joueurs sont à égalité (personne ne gagne).
// ============================================================
export function resolveVictoryPointWinner(
  players: Player[],
  getValue: (p: Player) => number
): string | null {
  // Trier par valeur décroissante
  const sorted = [...players].sort((a, b) => getValue(b) - getValue(a));

  // Parcourir les groupes de valeurs identiques par ordre décroissant.
  // Un groupe avec 1 seul joueur = ce joueur gagne le PV.
  // Un groupe avec 2+ joueurs = ils s'annulent, on passe au groupe suivant.
  // Si tous les groupes sont des doublons = null (personne ne gagne).
  let i = 0;
  while (i < sorted.length) {
    const currentValue = getValue(sorted[i]);
    // Trouver tous les joueurs ayant cette valeur
    let j = i;
    while (j < sorted.length && getValue(sorted[j]) === currentValue) {
      j++;
    }
    const groupSize = j - i;
    if (groupSize === 1) {
      // Valeur unique dans ce groupe : ce joueur gagne
      return sorted[i].id;
    }
    // Doublon ou plus : ce groupe s'annule, passer au suivant
    i = j;
  }

  // Tous les groupes étaient des doublons : personne ne gagne
  return null;
}

// ============================================================
// Calcul des points de victoire de fin de manche
// 3 catégories : étoiles, points cartes, points bonus
// Règle d'annulation : si 2 joueurs à égalité en tête,
// le point va au joueur suivant (ou personne si tous à égalité)
// ============================================================
export function computeRoundVictoryPoints(
  players: Player[]
): {
  starsVPWinner: string | null;
  cardScoreVPWinner: string | null;
  bonusVPWinner: string | null;
} {
  const starsVPWinner = resolveVictoryPointWinner(
    players,
    p => p.stars
  );

  const cardScoreVPWinner = resolveVictoryPointWinner(
    players,
    p => computeScoreFromPile(p.scorePile)
  );

  const bonusVPWinner = resolveVictoryPointWinner(
    players,
    p => p.bonusPoints
  );

  return { starsVPWinner, cardScoreVPWinner, bonusVPWinner };
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
// Calcul du classement final (nouveau système — mode classic)
//
// Le classement est basé sur les points de victoire accumulés.
// En cas d'égalité à 3+ points de victoire, une nouvelle manche
// est jouée (géré dans engine.ts).
// ============================================================
export function computeFinalScores(players: Player[]): FinalScore[] {
  const scores: FinalScore[] = players.map(player => {
    const scoreFromCards = computeScoreFromPile(player.scorePile);
    return {
      playerId: player.id,
      pseudo: player.pseudo,
      color: player.color,
      scoreFromCards,
      bonusPoints: player.bonusPoints,
      stars: player.stars,
      starBonus: 0,
      totalScore: scoreFromCards + player.bonusPoints,
      victoryPoints: player.victoryPoints,
      rank: 0,
    };
  });

  // Trier par points de victoire décroissants, puis par score total en cas d'égalité
  scores.sort((a, b) => {
    if (b.victoryPoints !== a.victoryPoints) return b.victoryPoints - a.victoryPoints;
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    return b.stars - a.stars;
  });

  // Attribuer les rangs (ex-aequo possible)
  let rank = 1;
  for (let i = 0; i < scores.length; i++) {
    if (i > 0) {
      const prev = scores[i - 1];
      const curr = scores[i];
      if (curr.victoryPoints === prev.victoryPoints && curr.totalScore === prev.totalScore) {
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

// ============================================================
// Vérifie si la partie est terminée (mode classic)
// La partie se termine quand un seul joueur atteint
// VICTORY_POINTS_TO_WIN points de victoire.
// Si plusieurs joueurs sont à égalité au seuil, on continue.
// ============================================================
export function checkGameOver(players: Player[]): boolean {
  const maxVP = Math.max(...players.map(p => p.victoryPoints));
  if (maxVP < VICTORY_POINTS_TO_WIN) return false;

  // Compter combien de joueurs ont atteint le seuil
  const leadersCount = players.filter(p => p.victoryPoints === maxVP).length;

  // Fin de partie seulement si un seul joueur est en tête
  return leadersCount === 1;
}
