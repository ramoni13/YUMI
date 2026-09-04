import React, { useState, useCallback } from 'react';
import { useT } from '../../hooks/useT';
import styles from './Tutorial.module.css';
import fluxStyles from './FluxTutorial.module.css';

// ─── Illustrations Flux ───────────────────────────────────────────────────────

// Slide 1 — But du jeu Flux
function FluxIlluGoal({ illu }: { illu: ReturnType<typeof useT>['fluxTutorial']['illu'] }) {
  return (
    <div className={styles.illuRow}>
      {/* Flux de cartes */}
      <div className={styles.illuCol}>
        <div style={{ position: 'relative', width: 64, height: 100 }}>
          {[2, 1, 0].map(offset => (
            <div
              key={offset}
              className={`${styles.scoreCard} ${offset % 2 === 0 ? styles.scoreCardPositive : styles.scoreCardNegative}`}
              style={{
                position: 'absolute',
                top: offset * 6,
                left: offset * 4,
                opacity: 1 - offset * 0.2,
                zIndex: 3 - offset,
                fontSize: '0.85rem',
              }}
            >
              {offset === 0 ? '+4' : offset === 1 ? '-2⭐' : '+3'}
            </div>
          ))}
        </div>
        <span className={styles.illuBoxLabel} style={{ color: '#38bdf8' }}>Flux continu</span>
      </div>

      <div className={styles.arrow}>→</div>

      {/* Score total */}
      <div className={styles.illuCol}>
        <div style={{
          width: 80, height: 80, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0c4a6e, #38bdf8)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column',
          boxShadow: '0 0 24px rgba(56,189,248,0.4)',
          border: '3px solid rgba(56,189,248,0.5)',
        }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>3</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#e0f2fe', opacity: 0.8 }}>PV</span>
        </div>
        <span className={styles.illuBoxLabel} style={{ color: '#38bdf8' }}>{illu.finalScore}</span>
      </div>

      <div className={styles.arrow}>→</div>

      {/* Trophée */}
      <div className={styles.illuCol}>
        <div style={{ fontSize: '3.5rem', filter: 'drop-shadow(0 0 12px rgba(56,189,248,0.6))' }}>🏆</div>
        <span className={styles.illuBoxLabel} style={{ color: '#38bdf8' }}>{illu.victory}</span>
      </div>
    </div>
  );
}

// Slide 2 — La main : 1 à 8 cartes + 1 Recharge + 1 mystère
function FluxIlluHand({ illu }: { illu: ReturnType<typeof useT>['fluxTutorial']['illu'] }) {
  return (
    <div className={styles.illuCol} style={{ gap: '0.9rem', width: '100%', maxWidth: 460 }}>

      {/* Fourchette de cartes */}
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel}>{illu.handTitle}</div>
        <div className={styles.illuRow} style={{ gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Min */}
          <div className={styles.illuCol} style={{ gap: '0.3rem' }}>
            <div className={styles.card} style={{
              width: 40, height: 58, fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
              border: '2px solid #60a5fa',
            }}>1</div>
            <span style={{ fontSize: '0.65rem', color: '#60a5fa', fontWeight: 700 }}>{illu.handMin}</span>
          </div>

          <span style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.3)', alignSelf: 'center' }}>→</span>

          {/* Max */}
          <div className={styles.illuCol} style={{ gap: '0.3rem' }}>
            <div style={{ display: 'flex', gap: '0.2rem' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map(n => (
                <div key={n} className={styles.card} style={{
                  width: 22, height: 34, fontSize: '0.6rem', fontWeight: 800,
                  background: `linear-gradient(135deg, #1e3a8a, #3b82f6)`,
                  border: '1px solid rgba(96,165,250,0.5)',
                  borderRadius: 5, flexShrink: 0,
                }}>{n}</div>
              ))}
            </div>
            <span style={{ fontSize: '0.65rem', color: '#60a5fa', fontWeight: 700 }}>{illu.handMax}</span>
          </div>
        </div>
      </div>

      {/* Recharge + Mystère */}
      <div className={styles.illuRow} style={{ gap: '0.75rem', width: '100%' }}>
        {/* Carte Recharge */}
        <div className={styles.illuBox} style={{ flex: 1 }}>
          <div className={styles.illuBoxLabel} style={{ color: '#38bdf8' }}>{illu.handRecharge}</div>
          <div style={{
            width: 48, height: 68, borderRadius: 10,
            background: 'linear-gradient(135deg, #0c4a6e, #0ea5e9)',
            border: '2px solid #38bdf8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.6rem',
            boxShadow: '0 0 16px rgba(56,189,248,0.4)',
          }}>🔄</div>
        </div>

        {/* Carte Mystère */}
        <div className={styles.illuBox} style={{ flex: 1 }}>
          <div className={styles.illuBoxLabel} style={{ color: '#fbbf24' }}>{illu.handMystery}</div>
          <div className={`${styles.card} ${styles.cardFaceDown}`} style={{
            width: 48, height: 68, fontSize: '1.4rem',
            border: '2px solid #fbbf24',
            boxShadow: '0 0 16px rgba(251,191,36,0.3)',
          }}>🂠</div>
        </div>
      </div>
    </div>
  );
}

// Slide 3 — Flux de cartes Score
function FluxIlluStream({ illu }: { illu: ReturnType<typeof useT>['fluxTutorial']['illu'] }) {
  const cards = [
    { val: '+5', type: 'positive', label: illu.fluxGreen },
    { val: '-2⭐', type: 'negative', label: illu.fluxRed },
    { val: '+3', type: 'positive', label: '' },
    { val: '🦅', type: 'special', label: illu.fluxSpecial },
    { val: '-1⭐', type: 'negative', label: '' },
    { val: '+4', type: 'positive', label: '' },
  ];

  return (
    <div className={styles.illuCol} style={{ gap: '0.9rem', width: '100%', maxWidth: 460 }}>
      {/* Badge flux continu */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: '0.5rem',
      }}>
        <span style={{
          fontSize: '0.82rem', fontWeight: 800, color: '#38bdf8',
          background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.3)',
          borderRadius: 8, padding: '0.3rem 0.75rem',
        }}>
          🌊 {illu.fluxContinuous}
        </span>
      </div>

      {/* Flux de cartes */}
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'flex-end', justifyContent: 'center', flexWrap: 'wrap' }}>
          {cards.map((c, i) => (
            <div key={i} className={styles.illuCol} style={{ gap: '0.25rem' }}>
              <div
                className={`${styles.scoreCard} ${
                  c.type === 'positive' ? styles.scoreCardPositive :
                  c.type === 'negative' ? styles.scoreCardNegative :
                  styles.scoreCardSpecial
                }`}
                style={{
                  width: 42, height: 60, fontSize: '0.78rem',
                  textAlign: 'center', padding: '0 2px',
                  opacity: i === 0 ? 1 : 0.7 + (i * 0.05),
                  transform: `rotate(${(i - 2.5) * 3}deg)`,
                }}
              >
                {c.val}
              </div>
              {c.label && (
                <span style={{
                  fontSize: '0.58rem', fontWeight: 700, textAlign: 'center',
                  color: c.type === 'positive' ? '#4ade80' : c.type === 'negative' ? '#f87171' : '#c4b5fd',
                  maxWidth: 52,
                }}>{c.label}</span>
              )}
            </div>
          ))}
          <div style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.3)', alignSelf: 'center' }}>→</div>
          <div style={{ fontSize: '1.5rem', color: 'rgba(255,255,255,0.15)', alignSelf: 'center' }}>…</div>
        </div>
      </div>

      {/* Légende */}
      <div className={styles.illuRow} style={{ gap: '0.75rem' }}>
        <div className={styles.illuBox} style={{ flex: 1, padding: '0.5rem' }}>
          <div className={`${styles.scoreCard} ${styles.scoreCardPositive}`} style={{ width: 32, height: 44, fontSize: '0.72rem' }}>+5</div>
          <span style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 700, textAlign: 'center' }}>{illu.fluxGreen}</span>
        </div>
        <div className={styles.illuBox} style={{ flex: 1, padding: '0.5rem' }}>
          <div className={`${styles.scoreCard} ${styles.scoreCardNegative}`} style={{ width: 32, height: 44, fontSize: '0.65rem' }}>-2⭐</div>
          <span style={{ fontSize: '0.65rem', color: '#f87171', fontWeight: 700, textAlign: 'center' }}>{illu.fluxRed}</span>
        </div>
        <div className={styles.illuBox} style={{ flex: 1, padding: '0.5rem' }}>
          <div className={`${styles.scoreCard} ${styles.scoreCardSpecial}`} style={{ width: 32, height: 44, fontSize: '0.9rem' }}>🦅</div>
          <span style={{ fontSize: '0.65rem', color: '#c4b5fd', fontWeight: 700, textAlign: 'center' }}>{illu.fluxSpecial}</span>
        </div>
      </div>
    </div>
  );
}

