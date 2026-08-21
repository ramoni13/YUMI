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
  const typeClass = card.specialEffect
    ? card.type === 'positive' ? styles.specialGreen : styles.specialRed
    : card.value > 0
    ? styles.positive
    : styles.negative;

  // Affichage de la valeur : séparer les étoiles sur une 2ème ligne si besoin
  const hasStars = card.bonusStars > 0;
  const starStr = '⭐'.repeat(card.bonusStars);
  const baseValue = card.displayValue.replace(/⭐/g, '').trim();

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
      {hasStars ? (
        <>
          <span className={styles.cardValue}>{baseValue}</span>
          <span className={styles.cardStars}>{starStr}</span>
        </>
      ) : (
        <span className={styles.cardValue}>{card.displayValue}</span>
      )}
      {card.appliedDouble && <span className={styles.doubledBadge}>×2✓</span>}
    </div>
  );
}
