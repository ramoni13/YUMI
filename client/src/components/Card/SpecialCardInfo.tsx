import React from 'react';
import type { SpecialEffect, ScoreCard } from '../../types';
import styles from './SpecialCardInfo.module.css';

// ============================================================
// Données descriptives de chaque carte spéciale
// ============================================================
interface EffectInfo {
  icon: string;
  title: string;
  role: string;
  how: string;
  tip: string;
}

const EFFECT_INFO: Record<NonNullable<SpecialEffect>, EffectInfo> = {
  DOUBLE: {
    icon: '×2',
    title: 'DOUBLE',
    role: 'Doublement de score',
    how: 'La valeur de ta dernière carte Score gagnée est multipliée par 2.',
    tip: 'Gagne-la après une carte à forte valeur pour maximiser l\'effet.',
  },
  STEAL: {
    icon: '🦅',
    title: 'VOL',
    role: 'Voler une carte adverse',
    how: 'Tu prends la carte du dessus de la pile d\'un adversaire de ton choix et tu la places dans ta propre pile.',
    tip: 'Cible le joueur avec la carte la plus précieuse au sommet.',
  },
  SWAP: {
    icon: '⇄',
    title: 'ÉCHANGE',
    role: 'Échanger deux piles',
    how: 'Tu choisis 2 joueurs (toi inclus) : leurs cartes du dessus de pile sont échangées.',
    tip: 'Utile pour te débarrasser d\'une carte négative ou voler un gros score.',
  },
  PIOCHE: {
    icon: '🎰',
    title: 'PIOCHE',
    role: 'Forcer une carte adverse',
    how: 'Tu regardes une carte au hasard dans la main d\'un adversaire. Il devra jouer cette carte à la prochaine mène.',
    tip: 'Cible un joueur fort pour lui imposer une carte qui ne l\'arrange pas.',
  },
  VERROU: {
    icon: '🔒',
    title: 'VERROU',
    role: 'Bloquer la carte d\'un adversaire',
    how: 'Tu désignes un adversaire. Selon la prochaine carte Score (verte → il joue sa plus haute, rouge → sa plus basse), il n\'a plus le choix.',
    tip: 'Parfait pour forcer un adversaire à se trahir sur une carte clé.',
  },
  REVELATION: {
    icon: '🕵️',
    title: 'RÉVÉLATION',
    role: 'Révéler une carte mystère',
    how: 'Tu choisis un adversaire : sa carte mystère (valeur cachée) est révélée à tous les joueurs.',
    tip: 'Brise l\'avantage informationnel d\'un adversaire discret.',
  },
  MYSTERE: {
    icon: '🎭',
    title: 'MYSTÈRE',
    role: 'Mène mystère',
    how: 'À la prochaine mène, tous les joueurs jouent obligatoirement leur carte mystère (valeur cachée) au lieu d\'une carte normale.',
    tip: 'Crée une mène imprévisible où personne ne contrôle sa carte.',
  },
  SURCHARGE: {
    icon: '⚡',
    title: 'SURCHARGE',
    role: 'Forcer une Recharge',
    how: 'Tu désignes un adversaire qui sera forcé de jouer Recharge à la prochaine mène, qu\'il le veuille ou non.',
    tip: 'Idéal pour priver un adversaire d\'une carte forte au moment crucial.',
  },
  INVERSION: {
    icon: '🌀',
    title: 'INVERSION',
    role: 'Inverser la condition de victoire',
    how: 'À la prochaine mène, la condition est inversée : si la carte Score est verte (plus grande gagne), c\'est la plus petite qui gagne, et vice versa.',
    tip: 'Surprend les adversaires qui ont déjà choisi leur stratégie.',
  },
  CONSTELLATION: {
    icon: '🌟',
    title: 'CONSTELLATION',
    role: 'Bonus d\'étoiles massif',
    how: 'Gagne immédiatement un grand nombre d\'étoiles bonus (⭐×5). Ces étoiles comptent pour la majorité et valent +1 pt chacune.',
    tip: 'Très puissante en fin de partie pour décrocher le bonus de majorité.',
  },
  ECLIPSE: {
    icon: '☄️',
    title: 'ÉCLIPSE',
    role: 'Donner des malus d\'étoiles',
    how: 'Tu choisis un joueur (toi inclus) qui reçoit la carte : il perd 3 étoiles mais gagne +1 point de score.',
    tip: 'Donne-la à un adversaire dominant en étoiles pour briser sa majorité.',
  },
  JACKPOT: {
    icon: '💰',
    title: 'JACKPOT',
    role: 'Points bonus immédiats',
    how: 'Tu gagnes immédiatement des points bonus (🪙) qui s\'ajoutent à ton score final, en plus de la valeur de la carte.',
    tip: 'Un gain sûr et immédiat, indépendant des étoiles.',
  },
  TAXE: {
    icon: '🧹',
    title: 'TAXE',
    role: 'Voler des points bonus',
    how: 'Tu choisis un adversaire qui possède des points bonus (🪙) : tu lui en prends 2 et tu les ajoutes à ton score.',
    tip: 'Cible le joueur avec le plus de points bonus accumulés.',
  },
  ORACLE: {
    icon: '👁️',
    title: 'ORACLE',
    role: 'Vision secrète',
    how: 'Tu consultes secrètement les 3 prochaines cartes Score du deck. Cette information n\'est visible que par toi.',
    tip: 'Planifie ta stratégie sur les prochaines mènes avec une longueur d\'avance.',
  },
  DEVOILEMENT: {
    icon: '📢',
    title: 'DÉVOILEMENT',
    role: 'Révéler les prochaines cartes',
    how: 'Les 3 prochaines cartes Score du deck sont révélées à tous les joueurs simultanément.',
    tip: 'Tout le monde voit la même chose — à toi de mieux l\'exploiter.',
  },
};

