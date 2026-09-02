import React from 'react';
import type { ScoreCard } from '../../types';
import styles from './Card.module.css';

interface ScoreCardDisplayProps {
  card: ScoreCard | null; // null = face cachée
  size?: 'sm' | 'md' | 'lg';
  highlighted?: boolean;
  discarded?: boolean;
}

export function ScoreCardDisplay({ card, size = 'md', highlighted, discarded }: ScoreCardDisplayProps) {
  if (!card) {
    return (
      <div className={`${styles.scoreCard} ${styles.faceDown} ${styles[size]}`}>
        <span className={styles.cardBack}>?</span>
      </div>
    );
  }

  // Couleur de la carte :
  // - Spéciale verte (type positive) → vert
  // - Spéciale rouge (type negative) → rouge
  // - Numérique positive → vert
  // - Numérique négative → rouge
  // Couleur : gain '+' = vert, gain '-' = rouge
  const typeClass = card.gain === '+' ? styles.positive : styles.negative;

  const isSpecial = card.specialEffect !== null;
  const hasStars = card.bonusStars !== 0;
  const starStr = '⭐'.repeat(Math.abs(card.bonusStars));
  // Affichage de la valeur score (ex: "+1", "-3", "0") — utile surtout pour les spéciales
  const scoreStr = card.value > 0 ? `+${card.value}` : card.value === 0 ? '' : `${card.value}`;

  return (
    <div
      className={`
        ${styles.scoreCard}
        ${styles[size]}
        ${typeClass}
        ${highlighted ? styles.highlighted : ''}
        ${discarded ? styles.discarded : ''}
      `}
    >
      {/* Nom de la carte (centre) */}
      <span className={styles.cardName}>{card.displayName}</span>

      {/* Score de la carte (en bas, visible surtout pour les spéciales) */}
      {isSpecial && scoreStr !== '' && (
        <span className={styles.cardScore}>{scoreStr}</span>
      )}

      {/* Étoiles bonus */}
      {hasStars && (
        <span className={styles.cardStars}>
          {card.bonusStars < 0 ? '-' : '+'}{starStr}
        </span>
      )}

      {/* Points bonus immédiats (JACKPOT = gain fixe, TAXE = vol) */}
      {card.bonusPoints > 0 && (
        <span className={styles.bonusBadge}>
          {card.specialEffect === 'TAXE' ? `×${card.bonusPoints}🪙` : `+${card.bonusPoints}🪙`}
        </span>
      )}

      {/* Indicateur doublement appliqué */}
      {card.appliedDouble && (
        <span className={styles.doubledBadge}>×2✓</span>
      )}
    </div>
  );
}
