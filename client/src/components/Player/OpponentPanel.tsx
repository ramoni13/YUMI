import React from 'react';
import type { PublicPlayer } from '../../types';
import { ScoreCardDisplay } from '../Card/ScoreCardDisplay';
import { useT } from '../../hooks/useT';
import styles from './Player.module.css';

const COLOR_HEX: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e',
  yellow: '#eab308', purple: '#a855f7', orange: '#f97316',
};

// Les IDs de bots commencent par "bot_"
function isBot(playerId: string): boolean {
  return playerId.startsWith('bot_');
}

interface OpponentPanelProps {
  player: PublicPlayer;
  /** Si true, masque la dernière carte jouée (mène en cours, avant révélation) */
  hideCurrentCard?: boolean;
  isStealTarget?: boolean;
  onStealSelect?: (id: string) => void;
}

export function OpponentPanel({
  player, hideCurrentCard = false, isStealTarget, onStealSelect,
}: OpponentPanelProps) {
  const visibleHistory = hideCurrentCard && player.hasPlayedCard && player.playedHistory.length > 0
    ? player.playedHistory.slice(0, -1)
    : player.playedHistory;
  const t = useT();
  const bot = isBot(player.id);
  const isClickable = isStealTarget && !!onStealSelect;

  const handleClick = () => {
    if (isStealTarget && onStealSelect) onStealSelect(player.id);
  };

  return (
    <div
      className={`
        ${styles.opponent}
        ${isStealTarget ? styles.stealTarget : ''}
        ${bot ? styles.botOpponent : ''}
      `}
      style={{ borderColor: COLOR_HEX[player.color] }}
      onClick={isClickable ? handleClick : undefined}
    >
      <div className={styles.opponentHeader}>
        <span className={styles.colorDot} style={{ background: COLOR_HEX[player.color] }} />
        <span className={styles.pseudo}>{player.pseudo}</span>
        {bot && <span className={styles.botBadge}>BOT</span>}
        {!player.isConnected && !bot && <span className={styles.disconnected}>⚠</span>}
      </div>

      {/* Stats redondantes avec le bandeau du haut — masquées
      <div className={styles.opponentStats}>
        <div className={styles.statsRow}>
          <span className={styles.victoryPoints} title={t.opponent.titleVP}>
            {Array.from({ length: 3 }, (_, i) => (
              <span key={i} style={{ color: i < player.victoryPoints ? '#fbbf24' : 'rgba(255,255,255,0.15)', fontSize: '0.75rem' }}>★</span>
            ))}
          </span>
          <span className={styles.cardScore} title={t.opponent.titleCardScore}>
            🃏 {player.scoreFromCards > 0 ? '+' : ''}{player.scoreFromCards}
          </span>
        </div>
        <div className={styles.statsRow}>
          <span className={styles.stars} title={t.opponent.titleStars}>⭐ {player.stars}</span>
          {player.bonusPoints > 0 && <span className={styles.bonus} title={t.opponent.titleBonus}>🪙 {player.bonusPoints}</span>}
          <span className={styles.handCount}>✋ {player.handCount}</span>
          {player.hasPlayedCard && <span className={styles.played}>✓</span>}
        </div>
      </div>
      */}

      <div className={styles.scorePile}>
        {player.topScoreCard ? (
          <ScoreCardDisplay card={player.topScoreCard} size="sm" />
        ) : (
          <div className={styles.emptyPile}>—</div>
        )}
        {player.scorePileCount > 1 && (
          <span className={styles.pileCount}>+{player.scorePileCount - 1}</span>
        )}
      </div>

      {/* Cartes jouées lors des mènes précédentes (utiles pour la déduction).
          La carte de la mène en cours est masquée jusqu'à la révélation. */}
      {visibleHistory && visibleHistory.length > 0 && (
        <div className={styles.playedHistory}>
          <span className={styles.playedHistoryLabel}>{t.opponent.playedLabel}</span>
          <div className={styles.playedHistoryCards}>
            {visibleHistory.map((v, i) => (
              <span key={i} className={styles.playedHistoryCard}>{v}</span>
            ))}
          </div>
        </div>
      )}

      {isStealTarget && <div className={styles.stealOverlay}>{t.opponent.stealOverlay}</div>}
    </div>
  );
}
