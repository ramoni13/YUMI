import React from 'react';
import type { PublicPlayer } from '../../types';
import { ScoreCardDisplay } from '../Card/ScoreCardDisplay';
import { useT } from '../../hooks/useT';
import styles from './Player.module.css';

const COLOR_HEX: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e',
  yellow: '#eab308', purple: '#a855f7', orange: '#f97316',
};

// Les IDs de bots commencent par "bot_"
function isBot(playerId: string): boolean {
  return playerId.startsWith('bot_');
}

interface OpponentPanelProps {
  player: PublicPlayer;
  /** Si true, masque la dernière carte jouée (mène en cours, avant révélation) */
  hideCurrentCard?: boolean;
  isSwapTarget?: boolean;
  onSwapSelect?: (id: string) => void;
  isStealTarget?: boolean;
  onStealSelect?: (id: string) => void;
  isEclipseTarget?: boolean;
  onEclipseSelect?: (id: string) => void;
  isPiocheTarget?: boolean;
  onPiocheSelect?: (id: string) => void;
  isVerrouTarget?: boolean;
  onVerrouSelect?: (id: string) => void;
  isRevelationTarget?: boolean;
  onRevelationSelect?: (id: string) => void;
  isTaxeTarget?: boolean;
  onTaxeSelect?: (id: string) => void;
}

export function OpponentPanel({
  player, hideCurrentCard = false, isSwapTarget, onSwapSelect, isStealTarget, onStealSelect,
  isEclipseTarget, onEclipseSelect, isPiocheTarget, onPiocheSelect,
  isVerrouTarget, onVerrouSelect, isRevelationTarget, onRevelationSelect,
  isTaxeTarget, onTaxeSelect,
}: OpponentPanelProps) {
  // Historique visible : toutes les cartes sauf la dernière si elle correspond
  // à la mène en cours (le joueur a déjà joué mais la révélation n'a pas encore eu lieu)
  const visibleHistory = hideCurrentCard && player.hasPlayedCard && player.playedHistory.length > 0
    ? player.playedHistory.slice(0, -1)  // masquer uniquement la dernière carte
    : player.playedHistory;
  const t = useT();
  const bot = isBot(player.id);
  const isClickable = (isSwapTarget && !!onSwapSelect) || (isStealTarget && !!onStealSelect)
    || (isEclipseTarget && !!onEclipseSelect) || (isPiocheTarget && !!onPiocheSelect)
    || (isVerrouTarget && !!onVerrouSelect) || (isRevelationTarget && !!onRevelationSelect)
    || (isTaxeTarget && !!onTaxeSelect);

  const handleClick = () => {
    if (isSwapTarget && onSwapSelect) onSwapSelect(player.id);
    else if (isStealTarget && onStealSelect) onStealSelect(player.id);
    else if (isEclipseTarget && onEclipseSelect) onEclipseSelect(player.id);
    else if (isPiocheTarget && onPiocheSelect) onPiocheSelect(player.id);
    else if (isVerrouTarget && onVerrouSelect) onVerrouSelect(player.id);
    else if (isRevelationTarget && onRevelationSelect) onRevelationSelect(player.id);
    else if (isTaxeTarget && onTaxeSelect) onTaxeSelect(player.id);
  };

  return (
    <div
      className={`
        ${styles.opponent}
        ${isSwapTarget ? styles.swapTarget : ''}
        ${isStealTarget ? styles.stealTarget : ''}
        ${isEclipseTarget || isPiocheTarget || isVerrouTarget || isRevelationTarget || isTaxeTarget ? styles.specialTarget : ''}
        ${bot ? styles.botOpponent : ''}
      `}
      style={{ borderColor: COLOR_HEX[player.color] }}
      onClick={isClickable ? handleClick : undefined}
    >
      <div className={styles.opponentHeader}>
        <span className={styles.colorDot} style={{ background: COLOR_HEX[player.color] }} />
        <span className={styles.pseudo}>{player.pseudo}</span>
        {bot && <span className={styles.botBadge}>BOT</span>}
        {!player.isConnected && !bot && <span className={styles.disconnected}>⚠</span>}
      </div>

      <div className={styles.opponentStats}>
        <span className={styles.stars} title="Étoiles totales">⭐ {player.stars}</span>
        {player.bonusPoints > 0 && <span className={styles.bonus} title="Points bonus">🪙 {player.bonusPoints}</span>}
        <span className={styles.handCount}>🃏 {player.handCount}</span>
        {player.hasPlayedCard && <span className={styles.played}>✓</span>}
      </div>

      <div className={styles.scorePile}>
        {player.topScoreCard ? (
          <ScoreCardDisplay card={player.topScoreCard} size="sm" />
        ) : (
          <div className={styles.emptyPile}>—</div>
        )}
        {player.scorePileCount > 1 && (
          <span className={styles.pileCount}>+{player.scorePileCount - 1}</span>
        )}
      </div>

      {/* Cartes jouées lors des mènes précédentes (utiles pour la déduction).
          La carte de la mène en cours est masquée jusqu'à la révélation. */}
      {visibleHistory && visibleHistory.length > 0 && (
        <div className={styles.playedHistory}>
          <span className={styles.playedHistoryLabel}>Jouées :</span>
          <div className={styles.playedHistoryCards}>
            {visibleHistory.map((v, i) => (
              <span key={i} className={styles.playedHistoryCard}>{v}</span>
            ))}
          </div>
        </div>
      )}

      {isSwapTarget && <div className={styles.swapOverlay}>{t.opponent.swapOverlay}</div>}
      {isStealTarget && <div className={styles.stealOverlay}>{t.opponent.stealOverlay}</div>}
      {isEclipseTarget && <div className={styles.specialOverlay}>☄️ Donner ECLIPSE</div>}
      {isPiocheTarget && <div className={styles.specialOverlay}>🎰 Piocher une carte</div>}
      {isVerrouTarget && <div className={styles.specialOverlay}>🔒 Verrouiller</div>}
      {isRevelationTarget && <div className={styles.specialOverlay}>🕵️ Révéler</div>}
      {isTaxeTarget && <div className={styles.specialOverlay}>🧹 Taxer</div>}
    </div>
  );
}
