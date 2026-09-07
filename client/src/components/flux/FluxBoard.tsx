import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useT } from '../../hooks/useT';
import { VICTORY_POINTS_TO_WIN } from '../../types';
import { ScoreCardDisplay } from '../Card/ScoreCardDisplay';
import { SpecialCardInfo } from '../Card/SpecialCardInfo';
import { PlayerCard } from '../Card/PlayerCard';
import { OpponentPanel } from '../Player/OpponentPanel';
import { HistoryPanel } from '../History/HistoryPanel';
import { getSocket } from '../../hooks/useSocket';
import { RECHARGE_CARD_VALUE, YUMI_CARD_VALUE } from '../../types';
import styles from './FluxBoard.module.css';

export function FluxBoard() {
  const { gameState, privateInfo, playerId, lastReveal, oracleCards, setOracleCards } = useGameStore();
  const t = useT();
  const [selectedCard, setSelectedCard] = useState<number | null>(null);

  // Reset sélection à chaque nouvelle mène
  React.useEffect(() => {
    setSelectedCard(null);
  }, [gameState?.currentTrick]);

  if (!gameState) return <div className={styles.loading}>{t.fluxBoard.loading}</div>;

  const myPlayer = gameState.players.find(p => p.id === playerId);
  const opponents = gameState.players.filter(p => p.id !== playerId);
  const phase = gameState.phase;

  const canPlay = phase === 'CARD_SELECTION';
  const hasPlayed = myPlayer?.hasPlayedCard ?? false;

  const isSwapPhase = phase === 'SPECIAL_EFFECT' && gameState.swapRequestPlayerId === playerId;
  const isStealPhase = phase === 'SPECIAL_EFFECT' && gameState.stealRequestPlayerId === playerId;

  // Effets spéciaux où le joueur local doit choisir une cible
  const isEclipsePhase = phase === 'SPECIAL_ECLIPSE' && gameState.eclipseRequestPlayerId === playerId;
  const isPiochePhase = phase === 'SPECIAL_PIOCHE' && gameState.piocheRequestPlayerId === playerId;
  const isVerrouPhase = phase === 'SPECIAL_VERROU' && gameState.verrouRequestPlayerId === playerId;
  const isRevelationPhase = phase === 'SPECIAL_REVELATION' && gameState.revelationRequestPlayerId === playerId;
  const isTaxePhase = phase === 'SPECIAL_TAXE' && gameState.taxeRequestPlayerId === playerId;

  // Carte mystère du joueur local (valeur manquante)
  const myMysteryCard = privateInfo?.missingCardValue;
  // Le joueur doit jouer sa carte mystère (effet MYSTÈRE)
  const mustPlayMystery = myPlayer?.deferred?.mustPlayMysteryCard ?? false;

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

  const handleEclipseTarget = (targetId: string) => {
    getSocket().emit('eclipse_target', { targetPlayerId: targetId }, (res: any) => {
      if ('error' in res) console.error(res.error);
    });
  };

  const handlePiocheTarget = (targetId: string) => {
    getSocket().emit('pioche_target', { targetPlayerId: targetId }, (res: any) => {
      if ('error' in res) console.error(res.error);
    });
  };

  const handleVerrouTarget = (targetId: string) => {
    getSocket().emit('verrou_target', { targetPlayerId: targetId }, (res: any) => {
      if ('error' in res) console.error(res.error);
    });
  };

  const handleRevelationTarget = (targetId: string) => {
    getSocket().emit('revelation_target', { targetPlayerId: targetId }, (res: any) => {
      if ('error' in res) console.error(res.error);
    });
  };

  const handleTaxeTarget = (targetId: string) => {
    getSocket().emit('taxe_target', { targetPlayerId: targetId }, (res: any) => {
      if ('error' in res) console.error(res.error);
    });
  };

  const handleOracleOk = () => {
    setOracleCards(null);
    getSocket().emit('oracle_ok');
  };

  // Jouer la carte mystère (effet MYSTÈRE)
  const handlePlayMystery = () => {
    if (!myMysteryCard || hasPlayed) return;
    getSocket().emit('play_card', { cardValue: myMysteryCard }, (res: any) => {
      if ('error' in res) console.error(res.error);
    });
  };

  const hand = privateInfo?.hand ?? [];

  // ── Fin de manche : résumé des PV ──────────────────────────
  if (phase === 'BONUS_STAR' && gameState.roundEndSummary) {
    const summary = gameState.roundEndSummary;
    const handleNextRound = () => {
      getSocket().emit('next_phase');
    };
    return (
      <div className={styles.boardWrapper}>
        <div className={styles.board}>
          <div className={styles.roundEndOverlay}>
            <h2 className={styles.roundEndTitle}>{t.fluxBoard.roundEndTitle}</h2>

            {/* 3 catégories */}
            <div className={styles.vpCategories}>
              <div className={styles.vpCatRow}>
                <span className={styles.vpCatIcon}>⭐</span>
                <span className={styles.vpCatName}>{t.fluxBoard.vpCatStars}</span>
                <span className={styles.vpCatWinner}>
                  {summary.starsVPWinner
                    ? gameState.players.find(p => p.id === summary.starsVPWinner)?.pseudo
                    : <em>{t.fluxBoard.vpCancelled}</em>}
                </span>
                {summary.starsVPWinner && <span className={styles.vpBadge}>{t.common.vpGain}</span>}
              </div>
              <div className={styles.vpCatRow}>
                <span className={styles.vpCatIcon}>🃏</span>
                <span className={styles.vpCatName}>{t.fluxBoard.vpCatCards}</span>
                <span className={styles.vpCatWinner}>
                  {summary.cardScoreVPWinner
                    ? gameState.players.find(p => p.id === summary.cardScoreVPWinner)?.pseudo
                    : <em>{t.fluxBoard.vpCancelled}</em>}
                </span>
                {summary.cardScoreVPWinner && <span className={styles.vpBadge}>{t.common.vpGain}</span>}
              </div>
              <div className={styles.vpCatRow}>
                <span className={styles.vpCatIcon}>🪙</span>
                <span className={styles.vpCatName}>{t.fluxBoard.vpCatBonus}</span>
                <span className={styles.vpCatWinner}>
                  {summary.bonusVPWinner
                    ? gameState.players.find(p => p.id === summary.bonusVPWinner)?.pseudo
                    : <em>{t.fluxBoard.vpCancelled}</em>}
                </span>
                {summary.bonusVPWinner && <span className={styles.vpBadge}>{t.common.vpGain}</span>}
              </div>
            </div>

            {/* Classement PV */}
            <div className={styles.vpRanking}>
              <div className={styles.vpRankTitle}>{t.fluxBoard.vpRankTitle}</div>
              {gameState.players
                .slice()
                .sort((a, b) => (summary.victoryPoints[b.id] ?? 0) - (summary.victoryPoints[a.id] ?? 0))
                .map(p => (
                  <div key={p.id} className={`${styles.vpRankRow} ${p.id === playerId ? styles.vpRankMe : ''}`}>
                    <span className={styles.vpRankPseudo}>{p.pseudo}</span>
                    <span className={styles.vpRankStars}>
                      {Array.from({ length: VICTORY_POINTS_TO_WIN }, (_, i) => (
                        <span key={i} className={i < (summary.victoryPoints[p.id] ?? 0) ? styles.vpFilled : styles.vpEmpty}>★</span>
                      ))}
                    </span>
                                          <span className={styles.vpRankCount}>{t.common.vpCount(summary.victoryPoints[p.id] ?? 0)}</span>
                    <span className={styles.vpRankDetail}>
                      🃏 {summary.scores[p.id] ?? 0} &nbsp;
                      🪙 {summary.bonusPointsMap?.[p.id] ?? 0} &nbsp;
                      ⭐ {summary.stars[p.id] ?? 0}
                    </span>
                  </div>
                ))}
            </div>

            <button className={styles.nextRoundBtn} onClick={handleNextRound}>
              {t.fluxBoard.nextRoundBtn}
            </button>
          </div>
        </div>
        <HistoryPanel />
      </div>
    );
  }

  return (
    <div className={styles.boardWrapper}>
      <div className={styles.board}>

        {/* Header enrichi */}
        <div className={styles.header}>
          <div className={styles.trickInfo}>
            {t.fluxBoard.trickLabel(gameState.currentTrick)}
          </div>

          {/* Stats du joueur local au centre */}
          {myPlayer && (
            <div className={styles.headerStats}>
              {privateInfo?.mysteryCard !== undefined && (
                <span className={styles.headerMystery}>
                  🔍 {privateInfo.mysteryCardOwner} :
                  {privateInfo.mysteryCard === YUMI_CARD_VALUE
                    ? <strong className={styles.yumiMysteryVal}>Y</strong>
                    : <strong>{privateInfo.mysteryCard}</strong>
                  }
                </span>
              )}
              <span className={styles.headerStat}>⭐ {myPlayer.stars}</span>
              {myPlayer.bonusPoints > 0 && (
                <span className={styles.headerStat}>🪙 {myPlayer.bonusPoints}</span>
              )}
              <span className={styles.headerStat}>🃏 {myPlayer.scorePileCount}</span>
              {myPlayer.topScoreCard && (
                <div
                  className={`${styles.headerTopCard} ${isSwapPhase && gameState.swapEligibleTargets.includes(playerId ?? '') ? styles.swapSelf : ''}`}
                  onClick={() => {
                    if (isSwapPhase && gameState.swapEligibleTargets.includes(playerId ?? '')) {
                      handleSwapTarget(playerId ?? '');
                    }
                  }}
                  title={t.fluxBoard.scoreCardLabel}
                >
                  <ScoreCardDisplay card={myPlayer.topScoreCard} size="sm" />
                </div>
              )}
              {myMysteryCard !== undefined && (
                <div
                  className={`${styles.headerMysteryCard} ${mustPlayMystery && !hasPlayed ? styles.mysteryCardPlayable : ''}`}
                  onClick={mustPlayMystery && !hasPlayed ? handlePlayMystery : undefined}
                  title={mustPlayMystery ? t.fluxBoard.mysteryCardPlayTitle : t.fluxBoard.mysteryCardTitle}
                >
                  <span className={styles.headerMysteryLabel}>🔒</span>
                  {myMysteryCard === YUMI_CARD_VALUE
                    ? <span className={`${styles.headerMysteryVal} ${styles.yumiMysteryVal}`}>Y</span>
                    : <span className={styles.headerMysteryVal}>{myMysteryCard}</span>
                  }
                  {mustPlayMystery && !hasPlayed && <span className={styles.headerMysteryHint}>{t.fluxBoard.mysteryCardPlay}</span>}
                </div>
              )}
            </div>
          )}

          <div className={styles.deckCount}>
            {t.fluxBoard.deckRemaining(gameState.scoreDeckCount)}
          </div>
        </div>

        {/* Adversaires */}
        {/* hideCurrentCard=true pendant CARD_SELECTION : masque uniquement la carte de la mène en cours */}
        <div className={styles.opponents}>
          {opponents.map(p => (
            <OpponentPanel
              key={p.id}
              player={p}
              hideCurrentCard={phase === 'CARD_SELECTION'}
              isSwapTarget={isSwapPhase && gameState.swapEligibleTargets.includes(p.id)}
              onSwapSelect={handleSwapTarget}
              isStealTarget={isStealPhase && gameState.stealEligibleTargets.includes(p.id)}
              onStealSelect={handleStealTarget}
              isEclipseTarget={isEclipsePhase && gameState.eclipseEligibleTargets.includes(p.id)}
              onEclipseSelect={handleEclipseTarget}
              isPiocheTarget={isPiochePhase && gameState.piocheEligibleTargets.includes(p.id)}
              onPiocheSelect={handlePiocheTarget}
              isVerrouTarget={isVerrouPhase && gameState.verrouEligibleTargets.includes(p.id)}
              onVerrouSelect={handleVerrouTarget}
              isRevelationTarget={isRevelationPhase && gameState.revelationEligibleTargets.includes(p.id)}
              onRevelationSelect={handleRevelationTarget}
              isTaxeTarget={isTaxePhase && gameState.taxeEligibleTargets.includes(p.id)}
              onTaxeSelect={handleTaxeTarget}
            />
          ))}
        </div>

        {/* Zone centrale */}
        <div className={styles.center}>

          {/* Carte Score active + pavé d'info si carte spéciale */}
          {gameState.currentScoreCard && (
            <div className={styles.activeCardRow}>
              <div className={styles.activeCard}>
                <div className={styles.activeLabel}>{t.fluxBoard.scoreCardLabel}</div>
                <ScoreCardDisplay
                  card={gameState.currentScoreCard}
                  size="lg"
                  highlighted
                />
              </div>
              {gameState.currentScoreCard.specialEffect && (
                <SpecialCardInfo card={gameState.currentScoreCard} />
              )}
            </div>
          )}

          {/* Cartes jouées (révélation) */}
          {(phase === 'REVEAL' || phase === 'RESOLUTION' || phase === 'TRICK_END') && lastReveal && (
            <div className={styles.playedCards}>
              {gameState.players.map(p => {
                const value = lastReveal[p.id];
                const isRecharge = value === RECHARGE_CARD_VALUE;
                const isYumi = value === YUMI_CARD_VALUE;
                const cancelled = !isRecharge && !isYumi && (gameState.cancelledValues ?? []).includes(value);
                // Les YUMI s'annulent entre elles (doublon de valeur effective)
                const yumiCancelled = isYumi && Object.values(lastReveal).filter(v => v === YUMI_CARD_VALUE).length >= 2;
                const isWinner = p.id === gameState.trickWinnerId;
                const gotStar = (gameState.bonusPointWinners ?? []).includes(p.id);
                const didRecharge = (gameState.rechargedPlayerIds ?? []).includes(p.id);
                return (
                  <div key={p.id} className={styles.playedCardSlot}>
                    <span className={styles.playerLabel}>{p.pseudo}</span>
                    {isRecharge ? (
                      <div className={styles.rechargeSlot}>{t.fluxBoard.rechargeSlot}</div>
                    ) : value !== undefined ? (
                      <PlayerCard
                        value={value}
                        color={p.color}
                        cancelled={cancelled || yumiCancelled}
                        winner={isWinner}
                      />
                    ) : (
                      <PlayerCard value={0} color={p.color} faceDown />
                    )}
                    {gotStar && <span className={styles.starBadge}>⭐</span>}
                    {didRecharge && privateInfo?.mysteryCard !== undefined && p.id === playerId && (
                      <span className={styles.mysteryBadge}>
                        {t.fluxBoard.mysteryCardLabel}
                        {privateInfo.mysteryCard === YUMI_CARD_VALUE
                          ? <span className={styles.yumiMysteryVal}> Y</span>
                          : ` ${privateInfo.mysteryCard}`
                        }
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
                <span>{t.fluxBoard.trickDiscarded}</span>
              ) : gameState.trickWinnerId ? (
                <span>
                  {t.fluxBoard.trickWinner(gameState.players.find(p => p.id === gameState.trickWinnerId)?.pseudo ?? '?')}
                </span>
              ) : null}
                            {(gameState.bonusPointWinners ?? []).length > 0 && (
                <div className={styles.starInfo}>
                  {t.fluxBoard.bonusPointInfo(
                    gameState.lastTrickSummary?.bonusPointCount ?? 1,
                    (gameState.bonusPointWinners ?? [])
                      .map((id: string) => gameState.players.find(p => p.id === id)?.pseudo)
                      .join(', ')
                  )}
                </div>
              )}
            </div>
          )}

          {/* DEVOILEMENT : rivière des prochaines cartes Score */}
          {gameState.revealedUpcoming && gameState.revealedUpcoming.length > 0 && (
            <div className={styles.revealedUpcoming}>
              <div className={styles.revealedUpcomingLabel}>
                {t.fluxBoard.revealedUpcomingLabel}
              </div>
              <div className={styles.revealedUpcomingCards}>
                {gameState.revealedUpcoming.map((card, i) => (
                  <div key={i} className={styles.revealedUpcomingSlot}>
                    <span className={styles.revealedUpcomingNum}>{t.fluxBoard.revealedUpcomingNum(i + 1)}</span>
                    <ScoreCardDisplay card={card} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEAL */}
          {isStealPhase && (
            <div className={styles.actionPrompt}>{t.fluxBoard.stealPrompt}</div>
          )}

          {/* SWAP */}
          {isSwapPhase && !gameState.swapChosenA && (
            <div className={styles.actionPrompt}>{t.fluxBoard.swapPrompt1}</div>
          )}
          {isSwapPhase && gameState.swapChosenA && (
            <div className={styles.actionPrompt}>
              {t.fluxBoard.swapPrompt2(gameState.players.find(p => p.id === gameState.swapChosenA)?.pseudo ?? '?')}
            </div>
          )}
        </div>

        {/* Ma main */}
        {myPlayer && privateInfo && (
          <div className={styles.myZone}>

            {/* Ligne : historique + carte mystère côte à côte */}
            <div className={styles.myInfoRow}>
              {myPlayer.playedHistory && myPlayer.playedHistory.length > 0 && (
                <div className={styles.playedHistoryZone}>
                  <span className={styles.playedHistoryLabel}>{t.fluxBoard.alreadyPlayed}</span>
                  <div className={styles.playedHistoryCards}>
                    {myPlayer.playedHistory.map((v: number, i: number) => (
                      <span key={i} className={styles.playedHistoryCard}>{v}</span>
                    ))}
                  </div>
                </div>
            )}
            </div>

            {/* Info carte YUMI si présente en main */}
            {hand.includes(YUMI_CARD_VALUE) && (
              <div className={styles.yumiHint}>
                {t.fluxBoard.yumiHint}
              </div>
            )}

            {/* Cartes valeur */}
            <div className={styles.handLabel}>{t.fluxBoard.handLabel}</div>
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

            {/* Boutons action */}
            <div className={styles.actionRow}>
              {selectedCard !== null && !hasPlayed && canPlay && (
                <button className={styles.playBtn} onClick={handlePlay}>
                  {selectedCard === YUMI_CARD_VALUE ? t.fluxBoard.playYumi : t.fluxBoard.playValue(selectedCard!)}
                </button>
              )}
              {canPlay && !hasPlayed && (
                <button className={styles.rechargeBtn} onClick={handleRecharge}>
                  {t.fluxBoard.rechargeBtn}
                </button>
              )}
              {hasPlayed && (
                <div className={styles.waitingMsg}>{t.fluxBoard.waitingMsg}</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Panneau historique */}
      <HistoryPanel />

      {/* Modal ORACLE — visible uniquement pour le gagnant */}
      {oracleCards && oracleCards.length > 0 && (
        <div className={styles.oracleOverlay}>
          <div className={styles.oracleModal}>
            <div className={styles.oracleHeader}>
              <span className={styles.oracleIcon}>👁️</span>
              <div className={styles.oracleTitleBlock}>
                                  <span className={styles.oracleTitle}>{t.fluxBoard.oracleTitle}</span>
                  <span className={styles.oracleSubtitle}>{t.fluxBoard.oracleSubtitle}</span>
              </div>
            </div>

            <div className={styles.oracleDivider} />

            <span className={styles.oracleLabel}>Les 3 prochaines cartes Score :</span>

            <div className={styles.oracleCards}>
              {oracleCards.map((card, i) => (
                <div key={i} className={styles.oracleCardSlot}>
                  <span className={styles.oracleCardNum}>#{i + 1}</span>
                  <ScoreCardDisplay card={card} size="md" />
                </div>
              ))}
            </div>

            <p className={styles.oracleWarning}>
              {t.fluxBoard.oracleWarning}
            </p>

            <button className={styles.oracleOkBtn} onClick={handleOracleOk}>
              {t.fluxBoard.oracleOkBtn}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
