import React, { useState } from 'react';
import type { PlayerColor } from '../../types';
import { PlayerCard } from '../Card/PlayerCard';
import { getSocket } from '../../hooks/useSocket';
import { useGameStore } from '../../store/gameStore';
import { useT } from '../../hooks/useT';
import styles from './Player.module.css';

interface MyHandProps {
  hand: number[];
  color: PlayerColor;
  playedHistory?: number[]; // Cartes déjà jouées lors des mènes précédentes
}

export function MyHand({ hand, color, playedHistory = [] }: MyHandProps) {
  const { gameState, playerId } = useGameStore();
  const t = useT();
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  const canPlay = gameState?.phase === 'CARD_SELECTION';
  const hasPlayed = gameState?.players.find(p => p.id === playerId)?.hasPlayedCard ?? false;

  const handleSelect = (value: number) => {
    if (!canPlay || hasPlayed) return;
    setSelectedCard(prev => (prev === value ? null : value));
  };

  const handlePlay = () => {
    if (selectedCard === null || hasPlayed) return;
    getSocket().emit('play_card', { cardValue: selectedCard }, (res: any) => {
      if ('error' in res) {
        console.error(res.error);
      } else {
        setSelectedCard(null);
      }
    });
  };

  // Reset quand une nouvelle mène commence
  React.useEffect(() => {
    if (gameState?.phase === 'CARD_SELECTION') {
      setSelectedCard(null);
    }
  }, [gameState?.currentTrick]);

  return (
    <div className={styles.myHand}>
      <div className={styles.handLabel}>{t.hand.label}</div>
      <div className={styles.cards}>
        {hand.map(value => (
          <PlayerCard
            key={value}
            value={value}
            color={color}
            selected={selectedCard === value}
            disabled={hasPlayed || !canPlay}
            onClick={() => handleSelect(value)}
          />
        ))}
      </div>

      {selectedCard !== null && !hasPlayed && (
        <button className={styles.playBtn} onClick={handlePlay}>
          {t.hand.playBtn(selectedCard)}
        </button>
      )}

      {hasPlayed && (
        <div className={styles.waitingMsg}>{t.hand.waiting}</div>
      )}

      {/* Cartes déjà jouées lors des mènes précédentes */}
      {playedHistory.length > 0 && (
        <div className={styles.playedHistory}>
          <span className={styles.playedHistoryLabel}>Déjà jouées :</span>
          <div className={styles.playedHistoryCards}>
            {playedHistory.map((v, i) => (
              <span key={i} className={`${styles.playedHistoryCard} ${styles.playedHistoryCardMine}`}>{v}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