// Slide 4 — Doublons s'annulent
function FluxIlluDuplicates({ illu }: { illu: ReturnType<typeof useT>['fluxTutorial']['illu'] }) {
  return (
    <div className={styles.illuCol} style={{ gap: '0.8rem', width: '100%', maxWidth: 440 }}>

      {/* Exemple : doublons annulés, unique gagne */}
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel} style={{ color: '#4ade80' }}>{illu.dupWinner}</div>
        <div className={styles.illuRow} style={{ gap: '0.5rem' }}>
          {[
            { val: '5', bg: 'linear-gradient(135deg,#991b1b,#ef4444)', name: 'Alice', cancelled: true },
            { val: '5', bg: 'linear-gradient(135deg,#1e3a8a,#3b82f6)', name: 'Bob',   cancelled: true },
            { val: '7', bg: 'linear-gradient(135deg,#14532d,#22c55e)', name: 'Cara',  cancelled: false },
          ].map((c, i) => (
            <div key={i} className={styles.illuCol} style={{ gap: '0.25rem' }}>
              <div className={`${styles.card} ${c.cancelled ? styles.cancelled : ''}`}
                style={{
                  width: 40, height: 58, fontSize: '1.1rem', background: c.bg,
                  boxShadow: !c.cancelled ? '0 0 14px rgba(34,197,94,0.6)' : undefined,
                  border: !c.cancelled ? '2px solid #4ade80' : undefined,
                }}>
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
          Les 5 s'annulent → Cara gagne avec le 7
        </span>
      </div>

      {/* Tout annulé */}
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel}>{illu.dupDiscard}</div>
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

// Slide 5 - La carte YUMI
function FluxIlluYumi({ illu }: { illu: ReturnType<typeof useT>['fluxTutorial']['illu'] }) {
  return (
    <div className={styles.illuCol} style={{ gap: '0.85rem', width: '100%', maxWidth: 460 }}>
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel} style={{ color: '#fbbf24' }}>{illu.rechargePlay}</div>
        <div style={{
          width: 56, height: 80, borderRadius: 12,
          background: 'linear-gradient(135deg, #78350f, #f59e0b)',
          border: '3px solid #fbbf24',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.1rem', fontWeight: 900, color: '#fff',
          boxShadow: '0 0 24px rgba(251,191,36,0.6)',
        }}>YUMI</div>
      </div>
      <div className={styles.illuRow} style={{ gap: '0.6rem', width: '100%' }}>
        <div className={styles.illuBox} style={{ flex: 1, border: '1px solid rgba(74,222,128,0.4)' }}>
          <div className={`${styles.scoreCard} ${styles.scoreCardPositive}`} style={{ width: 36, height: 50, fontSize: '0.8rem' }}>+5</div>
          <span style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 700, textAlign: 'center' }}>{illu.rechargeGet}</span>
        </div>
        <div className={styles.illuBox} style={{ flex: 1, border: '1px solid rgba(248,113,113,0.4)' }}>
          <div className={`${styles.scoreCard} ${styles.scoreCardNegative}`} style={{ width: 36, height: 50, fontSize: '0.8rem' }}>-3</div>
          <span style={{ fontSize: '0.65rem', color: '#f87171', fontWeight: 700, textAlign: 'center' }}>{illu.rechargeNewMystery}</span>
        </div>
      </div>
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel}>{illu.rechargeStarBonus}</div>
        <div className={styles.illuRow} style={{ gap: '0.4rem' }}>
          {[0, 1].map(i => (
            <div key={i} className={`${styles.card} ${styles.cancelled}`} style={{
              width: 40, height: 56, borderRadius: 10,
              background: 'linear-gradient(135deg, #78350f, #f59e0b)',
              border: '2px solid rgba(251,191,36,0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.7rem', fontWeight: 900, color: 'rgba(255,255,255,0.4)',
            }}>YUMI<span className={styles.cancelX}>✕</span></div>
          ))}
          <div className={styles.arrow}>→</div>
          <span style={{ fontSize: '1.8rem' }}>🚫</span>
        </div>
      </div>
    </div>
  );
}

