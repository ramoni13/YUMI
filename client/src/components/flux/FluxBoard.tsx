import React, { useState } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useT } from '../../hooks/useT';
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

  if (!gameState) return <div className={styles.loading}>Chargement…</div>;

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

  // ORACLE : le joueur a vu les cartes, il clique OK pour continuer
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

  return (
    <div className={styles.boardWrapper}>
      <div className={styles.board}>

        {/* Header enrichi */}
        <div className={styles.header}>
          <div className={styles.trickInfo}>
            Mène {gameState.currentTrick}
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
                  title="Ma dernière carte Score"
                >
                  <ScoreCardDisplay card={myPlayer.topScoreCard} size="sm" />
                </div>
              )}
              {myMysteryCard !== undefined && (
                <div
                  className={`${styles.headerMysteryCard} ${mustPlayMystery && !hasPlayed ? styles.mysteryCardPlayable : ''}`}
                  onClick={mustPlayMystery && !hasPlayed ? handlePlayMystery : undefined}
                  title={mustPlayMystery ? 'Cliquer pour jouer votre carte mystère' : 'Votre carte mystère'}
                >
                  <span className={styles.headerMysteryLabel}>🔒</span>
                  {myMysteryCard === YUMI_CARD_VALUE
                    ? <span className={`${styles.headerMysteryVal} ${styles.yumiMysteryVal}`}>Y</span>
                    : <span className={styles.headerMysteryVal}>{myMysteryCard}</span>
                  }
                  {mustPlayMystery && !hasPlayed && <span className={styles.headerMysteryHint}>jouer</span>}
                </div>
              )}
            </div>
          )}

          <div className={styles.deckCount}>
            🃏 {gameState.scoreDeckCount} restantes
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
                <div className={styles.activeLabel}>Carte Score</div>
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
                      <div className={styles.rechargeSlot}>🔄 Recharge</div>
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
                        Carte mystère :
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
                <span>Carte défaussée — tout le monde a rechargé</span>
              ) : gameState.trickWinnerId ? (
                <span>
                  {gameState.players.find(p => p.id === gameState.trickWinnerId)?.pseudo} remporte la carte !
                </span>
              ) : null}
                            {(gameState.bonusPointWinners ?? []).length > 0 && (
                <div className={styles.starInfo}>
                  🪙×{gameState.lastTrickSummary?.bonusPointCount ?? 1} Recharge —
                  {(gameState.bonusPointWinners ?? [])
                    .map((id: string) => gameState.players.find(p => p.id === id)?.pseudo)
                    .join(', ')}
                </div>
              )}
            </div>
          )}

          {/* DEVOILEMENT : rivière des prochaines cartes Score */}
          {gameState.revealedUpcoming && gameState.revealedUpcoming.length > 0 && (
            <div className={styles.revealedUpcoming}>
              <div className={styles.revealedUpcomingLabel}>
                📢 Prochaines cartes Score révélées :
              </div>
              <div className={styles.revealedUpcomingCards}>
                {gameState.revealedUpcoming.map((card, i) => (
                  <div key={i} className={styles.revealedUpcomingSlot}>
                    <span className={styles.revealedUpcomingNum}>#{i + 1}</span>
                    <ScoreCardDisplay card={card} size="sm" />
                  </div>
                ))}
              </div>
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

            {/* Ligne : historique + carte mystère côte à côte */}
            <div className={styles.myInfoRow}>
              {myPlayer.playedHistory && myPlayer.playedHistory.length > 0 && (
                <div className={styles.playedHistoryZone}>
                  <span className={styles.playedHistoryLabel}>Déjà jouées :</span>
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
                ✨ <strong>YUMI</strong> — vaut la + grande ou + petite valeur selon la carte Score. Usage unique, non récupérable.
              </div>
            )}

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

            {/* Boutons action */}
            <div className={styles.actionRow}>
              {selectedCard !== null && !hasPlayed && canPlay && (
                <button className={styles.playBtn} onClick={handlePlay}>
                  {selectedCard === YUMI_CARD_VALUE ? 'Jouer YUMI ✨' : `Jouer le ${selectedCard}`}
                </button>
              )}
              {canPlay && !hasPlayed && (
                <button className={styles.rechargeBtn} onClick={handleRecharge}>
                  🔄 Recharge
                </button>
              )}
              {hasPlayed && (
                <div className={styles.waitingMsg}>En attente des autres joueurs…</div>
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
                <span className={styles.oracleTitle}>Oracle</span>
                <span className={styles.oracleSubtitle}>Vision secrète — vous seul voyez ces cartes</span>
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
              Ces informations sont confidentielles. Les autres joueurs ne les voient pas.
            </p>

            <button className={styles.oracleOkBtn} onClick={handleOracleOk}>
              J’ai mémorisé — Continuer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
