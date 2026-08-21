import React, { useState, useCallback } from 'react';
import { useT } from '../../hooks/useT';
import type { Translations } from '../../i18n';
import styles from './Tutorial.module.css';

type Illu = Translations['tutorial']['illu'];

// ─── Illustrations par slide ──────────────────────────────────────────────────

// Slide 1 — But du jeu : colonne Score + pile de points
function IlluGoal({ illu }: { illu: Illu }) {
  return (
    <div className={styles.illuRow}>
      {/* Cartes Score empilées */}
      <div className={styles.illuCol}>
        <div style={{ position: 'relative', width: 64, height: 100 }}>
          {[2, 1, 0].map(offset => (
            <div
              key={offset}
              className={`${styles.scoreCard} ${styles.scoreCardPositive}`}
              style={{
                position: 'absolute',
                top: offset * 6,
                left: offset * 4,
                opacity: 1 - offset * 0.2,
                zIndex: 3 - offset,
              }}
            >
              <span>+3</span>
            </div>
          ))}
        </div>
        <span className={styles.illuBoxLabel} style={{ color: '#4ade80' }}>{illu.wonCards}</span>
      </div>

      <div className={styles.arrow}>→</div>

      {/* Score total */}
      <div className={styles.illuCol}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #713f12, #fbbf24)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
          boxShadow: '0 0 24px rgba(251,191,36,0.4)',
          border: '3px solid rgba(251,191,36,0.5)',
        }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#1e1b4b' }}>12</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#1e1b4b', opacity: 0.7 }}>pts</span>
        </div>
        <span className={styles.illuBoxLabel} style={{ color: '#fbbf24' }}>{illu.finalScore}</span>
      </div>

      <div className={styles.arrow}>→</div>

      {/* Trophée */}
      <div className={styles.illuCol}>
        <div style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 0 12px rgba(251,191,36,0.6))' }}>🏆</div>
        <span className={styles.illuBoxLabel} style={{ color: '#fbbf24' }}>{illu.victory}</span>
      </div>
    </div>
  );
}