// Slide 5 — La carte Recharge
// Slide 6 - La carte Recharge
function FluxIlluRecharge({ illu }: { illu: ReturnType<typeof useT>['fluxTutorial']['illu'] }) {
  return (
    <div className={styles.illuCol} style={{ gap: '0.75rem', width: '100%', maxWidth: 480 }}>

      {/* Scenario : 1 recharge, Alice joue 5, Bob joue 5 (annules), Cara joue 7 unique */}
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel} style={{ color: '#38bdf8' }}>Ce tour : 1 joueur recharge</div>
        <div className={styles.illuRow} style={{ gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          {/* David : Recharge */}
          <div className={styles.illuCol} style={{ gap: '0.25rem' }}>
            <div style={{
              width: 40, height: 56, borderRadius: 9,
              background: 'linear-gradient(135deg, #0c4a6e, #0ea5e9)',
              border: '2px solid #38bdf8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', boxShadow: '0 0 12px rgba(56,189,248,0.4)',
            }}>🔄</div>
            <span style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 700 }}>David</span>
          </div>
          {/* Alice : 5 annule */}
          <div className={styles.illuCol} style={{ gap: '0.25rem' }}>
            <div className={`${styles.card} ${styles.cancelled}`} style={{
              width: 40, height: 56, fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #991b1b, #ef4444)',
            }}>5<span className={styles.cancelX}>✕</span></div>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>Alice</span>
          </div>
          {/* Bob : 5 annule */}
          <div className={styles.illuCol} style={{ gap: '0.25rem' }}>
            <div className={`${styles.card} ${styles.cancelled}`} style={{
              width: 40, height: 56, fontSize: '1.1rem',
              background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
            }}>5<span className={styles.cancelX}>✕</span></div>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>Bob</span>
          </div>
          {/* Cara : 7 unique */}
          <div className={styles.illuCol} style={{ gap: '0.25rem' }}>
            <div className={styles.card} style={{
              width: 40, height: 56, fontSize: '1.2rem',
              background: 'linear-gradient(135deg, #14532d, #22c55e)',
              border: '2px solid #4ade80',
              boxShadow: '0 0 14px rgba(74,222,128,0.5)',
            }}>7</div>
            <span style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 700 }}>Cara 🏅</span>
          </div>
        </div>
      </div>

      {/* Resultat : Cara gagne 1 point bonus (= 1 rechargeur). Alice et Bob : 0 (annules) */}
      <div className={styles.illuRow} style={{ gap: '0.6rem', width: '100%' }}>
        {/* Cara : valeur unique -> 1 point bonus */}
        <div className={styles.illuBox} style={{ flex: 1, border: '1px solid rgba(56,189,248,0.35)' }}>
          <div className={styles.illuBoxLabel} style={{ color: '#4ade80' }}>Cara — valeur unique</div>
          <div className={styles.illuRow} style={{ gap: '0.4rem' }}>
            <div className={styles.card} style={{
              width: 32, height: 44, fontSize: '0.9rem',
              background: 'linear-gradient(135deg, #14532d, #22c55e)',
              border: '2px solid #4ade80',
            }}>7</div>
            <div className={styles.arrow} style={{ color: '#38bdf8' }}>→</div>
            <span style={{ fontSize: '1.4rem' }}>🎯</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8' }}>+1</span>
          </div>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>1 rechargeur × valeur unique</span>
        </div>
        {/* Alice & Bob : annules -> 0 */}
        <div className={styles.illuBox} style={{ flex: 1, border: '1px solid rgba(255,255,255,0.1)' }}>
          <div className={styles.illuBoxLabel} style={{ color: 'rgba(255,255,255,0.4)' }}>Alice & Bob — annulés</div>
          <div className={styles.illuRow} style={{ gap: '0.3rem' }}>
            <div className={`${styles.card} ${styles.cancelled}`} style={{ width: 28, height: 40, fontSize: '0.8rem', background: 'linear-gradient(135deg,#991b1b,#ef4444)' }}>5</div>
            <div className={`${styles.card} ${styles.cancelled}`} style={{ width: 28, height: 40, fontSize: '0.8rem', background: 'linear-gradient(135deg,#1e3a8a,#3b82f6)' }}>5</div>
            <div className={styles.arrow}>→</div>
            <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'rgba(255,255,255,0.3)' }}>0 🎯</span>
          </div>
          <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.4)' }}>doublon → pas de point bonus</span>
        </div>
      </div>

      {/* Recuperation main */}
      <div className={styles.illuRow} style={{ gap: '0.75rem', width: '100%' }}>
        <div className={styles.illuBox} style={{ flex: 1 }}>
          <div className={styles.illuBoxLabel} style={{ color: '#4ade80' }}>{illu.starsOnCards}</div>
          <div style={{ display: 'flex', gap: '0.15rem' }}>
            {[1,2,3,4,5].map(n => (
              <div key={n} className={styles.card} style={{
                width: 20, height: 30, fontSize: '0.55rem', fontWeight: 800,
                background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                border: '1px solid rgba(96,165,250,0.5)', borderRadius: 4,
              }}>{n}</div>
            ))}
          </div>
        </div>
        <div className={styles.illuBox} style={{ flex: 1 }}>
          <div className={styles.illuBoxLabel} style={{ color: '#fbbf24' }}>{illu.starsMajority}</div>
          <div className={`${styles.card} ${styles.cardFaceDown}`} style={{
            width: 36, height: 50, fontSize: '1.1rem',
            border: '2px solid #fbbf24',
            boxShadow: '0 0 10px rgba(251,191,36,0.3)',
          }}>🂠</div>
        </div>
      </div>
    </div>
  );
}
// Slide 7 - Les 3 compteurs (points de victoire)
function FluxIlluCounters({ illu }: { illu: ReturnType<typeof useT>['fluxTutorial']['illu'] }) {
  return (
    <div className={styles.illuCol} style={{ gap: '0.6rem', width: '100%', maxWidth: 460 }}>

      {/* Compteur 1 : Etoiles */}
      <div className={styles.illuBox} style={{ width: '100%', border: '1px solid #fbbf2444', padding: '0.5rem 0.75rem' }}>
        <div className={styles.illuBoxLabel} style={{ color: '#fbbf24' }}>{illu.formulaCards} — ⭐</div>
        <div className={styles.illuRow} style={{ gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Cartes avec etoiles */}
          {[
            { val: '-1', stars: 1, bg: 'linear-gradient(135deg,#7f1d1d,#ef4444)' },
            { val: '-2', stars: 2, bg: 'linear-gradient(135deg,#7f1d1d,#ef4444)' },
            { val: '-1', stars: 1, bg: 'linear-gradient(135deg,#7f1d1d,#ef4444)' },
          ].map((c, i) => (
            <div key={i} className={styles.illuCol} style={{ gap: '0.15rem', alignItems: 'center' }}>
              <div className={`${styles.scoreCard} ${styles.scoreCardNegative}`}
                style={{ width: 34, height: 48, fontSize: '0.7rem', textAlign: 'center' }}>
                {c.val}<br/>{'⭐'.repeat(c.stars)}
              </div>
            </div>
          ))}
          <div className={styles.arrow} style={{ color: '#fbbf24' }}>→</div>
          <div style={{
            fontSize: '0.8rem', fontWeight: 900, color: '#fbbf24',
            background: 'rgba(251,191,36,0.15)', border: '1px solid #fbbf24',
            borderRadius: 8, padding: '0.25rem 0.6rem',
          }}>4 ⭐ total</div>
          <div className={styles.arrow} style={{ color: '#fbbf24' }}>→</div>
          <div style={{
            fontSize: '0.7rem', fontWeight: 800, color: '#fff',
            background: 'rgba(251,191,36,0.25)', border: '1px solid #fbbf24',
            borderRadius: 6, padding: '0.2rem 0.4rem',
          }}>1 PV</div>
        </div>
      </div>

      {/* Compteur 2 : Points cartes */}
      <div className={styles.illuBox} style={{ width: '100%', border: '1px solid #4ade8044', padding: '0.5rem 0.75rem' }}>
        <div className={styles.illuBoxLabel} style={{ color: '#4ade80' }}>{illu.formulaRecharge} — 🃏</div>
        <div className={styles.illuRow} style={{ gap: '0.4rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { val: '+5', bg: 'linear-gradient(135deg,#14532d,#22c55e)', cls: styles.scoreCardPositive },
            { val: '+3', bg: 'linear-gradient(135deg,#14532d,#22c55e)', cls: styles.scoreCardPositive },
            { val: '-2', bg: 'linear-gradient(135deg,#7f1d1d,#ef4444)', cls: styles.scoreCardNegative },
            { val: '+1', bg: 'linear-gradient(135deg,#14532d,#22c55e)', cls: styles.scoreCardPositive },
          ].map((c, i) => (
            <div key={i} className={`${styles.scoreCard} ${c.cls}`}
              style={{ width: 32, height: 44, fontSize: '0.72rem' }}>
              {c.val}
            </div>
          ))}
          <div className={styles.arrow} style={{ color: '#4ade80' }}>→</div>
          <div style={{
            fontSize: '0.8rem', fontWeight: 900, color: '#4ade80',
            background: 'rgba(74,222,128,0.15)', border: '1px solid #4ade80',
            borderRadius: 8, padding: '0.25rem 0.6rem',
          }}>+7 pts</div>
          <div className={styles.arrow} style={{ color: '#4ade80' }}>→</div>
          <div style={{
            fontSize: '0.7rem', fontWeight: 800, color: '#fff',
            background: 'rgba(74,222,128,0.25)', border: '1px solid #4ade80',
            borderRadius: 6, padding: '0.2rem 0.4rem',
          }}>1 PV</div>
        </div>
      </div>

      {/* Compteur 3 : Points bonus */}
      <div className={styles.illuBox} style={{ width: '100%', border: '1px solid #38bdf844', padding: '0.5rem 0.75rem' }}>
        <div className={styles.illuBoxLabel} style={{ color: '#38bdf8' }}>{illu.formulaBonus} — 🎯</div>
        <div className={styles.illuRow} style={{ gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {['🎯', '🎯', '🎯'].map((icon, i) => (
            <span key={i} style={{ fontSize: '1.4rem', filter: 'drop-shadow(0 0 6px rgba(56,189,248,0.5))' }}>{icon}</span>
          ))}
          <div className={styles.arrow} style={{ color: '#38bdf8' }}>→</div>
          <div style={{
            fontSize: '0.8rem', fontWeight: 900, color: '#38bdf8',
            background: 'rgba(56,189,248,0.15)', border: '1px solid #38bdf8',
            borderRadius: 8, padding: '0.25rem 0.6rem',
          }}>3 pts bonus</div>
          <div className={styles.arrow} style={{ color: '#38bdf8' }}>→</div>
          <div style={{
            fontSize: '0.7rem', fontWeight: 800, color: '#fff',
            background: 'rgba(56,189,248,0.25)', border: '1px solid #38bdf8',
            borderRadius: 6, padding: '0.2rem 0.4rem',
          }}>1 PV</div>
        </div>
      </div>

    </div>
  );
}

// Slide 8 - Fin de partie
function FluxIlluGameOver({ illu }: { illu: ReturnType<typeof useT>['fluxTutorial']['illu'] }) {
  const rows = [
    { name: 'Cara',  color: '#22c55e', vp: 3, winner: true  },
    { name: 'Bob',   color: '#3b82f6', vp: 2, winner: false },
    { name: 'Alice', color: '#ef4444', vp: 1, winner: false },
    { name: 'David', color: '#a855f7', vp: 0, winner: false },
  ];
  return (
    <div className={styles.illuCol} style={{ gap: '0.75rem', width: '100%', maxWidth: 420 }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
        background: 'rgba(56,189,248,0.08)', border: '1px solid rgba(56,189,248,0.3)',
        borderRadius: 10, padding: '0.5rem 1rem',
      }}>
        <span style={{ fontSize: '1.4rem' }}>🏆</span>
        <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#38bdf8' }}>{illu.finalScore}</span>
      </div>
      <div className={styles.scoreboard}>
        {rows.map((r, i) => (
          <div key={i} className={styles.scoreRow}
            style={{ borderLeftColor: r.color, background: r.winner ? 'rgba(56,189,248,0.08)' : undefined }}>
            <span className={styles.dot}
              style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
            <span className={styles.scoreName}>{r.name}</span>
            <div className={styles.illuRow} style={{ gap: '0.3rem', marginLeft: 'auto' }}>
              {[0, 1, 2].map(slot => (
                <div key={slot} style={{
                  width: 22, height: 22, borderRadius: 5,
                  background: slot < r.vp ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.06)',
                  border: `1.5px solid ${slot < r.vp ? '#38bdf8' : 'rgba(255,255,255,0.12)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', color: slot < r.vp ? '#38bdf8' : 'transparent', fontWeight: 800,
                }}>{slot < r.vp ? '\u2713' : ''}</div>
              ))}
            </div>
            <span className={styles.scoreTotalBadge}
              style={{ background: r.winner ? 'rgba(56,189,248,0.2)' : undefined, color: r.winner ? '#38bdf8' : undefined }}>
              {r.vp} PV{r.winner ? ' 🏆' : ''}
            </span>
          </div>
        ))}
      </div>
      <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
        {illu.formulaTotal}
      </span>
    </div>
  );
}

// ─── Illustrations indexées ───────────────────────────────────────────────────
function useFluxIllustrations(illu: ReturnType<typeof useT>['fluxTutorial']['illu']) {
  return [
    <FluxIlluGoal       illu={illu} />,  // Slide 1 - But du jeu
    <FluxIlluHand       illu={illu} />,  // Slide 2 - Votre main
    <FluxIlluStream     illu={illu} />,  // Slide 3 - Flux de cartes Score
    <FluxIlluDuplicates illu={illu} />,  // Slide 4 - Doublons
    <FluxIlluYumi       illu={illu} />,  // Slide 5 - Carte YUMI
    <FluxIlluRecharge   illu={illu} />,  // Slide 6 - Carte Recharge
    <FluxIlluCounters   illu={illu} />,  // Slide 7 - Les 3 compteurs
    <FluxIlluGameOver   illu={illu} />,  // Slide 8 - Fin de partie
  ];
}

// ─── Composant principal ──────────────────────────────────────────────────────

interface FluxTutorialProps {
  onClose: () => void;
}

export function FluxTutorial({ onClose }: FluxTutorialProps) {
  const t = useT();
  const ft = t.fluxTutorial;
  const slides = ft.slides;
  const total = slides.length;
  const illustrations = useFluxIllustrations(ft.illu);

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
      <div className={`${styles.modal} ${fluxStyles.fluxModal}`}>

        {/* Badge mode Flux */}
        <div className={fluxStyles.fluxBadge}>🌊 MODE FLUX</div>

        {/* Bouton fermer */}
        <button className={styles.closeBtn} onClick={onClose} aria-label="Fermer">✕</button>

        {/* Barre de progression */}
        <div className={styles.progressBar}>
          {slides.map((_, i) => (
            <div
              key={i}
              className={`${styles.progressDot} ${i === current ? fluxStyles.fluxProgressActive : i < current ? fluxStyles.fluxProgressDone : ''}`}
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
            <h2 className={`${styles.slideTitle} ${fluxStyles.fluxTitle}`}>{slide.title}</h2>
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
            {ft.counter(current + 1, total)}
          </span>
          <div className={styles.navButtons}>
            {current > 0 && (
              <button className={`${styles.btnNav} ${styles.btnPrev}`} onClick={handlePrev}>
                {ft.btnPrev}
              </button>
            )}
            {current < total - 1 ? (
              <button className={`${styles.btnNav} ${fluxStyles.fluxBtnNext}`} onClick={handleNext}>
                {ft.btnNext}
              </button>
            ) : (
              <button className={`${styles.btnNav} ${styles.btnClose}`} onClick={onClose}>
                {ft.btnClose}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
