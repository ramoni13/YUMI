import { FluxGameState } from './engine';
import { BotProfile, GameOptions, ScoreCard, RECHARGE_CARD_VALUE } from '../../types';

// ============================================================
// Helpers communs (portés depuis bot.ts classic)
// ============================================================

/**
 * Une carte Score est "désirable" si on veut la gagner.
 * - Positive (verte)  : toujours désirable
 * - Spéciale          : toujours désirable (effet intéressant)
 * - Négative (rouge)  : indésirable en règle standard
 *                       désirable avec colorRule (on la gagne avec la plus petite valeur)
 */
function isDesirable(scoreCard: ScoreCard, options: GameOptions): boolean {
  if (scoreCard.specialEffect) return true;
  if (scoreCard.value > 0) return true;
  if (scoreCard.value < 0) return options.colorRule;
  return false;
}

/**
 * Avec colorRule actif, une carte négative (rouge) se gagne avec la PLUS PETITE valeur.
 * Dans ce cas le bot doit jouer bas pour gagner, haut pour éviter.
 */
function smallestWins(scoreCard: ScoreCard, options: GameOptions): boolean {
  return options.colorRule && scoreCard.type === 'negative';
}

// ============================================================
// Décision du bot en mode flux : carte valeur OU Recharge (0)
// ============================================================
export function decideBotFluxCard(
  state: FluxGameState,
  botId: string,
  profile: BotProfile
): number {
  const bot = state.players.find(p => p.id === botId);
  if (!bot) throw new Error(`Bot ${botId} introuvable`);

  const hand = bot.hand;
  const options = state.gameOptions;
  const scoreCard = state.currentScoreCard;

  // Main vide → recharger obligatoirement
  if (hand.length === 0) return RECHARGE_CARD_VALUE;

  // Décision de recharger selon le profil et l'état de la main
  if (shouldRecharge(hand, profile, state, scoreCard, options)) {
    return RECHARGE_CARD_VALUE;
  }

  // Sinon jouer une carte valeur selon le profil
  const alreadyPlayed = Object.values(state.playedCards)
    .filter(v => v !== undefined && v !== RECHARGE_CARD_VALUE) as number[];

  return pickCard(hand, alreadyPlayed, scoreCard, options, profile);
}

// ============================================================
// Choix de la carte valeur à jouer
// ============================================================
function pickCard(
  hand: number[],
  alreadyPlayed: number[],
  scoreCard: ScoreCard | null,
  options: GameOptions,
  profile: BotProfile
): number {
  const sorted = [...hand].sort((a, b) => a - b);
  // Cartes "sûres" = pas encore jouées par un autre (pas de risque de doublon)
  const safe = sorted.filter(c => !alreadyPlayed.includes(c));
  const pool = safe.length > 0 ? safe : sorted;

  switch (profile) {

    // BLITZ — veut toujours GAGNER la carte Score
    // Carte verte (plus grande gagne) → joue haut
    // Carte rouge avec colorRule (plus petite gagne) → joue bas
    case 'KAMIKAZE':
      if (scoreCard && smallestWins(scoreCard, options)) return pool[0];
      return pool[pool.length - 1];

    // FELIX — veut toujours ÉVITER la carte Score
    // Carte verte (plus grande gagne) → joue bas pour éviter
    // Carte rouge avec colorRule (plus petite gagne) → joue HAUT pour éviter
    // Carte positive (désirable) → joue bas par prudence
    case 'PRUDENT': {
      if (!scoreCard) return pool[0];
      if (scoreCard.specialEffect) return pool[0]; // spéciale : jouer bas par défaut
      const wantToAvoid = !isDesirable(scoreCard, options);
      if (wantToAvoid) {
        return smallestWins(scoreCard, options)
          ? pool[pool.length - 1]  // rouge colorRule : jouer haut pour éviter
          : pool[0];               // verte : jouer bas pour éviter
      }
      return pool[0]; // carte positive : rester discret
    }

    // DINGO — aléatoire
    case 'HASARD':
      return hand[Math.floor(Math.random() * hand.length)];

    // LOKI — cherche à annuler une carte déjà jouée
    case 'SABOTEUR': {
      for (const played of alreadyPlayed) {
        if (hand.includes(played)) return played;
      }
      return hand[Math.floor(Math.random() * hand.length)];
    }

    // ARIA — logique complète avec colorRule
    case 'LOGIQUE':
    default: {
      if (!scoreCard) return hand[Math.floor(Math.random() * hand.length)];

      if (scoreCard.specialEffect) {
        // Carte spéciale : jouer la médiane (ni trop haut ni trop bas)
        return pool[Math.floor(pool.length / 2)];
      }

      const wantToWin = isDesirable(scoreCard, options);
      const needSmall = smallestWins(scoreCard, options);

      if (wantToWin) {
        // On veut gagner
        return needSmall
          ? pool[0]                 // rouge colorRule : jouer bas pour gagner
          : pool[pool.length - 1];  // verte : jouer haut pour gagner
      } else {
        // On veut éviter
        return needSmall
          ? pool[pool.length - 1]   // rouge colorRule : jouer haut pour éviter
          : pool[0];                // verte : jouer bas pour éviter
      }
    }
  }
}

