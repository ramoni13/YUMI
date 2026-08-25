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
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#fff' }}>15</span>
          <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#e0f2fe', opacity: 0.8 }}>pts</span>
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

// Slide 5 — La carte Recharge
function FluxIlluRecharge({ illu }: { illu: ReturnType<typeof useT>['fluxTutorial']['illu'] }) {
  return (
    <div className={styles.illuCol} style={{ gap: '0.75rem', width: '100%', maxWidth: 480 }}>

      {/* Scénario : 2 joueurs rechargent, Alice joue un 7 unique */}
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel} style={{ color: '#38bdf8' }}>Ce tour : 2 joueurs rechargent</div>
        <div className={styles.illuRow} style={{ gap: '0.6rem', flexWrap: 'wrap' }}>
          {/* Bob : Recharge */}
          <div className={styles.illuCol} style={{ gap: '0.25rem' }}>
            <div style={{
              width: 40, height: 56, borderRadius: 9,
              background: 'linear-gradient(135deg, #0c4a6e, #0ea5e9)',
              border: '2px solid #38bdf8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', boxShadow: '0 0 12px rgba(56,189,248,0.4)',
            }}>🔄</div>
            <span style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 700 }}>Bob</span>
          </div>
          {/* Cara : Recharge */}
          <div className={styles.illuCol} style={{ gap: '0.25rem' }}>
            <div style={{
              width: 40, height: 56, borderRadius: 9,
              background: 'linear-gradient(135deg, #0c4a6e, #0ea5e9)',
              border: '2px solid #38bdf8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.2rem', boxShadow: '0 0 12px rgba(56,189,248,0.4)',
            }}>🔄</div>
            <span style={{ fontSize: '0.65rem', color: '#38bdf8', fontWeight: 700 }}>Cara</span>
          </div>
          {/* Séparateur */}
          <div style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,0.25)', alignSelf: 'center' }}>vs</div>
          {/* Alice : valeur unique */}
          <div className={styles.illuCol} style={{ gap: '0.25rem' }}>
            <div className={styles.card} style={{
              width: 40, height: 56, fontSize: '1.2rem',
              background: 'linear-gradient(135deg, #991b1b, #ef4444)',
              border: '2px solid #4ade80',
              boxShadow: '0 0 14px rgba(74,222,128,0.5)',
            }}>7</div>
            <span style={{ fontSize: '0.65rem', color: '#4ade80', fontWeight: 700 }}>Alice 🏅</span>
          </div>
        </div>
      </div>

      {/* Résultat : Alice gagne 2 étoiles (= nb de rechargeurs) */}
      <div className={styles.illuBox} style={{ width: '100%', border: '1px solid rgba(251,191,36,0.35)' }}>
        <div className={styles.illuBoxLabel} style={{ color: '#fbbf24' }}>Alice joue une valeur unique → gagne 2 étoiles</div>
        <div className={styles.illuRow} style={{ gap: '0.75rem' }}>
          <div className={styles.card} style={{
            width: 36, height: 50, fontSize: '1rem',
            background: 'linear-gradient(135deg, #991b1b, #ef4444)',
            border: '2px solid #4ade80',
          }}>7</div>
          <div className={styles.arrow} style={{ color: '#fbbf24' }}>→</div>
          <div style={{ display: 'flex', gap: '0.3rem', alignItems: 'center' }}>
            <span style={{ fontSize: '1.6rem', filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.7))' }}>⭐</span>
            <span style={{ fontSize: '1.6rem', filter: 'drop-shadow(0 0 8px rgba(251,191,36,0.7))' }}>⭐</span>
          </div>
          <div className={styles.illuCol} style={{ gap: '0.15rem', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.7rem', color: '#fbbf24', fontWeight: 800 }}>majorité</span>
            <span style={{ fontSize: '0.7rem', color: '#4ade80', fontWeight: 800 }}>+2 pts immédiats</span>
          </div>
        </div>
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          2 rechargeurs × 1 valeur unique = 2 étoiles Recharge
        </span>
      </div>

      {/* Nouvelle mystère + récupération main */}
      <div className={styles.illuRow} style={{ gap: '0.75rem', width: '100%' }}>
        <div className={styles.illuBox} style={{ flex: 1 }}>
          <div className={styles.illuBoxLabel} style={{ color: '#4ade80' }}>{illu.rechargeGet}</div>
          <div style={{ display: 'flex', gap: '0.15rem' }}>
            {[1,2,3,4,5].map(n => (
              <div key={n} className={styles.card} style={{
                width: 20, height: 30, fontSize: '0.55rem', fontWeight: 800,
                background: 'linear-gradient(135deg, #1e3a8a, #3b82f6)',
                border: '1px solid rgba(96,165,250,0.5)', borderRadius: 4,
                boxShadow: '0 0 6px rgba(96,165,250,0.3)',
              }}>{n}</div>
            ))}
          </div>
        </div>
        <div className={styles.illuBox} style={{ flex: 1 }}>
          <div className={styles.illuBoxLabel} style={{ color: '#fbbf24' }}>{illu.rechargeNewMystery}</div>
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

// Slide 6 — Les étoiles en mode Flux
function FluxIlluStars({ illu }: { illu: ReturnType<typeof useT>['fluxTutorial']['illu'] }) {
  return (
    <div className={styles.illuCol} style={{ gap: '0.75rem', width: '100%', maxWidth: 460 }}>

      {/* Tableau comparatif : 2 sources d'étoiles */}
      <div className={styles.illuRow} style={{ gap: '0.6rem', width: '100%' }}>

        {/* Source 1 : cartes Score */}
        <div className={styles.illuBox} style={{ flex: 1 }}>
          <div className={styles.illuBoxLabel} style={{ color: '#fbbf24' }}>{illu.starsOnCards}</div>
          <div className={`${styles.scoreCard} ${styles.scoreCardNegative}`}
            style={{ width: 40, height: 56, fontSize: '0.72rem', textAlign: 'center' }}>
            -2⭐
          </div>
          <div className={styles.arrow} style={{ fontSize: '1rem' }}>↓</div>
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            <span style={{ fontSize: '1.1rem' }}>⭐</span>
            <span style={{ fontSize: '1.1rem' }}>⭐</span>
          </div>
          <div style={{
            fontSize: '0.62rem', fontWeight: 700, textAlign: 'center',
            color: '#fbbf24', background: 'rgba(251,191,36,0.1)',
            border: '1px solid rgba(251,191,36,0.3)', borderRadius: 6,
            padding: '0.2rem 0.4rem',
          }}>{illu.starsMajority}</div>
        </div>

        {/* Source 2 : Recharge */}
        <div className={styles.illuBox} style={{ flex: 1, border: '1px solid rgba(56,189,248,0.35)' }}>
          <div className={styles.illuBoxLabel} style={{ color: '#38bdf8' }}>{illu.starsRecharge}</div>
          <div style={{
            width: 40, height: 56, borderRadius: 9,
            background: 'linear-gradient(135deg, #0c4a6e, #0ea5e9)',
            border: '2px solid #38bdf8',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.2rem',
          }}>🔄</div>
          <div className={styles.arrow} style={{ fontSize: '1rem' }}>↓</div>
          <div style={{ display: 'flex', gap: '0.2rem' }}>
            <span style={{ fontSize: '1.1rem' }}>⭐</span>
            <span style={{ fontSize: '1.1rem' }}>⭐</span>
            <span style={{ fontSize: '1.1rem' }}>⭐</span>
          </div>
          <div className={styles.illuCol} style={{ gap: '0.15rem' }}>
            <div style={{
              fontSize: '0.62rem', fontWeight: 700, textAlign: 'center',
              color: '#fbbf24', background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.3)', borderRadius: 6,
              padding: '0.2rem 0.4rem',
            }}>{illu.starsMajority}</div>
            <div style={{
              fontSize: '0.62rem', fontWeight: 800, textAlign: 'center',
              color: '#4ade80', background: 'rgba(74,222,128,0.1)',
              border: '1px solid rgba(74,222,128,0.3)', borderRadius: 6,
              padding: '0.2rem 0.4rem',
            }}>+1 pt / ⭐</div>
          </div>
        </div>
      </div>

      {/* Bonus fin de partie */}
      <div className={styles.illuBox} style={{ width: '100%' }}>
        <div className={styles.illuBoxLabel}>{illu.starsEndBonus}</div>
        <div className={styles.illuRow} style={{ gap: '0.75rem' }}>
          <span style={{ fontSize: '1.8rem' }}>⭐⭐⭐⭐</span>
          <div className={styles.arrow}>→</div>
          <div className={styles.scorePill} style={{ background: 'rgba(251,191,36,0.15)', border: '1px solid rgba(251,191,36,0.4)' }}>
            <span style={{ color: '#fbbf24', fontWeight: 800 }}>+5 pts</span>
          </div>
        </div>
        <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
          Le joueur avec le plus d’étoiles totales (cartes + Recharge)
        </span>
      </div>
    </div>
  );
}

// Slide 7 — Fin de partie Flux
function FluxIlluGameOver({ illu }: { illu: ReturnType<typeof useT>['fluxTutorial']['illu'] }) {
  const rows = [
    { rank: 1, name: 'Cara',  color: '#22c55e', cards: '+9', recharge: 3, bonus: 5, total: 17 },
    { rank: 2, name: 'Bob',   color: '#3b82f6', cards: '+6', recharge: 1, bonus: 0, total: 7  },
    { rank: 3, name: 'Alice', color: '#ef4444', cards: '-1', recharge: 0, bonus: 0, total: -1 },
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
          { label: illu.formulaCards,   color: '#4ade80' },
          { label: '+',                 color: 'rgba(255,255,255,0.3)' },
          { label: illu.formulaRecharge, color: '#38bdf8' },
          { label: '+',                 color: 'rgba(255,255,255,0.3)' },
          { label: illu.formulaBonus,   color: '#fbbf24' },
          { label: '=',                 color: 'rgba(255,255,255,0.3)' },
          { label: illu.formulaTotal,   color: 'white' },
        ].map((item, i) => (
          <span key={i} style={{ fontSize: '0.8rem', fontWeight: 700, color: item.color }}>{item.label}</span>
        ))}
      </div>

      {/* Scoreboard */}
      <div className={styles.scoreboard}>
        {rows.map((r) => (
          <div key={r.rank} className={styles.scoreRow} style={{ borderLeftColor: r.color }}>
            <span className={`${styles.scoreRank} ${styles[rankClass[r.rank - 1]]}`}>#{r.rank}</span>
            <span className={styles.dot}
              style={{ width: 10, height: 10, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
            <span className={styles.scoreName}>{r.name}</span>
            <div className={styles.scoreDetail}>
              <span style={{ color: r.cards.startsWith('+') ? '#4ade80' : '#f87171' }}>🃏 {r.cards}</span>
              {r.recharge > 0 && <span style={{ color: '#38bdf8' }}>🔄 +{r.recharge}</span>}
              {r.bonus > 0 && <span style={{ color: '#fbbf24' }}>⭐ +{r.bonus}</span>}
            </div>
            <span className={styles.scoreTotalBadge}>{r.total} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Illustrations indexées ───────────────────────────────────────────────────

function useFluxIllustrations(illu: ReturnType<typeof useT>['fluxTutorial']['illu']) {
  return [
    <FluxIlluGoal      illu={illu} />,
    <FluxIlluHand      illu={illu} />,
    <FluxIlluStream    illu={illu} />,
    <FluxIlluDuplicates illu={illu} />,
    <FluxIlluRecharge  illu={illu} />,
    <FluxIlluStars     illu={illu} />,
    <FluxIlluGameOver  illu={illu} />,
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
