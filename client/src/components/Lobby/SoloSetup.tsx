import React, { useState } from 'react';
import { BotProfile, BOT_PROFILES_INFO, GameOptions, DEFAULT_GAME_OPTIONS } from '../../types';
import { useT } from '../../hooks/useT';
import type { Translations } from '../../i18n';
import styles from './SoloSetup.module.css';

interface SoloSetupProps {
  pseudo: string;
  onConfirm: (bots: BotProfile[], gameOptions: GameOptions) => void;
  onCancel: () => void;
  error?: string;
}

const ALL_PROFILES = Object.values(BOT_PROFILES_INFO);

const DEFAULT_BOTS: BotProfile[] = ['LOGIQUE', 'KAMIKAZE', 'HASARD'];

export function SoloSetup({ pseudo, onConfirm, onCancel, error }: SoloSetupProps) {
  const t = useT();
  const [botCount, setBotCount] = useState(3);
  const [selectedBots, setSelectedBots] = useState<BotProfile[]>(DEFAULT_BOTS);
  const [gameOptions, setGameOptions] = useState<GameOptions>({ ...DEFAULT_GAME_OPTIONS });

  const handleCountChange = (delta: number) => {
    const next = botCount + delta;
    if (next < 2 || next > 5) return;
    setBotCount(next);
    setSelectedBots(prev => {
      if (delta > 0) {
        // Ajouter un bot avec un profil par défaut
        return [...prev, 'HASARD'];
      } else {
        // Retirer le dernier bot
        return prev.slice(0, -1);
      }
    });
  };

  const handleBotChange = (index: number, profile: BotProfile) => {
    setSelectedBots(prev => {
      const next = [...prev];
      next[index] = profile;
      return next;
    });
  };

  const handleConfirm = () => {
    onConfirm(selectedBots, gameOptions);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>{t.solo.title}</h2>
        <p className={styles.subtitle}>
          {t.solo.subtitlePrefix}{' '}
          <strong style={{ color: '#fbbf24' }}>{pseudo}</strong>
          {' '}{t.solo.subtitleSuffix}
        </p>

        {/* Nombre d'adversaires */}
        <div className={styles.counterSection}>
          <div className={styles.sectionLabel}>{t.solo.opponentsLabel}</div>
          <div className={styles.counter}>
            <button
              className={styles.counterBtn}
              onClick={() => handleCountChange(-1)}
              disabled={botCount <= 2}
            >
              −
            </button>
            <span className={styles.counterValue}>{botCount}</span>
            <button
              className={styles.counterBtn}
              onClick={() => handleCountChange(1)}
              disabled={botCount >= 5}
            >
              +
            </button>
          </div>
          <p className={styles.counterHint}>
            {t.solo.counterHint(botCount + 1, botCount)}
          </p>
        </div>

        {/* Configuration de chaque bot */}
        <div className={styles.sectionLabel}>{t.solo.botsLabel}</div>
        <div className={styles.botSlots}>
          {selectedBots.map((profile, i) => {
            const info = BOT_PROFILES_INFO[profile];
            return (
              <div key={i} className={styles.botSlot}>
                <span className={styles.slotNumber}>#{i + 1}</span>

                <select
                  className={styles.botSelect}
                  value={profile}
                  onChange={e => handleBotChange(i, e.target.value as BotProfile)}
                >
                  {ALL_PROFILES.map(p => (
                    <option key={p.profile} value={p.profile}>
                      {p.emoji} {p.name} — {p.profile}
                    </option>
                  ))}
                </select>

                <div className={styles.botPreview}>
                  <span className={styles.botEmoji}>{info.emoji}</span>
                  <div>
                    <div className={styles.botName}>{info.name}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Options de partie */}
        {/* [HIDDEN] Pavé d'options masqué — colorRule activé par défaut */}
        <div style={{ display: 'none' }}>
          <div className={styles.sectionLabel}>{t.solo.optionsLabel}</div>
          <div className={styles.optionsSection}>
            <label className={styles.optionRow}>
              <div className={styles.optionToggle}>
                <input
                  type="checkbox"
                  className={styles.toggleInput}
                  checked={gameOptions.colorRule}
                  onChange={e => setGameOptions(o => ({ ...o, colorRule: e.target.checked }))}
                />
                <span className={styles.toggleSlider} />
              </div>
              <div className={styles.optionText}>
                <span className={styles.optionTitle}>
                  {t.solo.optionColorRuleTitle(t.common.green, t.common.red)}
                </span>
                <span className={styles.optionDesc}>
                  {t.solo.optionColorRuleDesc}
                </span>
              </div>
            </label>
          </div>
        </div>

        {/* Légende des profils */}
        <div className={styles.profilesLegend}>
          <div className={styles.legendTitle}>{t.solo.profilesLegendTitle}</div>
          <div className={styles.legendGrid}>
            {ALL_PROFILES.map(p => (
              <div key={p.profile} className={styles.legendItem}>
                <span className={styles.legendEmoji}>{p.emoji}</span>
                <div className={styles.legendText}>
                  <span className={styles.legendName}>{p.name}</span>
                  {' — '}
                  {t.botDescriptions[p.profile as keyof Translations['botDescriptions']]}
                </div>
              </div>
            ))}
          </div>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button className={styles.btnCancel} onClick={onCancel}>
            {t.solo.btnCancel}
          </button>
          <button className={styles.btnStart} onClick={handleConfirm}>
            {t.solo.btnStart}
          </button>
        </div>
      </div>
    </div>
  );
}