// ============================================================
// Décide si le bot doit recharger
// ============================================================
function shouldRecharge(
  hand: number[],
  profile: BotProfile,
  state: FluxGameState,
  scoreCard: ScoreCard | null,
  options: GameOptions
): boolean {
  const handSize = hand.length;
  const alreadyPlayed = Object.values(state.playedCards)
    .filter(v => v !== undefined && v !== RECHARGE_CARD_VALUE) as number[];

  switch (profile) {

    // BLITZ : recharge seulement quand il ne reste qu'1 carte
    // Il veut toujours jouer une carte forte, donc recharge le plus tard possible
    case 'KAMIKAZE':
      return handSize <= 1;

    // FELIX : recharge dès qu'il reste 3 cartes ou moins
    // Il préfère avoir des options pour éviter les cartes indésirables
    // Exception : si la carte Score est négative avec colorRule, il a besoin
    // de hautes valeurs pour éviter — recharge encore plus tôt
    case 'PRUDENT': {
      if (scoreCard && !isDesirable(scoreCard, options) && smallestWins(scoreCard, options)) {
        // Carte rouge colorRule : il faut jouer haut pour éviter
        // Si sa main ne contient que des petites valeurs, recharger
        const hasHighCard = hand.some(c => c >= 6);
        if (!hasHighCard && handSize <= 5) return true;
      }
      return handSize <= 3;
    }

    // DINGO : aléatoire, probabilité inversement proportionnelle à la taille de la main
    case 'HASARD':
      return handSize <= 2 || Math.random() < (1 / handSize);

    // LOKI : recharge quand la main est petite (moins de valeurs à annuler)
    // Ou si aucune de ses cartes ne correspond à une carte déjà jouée
    case 'SABOTEUR': {
      if (handSize <= 2) return true;
      const canAnnul = hand.some(c => alreadyPlayed.includes(c));
      return !canAnnul && handSize <= 3;
    }

    // ARIA : recharge quand la main est épuisée ou inutile
    // Tient compte de la carte Score pour ne pas recharger au mauvais moment
    case 'LOGIQUE':
    default: {
      // Main vide ou presque : recharger
      if (handSize <= 2) return true;

      // Toutes les cartes en main sont déjà jouées par d'autres : recharger
      const usefulCards = hand.filter(c => !alreadyPlayed.includes(c));
      if (usefulCards.length === 0) return true;

      // Ne pas recharger si la carte Score est très positive et qu'on a une bonne carte
      if (scoreCard && scoreCard.value >= 4 && !scoreCard.specialEffect) {
        const bestCard = smallestWins(scoreCard, options)
          ? Math.min(...hand)
          : Math.max(...hand);
        // On a une carte dominante non jouée par d'autres : ne pas recharger
        if (!alreadyPlayed.includes(bestCard)) return false;
      }

      return false;
    }
  }
}