// Slide 2 — Distribution des cartes
function IlluHand({ illu }: { illu: Illu }) {
  const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
  return (
    <div className={styles.illuCol} style={{ gap: '0.9rem', width: '100%', maxWidth: 460 }}>

      {/* Formule */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '0.5rem', flexWrap: 'wrap',
      }}>
        <span style={{
          fontSize: '0.82rem', fontWeight: 800, color: '#c4b5fd',
          background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.35)',
          borderRadius: 8, padding: '0.3rem 0.75rem',
        }}>
          {illu.handFormula}
        </span>
      </div>

      {/* Tableau joueurs → cartes */}
      <div className={styles.illuBox} style={{ width: '100%', padding: '0.6rem 0.75rem' }}>
        {/* En-tête */}
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: '0.25rem', marginBottom: '0.45rem',
        }}>
          {[illu.handPlayers, illu.handCards, illu.handTitle].map((h, i) => (
            <span key={i} style={{
              fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)', textAlign: 'center', letterSpacing: '0.05em',
            }}>{h}</span>
          ))}
        </div>
        {/* Lignes */}
        {illu.handRows.map((row, idx) => (
          <div key={row.players} style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
            gap: '0.25rem', alignItems: 'center',
            padding: '0.35rem 0',
            borderTop: idx === 0 ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.06)',
          }}>
            {/* Nb joueurs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}>
              {Array.from({ length: row.players }).map((_, i) => (
                <span key={i} style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: PLAYER_COLORS[i % PLAYER_COLORS.length],
                  display: 'inline-block', flexShrink: 0,
                  boxShadow: `0 0 5px ${PLAYER_COLORS[i % PLAYER_COLORS.length]}88`,
                }} />
              ))}
            </div>
            {/* Nb cartes */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.2rem' }}>
              <span style={{
                fontSize: '1.1rem', fontWeight: 900,
                color: '#fbbf24',
                textShadow: '0 0 10px rgba(251,191,36,0.5)',
              }}>{row.cards}</span>
              <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>{illu.handCards}</span>
            </div>
            {/* Mini-main de cartes */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.15rem' }}>
              {Array.from({ length: row.cards }).map((_, i) => (
                <div key={i} className={styles.card} style={{
                  width: 20, height: 30, fontSize: '0.52rem', fontWeight: 800,
                  background: `linear-gradient(135deg, #1e3a8a, #3b82f6)`,
                  border: '1px solid rgba(96,165,250,0.5)',
                  borderRadius: 4, flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white',
                }}>
                  {i + 1}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Note bas */}
      <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
        {illu.handRange(illu.handRows[illu.handRows.length - 1].cards)}
      </span>
    </div>
  );
}

// Slide 3 — Début de manche : carte mystère / carte écartée
function IlluMysteryCard({ illu }: { illu: Illu }) {
  return (
    <div className={styles.illuCol} style={{ gap: '1.1rem', width: '100%', maxWidth: 440 }}>
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel}>{illu.roundStart}</div>
        <div className={styles.illuRow} style={{ gap: '1rem', flexWrap: 'wrap' }}>
          {/* Alice écarte une carte */}
          <div className={styles.illuCol} style={{ gap: '0.4rem' }}>
            <div style={{ position: 'relative' }}>
              <div className={`${styles.card} ${styles.cardFaceDown}`}
                style={{ width: 44, height: 64, fontSize: '1rem', borderColor: '#ef4444' }}>🂠</div>
              <div style={{
                position: 'absolute', top: -8, right: -8,
                background: '#ef4444', borderRadius: '50%', width: 20, height: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.65rem', fontWeight: 900, color: 'white',
              }}>✕</div>
            </div>
            <span className={styles.playerName} style={{ textAlign: 'center', color: '#ef4444' }}>Alice</span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>{illu.discardsSecret}</span>
          </div>
          {/* Flèche */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.2rem' }}>
            <div className={styles.arrow} style={{ fontSize: '1.6rem', color: '#fbbf24' }}>→</div>
            <span style={{ fontSize: '0.65rem', color: '#fbbf24', fontWeight: 700 }}>{illu.rightNeighbourSees}</span>
          </div>
          {/* Bob voit la valeur */}
          <div className={styles.illuCol} style={{ gap: '0.4rem' }}>
            <div style={{ position: 'relative' }}>
              <div className={styles.card}
                style={{
                  width: 44, height: 64, fontSize: '1.4rem', fontWeight: 900,
                  background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)',
                  boxShadow: '0 0 14px rgba(59,130,246,0.5)', border: '2px solid #60a5fa',
                }}>5</div>
              <div style={{
                position: 'absolute', top: -8, right: -8,
                background: '#fbbf24', borderRadius: '50%', width: 20, height: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem',
              }}>👁</div>
            </div>
            <span className={styles.playerName} style={{ textAlign: 'center', color: '#3b82f6' }}>Bob</span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>{illu.seesValue}</span>
          </div>
        </div>
      </div>
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel}>{illu.discardedOutOfPlay}</div>
        <div className={styles.illuRow} style={{ gap: '0.75rem' }}>
          <div className={`${styles.card} ${styles.cardFaceDown}`}
            style={{ width: 40, height: 58, fontSize: '0.9rem', opacity: 0.4 }}>🂠</div>
          <div className={styles.arrow}>→</div>
          <div style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.55)', lineHeight: 1.5, maxWidth: 220 }}>
            {illu.discardedDesc(
              <strong style={{ color: 'white' }}>{illu.notPlayed}</strong>,
              <em style={{ color: '#fbbf24' }}>{illu.strategicAdvantage}</em>,
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Slide 3 — Déroulement d'une mène : 3 phases visuelles
function IlluTrick({ illu }: { illu: Illu }) {
  const players = [
    { name: 'Alice', color: '#ef4444' },
    { name: 'Bob',   color: '#3b82f6' },
    { name: 'Cara',  color: '#22c55e' },
  ];
  return (
    <div className={styles.trickTable}>
      {/* Phase 1 : carte Score révélée */}
      <div className={styles.trickPhase}>
        <div className={styles.trickPhaseNum}>1</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <div className={`${styles.scoreCard} ${styles.scoreCardPositive}`} style={{ width: 44, height: 64, fontSize: '1rem' }}>
            +4
          </div>
          <span className={styles.trickPhaseText}>{illu.trickPhase1(<strong style={{ color: '#4ade80' }}>{illu.trickPhase1Keyword}</strong>)}</span>
        </div>
      </div>

      {/* Phase 2 : cartes face cachée */}
      <div className={styles.trickPhase}>
        <div className={styles.trickPhaseNum}>2</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {players.map(p => (
              <div key={p.name} className={`${styles.card} ${styles.cardFaceDown}`}
                style={{ width: 36, height: 52, fontSize: '1rem', borderColor: p.color }}>
                🂠
              </div>
            ))}
          </div>
          <span className={styles.trickPhaseText}>{illu.trickPhase2(<strong style={{ color: '#fbbf24' }}>{illu.trickPhase2Keyword}</strong>)}</span>
        </div>
      </div>

      {/* Phase 3 : révélation simultanée */}
      <div className={styles.trickPhase}>
        <div className={styles.trickPhaseNum}>3</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1 }}>
          <div style={{ display: 'flex', gap: '0.3rem' }}>
            {[
              { val: '5', color: '#ef4444' },
              { val: '3', color: '#3b82f6' },
              { val: '7', color: '#22c55e' },
            ].map((c, i) => (
              <div key={i} className={styles.card}
                style={{ width: 36, height: 52, fontSize: '1rem', background: `linear-gradient(135deg, ${c.color}99, ${c.color})` }}>
                {c.val}
              </div>
            ))}
          </div>
          <span className={styles.trickPhaseText}>{illu.trickPhase3(<strong style={{ color: '#a78bfa' }}>{illu.trickPhase3Keyword}</strong>)}</span>
        </div>
      </div>
    </div>
  );
}

// Slide 4 — Les doublons s'annulent + règle verte/rouge
function IlluDuplicates({ illu }: { illu: Illu }) {
  return (
    <div className={styles.illuCol} style={{ gap: '0.8rem', width: '100%', maxWidth: 440 }}>

      {/* Règle verte */}
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel} style={{ color: '#4ade80' }}>{illu.greenRule}</div>
        <div className={styles.illuRow} style={{ gap: '0.5rem' }}>
          {[{ val: '5', bg: 'linear-gradient(135deg,#991b1b,#ef4444)', name: 'Alice', cancelled: true },
            { val: '5', bg: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', name: 'Bob',   cancelled: true },
            { val: '3', bg: 'linear-gradient(135deg,#14532d,#22c55e)', name: 'Cara',  cancelled: false },
          ].map((c, i) => (
            <div key={i} className={styles.illuCol} style={{ gap: '0.25rem' }}>
              <div className={`${styles.card} ${c.cancelled ? styles.cancelled : ''}`}
                style={{ width: 40, height: 58, fontSize: '1.1rem', background: c.bg,
                  boxShadow: !c.cancelled ? '0 0 14px rgba(34,197,94,0.6)' : undefined,
                  border: !c.cancelled ? '2px solid #4ade80' : undefined }}>
                {c.val}{c.cancelled && <span className={styles.cancelX}>✕</span>}
              </div>
              <span className={styles.playerName} style={{ fontSize: '0.7rem', textAlign: 'center', color: !c.cancelled ? '#4ade80' : undefined }}>
                {c.name}{!c.cancelled ? ' 🏅' : ''}
              </span>
            </div>
          ))}
          <div className={styles.arrow}>←</div>
          <div className={`${styles.scoreCard} ${styles.scoreCardPositive}`} style={{ width: 36, height: 52, fontSize: '0.85rem' }}>+4</div>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
          {illu.greenExplain(<span style={{ color: '#f87171' }}>5</span>, <span style={{ color: '#4ade80' }}>3</span>)}
        </span>
      </div>

      {/* Règle rouge */}
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel} style={{ color: '#f87171' }}>{illu.redRule}</div>
        <div className={styles.illuRow} style={{ gap: '0.5rem' }}>
          {[{ val: '2', bg: 'linear-gradient(135deg,#991b1b,#ef4444)', name: 'Alice', winner: true },
            { val: '4', bg: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', name: 'Bob',   winner: false },
            { val: '6', bg: 'linear-gradient(135deg,#14532d,#22c55e)', name: 'Cara',  winner: false },
          ].map((c, i) => (
            <div key={i} className={styles.illuCol} style={{ gap: '0.25rem' }}>
              <div className={styles.card}
                style={{ width: 40, height: 58, fontSize: '1.1rem', background: c.bg, opacity: c.winner ? 1 : 0.5,
                  boxShadow: c.winner ? '0 0 14px rgba(239,68,68,0.6)' : undefined,
                  border: c.winner ? '2px solid #f87171' : undefined }}>
                {c.val}
              </div>
              <span className={styles.playerName} style={{ fontSize: '0.7rem', textAlign: 'center', color: c.winner ? '#f87171' : undefined }}>
                {c.name}{c.winner ? ' 🏅' : ''}
              </span>
            </div>
          ))}
          <div className={styles.arrow}>←</div>
          <div className={`${styles.scoreCard} ${styles.scoreCardNegative}`} style={{ width: 36, height: 52, fontSize: '0.8rem' }}>-2⭐</div>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.45)' }}>
          {illu.redExplain(<span style={{ color: '#f87171' }}>2</span>)}
        </span>
      </div>

      {/* Tout annulé */}
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel}>{illu.allCancelledLabel}</div>
        <div className={styles.illuRow} style={{ gap: '0.4rem' }}>
          {['linear-gradient(135deg,#991b1b,#ef4444)', 'linear-gradient(135deg,#1e3a8a,#3b82f6)', 'linear-gradient(135deg,#14532d,#22c55e)'].map((bg, i) => (
            <div key={i} className={`${styles.card} ${styles.cancelled}`}
              style={{ width: 36, height: 52, fontSize: '1rem', background: bg }}>
              4<span className={styles.cancelX} style={{ fontSize: '1.8rem' }}>✕</span>
            </div>
          ))}
          <div className={styles.arrow}>→</div>
          <span style={{ fontSize: '1.8rem' }}>🚫</span>
        </div>
      </div>
    </div>
  );
}

