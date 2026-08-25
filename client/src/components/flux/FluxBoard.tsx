import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useT } from '../../hooks/useT';
import { ScoreCardDisplay } from '../Card/ScoreCardDisplay';
import { PlayerCard } from '../Card/PlayerCard';
import { OpponentPanel } from '../Player/OpponentPanel';
import { HistoryPanel } from '../History/HistoryPanel';
import { getSocket } from '../../hooks/useSocket';
import { RECHARGE_CARD_VALUE } from '../../types';
import styles from './FluxBoard.module.css';

export function FluxBoard() {
  const { gameState, privateInfo, playerId, lastReveal } = useGameStore();
  const t = useT();
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  // Reset sélection à chaque nouvelle mène
  React.useEffect(() => {
    setSelectedCard(null);
  }, [gameState?.currentTrick]);

  if (!gameState) return <div className={styles.loading}>Chargement…</div>;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const opponents = gameState.players.filter(p => p.id !== playerId);
  const phase = gameState.phase;

  const canPlay = phase === 'CARD_SELECTION';
  const hasPlayed = myPlayer?.hasPlayedCard ?? false;

  const isSwapPhase = phase === 'SPECIAL_EFFECT' && gameState.swapRequestPlayerId === playerId;
  const isStealPhase = phase === 'SPECIAL_EFFECT' && gameState.stealRequestPlayerId === playerId;

  const handleSelect = (value: number) => {
    if (!canPlay || hasPlayed) return;
    setSelectedCard(prev => (prev === value ? null : value));
  };

  const handlePlay = () => {
    if (selectedCard === null || hasPlayed) return;
    getSocket().emit('play_card', { cardValue: selectedCard }, (res: any) => {
      if ('error' in res) console.error(res.error);
      else setSelectedCard(null);
    });
  };

  const handleRecharge = () => {
    if (hasPlayed) return;
    getSocket().emit('play_card', { cardValue: RECHARGE_CARD_VALUE }, (res: any) => {
      if ('error' in res) console.error(res.error);
      else setSelectedCard(null);
    });
  };

  const handleSwapTarget = (targetId: string) => {
    getSocket().emit('swap_target', { targetPlayerId: targetId }, (res: any) => {
      if ('error' in res) console.error(res.error);
    });
  };

  const handleStealTarget = (targetId: string) => {
    getSocket().emit('steal_target', { targetPlayerId: targetId }, (res: any) => {
      if ('error' in res) console.error(res.error);
    });
  };

  const hand = privateInfo?.hand ?? [];

  return (
    <div className={styles.boardWrapper}>
      <div className={styles.board}>

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.trickInfo}>
            Mène {gameState.currentTrick}
          </div>
          <div className={styles.deckCount}>
            🃏 {gameState.scoreDeckCount} cartes restantes
          </div>
        </div>

        {/* Adversaires */}
        <div className={styles.opponents}>
          {opponents.map(p => (
            <OpponentPanel
              key={p.id}
              player={p}
              isSwapTarget={isSwapPhase && gameState.swapEligibleTargets.includes(p.id)}
              onSwapSelect={handleSwapTarget}
              isStealTarget={isStealPhase && gameState.stealEligibleTargets.includes(p.id)}
              onStealSelect={handleStealTarget}
            />
          ))}
        </div>

        {/* Zone centrale */}
        <div className={styles.center}>

          {/* Carte Score active */}
          {gameState.currentScoreCard && (
            <div className={styles.activeCard}>
              <div className={styles.activeLabel}>Carte Score</div>
              <ScoreCardDisplay
                card={gameState.currentScoreCard}
                size="lg"
                highlighted
              />
            </div>
          )}

          {/* Cartes jouées (révélation) */}
          {(phase === 'REVEAL' || phase === 'RESOLUTION' || phase === 'TRICK_END') && lastReveal && (
            <div className={styles.playedCards}>
              {gameState.players.map(p => {
                const value = lastReveal[p.id];
                const isRecharge = value === RECHARGE_CARD_VALUE;
                const cancelled = !isRecharge && (gameState.cancelledValues ?? []).includes(value);
                const isWinner = p.id === gameState.trickWinnerId;
                const gotStar = (gameState.rechargeStarWinners ?? []).includes(p.id);
                const didRecharge = (gameState.rechargedPlayerIds ?? []).includes(p.id);
                return (
                  <div key={p.id} className={styles.playedCardSlot}>
                    <span className={styles.playerLabel}>{p.pseudo}</span>
                    {isRecharge ? (
                      <div className={styles.rechargeSlot}>🔄 Recharge</div>
                    ) : value !== undefined ? (
                      <PlayerCard
                        value={value}
                        color={p.color}
                        cancelled={cancelled}
                        winner={isWinner}
                      />
                    ) : (
                      <PlayerCard value={0} color={p.color} faceDown />
                    )}
                    {gotStar && <span className={styles.starBadge}>⭐</span>}
                    {didRecharge && privateInfo?.mysteryCard !== undefined && p.id === playerId && (
                      <span className={styles.mysteryBadge}>
                        Carte mystère : {privateInfo.mysteryCard}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Résumé de la mène */}
          {gameState.lastTrickSummary && phase === 'TRICK_END' && (
            <div className={styles.trickSummary}>
              {gameState.lastTrickSummary.discarded ? (
                <span>Carte défaussée — tout le monde a rechargé</span>
              ) : gameState.trickWinnerId ? (
                <span>
                  {gameState.players.find(p => p.id === gameState.trickWinnerId)?.pseudo} remporte la carte !
                </span>
              ) : null}
              {(gameState.rechargeStarWinners ?? []).length > 0 && (
                <div className={styles.starInfo}>
                  ⭐×{gameState.rechargeStarCount ?? 1} Recharge — 
                  {(gameState.rechargeStarWinners ?? [])
                    .map(id => gameState.players.find(p => p.id === id)?.pseudo)
                    .join(', ')}
                </div>
              )}
            </div>
          )}

          {/* Infos privées — carte mystère après Recharge */}
          {privateInfo?.mysteryCard !== undefined && (
            <div className={styles.privateInfo}>
              🔍 Carte mystère de {privateInfo.mysteryCardOwner} : <strong>{privateInfo.mysteryCard}</strong>
            </div>
          )}
          {privateInfo?.missingCardValue !== undefined && (
            <div className={styles.privateInfo}>
              ⚠️ Votre carte manquante : <strong>{privateInfo.missingCardValue}</strong>
            </div>
          )}

          {/* STEAL */}
          {isStealPhase && (
            <div className={styles.actionPrompt}>🦅 Choisissez un adversaire à voler</div>
          )}

          {/* SWAP */}
          {isSwapPhase && !gameState.swapChosenA && (
            <div className={styles.actionPrompt}>⇄ Choisissez le premier joueur à échanger</div>
          )}
          {isSwapPhase && gameState.swapChosenA && (
            <div className={styles.actionPrompt}>
              ⇄ Choisissez le second joueur (A = {gameState.players.find(p => p.id === gameState.swapChosenA)?.pseudo})
            </div>
          )}
        </div>

        {/* Ma main */}
        {myPlayer && privateInfo && (
          <div className={styles.myZone}>
            <div className={styles.myStats}>
              <span title="Étoiles Recharge (+1 pt chacune) + Étoiles cartes Score (majorité)">
                ⭐ {myPlayer.rechargeStars + myPlayer.stars} étoile(s)
                {myPlayer.rechargeStars > 0 && (
                  <span style={{ fontSize: '0.7em', opacity: 0.7, marginLeft: '0.3em' }}>
                    ({myPlayer.rechargeStars}🔄 + {myPlayer.stars}🃏)
                  </span>
                )}
              </span>
              <span>🃏 {myPlayer.scorePileCount} carte(s) Score</span>
              {myPlayer.topScoreCard && (
                <span>Dernière : {myPlayer.topScoreCard.displayValue}</span>
              )}
            </div>

            {/* Cartes valeur */}
            <div className={styles.handLabel}>Ma main</div>
            <div className={styles.cards}>
              {hand.map(value => (
                <PlayerCard
                  key={value}
                  value={value}
                  color={myPlayer.color}
                  selected={selectedCard === value}
                  disabled={hasPlayed || !canPlay}
                  onClick={() => handleSelect(value)}
                />
              ))}
            </div>

            {/* Bouton jouer */}
            {selectedCard !== null && !hasPlayed && canPlay && (
              <button className={styles.playBtn} onClick={handlePlay}>
                Jouer le {selectedCard}
              </button>
            )}

            {/* Bouton Recharge */}
            {canPlay && !hasPlayed && (
              <button className={styles.rechargeBtn} onClick={handleRecharge}>
                🔄 Recharge
              </button>
            )}

            {hasPlayed && (
              <div className={styles.waitingMsg}>En attente des autres joueurs…</div>
            )}
          </div>
        )}
      </div>

      {/* Panneau historique */}
      <HistoryPanel />
    </div>
  );
}
