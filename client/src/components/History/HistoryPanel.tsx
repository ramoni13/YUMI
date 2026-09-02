import React from 'react';
import { useGameStore } from '../../store/gameStore';
import { useT } from '../../hooks/useT';
import type { GameEvent } from '../../types';
import { YUMI_CARD_VALUE } from '../../types';
import type { Translations } from '../../i18n';
import styles from './HistoryPanel.module.css';

// Convertit une valeur brute en label affichable dans le journal
// La YUMI (9) affiche sa valeur effective selon le gain de la carte Score
function cardLabel(value: number, scoreGain?: string): string {
  if (value !== YUMI_CARD_VALUE) return String(value);
  const effective = scoreGain === '-' ? 0 : YUMI_CARD_VALUE;
  return `YUMI(=${effective})`;
}

const COLOR_HEX: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e',
  yellow: '#eab308', purple: '#a855f7', orange: '#f97316',
};

function getColorGradient(color: string): string {
  const g: Record<string, string> = {
    red:    'linear-gradient(135deg,#991b1b,#ef4444)',
    blue:   'linear-gradient(135deg,#1e3a8a,#3b82f6)',
    green:  'linear-gradient(135deg,#14532d,#22c55e)',
    yellow: 'linear-gradient(135deg,#713f12,#eab308)',
    purple: 'linear-gradient(135deg,#581c87,#a855f7)',
    orange: 'linear-gradient(135deg,#7c2d12,#f97316)',
  };
  return g[color] ?? '#333';
}

// ─── Panneau principal ────────────────────────────────────────────────────────

export function HistoryPanel() {
  const { eventLog, gameState, playerId } = useGameStore();
  const t = useT();

  if (!gameState) return null;

  // Afficher les événements du plus récent au plus ancien
  const reversed = [...eventLog].reverse();

  return (
    <aside className={styles.panel}>
      <div className={styles.panelHeader}>
        <span className={styles.panelTitle}>{t.history.panelTitle}</span>
        <span className={styles.panelSub}>
          {t.history.panelSub(gameState.currentRound, gameState.totalRounds)}
        </span>
      </div>

      <div className={styles.list}>
        {reversed.length === 0 && (
          <div className={styles.empty}>{t.history.empty}</div>
        )}

        {reversed.map(evt => (
          <EventRow key={evt.id} event={evt} myId={playerId} t={t} />
        ))}
      </div>
    </aside>
  );
}

// ─── Ligne d'événement ────────────────────────────────────────────────────────

interface EventRowProps {
  event: GameEvent;
  myId: string | null;
  t: Translations;
}