// Slide 5 — Les cartes Score (vertes, rouges, spéciales vertes ET rouges)
function IlluScoreCards({ illu }: { illu: Illu }) {
  return (
    <div className={styles.illuCol} style={{ gap: '0.75rem', width: '100%', maxWidth: 460 }}>
      <div className={styles.illuRow} style={{ gap: '0.75rem', width: '100%' }}>
        <div className={styles.illuBox} style={{ flex: 1 }}>
          <div className={styles.illuBoxLabel} style={{ color: '#4ade80' }}>{illu.greenCardsLabel}</div>
          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
            {['+5', '+3', '+1'].map(v => (
              <div key={v} className={`${styles.scoreCard} ${styles.scoreCardPositive}`}
                style={{ width: 38, height: 54, fontSize: '0.82rem' }}>{v}</div>
            ))}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 700 }}>{illu.highestWins}</div>
        </div>
        <div className={styles.illuBox} style={{ flex: 1 }}>
          <div className={styles.illuBoxLabel} style={{ color: '#f87171' }}>{illu.redCardsLabel}</div>
          <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'center' }}>
            {['-1⭐', '-2⭐', '-3'].map(v => (
              <div key={v} className={`${styles.scoreCard} ${styles.scoreCardNegative}`}
                style={{ width: 38, height: 54, fontSize: '0.72rem', textAlign: 'center', padding: '0 2px' }}>{v}</div>
            ))}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 700 }}>{illu.lowestWins}</div>
        </div>
      </div>
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel} style={{ color: '#c4b5fd' }}>{illu.specialsLabel}</div>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          {([{ icon: '🦅', label: illu.specialNames.steal }, { icon: '×2', label: illu.specialNames.double }, { icon: '⇄', label: illu.specialNames.swap }] as const).map(e => (
            <div key={e.label} className={styles.illuCol} style={{ gap: '0.3rem' }}>
              <div style={{ display: 'flex', gap: '0.3rem' }}>
                <div className={`${styles.scoreCard} ${styles.scoreCardPositive}`}
                  style={{ width: 36, height: 52, fontSize: '0.9rem', border: '2px solid #4ade80' }}>{e.icon}</div>
                <div className={`${styles.scoreCard} ${styles.scoreCardNegative}`}
                  style={{ width: 36, height: 52, fontSize: '0.9rem', border: '2px solid #f87171' }}>{e.icon}</div>
              </div>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#c4b5fd', textAlign: 'center' }}>{e.label}</span>
            </div>
          ))}
        </div>
                <div style={{ fontSize: '0.68rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center', marginTop: '0.25rem' }}>
          {illu.specialsFooter}
        </div>
      </div>
    </div>
  );
}

