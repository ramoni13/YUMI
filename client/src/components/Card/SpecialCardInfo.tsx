import React from 'react';
import type { SpecialEffect, ScoreCard } from '../../types';
import { useT } from '../../hooks/useT';
import styles from './SpecialCardInfo.module.css';

// ============================================================
// Composant principal
// ============================================================
interface SpecialCardInfoProps {
  card: ScoreCard;
}

export function SpecialCardInfo({ card }: SpecialCardInfoProps) {
  const t = useT();

  if (!card.specialEffect) return null;

  const effectKey = card.specialEffect as NonNullable<SpecialEffect>;
  const info = t.specialCards[effectKey];
  if (!info) return null;

  const isGreen = card.gain === '+';
  const scoreStr = card.value > 0 ? `+${card.value}` : card.value < 0 ? `${card.value}` : null;

  return (
    <div className={`${styles.panel} ${isGreen ? styles.green : styles.red}`}>
      {/* Header */}
      <div className={styles.header}>
        <span className={styles.icon}>{info.icon}</span>
        <div className={styles.titleBlock}>
          <span className={styles.title}>{info.title}</span>
          <span className={styles.role}>{info.role}</span>
        </div>
        {/* Score / star badges */}
        <div className={styles.badges}>
          {scoreStr && (
            <span className={styles.badge}>{scoreStr} pt</span>
          )}
          {card.bonusStars !== 0 && (
            <span className={styles.badge}>
              {card.bonusStars > 0 ? '+' : ''}{card.bonusStars}⭐
            </span>
          )}
          {card.bonusPoints > 0 && (
            <span className={styles.badge}>
              {card.specialEffect === 'TAXE'
                ? t.specialCards.taxeStolen(card.bonusPoints)
                : `+${card.bonusPoints}🪙`}
            </span>
          )}
          <span className={`${styles.gainBadge} ${isGreen ? styles.gainGreen : styles.gainRed}`}>
            {isGreen ? t.specialCards.gainGreen : t.specialCards.gainRed}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Effect */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>{t.specialCards.effectLabel}</span>
        <p className={styles.sectionText}>{info.how}</p>
      </div>

      {/* Tip */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>{t.specialCards.tipLabel}</span>
        <p className={styles.sectionText}>{info.tip}</p>
      </div>
    </div>
  );
}
