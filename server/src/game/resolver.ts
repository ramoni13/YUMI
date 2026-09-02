// ============================================================
// YUMI — Résolution du pli
// ============================================================

import { GameOptions, GainType, YUMI_CARD_VALUE, RECHARGE_CARD_VALUE } from '../types';

export interface TrickResult {
  winnerId: string | null;   // null = carte Score défaussée
  cancelledValues: number[];
  discarded: boolean;
}

/**
 * Résout un pli selon les règles YUMI standard :
 * 1. La valeur la plus haute (ou la plus basse selon gain) remporte la carte Score.
 * 2. Les doublons s'annulent en cascade.
 * 3. Si toutes les valeurs sont annulées → carte Score défaussée.
 *
 * Avec l'option colorRule activée :
 *   Gain '+' (vert)  → plus GRANDE valeur sans doublon gagne.
 *   Gain '-' (rouge) → plus PETITE valeur sans doublon gagne.
 * La couleur est découplée de la valeur : une carte +4 peut être rouge (gain '-').
 *
 * @param playedCards  Map joueur_id → valeur jouée
 * @param options      Options de la partie
 * @param gain         Condition de victoire de la carte Score active ('+' | '-')
 * @param inverted     Si true (effet INVERSION), la condition est inversée
 */
export function resolveTrick(
  playedCards: Record<string, number>,
  options?: GameOptions,
  gain?: GainType,
  inverted: boolean = false
): TrickResult {
  // --- Résolution de la valeur effective de la carte YUMI ---
  // La YUMI (valeur brute 9 en main) prend la valeur la plus avantageuse :
  //   gain '+' (grande gagne) → vaut 9 (la plus haute possible)
  //   gain '-' (petite gagne) → vaut -1 (sentinelle interne, plus basse que toute carte normale)
  // On utilise -1 et non 0 pour éviter toute collision avec RECHARGE_CARD_VALUE=0
  // (les Recharges sont déjà filtrées avant d'appeler resolveTrick, mais par sécurité).
  // Deux YUMI s'annulent naturellement (même valeur effective → doublon).
  let smallestWinsForYumi = gain === '-';
  if (inverted) smallestWinsForYumi = !smallestWinsForYumi;
  // Sentinelle interne : -1 pour gain '-', 9 pour gain '+'
  const YUMI_SENTINEL = smallestWinsForYumi ? -1 : YUMI_CARD_VALUE;

  // Remplacer la valeur YUMI par sa sentinelle dans une copie pour le tri
  const resolvedCards: Record<string, number> = {};
  for (const [pid, val] of Object.entries(playedCards)) {
    resolvedCards[pid] = val === YUMI_CARD_VALUE ? YUMI_SENTINEL : val;
  }

  // Regrouper par valeur résolue : valeur → [joueur_id, ...]
  const byValue = new Map<number, string[]>();
  for (const [playerId, value] of Object.entries(resolvedCards)) {
    if (!byValue.has(value)) byValue.set(value, []);
    byValue.get(value)!.push(playerId);
  }

  // Déterminer la condition de victoire :
  // - colorRule désactivé → toujours la plus grande valeur
  // - colorRule actif     → gain '+' = grande, gain '-' = petite
  // - INVERSION           → inverse la condition
  let smallestWins = false;
  if (options?.colorRule !== false) {
    smallestWins = gain === '-';
  }
  if (inverted) smallestWins = !smallestWins;

  const sortedValues = [...byValue.keys()].sort((a, b) => smallestWins ? a - b : b - a);
  const cancelledValues: number[] = [];

  for (const value of sortedValues) {
    const players = byValue.get(value)!;
    if (players.length === 1) {
      return { winnerId: players[0], cancelledValues, discarded: false };
    } else {
      // Restituer la valeur brute dans cancelledValues :
      // si la sentinelle YUMI (-1 ou 9) est annulée, on remet YUMI_CARD_VALUE (9)
      // pour que le client puisse identifier la carte correctement.
      const rawValue = value === YUMI_SENTINEL ? YUMI_CARD_VALUE : value;
      cancelledValues.push(rawValue);
    }
  }

  return { winnerId: null, cancelledValues, discarded: true };
}