// Slide 6 — Les cartes spéciales : détail des 3 effets
function IlluSpecialCards({ illu }: { illu: Illu }) {
  return (
    <div className={styles.illuCol} style={{ gap: '0.65rem', width: '100%', maxWidth: 460 }}>
      {/* VOL */}
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuRow} style={{ gap: '0.75rem', alignItems: 'flex-start' }}>
          <div className={styles.illuCol} style={{ gap: '0.3rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <div className={`${styles.scoreCard} ${styles.scoreCardPositive}`} style={{ width: 32, height: 46, fontSize: '0.8rem', border: '2px solid #4ade80' }}>🦅</div>
              <div className={`${styles.scoreCard} ${styles.scoreCardNegative}`} style={{ width: 32, height: 46, fontSize: '0.8rem', border: '2px solid #f87171' }}>🦅</div>
            </div>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fbbf24', textAlign: 'center' }}>{illu.specialNames.steal}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', color: '#e0e7ff', lineHeight: 1.5, marginBottom: '0.4rem' }}>
              {illu.stealDesc}
            </div>
            <div className={styles.illuRow} style={{ gap: '0.4rem' }}>
              <div className={styles.illuCol} style={{ gap: '0.2rem' }}>
                <div className={`${styles.scoreCard} ${styles.scoreCardPositive}`} style={{ width: 30, height: 42, fontSize: '0.72rem' }}>+3</div>
                <span style={{ fontSize: '0.6rem', color: '#3b82f6' }}>Bob</span>
              </div>
              <span style={{ fontSize: '1.1rem', color: '#fbbf24' }}>🦅→</span>
              <div className={styles.illuCol} style={{ gap: '0.2rem' }}>
                <div className={`${styles.scoreCard} ${styles.scoreCardPositive}`} style={{ width: 30, height: 42, fontSize: '0.72rem', border: '2px solid #fbbf24' }}>+3</div>
                <span style={{ fontSize: '0.6rem', color: '#ef4444' }}>Alice !</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* DOUBLE */}
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuRow} style={{ gap: '0.75rem', alignItems: 'flex-start' }}>
          <div className={styles.illuCol} style={{ gap: '0.3rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <div className={`${styles.scoreCard} ${styles.scoreCardPositive}`} style={{ width: 32, height: 46, fontSize: '0.8rem', border: '2px solid #4ade80' }}>×2</div>
              <div className={`${styles.scoreCard} ${styles.scoreCardNegative}`} style={{ width: 32, height: 46, fontSize: '0.8rem', border: '2px solid #f87171' }}>×2</div>
            </div>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#a78bfa', textAlign: 'center' }}>{illu.specialNames.double}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', color: '#e0e7ff', lineHeight: 1.5, marginBottom: '0.4rem' }}>
              {illu.doubleDesc}
            </div>
            <div className={styles.illuRow} style={{ gap: '0.4rem' }}>
              <div className={`${styles.scoreCard} ${styles.scoreCardPositive}`} style={{ width: 30, height: 42, fontSize: '0.72rem' }}>+3</div>
              <span style={{ fontSize: '1rem', color: '#a78bfa', fontWeight: 900 }}>×2 →</span>
              <div className={`${styles.scoreCard} ${styles.scoreCardPositive}`} style={{ width: 30, height: 42, fontSize: '0.72rem', border: '2px solid #a78bfa', boxShadow: '0 0 8px rgba(167,139,250,0.5)' }}>+6</div>
            </div>
          </div>
        </div>
      </div>
      {/* ÉCHANGE */}
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuRow} style={{ gap: '0.75rem', alignItems: 'flex-start' }}>
          <div className={styles.illuCol} style={{ gap: '0.3rem', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <div className={`${styles.scoreCard} ${styles.scoreCardPositive}`} style={{ width: 32, height: 46, fontSize: '0.8rem', border: '2px solid #4ade80' }}>⇄</div>
              <div className={`${styles.scoreCard} ${styles.scoreCardNegative}`} style={{ width: 32, height: 46, fontSize: '0.8rem', border: '2px solid #f87171' }}>⇄</div>
            </div>
            <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#38bdf8', textAlign: 'center' }}>{illu.specialNames.swap}</span>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.82rem', color: '#e0e7ff', lineHeight: 1.5, marginBottom: '0.4rem' }}>
              {illu.swapDesc}
            </div>
            <div className={styles.illuRow} style={{ gap: '0.35rem', flexWrap: 'wrap' }}>
              <div className={styles.illuCol} style={{ gap: '0.2rem' }}>
                <div className={`${styles.scoreCard} ${styles.scoreCardPositive}`} style={{ width: 30, height: 42, fontSize: '0.72rem' }}>+5</div>
                <span style={{ fontSize: '0.6rem', color: '#ef4444' }}>Alice</span>
              </div>
              <span style={{ fontSize: '1.1rem', color: '#38bdf8' }}>⇄</span>
              <div className={styles.illuCol} style={{ gap: '0.2rem' }}>
                <div className={`${styles.scoreCard} ${styles.scoreCardNegative}`} style={{ width: 30, height: 42, fontSize: '0.72rem' }}>-3</div>
                <span style={{ fontSize: '0.6rem', color: '#22c55e' }}>Cara</span>
              </div>
              <span style={{ fontSize: '0.9rem', color: '#38bdf8' }}>→</span>
              <div className={styles.illuCol} style={{ gap: '0.2rem' }}>
                <div className={`${styles.scoreCard} ${styles.scoreCardNegative}`} style={{ width: 30, height: 42, fontSize: '0.72rem', border: '2px solid #38bdf8' }}>-3</div>
                <span style={{ fontSize: '0.6rem', color: '#ef4444' }}>Alice</span>
              </div>
              <div className={styles.illuCol} style={{ gap: '0.2rem' }}>
                <div className={`${styles.scoreCard} ${styles.scoreCardPositive}`} style={{ width: 30, height: 42, fontSize: '0.72rem', border: '2px solid #38bdf8' }}>+5</div>
                <span style={{ fontSize: '0.6rem', color: '#22c55e' }}>Cara</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Slide 7 — Les étoiles
function IlluStars({ illu }: { illu: Illu }) {
  const players = [
    { name: 'Alice', color: '#ef4444', lastCard: 3, unique: false },
    { name: 'Bob',   color: '#3b82f6', lastCard: 6, unique: true  },
    { name: 'Cara',  color: '#22c55e', lastCard: 3, unique: false },
  ];
  return (
    <div className={styles.illuCol} style={{ gap: '1rem', width: '100%', maxWidth: 400 }}>
      {/* Dernières cartes */}
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel}>{illu.roundEndLastCards}</div>
        <div className={styles.illuRow} style={{ gap: '1rem' }}>
          {players.map(p => (
            <div key={p.name} className={styles.illuCol} style={{ gap: '0.4rem' }}>
              <div className={`${styles.card} ${p.unique ? '' : styles.cancelled}`}
                style={{
                  width: 44, height: 64, fontSize: '1.2rem',
                  background: `linear-gradient(135deg, ${p.color}99, ${p.color})`,
                  boxShadow: p.unique ? `0 0 16px ${p.color}99` : undefined,
                  border: p.unique ? `2px solid ${p.color}` : undefined,
                }}>
                {p.lastCard}
                {!p.unique && <span className={styles.cancelX}>✕</span>}
              </div>
              <span className={styles.playerName} style={{ textAlign: 'center', color: p.unique ? '#fbbf24' : undefined }}>
                {p.name}{p.unique ? ' ⭐' : ''}
              </span>
            </div>
          ))}
        </div>
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
          {illu.bobUniqueExplain(<span style={{ color: '#fbbf24' }}>{illu.uniqueWord}</span>)}
        </span>
      </div>

      {/* Bonus final */}
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel}>{illu.endGameBonus}</div>
        <div className={styles.illuRow} style={{ gap: '0.75rem' }}>
          <span style={{ fontSize: '2rem' }}>⭐⭐⭐</span>
          <div className={styles.arrow}>→</div>
          <div className={styles.scorePill} style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)' }}>
            <span style={{ color: '#fbbf24', fontWeight: 800 }}>+5 pts</span>
          </div>
        </div>
        <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.5)' }}>
          {illu.mostStarsBonus}
        </span>
      </div>
    </div>
  );
}

