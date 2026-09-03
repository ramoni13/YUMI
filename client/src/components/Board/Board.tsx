import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useT } from '../../hooks/useT';
import { VICTORY_POINTS_TO_WIN } from '../../types';
import { ScoreCardDisplay } from '../Card/ScoreCardDisplay';
import { PlayerCard } from '../Card/PlayerCard';
import { OpponentPanel } from '../Player/OpponentPanel';
import { MyHand } from '../Player/MyHand';
import { HistoryPanel } from '../History/HistoryPanel';
import { getSocket } from '../../hooks/useSocket';
import styles from './Board.module.css';

export function Board() {
  const { gameState, privateInfo, playerId, lastReveal } = useGameStore();

  const t = useT();

  if (!gameState) return <div className={styles.loading}>{t.board.loading}</div>;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const opponents = gameState.players.filter(p => p.id !== playerId);

  // Calculer le nom du joueur dont j'ai vu la carte mystère :
  // Le voisin de droite (moi = index j) pioche la carte du joueur à sa gauche (index j-1).
  // Donc j'ai vu la carte du joueur players[(myIndex - 1 + n) % n].
  const myIndex = gameState.players.findIndex(p => p.id === playerId);
  const mysteryCardOwnerName = myIndex >= 0 && privateInfo?.mysteryCard !== undefined
    ? gameState.players[(myIndex - 1 + gameState.players.length) % gameState.players.length]?.pseudo
    : undefined;

  const isSwapPhase =
    gameState.phase === 'SPECIAL_EFFECT' &&
    gameState.swapRequestPlayerId === playerId;

  const isStealPhase =
    gameState.phase === 'SPECIAL_EFFECT' &&
    gameState.stealRequestPlayerId === playerId;

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

  const phase = gameState.phase;

  return (
    <div className={styles.boardWrapper}>
    <div className={styles.board}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.roundInfo}>
          {t.board.round(gameState.currentRound, VICTORY_POINTS_TO_WIN)}
        </div>
        <div className={styles.trickInfo}>
          {t.board.trick(gameState.currentTrick, gameState.totalTricks)}
        </div>
        <div className={styles.deckCount}>
          {t.board.deckCount(Math.max(0, gameState.scoreDeckCount))}
        </div>
        {/* Points de victoire en cours */}
        <div className={styles.victoryPointsBar}>
          {gameState.players.map(p => (
            <div key={p.id} className={styles.vpPlayer}>
              <span className={styles.vpPseudo}>{p.pseudo}</span>
              <span className={styles.vpStars}>
                {Array.from({ length: VICTORY_POINTS_TO_WIN }, (_, i) => (
                  <span key={i} className={i < p.victoryPoints ? styles.vpFilled : styles.vpEmpty}>★</span>
                ))}
              </span>
            </div>
          ))}
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
        {/* Colonne Score — uniquement les cartes pas encore jouées */}
        <div className={styles.scoreColumn}>
          <div className={styles.columnLabel}>{t.board.scoreColumnLabel}</div>
          <div className={styles.columnCards}>
            {gameState.scoreColumn
              .map((card, i) => ({ card, i }))
              .filter(({ i }) => i >= gameState.currentTrick)
              .map(({ card, i }) => (
                <ScoreCardDisplay
                  key={i}
                  card={card}
                  size="md"
                  highlighted={card !== null && i === gameState.currentTrick}
                />
              ))
            }
          </div>
        </div>

        {/* Carte Score active */}
        {gameState.currentScoreCard && (
          <div className={styles.activeCard}>
            <div className={styles.activeLabel}>{t.board.activeCardLabel}</div>
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
              const cancelled = gameState.cancelledValues.includes(value);
              const isWinner = p.id === gameState.trickWinnerId;
              return (
                <div key={p.id} className={styles.playedCardSlot}>
                  <span className={styles.playerLabel}>{p.pseudo}</span>
                  {value !== undefined ? (
                    <PlayerCard
                      value={value}
                      color={p.color}
                      cancelled={cancelled}
                      winner={isWinner}
                    />
                  ) : (
                    <PlayerCard value={0} color={p.color} faceDown />
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
              <span>{t.board.trickDiscarded}</span>
            ) : (
              <span>
                {t.board.trickWinner(gameState.players.find(p => p.id === gameState.trickWinnerId)?.pseudo ?? '?')}
              </span>
            )}
          </div>
        )}

        {/* Résumé fin de manche */}
        {phase === 'BONUS_STAR' && gameState.roundEndSummary && (
          <div className={styles.roundSummary}>
            <h3>{t.board.roundEndTitle}</h3>

            {/* Dernières cartes + bonus étoile */}
            <div className={styles.lastCards}>
              {Object.entries(gameState.roundEndSummary.lastCards).map(([pid, val]) => {
                const p = gameState.players.find(pl => pl.id === pid);
                const hasBonus = gameState.roundEndSummary!.bonusStarWinners.includes(pid);
                return (
                  <div key={pid} className={styles.lastCardRow}>
                    <span>{p?.pseudo}</span>
                    <span className={styles.lastCardVal}>{val}</span>
                    {hasBonus && <span className={styles.bonusStar}>{t.common.bonusStar}</span>}
                  </div>
                );
              })}
            </div>

            {/* Points de victoire attribués cette manche */}
            <div className={styles.vpSummary}>
              <div className={styles.vpCategory}>
                <span className={styles.vpCatLabel}>⭐ {t.board.vpCatStars}</span>
                <span className={styles.vpCatWinner}>
                  {gameState.roundEndSummary.starsVPWinner
                    ? gameState.players.find(p => p.id === gameState.roundEndSummary!.starsVPWinner)?.pseudo ?? '—'
                    : t.board.vpCancelled}
                </span>
              </div>
              <div className={styles.vpCategory}>
                <span className={styles.vpCatLabel}>🃏 {t.board.vpCatCards}</span>
                <span className={styles.vpCatWinner}>
                  {gameState.roundEndSummary.cardScoreVPWinner
                    ? gameState.players.find(p => p.id === gameState.roundEndSummary!.cardScoreVPWinner)?.pseudo ?? '—'
                    : t.board.vpCancelled}
                </span>
              </div>
              <div className={styles.vpCategory}>
                <span className={styles.vpCatLabel}>🪙 {t.board.vpCatBonus}</span>
                <span className={styles.vpCatWinner}>
                  {gameState.roundEndSummary.bonusVPWinner
                    ? gameState.players.find(p => p.id === gameState.roundEndSummary!.bonusVPWinner)?.pseudo ?? '—'
                    : t.board.vpCancelled}
                </span>
              </div>
            </div>

            {/* Classement points de victoire après cette manche */}
            <div className={styles.vpRanking}>
              <div className={styles.vpRankTitle}>{t.board.vpRankTitle}</div>
              {gameState.players
                .slice()
                .sort((a, b) => (gameState.roundEndSummary!.victoryPoints[b.id] ?? 0) - (gameState.roundEndSummary!.victoryPoints[a.id] ?? 0))
                .map(p => (
                  <div key={p.id} className={styles.vpRankRow}>
                    <span>{p.pseudo}</span>
                    <span className={styles.vpRankStars}>
                      {Array.from({ length: VICTORY_POINTS_TO_WIN }, (_, i) => (
                        <span key={i} className={i < (gameState.roundEndSummary!.victoryPoints[p.id] ?? 0) ? styles.vpFilled : styles.vpEmpty}>★</span>
                      ))}
                      <span className={styles.vpRankCount}>{gameState.roundEndSummary!.victoryPoints[p.id] ?? 0} PV</span>
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Infos privées */}
        {privateInfo?.mysteryCard !== undefined && (
          <div className={styles.privateInfo}>
            {t.board.mysteryCard(
              mysteryCardOwnerName ?? privateInfo.mysteryCardOwner ?? '?',
              privateInfo.mysteryCard,
            )}
          </div>
        )}
        {privateInfo?.missingCardValue !== undefined && (
          <div className={styles.privateInfo}>
            {t.board.missingCard(privateInfo.missingCardValue)}
          </div>
        )}

        {/* STEAL */}
        {isStealPhase && (
          <div className={styles.stealPrompt}>
            {t.board.stealPrompt}
          </div>
        )}

        {/* SWAP étape 1 */}
        {isSwapPhase && !gameState.swapChosenA && (
          <div className={styles.swapPrompt}>
            {t.board.swapPrompt1}
          </div>
        )}

        {/* SWAP étape 2 */}
        {isSwapPhase && gameState.swapChosenA && (
          <div className={styles.swapPrompt}>
            {t.board.swapPrompt2(gameState.players.find(p => p.id === gameState.swapChosenA)?.pseudo ?? '?')}
          </div>
        )}
      </div>

      {/* Ma main */}
      {myPlayer && privateInfo && (
        <div className={styles.myZone}>
          <div className={styles.myStats}>
            {/* Points de victoire */}
            <span className={styles.myVP}>
              {Array.from({ length: VICTORY_POINTS_TO_WIN }, (_, i) => (
                <span key={i} className={i < myPlayer.victoryPoints ? styles.vpFilled : styles.vpEmpty}>★</span>
              ))}
              <span style={{ marginLeft: '0.3rem', fontWeight: 700, color: '#fbbf24' }}>{myPlayer.victoryPoints} PV</span>
            </span>
            <span>{t.board.myStars(myPlayer.stars)}</span>
            <span>{t.board.myScorePile(myPlayer.scorePileCount)}</span>
            {myPlayer.topScoreCard && (
              <span>{t.board.myLastCard(myPlayer.topScoreCard.displayName)}</span>
            )}
          </div>
          <MyHand hand={privateInfo.hand} color={myPlayer.color} playedHistory={myPlayer.playedHistory} />
        </div>
      )}
    </div>

    {/* Panneau historique — colonne droite */}
    <HistoryPanel />
    </div>
  );
}
