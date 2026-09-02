import React from 'react';
import type { PlayerColor } from '../../types';
import { YUMI_CARD_VALUE } from '../../types';
import styles from './Card.module.css';

interface PlayerCardProps {
  value: number;
  color: PlayerColor;
  selected?: boolean;
  disabled?: boolean;
  faceDown?: boolean;
  cancelled?: boolean;
  winner?: boolean;
  onClick?: () => void;
}

export function PlayerCard({
  value,
  color,
  selected,
  disabled,
  faceDown,
  cancelled,
  winner,
  onClick,
}: PlayerCardProps) {
  return (
    <div
      className={`
        ${styles.playerCard}
        ${value === YUMI_CARD_VALUE ? styles.yumiCard : styles[color]}
        ${selected ? styles.selected : ''}
        ${disabled ? styles.disabled : ''}
        ${faceDown ? styles.faceDown : ''}
        ${cancelled ? styles.cancelled : ''}
        ${winner ? styles.winner : ''}
        ${onClick && !disabled ? styles.clickable : ''}
      `}
      onClick={!disabled && onClick ? onClick : undefined}
    >
      {faceDown ? (
        <span className={styles.cardBack}>?</span>
      ) : value === YUMI_CARD_VALUE ? (
        <span className={styles.yumiLabel}>YUMI</span>
      ) : (
        <span className={styles.cardValue}>{value}</span>
      )}
      {cancelled && <div className={styles.cancelOverlay}>✕</div>}
    </div>
  );
}