// Slide 9 — Nombre de manches
function IlluRounds({ illu }: { illu: Illu }) {
  const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b'];
  const maxRounds = Math.max(...illu.roundsRows.map(r => r.rounds));
  return (
    <div className={styles.illuCol} style={{ gap: '0.9rem', width: '100%', maxWidth: 460 }}>

      {/* Formule */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <span style={{
          fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8',
          background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)',
          borderRadius: 8, padding: '0.3rem 0.75rem',
        }}>
          {illu.roundsFormula}
        </span>
      </div>

      {/* Tableau + barres */}
      <div className={styles.illuBox} style={{ width: '100%', padding: '0.6rem 0.75rem' }}>
        {/* En-tête */}
        <div style={{
          display: 'grid', gridTemplateColumns: '80px 1fr 48px',
          gap: '0.4rem', marginBottom: '0.45rem', alignItems: 'center',
        }}>
          {[illu.roundsPlayers, illu.roundsRounds, ''].map((h, i) => (
            <span key={i} style={{
              fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.35)', letterSpacing: '0.05em',
              textAlign: i === 2 ? 'right' : 'left',
            }}>{h}</span>
          ))}
        </div>
        {/* Lignes */}
        {illu.roundsRows.map((row, idx) => {
          const pct = (row.rounds / maxRounds) * 100;
          const color = PLAYER_COLORS[idx % PLAYER_COLORS.length];
          return (
            <div key={row.players} style={{
              display: 'grid', gridTemplateColumns: '80px 1fr 48px',
              gap: '0.4rem', alignItems: 'center',
              padding: '0.4rem 0',
              borderTop: idx === 0 ? '1px solid rgba(255,255,255,0.08)' : '1px solid rgba(255,255,255,0.06)',
            }}>
              {/* Joueurs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                {Array.from({ length: row.players }).map((_, i) => (
                  <span key={i} style={{
                    width: 9, height: 9, borderRadius: '50%',
                    background: PLAYER_COLORS[i % PLAYER_COLORS.length],
                    display: 'inline-block', flexShrink: 0,
                    boxShadow: `0 0 4px ${PLAYER_COLORS[i % PLAYER_COLORS.length]}88`,
                  }} />
                ))}
              </div>
              {/* Barre de progression */}
              <div style={{
                height: 14, borderRadius: 7,
                background: 'rgba(255,255,255,0.07)',
                overflow: 'hidden',
                position: 'relative',
              }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, bottom: 0,
                  width: `${pct}%`,
                  background: `linear-gradient(90deg, ${color}99, ${color})`,
                  borderRadius: 7,
                  transition: 'width 0.4s ease',
                }} />
              </div>
              {/* Valeur */}
              <span style={{
                fontSize: '1rem', fontWeight: 900, color,
                textAlign: 'right',
                textShadow: `0 0 8px ${color}88`,
              }}>{row.rounds}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Slide 10 — Fin de partie : scoreboard
function IlluGameOver({ illu }: { illu: Illu }) {
  const rows = [
    { rank: 1, name: 'Bob',   color: '#3b82f6', cards: '+11', stars: 4, bonus: 5, total: 20 },
    { rank: 2, name: 'Cara',  color: '#22c55e', cards: '+8',  stars: 2, bonus: 0, total: 10 },
    { rank: 3, name: 'Alice', color: '#ef4444', cards: '-2',  stars: 1, bonus: 0, total:  -1 },
  ];
  const rankClass = ['gold', 'silver', 'bronze'] as const;

  return (
    <div className={styles.illuCol} style={{ gap: '0.75rem', width: '100%', maxWidth: 420 }}>
      {/* Formule */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap',
        justifyContent: 'center', marginBottom: '0.25rem',
      }}>
        {[
          { label: illu.formulaCards, color: '#4ade80' },
          { label: '+', color: 'rgba(255,255,255,0.3)' },
          { label: illu.formulaStars, color: '#fbbf24' },
          { label: '+', color: 'rgba(255,255,255,0.3)' },
          { label: illu.formulaBonus, color: '#c4b5fd' },
          { label: '=', color: 'rgba(255,255,255,0.3)' },
          { label: illu.formulaTotal, color: 'white' },
        ].map((item, i) => (
          <span key={i} style={{ fontSize: '0.8rem', fontWeight: 700, color: item.color }}>{item.label}</span>
        ))}
      </div>

      {/* Scoreboard */}
      <div className={styles.scoreboard}>
        {rows.map((r) => (
          <div key={r.rank} className={styles.scoreRow}
            style={{ borderLeftColor: r.color }}>
            <span className={`${styles.scoreRank} ${styles[rankClass[r.rank - 1]]}`}>
              #{r.rank}
            </span>
            <span className={styles.dot}
              style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
            <span className={styles.scoreName}>{r.name}</span>
            <div className={styles.scoreDetail}>
              <span style={{ color: r.cards.startsWith('+') ? '#4ade80' : '#f87171' }}>🃏 {r.cards}</span>
              <span>⭐ +{r.stars}</span>
              {r.bonus > 0 && <span style={{ color: '#c4b5fd' }}>🏆 +{r.bonus}</span>}
            </div>
            <span className={styles.scoreTotalBadge}>{r.total} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Illustrations indexées ───────────────────────────────────────────────────

// Ordre : Goal | Hand | MysteryCard | Trick | Duplicates | ScoreCards | SpecialCards | Stars | GameOver | Rounds
function useIllustrations(illu: Illu) {
  return [
    <IlluGoal illu={illu} />,
    <IlluHand illu={illu} />,
    <IlluMysteryCard illu={illu} />,
    <IlluTrick illu={illu} />,
    <IlluDuplicates illu={illu} />,
    <IlluScoreCards illu={illu} />,
    <IlluSpecialCards illu={illu} />,
    <IlluStars illu={illu} />,
    <IlluGameOver illu={illu} />,
    <IlluRounds illu={illu} />,
  ];
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface TutorialProps {
  onClose: () => void;
}

export function Tutorial({ onClose }: TutorialProps) {
  const t = useT();
  const slides = t.tutorial.slides;
  const total = slides.length;
  const illustrations = useIllustrations(t.tutorial.illu);

  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');
  const [animKey, setAnimKey] = useState(0);

  const goTo = useCallback((next: number, dir: 'forward' | 'back') => {
    setDirection(dir);
    setAnimKey(k => k + 1);
    setCurrent(next);
  }, []);

  const handlePrev = () => { if (current > 0) goTo(current - 1, 'back'); };
  const handleNext = () => { if (current < total - 1) goTo(current + 1, 'forward'); };

  const slide = slides[current];

  return (
    <div className={styles.overlay} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.modal}>

        {/* Bouton fermer */}
        <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">✕</button>

        {/* Barre de progression */}
        <div className={styles.progressBar}>
          {slides.map((_, i) => (
            <div
              key={i}
              className={`${styles.progressDot} ${i === current ? styles.active : i < current ? styles.done : ''}`}
              onClick={() => goTo(i, i > current ? 'forward' : 'back')}
            />
          ))}
        </div>

        {/* Contenu de la slide */}
        <div
          key={animKey}
          className={`${styles.slideWrapper} ${direction === 'back' ? styles.reverse : ''}`}
        >
          <div className={styles.slideHeader}>
            <span className={styles.slideIcon}>{slide.icon}</span>
            <h2 className={styles.slideTitle}>{slide.title}</h2>
          </div>

          <div className={styles.illustration}>
            {illustrations[current]}
          </div>

          <p
            className={styles.slideText}
            dangerouslySetInnerHTML={{ __html: slide.text }}
          />
        </div>

        {/* Navigation */}
        <div className={styles.nav}>
          <span className={styles.navCounter}>
            {t.tutorial.counter(current + 1, total)}
          </span>
          <div className={styles.navButtons}>
            {current > 0 && (
              <button className={`${styles.btnNav} ${styles.btnPrev}`} onClick={handlePrev}>
                {t.tutorial.btnPrev}
              </button>
            )}
            {current < total - 1 ? (
              <button className={`${styles.btnNav} ${styles.btnNext}`} onClick={handleNext}>
                {t.tutorial.btnNext}
              </button>
            ) : (
              <button className={`${styles.btnNav} ${styles.btnClose}`} onClick={onClose}>
                {t.tutorial.btnClose}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
