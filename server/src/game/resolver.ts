// ============================================================
// YUMI — Résolution du pli
// ============================================================

import { GameOptions, ScoreCardType } from '../types';

export interface TrickResult {
  winnerId: string | null;   // null = carte Score défaussée
  cancelledValues: number[];
  discarded: boolean;
}

/**
 * Résout un pli selon les règles YUMI standard :
 * 1. La valeur la plus haute remporte la carte Score.
 * 2. Les doublons s'annulent.
 * 3. Si tout s'annule sauf le 1 → le 1 gagne.
 * 4. Si le 1 est aussi en doublon → carte Score défaussée.
 *
 * Avec l'option colorRule activée :
 * - Carte verte (type 'positive') → gagnée par la valeur la PLUS GRANDE sans doublon.
 * - Carte rouge (type 'negative') → gagnée par la valeur la PLUS PETITE sans doublon.
 *   Cela s'applique aux cartes numériques ET aux cartes spéciales rouges.
 *
 * @param playedCards    Map joueur_id → valeur jouée
 * @param options        Options de la partie
 * @param scoreCardType  Type de la carte Score active ('positive' | 'negative' | 'special')
 */
export function resolveTrick(
  playedCards: Record<string, number>,
  options?: GameOptions,
  scoreCardType?: ScoreCardType
): TrickResult {
  // Regrouper par valeur : valeur → [joueur_id, ...]
  const byValue = new Map<number, string[]>();
  for (const [playerId, value] of Object.entries(playedCards)) {
    if (!byValue.has(value)) byValue.set(value, []);
    byValue.get(value)!.push(playerId);
  }

  // Déterminer l'ordre de tri selon l'option colorRule :
  // - colorRule actif + carte rouge (negative) → plus petite valeur gagne → tri croissant
  // - Tout le reste (carte verte, pas d'option) → plus grande valeur gagne → tri décroissant
  // Les cartes spéciales ont un type 'positive' (verte) ou 'negative' (rouge) — même règle.
  const smallestWins = options?.colorRule === true && scoreCardType === 'negative';
  const sortedValues = [...byValue.keys()].sort((a, b) => smallestWins ? a - b : b - a);

  const cancelledValues: number[] = [];

  for (const value of sortedValues) {
    const players = byValue.get(value)!;
    if (players.length === 1) {
      // Valeur unique → ce joueur gagne
      return {
        winnerId: players[0],
        cancelledValues,
        discarded: false,
      };
    } else {
      // Doublon → annulée
      cancelledValues.push(value);
    }
  }

  // Toutes les valeurs sont annulées → défausse
  return {
    winnerId: null,
    cancelledValues,
    discarded: true,
  };
}
