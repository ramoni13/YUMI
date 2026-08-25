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
  isSwapTarget?: boolean;
  onSwapSelect?: (id: string) => void;
  isStealTarget?: boolean;
  onStealSelect?: (id: string) => void;
}

export function OpponentPanel({ player, isSwapTarget, onSwapSelect, isStealTarget, onStealSelect }: OpponentPanelProps) {
  const t = useT();
  const bot = isBot(player.id);
  const isClickable = (isSwapTarget && !!onSwapSelect) || (isStealTarget && !!onStealSelect);

  const handleClick = () => {
    if (isSwapTarget && onSwapSelect) onSwapSelect(player.id);
    else if (isStealTarget && onStealSelect) onStealSelect(player.id);
  };

  return (
    <div
      className={`
        ${styles.opponent}
        ${isSwapTarget ? styles.swapTarget : ''}
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

      <div className={styles.opponentStats}>
        <span className={styles.stars} title="Étoiles totales (cartes + Recharge)">⭐ {player.stars + player.rechargeStars}</span>
        <span className={styles.handCount}>🃏 {player.handCount}</span>
        {player.hasPlayedCard && <span className={styles.played}>✓</span>}
      </div>

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

      {isSwapTarget && (
        <div className={styles.swapOverlay}>{t.opponent.swapOverlay}</div>
      )}
      {isStealTarget && (
        <div className={styles.stealOverlay}>{t.opponent.stealOverlay}</div>
      )}
    </div>
  );
}
