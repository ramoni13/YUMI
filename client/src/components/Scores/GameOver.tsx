import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useT } from '../../hooks/useT';
import { VICTORY_POINTS_TO_WIN } from '../../types';
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
          {winner ? t.gameover.winnerLine(winner.pseudo, winner.victoryPoints) : ''}
        </p>
      </div>

      <div className={styles.scoreboard}>
        {scores.map((s) => (
          <div
            key={s.playerId}
            className={`${styles.row} ${s.playerId === playerId ? styles.myRow : ''}`}
            style={{ borderLeftColor: COLOR_HEX[s.color] }}
          >
            <span className={styles.rank}>#{s.rank}</span>
            <span className={styles.pseudo}>{s.pseudo}</span>
            <div className={styles.details}>
              {/* Points de victoire — affichage principal */}
              <span className={styles.victoryPoints} title={t.gameover.victoryPointsTitle}>
                {Array.from({ length: VICTORY_POINTS_TO_WIN }, (_, i) => (
                  <span key={i} className={i < s.victoryPoints ? styles.vpFilled : styles.vpEmpty}>
                    ★
                  </span>
                ))}
                <span className={styles.vpCount}>{s.victoryPoints} PV</span>
              </span>
              {/* Détails des cumuls */}
              <span className={styles.cardScore} title={t.gameover.cardScoreTitle}>
                🃏 {s.scoreFromCards > 0 ? '+' : ''}{s.scoreFromCards}
              </span>
              {s.bonusPoints > 0 && (
                <span className={styles.rechargeStarScore} title={t.gameover.bonusPointsTitle}>
                  🪙 +{s.bonusPoints}
                </span>
              )}
              {s.stars > 0 && (
                <span className={styles.starScore} title={t.gameover.starsTitle}>
                  ⭐ {s.stars}
                </span>
              )}
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
