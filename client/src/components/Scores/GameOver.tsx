import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useT } from '../../hooks/useT';
import styles from './GameOver.module.css';

const COLOR_HEX: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e',
  yellow: '#eab308', purple: '#a855f7', orange: '#f97316',
};

interface GameOverProps {
  onReplay: () => void;
}

export function GameOver({ onReplay }: GameOverProps) {
  const { gameState, playerId } = useGameStore();
  const t = useT();
  const scores = gameState?.finalScores ?? [];

  const winner = scores[0];
  const isWinner = winner?.playerId === playerId;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        {isWinner ? (
          <>
            <div className={styles.trophy}>{t.gameover.trophy}</div>
            <h1 className={styles.title}>{t.gameover.titleWin}</h1>
          </>
        ) : (
          <>
            <div className={styles.trophy}>{t.gameover.gameIcon}</div>
            <h1 className={styles.title}>{t.gameover.titleLose}</h1>
          </>
        )}
        <p className={styles.winner}>
          {winner ? t.gameover.winnerLine(winner.pseudo, winner.totalScore) : ''}
        </p>
      </div>

      <div className={styles.scoreboard}>
        {scores.map((s, i) => (
          <div
            key={s.playerId}
            className={`${styles.row} ${s.playerId === playerId ? styles.myRow : ''}`}
            style={{ borderLeftColor: COLOR_HEX[s.color] }}
          >
            <span className={styles.rank}>#{s.rank}</span>
            <span className={styles.pseudo}>{s.pseudo}</span>
            <div className={styles.details}>
              <span className={styles.cardScore} title={t.gameover.cardScoreTitle}>
                🃏 {s.scoreFromCards > 0 ? '+' : ''}{s.scoreFromCards}
              </span>
              {s.bonusPoints > 0 && (
                <span className={styles.rechargeStarScore} title="Points bonus">
                  🪙 +{s.bonusPoints}
                </span>
              )}
              {s.stars > 0 && (
                <span className={styles.starScore} title="Étoiles (majorité)">
                  ⭐ {s.stars}
                </span>
              )}
              {s.starBonus > 0 && (
                <span className={styles.starBonus} title={t.gameover.starBonusTitle}>
                  🏆 +{s.starBonus}
                </span>
              )}
              <span className={styles.total}>{t.gameover.pts(s.totalScore)}</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.actions}>
        <button className={styles.replayBtn} onClick={onReplay}>
          {t.gameover.btnReplay}
        </button>
      </div>
    </div>
  );
}