function EventRow({ event, myId, t }: EventRowProps) {
  const isMe = event.playerId === myId;

  // Séparateur de manche
  if (event.kind === 'ROUND_START') {
    return (
      <div className={styles.separator}>
        <span>{event.message}</span>
      </div>
    );
  }

  // Séparateur de mène
  if (event.kind === 'TRICK_START') {
    return (
      <div className={styles.trickSep}>
        <span className={styles.trickSepNum}>{t.history.trickSepLabel(event.trick)}</span>
        {event.scoreCard && (
          <span className={`${styles.scoreBadge} ${scoreClass(event.scoreCard.value, event.scoreCard.specialEffect)}`}>
            {event.scoreCard.displayName}
          </span>
        )}
      </div>
    );
  }

  // Fin de partie
  if (event.kind === 'GAME_OVER') {
    return (
      <div className={`${styles.row} ${styles.rowGameOver}`}>
        <span className={styles.icon}>🏆</span>
        <span className={styles.text}>{event.message}</span>
      </div>
    );
  }

  // Révélation : affichage spécial avec mini-cartes
  if (event.kind === 'REVEAL' && event.allCards) {
    const scoreGain = event.scoreCard?.gain;
    return (
      <div className={`${styles.row} ${styles.rowReveal}`}>
        <span className={styles.icon}>🂠</span>
        <div className={styles.revealContent}>
          <span className={styles.revealLabel}>{t.history.revealLabel}</span>
          <div className={styles.miniCardsRow}>
            {event.allCards.map(c => (
              <div key={c.playerId} className={styles.miniCardSlot}>
                <div
                  className={`${styles.miniCard} ${c.cancelled ? styles.cancelled : ''} ${c.playerId === myId ? styles.mine : ''} ${c.value === YUMI_CARD_VALUE ? styles.miniCardYumi : ''}`}
                  style={c.value === YUMI_CARD_VALUE ? {} : { background: getColorGradient(c.color) }}
                  title={c.pseudo}
                >
                  {c.value === YUMI_CARD_VALUE ? 'Y' : c.value}
                  {c.cancelled && <span className={styles.cancelX}>✕</span>}
                </div>
                <span
                  className={styles.miniCardOwner}
                  style={{ color: COLOR_HEX[c.color] }}
                >
                  {c.playerId === myId ? t.history.me : c.pseudo.slice(0, 4)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Résultat du pli
  if (event.kind === 'TRICK_RESULT') {
    const isWinner = event.winnerId === myId;
    const cancelledPlayers = event.allCards?.filter(c => c.cancelled) ?? [];
    const winnerCard = event.allCards?.find(c => c.playerId === event.winnerId);
    return (
      <div className={`${styles.row} ${event.discarded ? styles.rowDiscarded : styles.rowResult}`}>
        <span className={styles.icon}>{event.discarded ? '🚫' : '🏅'}</span>
        <div className={styles.resultContent}>
          {event.discarded ? (
            <span className={styles.discardedText}>{t.history.discardedText}</span>
          ) : (
            /* Ligne principale : gagnant + carte Score */
            <span className={styles.winnerText}>
              {event.winnerColor && (
                <span className={styles.dot} style={{ background: COLOR_HEX[event.winnerColor] }} />
              )}
              <strong>{isWinner ? t.history.youWin : t.history.wins(event.winnerPseudo ?? '?')}</strong>
              {' '}{t.history.theCard}{' '}
              {event.scoreCard && (
                <span className={`${styles.scoreBadge} ${scoreClass(event.scoreCard.value, event.scoreCard.specialEffect)}`}>
                  {event.scoreCard.displayName}
                </span>
              )}
              {winnerCard && (
                <span className={styles.winnerCardVal}> {t.history.withCard(winnerCard.value)}</span>
              )}
            </span>
          )}
          {/* Joueurs annulés par doublon */}
          {cancelledPlayers.length > 0 && (
            <div className={styles.cancelledList}>
              {cancelledPlayers.map((c, i) => (
                <span key={i} className={styles.cancelledItem}>
                  <span className={styles.dot} style={{ background: COLOR_HEX[c.color] }} />
                  {t.history.cancelled(c.playerId === myId ? t.history.me : c.pseudo, c.value)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Fin de manche — dernières cartes + bonus étoile
  if (event.kind === 'ROUND_END') {
    const allCards = event.bonusWinners ?? []; // contient toutes les dernières cartes
    const hasAnyBonus = allCards.some(w => w.hasBonus);
    return (
      <div className={`${styles.row} ${styles.rowRoundEnd}`}>
        <span className={styles.icon}>⭐</span>
                <div className={styles.roundEndContent}>
          <span className={styles.roundEndTitle}>{t.history.roundEndTitle}</span>
          <div className={styles.bonusList}>
            {allCards.map((w, i) => (
              <span key={i} className={`${styles.bonusItem} ${w.hasBonus ? styles.bonusItemWinner : ''}`}>
                <span className={styles.dot} style={{ background: COLOR_HEX[w.color] }} />
                {w.pseudo} : {w.cardValue}
                {w.hasBonus && <span className={styles.bonusTag}>{t.common.bonusStar}</span>}
              </span>
            ))}
          </div>
          {!hasAnyBonus && (
            <span className={styles.noBonus}>{t.history.noBonus}</span>
          )}
        </div>
      </div>
    );
  }

  // Classement de la manche
  if (event.kind === 'ROUND_WINNER' && event.roundScores) {
    return (
      <div className={`${styles.row} ${styles.rowRoundWinner}`}>
        <span className={styles.icon}>🏆</span>
        <div className={styles.roundEndContent}>
          <span className={styles.roundEndTitle}>{t.history.roundRankTitle(event.round)}</span>
          <div className={styles.bonusList}>
            {event.roundScores.map((s, i) => (
              <span key={i} className={`${styles.bonusItem} ${i === 0 ? styles.bonusItemWinner : ''}`}>
                <span className={styles.rankNum}>#{i + 1}</span>
                <span className={styles.dot} style={{ background: COLOR_HEX[s.color] }} />
                {s.pseudo}
                <span className={styles.scoreDetail}>
                  🃏 {s.scoreFromCards > 0 ? '+' : ''}{s.scoreFromCards}
                  {' '}⭐ {s.stars}
                  {' '}→ {s.total} pts
                </span>
              </span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Ligne explicite gagnant carte Score
  if (event.kind === 'SCORE_WON') {
    const isWinner = event.winnerId === myId;
    if (event.discarded) {
          return (
      <div className={`${styles.row} ${styles.rowScoreWonDiscard}`}>
        <span className={styles.icon}>🚫</span>
        <span className={styles.scoreWonText}>
          {event.scoreCard && (
            <span className={`${styles.scoreBadge} ${scoreClass(event.scoreCard.value, event.scoreCard.specialEffect)}`}>
              {event.scoreCard.displayName}
            </span>
          )}
          {' '}{t.history.cardDiscarded}
        </span>
      </div>
    );
  }
  return (
    <div className={`${styles.row} ${styles.rowScoreWon} ${isWinner ? styles.rowScoreWonMe : ''}`}>
      <span className={styles.icon}>🏅</span>
      <span className={styles.scoreWonText}>
        {event.winnerColor && (
          <span className={styles.dot} style={{ background: COLOR_HEX[event.winnerColor] }} />
        )}
        <strong>{isWinner ? t.history.youHave : t.history.has(event.winnerPseudo ?? '?')}</strong>
        {' '}{t.history.won}{' '}
        {event.scoreCard && (
          <span className={`${styles.scoreBadge} ${scoreClass(event.scoreCard.value, event.scoreCard.specialEffect)}`}>
            {event.scoreCard.displayName}
          </span>
        )}
      </span>
    </div>
  );
  }

  // Étoiles Recharge (mode flux)
  if (event.kind === 'FLUX_RECHARGE_BONUS') {
    const hasWinners = (event.bonusPointWinners?.length ?? 0) > 0;
    const allRecharge = (event.rechargedPlayers?.length ?? 0) > 0 &&
      event.bonusPointWinners !== undefined &&
      event.bonusPointWinners.length === 0 &&
      event.message?.includes('défaussée');

    return (
      <div className={`${styles.row} ${hasWinners ? styles.rowRechargeStars : styles.rowRechargeNoStar}`}>
        <span className={styles.icon}>🔄</span>
        <div className={styles.rechargeContent}>
          {/* Joueurs qui ont rechargé */}
          {event.rechargedPlayers && event.rechargedPlayers.length > 0 && (
            <div className={styles.rechargeWho}>
              {event.rechargedPlayers.map((p, i) => (
                <span key={i} className={styles.rechargePlayer}>
                  <span className={styles.dot} style={{ background: COLOR_HEX[p.color] }} />
                  {p.pseudo}
                </span>
              ))}
              <span className={styles.rechargeLabel}> recharge</span>
            </div>
          )}
                    {/* Gagnants d'étoile */}
          {hasWinners && (() => {
            // nb d'étoiles = nb de joueurs ayant rechargé ce tour
            const starCount = event.rechargedPlayers?.length ?? 1;
            return (
              <div className={styles.rechargeStarList}>
                {event.bonusPointWinners!.map((w, i) => (
                  <span key={i} className={styles.rechargeStarItem}>
                    <span className={styles.dot} style={{ background: COLOR_HEX[w.color] }} />
                    <strong>{w.pseudo}</strong>
                    <span className={styles.starTag}>⭐ +{starCount}</span>
                    <span className={styles.rechargeCardVal}>(carte {w.cardValue})</span>
                  </span>
                ))}
              </div>
            );
          })()}
          {/* Aucun gagnant */}
          {!hasWinners && !allRecharge && (
            <span className={styles.rechargeNoStar}>Aucune étoile — doublons</span>
          )}
          {/* Tout le monde a rechargé */}
          {allRecharge && (
            <span className={styles.rechargeNoStar}>Carte défaussée</span>
          )}
        </div>
      </div>
    );
  }

  // Tous les autres événements : ligne simple avec icône
  const { icon, rowClass } = getEventStyle(event.kind);
  return (
    <div className={`${styles.row} ${rowClass} ${isMe ? styles.rowMe : ''}`}>
      <span className={styles.icon}>{icon}</span>
      <span className={styles.text}>
        {event.color && (
          <span className={styles.dot} style={{ background: COLOR_HEX[event.color] }} />
        )}
        {event.pseudo && <strong>{event.pseudo} </strong>}
        {event.message}
        {event.targetPseudo && (
          <span style={{ opacity: 0.8 }}> → {event.targetPseudo}</span>
        )}
      </span>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreClass(value: number, effect: string | null): string {
  if (effect) return styles.special;
  if (value > 0) return styles.positive;
  return styles.negative;
}

function getEventStyle(kind: GameEvent['kind']): { icon: string; rowClass: string } {
  switch (kind) {
    case 'CARD_PLAYED':           return { icon: '🂠', rowClass: styles.rowCard };
    case 'SPECIAL_STEAL':         return { icon: '🦅', rowClass: styles.rowSpecial };
    case 'SPECIAL_DOUBLE':        return { icon: '×2', rowClass: styles.rowSpecial };
    case 'SPECIAL_SWAP':          return { icon: '⇄',  rowClass: styles.rowSpecial };
    case 'SPECIAL_PIOCHE':        return { icon: '🎰', rowClass: styles.rowSpecial };
    case 'SPECIAL_VERROU':        return { icon: '🔒', rowClass: styles.rowSpecial };
    case 'SPECIAL_REVELATION':    return { icon: '🕵️', rowClass: styles.rowSpecial };
    case 'SPECIAL_MYSTERE':       return { icon: '🎭', rowClass: styles.rowSpecial };
    case 'SPECIAL_SURCHARGE':     return { icon: '⚡', rowClass: styles.rowSpecial };
    case 'SPECIAL_INVERSION':     return { icon: '🌀', rowClass: styles.rowSpecial };
    case 'SPECIAL_CONSTELLATION': return { icon: '🌟', rowClass: styles.rowSpecial };
    case 'SPECIAL_ECLIPSE':       return { icon: '☄️', rowClass: styles.rowSpecial };
    case 'SPECIAL_JACKPOT':       return { icon: '💰', rowClass: styles.rowSpecial };
    case 'SPECIAL_TAXE':          return { icon: '🧹', rowClass: styles.rowSpecial };
    case 'SPECIAL_ORACLE':        return { icon: '👁️', rowClass: styles.rowSpecial };
    case 'SPECIAL_DEVOILEMENT':   return { icon: '📢', rowClass: styles.rowSpecial };
    case 'FLUX_RECHARGE_BONUS':   return { icon: '🪙', rowClass: styles.rowBonus };
    case 'ROUND_WINNER':          return { icon: '🏆', rowClass: styles.rowRoundWinner };
    default:                      return { icon: '•',  rowClass: styles.rowDefault };
  }
}
