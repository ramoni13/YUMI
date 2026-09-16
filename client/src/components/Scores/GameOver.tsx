import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useT } from '../../hooks/useT';
import { VICTORY_POINTS_TO_WIN, type FinalScore } from '../../types';
import styles from './GameOver.module.css';

// Retourne l'ID du joueur avec le + haut score sans doublon (null si ex-æquo en tête)
function resolveTopPlayer(scores: FinalScore[], getValue: (s: FinalScore) => number): string | null {
  const sorted = [...scores].sort((a, b) => getValue(b) - getValue(a));
  if (sorted.length === 0) return null;
  const topValue = getValue(sorted[0]);
  if (topValue === 0) return null;
  const topCount = sorted.filter(s => getValue(s) === topValue).length;
  if (topCount === 1) return sorted[0].playerId;
  // Ex-æquo en tête : chercher le suivant unique
  const rest = sorted.filter(s => getValue(s) !== topValue);
  if (rest.length === 0) return null;
  const nextValue = getValue(rest[0]);
  const nextCount = rest.filter(s => getValue(s) === nextValue).length;
  return nextCount === 1 ? rest[0].playerId : null;
}

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

  // Gagnants de chaque compteur (+ haut sans doublon)
  const starsLeaderId   = resolveTopPlayer(scores, s => s.stars);
  const cardsLeaderId   = resolveTopPlayer(scores, s => s.scoreFromCards);
  const bonusLeaderId   = resolveTopPlayer(scores, s => s.bonusPoints);

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

      {/* Légende des compteurs */}
      <div className={styles.countersLegend}>
        <div className={styles.counterItem}>
          <span className={styles.counterIcon}>⭐</span>
          <span className={styles.counterLabel}>{t.gameover.starsLeader}</span>
          <span className={styles.counterWinner}>
            {starsLeaderId
              ? scores.find(s => s.playerId === starsLeaderId)?.pseudo
              : <em>{t.gameover.counterCancelled}</em>}
          </span>
          {starsLeaderId && <span className={styles.counterVP}>{t.common.vpGain}</span>}
        </div>
        <div className={styles.counterItem}>
          <span className={styles.counterIcon}>🃏</span>
          <span className={styles.counterLabel}>{t.gameover.cardsLeader}</span>
          <span className={styles.counterWinner}>
            {cardsLeaderId
              ? scores.find(s => s.playerId === cardsLeaderId)?.pseudo
              : <em>{t.gameover.counterCancelled}</em>}
          </span>
          {cardsLeaderId && <span className={styles.counterVP}>{t.common.vpGain}</span>}
        </div>
        <div className={styles.counterItem}>
          <span className={styles.counterIcon}>🪙</span>
          <span className={styles.counterLabel}>{t.gameover.bonusLeader}</span>
          <span className={styles.counterWinner}>
            {bonusLeaderId
              ? scores.find(s => s.playerId === bonusLeaderId)?.pseudo
              : <em>{t.gameover.counterCancelled}</em>}
          </span>
          {bonusLeaderId && <span className={styles.counterVP}>{t.common.vpGain}</span>}
        </div>
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
                                  <span className={styles.vpCount}>{t.common.vpCount(s.victoryPoints)}</span>
              </span>
              {/* Détails des cumuls avec mise en évidence du leader */}
              <span
                className={`${styles.cardScore} ${s.playerId === cardsLeaderId ? styles.leaderHighlight : ''}`}
                title={t.gameover.cardScoreTitle}
              >
                🃏 {s.scoreFromCards > 0 ? '+' : ''}{s.scoreFromCards}
              </span>
              <span
                className={`${s.bonusPoints > 0 ? styles.rechargeStarScore : styles.cardScore} ${s.playerId === bonusLeaderId ? styles.leaderHighlight : ''}`}
                title={t.gameover.bonusPointsTitle}
              >
                🪙 {s.bonusPoints > 0 ? '+' : ''}{s.bonusPoints}
              </span>
              <span
                className={`${styles.starScore} ${s.playerId === starsLeaderId ? styles.leaderHighlight : ''}`}
                title={t.gameover.starsTitle}
              >
                ⭐ {s.stars}
              </span>
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