// ============================================================
// Composant principal
// ============================================================
interface SpecialCardInfoProps {
  card: ScoreCard;
}

export function SpecialCardInfo({ card }: SpecialCardInfoProps) {
  if (!card.specialEffect) return null;

  const info = EFFECT_INFO[card.specialEffect];
  if (!info) return null;

  const isGreen = card.gain === '+';
  const scoreStr = card.value > 0 ? `+${card.value}` : card.value < 0 ? `${card.value}` : null;

  return (
    <div className={`${styles.panel} ${isGreen ? styles.green : styles.red}`}>
      {/* En-tête */}
      <div className={styles.header}>
        <span className={styles.icon}>{info.icon}</span>
        <div className={styles.titleBlock}>
          <span className={styles.title}>{info.title}</span>
          <span className={styles.role}>{info.role}</span>
        </div>
        {/* Badges score / étoiles */}
        <div className={styles.badges}>
          {scoreStr && (
            <span className={styles.badge}>{scoreStr} pt</span>
          )}
          {card.bonusStars !== 0 && (
            <span className={styles.badge}>
              {card.bonusStars > 0 ? '+' : ''}{card.bonusStars}⭐
            </span>
          )}
          {card.bonusPoints > 0 && (
            <span className={styles.badge}>
              {card.specialEffect === 'TAXE' ? `×${card.bonusPoints}🪙 volés` : `+${card.bonusPoints}🪙`}
            </span>
          )}
          <span className={`${styles.gainBadge} ${isGreen ? styles.gainGreen : styles.gainRed}`}>
            {isGreen ? '🟢 + grande gagne' : '🔴 + petite gagne'}
          </span>
        </div>
      </div>

      {/* Séparateur */}
      <div className={styles.divider} />

      {/* Effet */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>⚙️ Effet</span>
        <p className={styles.sectionText}>{info.how}</p>
      </div>

      {/* Conseil */}
      <div className={styles.section}>
        <span className={styles.sectionLabel}>💡 Conseil</span>
        <p className={styles.sectionText}>{info.tip}</p>
      </div>
    </div>
  );
}
