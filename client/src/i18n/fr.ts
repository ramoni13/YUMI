// ============================================================
// YUMI — Traductions françaises
// ============================================================

import type { ReactNode } from 'react';

export const fr = {

  // ── Lobby — page d'accueil ──────────────────────────────
  lobby: {
    title: 'YUMI',
    subtitle: 'Le jeu de plis où les doublons s\'annulent !',
    pseudoPlaceholder: 'Votre pseudo',
    btnSolo: '⚔️ Jouer en solo contre des bots',
    btnCreate: 'Créer une partie multijoueur',
    dividerJoin: 'ou rejoindre',
    codePlaceholder: 'Code de la salle (ex: ABC123)',
    btnJoin: 'Rejoindre une partie',
    errorNoPseudo: 'Entrez un pseudo',
    errorNoPseudoFirst: "Entrez un pseudo d'abord",
    errorNoCode: 'Entrez un code de salle',
  },

  // ── Lobby — salle d'attente ─────────────────────────────
  waiting: {
    roomCodeLabel: 'Code de la salle :',
    hostBadge: 'Hôte',
    readyBadge: '✓ Prêt',
    notReadyBadge: 'En attente...',
    waitingPlayers: (count: number) => `En attente de joueurs... (${count}/3 minimum)`,
    optionsTitle: '⚙️ Options de partie',
    optionColorRuleTitle: (green: string, red: string) => `${green} = plus grande carte • ${red} = plus petite carte`,
    optionColorRuleDesc: 'Cartes positives remportées par la plus haute valeur, négatives par la plus basse.',
    btnReady: 'Je suis prêt !',
    btnCancelReady: 'Annuler',
    btnStart: 'Lancer la partie !',
    // Bots en salle d'attente multijoueur
    botsTitle: '🤖 Bots',
    addBotLabel: '+ Ajouter un bot',
    removeBotLabel: '✕',
    botSlotLabel: (name: string, profile: string) => `${name} (${profile})`,
    playerCount: (humans: number, bots: number, max: number) => `${humans} joueur(s) + ${bots} bot(s) / ${max} max`,
    removeBotTitle: 'Retirer ce bot',
  },

  // ── SoloSetup ───────────────────────────────────────────
  solo: {
    title: '⚔️ Mode Solo',
    subtitlePrefix: 'Tu joues en tant que',
    subtitleSuffix: 'contre des bots',
    opponentsLabel: 'Nombre d\'adversaires',
    counterHint: (total: number, bots: number) =>
      `Partie à ${total} joueurs (toi + ${bots} bots) • min 2, max 5 bots`,
    botsLabel: 'Choisis tes adversaires',
    optionsLabel: 'Options de partie',
    optionColorRuleTitle: (green: string, red: string) => `${green} = plus grande carte • ${red} = plus petite carte`,
    optionColorRuleDesc:
      'Les cartes Score positives (vertes) sont remportées par la valeur la plus haute, les négatives (rouges) par la plus basse. Les cartes spéciales restent à la plus haute.',
    profilesLegendTitle: 'Profils disponibles',
    btnCancel: 'Annuler',
    btnStart: 'Lancer la partie !',
  },

  // ── Board — plateau de jeu ──────────────────────────────
  board: {
    loading: 'Chargement...',
    round: (cur: number, total: number) => `Manche ${cur}/${total}`,
    trick: (cur: number, total: number) => `Mène ${cur}/${total}`,
    deckCount: (n: number) => `🃏 ${n} carte${n > 1 ? 's' : ''} restante${n > 1 ? 's' : ''} dans la manche`,
    scoreColumnLabel: 'Cartes Score',
    activeCardLabel: 'En jeu',
    trickDiscarded: 'Carte défaussée — tout s\'est annulé !',
    trickWinner: (pseudo: string) => `${pseudo} remporte la carte !`,
    roundEndTitle: 'Fin de manche — Bonus étoile',
    mysteryCard: (owner: string, value: number) => `🔍 Carte mystère de ${owner} : ${value}`,
    missingCard: (value: number) => `⚠️ Votre carte manquante : ${value}`,
    stealPrompt: '🦅 Choisissez un adversaire à voler !',
    swapPrompt1: '⇄ Choisissez le 1er joueur à échanger',
    swapPrompt2: (pseudo: string) => `⇄ Choisissez le 2ème joueur à échanger avec ${pseudo}`,
    myStars: (n: number) => `⭐ ${n} étoiles`,
    myScorePile: (n: number) => `Score pile : ${n} carte(s)`,
    myLastCard: (val: string) => `Dernière carte : ${val}`,
    // Points de victoire
    vpCatStars: 'Course aux étoiles',
    vpCatCards: 'Points des cartes',
    vpCatBonus: 'Points bonus',
    vpCancelled: 'Annulé (ex-æquo)',
    vpRankTitle: 'Points de victoire',
  },

  // ── MyHand ──────────────────────────────────────────────
  hand: {
    label: 'Ma main',
    playBtn: (value: number) => `Jouer le ${value}`,
    waiting: 'Carte jouée — en attente des autres joueurs...',
    alreadyPlayed: 'Déjà jouées :',
    yumiHint: '✨ YUMI — vaut la + grande ou + petite valeur selon la carte Score. Usage unique, non récupérable.',
    playYumi: 'Jouer YUMI ✨',
    playValue: (value: number) => `Jouer le ${value}`,
    rechargeBtn: '🔄 Recharge',
    waitingMsg: 'En attente des autres joueurs…',
  },

  // ── OpponentPanel ───────────────────────────────────────
  opponent: {
    swapOverlay: '⇄ Échanger',
    stealOverlay: '🦅 Voler',
    eclipseOverlay: '☄️ Donner ECLIPSE',
    piocheOverlay: '🎰 Piocher une carte',
    verrouOverlay: '🔒 Verrouiller',
    revelationOverlay: '🕵️ Révéler',
    taxeOverlay: '🧹 Taxer',
    playedLabel: 'Jouées :',
    titleVP: 'Points de victoire',
    titleStars: 'Étoiles totales',
    titleBonus: 'Points bonus',
  },

  // ── GameOver ────────────────────────────────────────────
  gameover: {
    trophy: '🏆',
    titleWin: 'Victoire !',
    titleLose: 'Fin de partie',
    gameIcon: '🎮',
    winnerLine: (pseudo: string, vp: number) => `${pseudo} remporte la partie avec ${vp} point${vp > 1 ? 's' : ''} de victoire !`,
    victoryPointsTitle: 'Points de victoire (1 par catégorie gagnée par manche)',
    cardScoreTitle: 'Cumul des points des cartes Score',
    bonusPointsTitle: 'Cumul des points bonus',
    starsTitle: 'Cumul des étoiles',
    rechargeStarScoreTitle: 'Étoiles Recharge (+1 pt chacune)',
    starScoreTitle: 'Étoiles cartes Score (majorité uniquement)',
    starBonusTitle: "Bonus : le plus d'étoiles totales (+5 pts)",
    pts: (n: number) => `${n} pts`,
    btnReplay: 'Rejouer',
  },

  // ── HistoryPanel ────────────────────────────────────────
  history: {
    panelTitle: 'Journal de jeu',
    panelSub: (cur: number, total: number) => `Manche ${cur}/${total}`,
    empty: 'En attente des événements…',
    trickSepLabel: (trick: number) => `Mène ${trick}`,
    revealLabel: 'Révélation',
    me: 'Moi',
    discardedText: 'Défaussée — tout annulé',
    youWin: 'Vous remportez',
    wins: (pseudo: string) => `${pseudo} remporte`,
    theCard: 'la carte',
    withCard: (val: number) => `avec le\u00a0${val}`,
    cancelled: (pseudo: string, val: number) => `${pseudo} (${val}) annulé`,
    roundEndTitle: 'Fin de manche — dernières cartes',
    noBonus: 'Aucun bonus étoile',
    roundRankTitle: (round: number) => `Classement manche ${round}`,
    cardDiscarded: 'défaussée',
    youHave: 'Vous avez',
    has: (pseudo: string) => `${pseudo} a`,
    won: 'remporté',
    rechargeNoStar: 'Aucune étoile — doublons',
    rechargeAllDiscard: 'Carte défaussée',
    rechargeLabel: 'recharge',
    rechargeCardVal: (val: number) => `(carte ${val})`,
    // Messages dynamiques du socket (useSocket.ts)
    socket: {
      roundSep: (cur: number, total: number) => `— Manche ${cur} / ${total} —`,
      trickCard: (trick: number, card: string) => `Mène ${trick} — carte : ${card}`,
      ruleGreenWins: ' — 🟢 plus grande gagne',
      ruleRedWins: ' — 🔴 plus petite gagne',
      scoreDiscarded: (card: string) => `🚫 Carte ${card} défaussée — personne ne la remporte`,
      scoreWon: (pseudo: string, card: string) => `🏅 ${pseudo} a remporté la carte ${card}`,
      bonusStars: (pseudo: string, n: number) => `⭐ ${pseudo} gagne ${n} étoile(s) bonus !`,
      steal: (thief: string, victim: string) => `🦅 ${thief} vole la carte de ${victim}`,
      double: (pseudo: string) => `×2 appliqué sur la dernière carte de ${pseudo}`,
      swap: (a: string, b: string) => `⇄ Échange entre ${a} et ${b}`,
      bonusStarWinners: (names: string) => `Étoile bonus : ${names}`,
      noBonusStar: 'Aucun bonus étoile cette manche',
      roundRank: (pseudo: string, pts: number) => `Classement manche : ${pseudo} en tête (${pts} pts)`,
      stealChoosing: (pseudo: string) => `🦅 ${pseudo} choisit une cible à voler...`,
      swapChoosing: (pseudo: string) => `⇄ ${pseudo} choisit 2 joueurs à échanger...`,
      cardPlayed: (pseudo: string) => `${pseudo} a joué sa carte`,
      gameOver: (pseudo: string) => `🏆 ${pseudo} remporte la partie !`,
      gameOverFallback: 'Fin de partie',
      // Mode flux — Recharge
      rechargeStars: (rechargers: string, winners: string, starCount: number) =>
        `🔄 ${rechargers} recharge${rechargers.includes(',') ? 'nt' : ''} — ⭐×${starCount} pour ${winners} (valeur unique)`,
      rechargeStarsNoWinner: (rechargers: string) =>
        `🔄 ${rechargers} recharge${rechargers.includes(',') ? 'nt' : ''} — aucune étoile (toutes les valeurs en doublon)`,
      rechargeAllDiscard: '🔄 Tout le monde recharge — carte Score défaussée',
      // Effets spéciaux — messages journal
      eclipseGives: (winner: string, target: string) => `☄️ ${winner} donne ECLIPSE à ${target} (-3⭐, +1 pt)`,
      inversionActive: '🌀 INVERSION active — la prochaine carte Score a sa condition inversée !',
      mystereActive: '🎭 MYSTÈRE — à la prochaine mène, tout le monde joue sa carte mystère !',
      piocheChoosing: (actor: string) => `🎰 ${actor} choisit une carte à piocher dans la main d'un adversaire…`,
      piocheResult: (winner: string, card: number, target: string) => `🎰 ${winner} pioche le ${card} dans la main de ${target} — ${target} devra jouer cette carte !`,
      jackpotResult: (winner: string, pts: number) => `💰 JACKPOT ! ${winner} gagne +${pts} points bonus`,
      constellationResult: (winner: string, stars: number) => `🌟 CONSTELLATION ! ${winner} gagne +${stars}⭐`,
      devoilementActive: '📢 DÉVOILEMENT — les 3 prochaines cartes Score sont révélées à tous !',
      oracleResult: (winner: string) => `👁️ ${winner} consulte secrètement les 3 prochaines cartes Score`,
      stealNoTarget: (winner: string) => `🦥 ${winner} remporte VOL — aucun adversaire à voler (effet sans cible)`,
      surchargeChoosing: (actor: string) => `⚡ ${actor} choisit qui forcer à Recharger…`,
      surchargeResult: (winner: string, target: string) => `⚡ ${winner} force ${target} à Recharger à la prochaine mène !`,
      verrouChoosing: (actor: string) => `🔒 ${actor} désigne un adversaire à verrouiller…`,
      verrouResult: (winner: string, target: string, lockType: string) => `🔒 ${winner} verrouille ${target} — devra jouer ${lockType} à la prochaine mène !`,
      verrouLockHigh: 'sa carte la plus haute',
      verrouLockLow: 'sa carte la plus basse',
      revelationChoosing: (actor: string) => `🕵️ ${actor} choisit une carte mystère à révéler...`,
      revelationResult: (winner: string, target: string, card: number | string) => `🕵️ ${winner} révèle la carte mystère de ${target} : c'est le ${card} !`,
      taxeChoosing: (actor: string) => `🧹 ${actor} choisit qui taxer…`,
      taxeResult: (winner: string, target: string) => `🧹 ${winner} taxe ${target} — lui vole 2 points bonus !`,
      eclipseChoosing: (actor: string) => `☄️ ${actor} choisit à qui donner ECLIPSE...`,
      vpRoundSummary: (stars: string, cards: string, bonus: string) => `⭐ Course aux étoiles : ${stars} | 🃏 Points cartes : ${cards} | 🪙 Points bonus : ${bonus}`,
      vpCancelled: 'Annulé (ex-æquo)',
      vpRoundMessage: (vpLines: string) => `🏆 PV cette manche — ${vpLines}`,
      cancelledLabel: (val: number) => `(${val}) annulé`,
    },
  },

  // ── Descriptions des bots ────────────────────────────────
  botDescriptions: {
    LOGIQUE: 'Joue de façon calculée. Évite les doublons et vise les meilleures cartes Score.',
    KAMIKAZE: 'Fonce tête baissée ! Joue toujours sa carte la plus haute, quoi qu\'il arrive.',
    HASARD: 'Complètement imprévisible. Joue n\'importe quelle carte au hasard.',
    PRUDENT: 'Joue toujours sa carte la plus basse. Préfère ne pas gagner plutôt que de perdre.',
    SABOTEUR: 'Cherche à annuler les cartes des autres en jouant les mêmes valeurs.',
  },

  // ── Profils de bots (noms affichés + label du profil) ──────────────────
  botProfiles: {
    LOGIQUE: { name: 'ARIA', label: 'LOGIQUE' },
    KAMIKAZE: { name: 'BLITZ', label: 'KAMIKAZE' },
    HASARD: { name: 'DINGO', label: 'HASARD' },
    PRUDENT: { name: 'FELIX', label: 'PRUDENT' },
    SABOTEUR: { name: 'LOKI', label: 'SABOTEUR' },
  },

  // ── Tutoriel ────────────────────────────────────────────
  tutorial: {
    btnOpen: '📖 Règles',
    illu: {
      // Slide 1 — But du jeu
      wonCards: 'Cartes gagnées',
      finalScore: 'Score final',
      victory: 'Victoire !',
      // Slide 2 — Distribution des cartes
      handTitle: 'Votre main',
      handFormula: 'Nb cartes = Nb joueurs + 2',
      handPlayers: 'joueurs',
      handCards: 'cartes',
      handRange: (n: number) => `de 1 à ${n}`,
      handRows: [
        { players: 3, cards: 5 },
        { players: 4, cards: 6 },
        { players: 5, cards: 7 },
        { players: 6, cards: 8 },
      ] as { players: number; cards: number }[],
      // Slide 3 — Carte mystère
      roundStart: 'En début de manche',
      discardsSecret: 'écarte en secret',
      rightNeighbourSees: 'voisin de droite voit',
      seesValue: 'voit la valeur !',
      discardedOutOfPlay: 'La carte écartée est hors jeu',
      discardedDesc: (strong: ReactNode, em: ReactNode): ReactNode => `Elle ne sera ${strong} pendant la manche. Seul le voisin connaît sa valeur — un ${em} !`,
      notPlayed: 'pas jouée',
      strategicAdvantage: 'avantage stratégique',
      // Slide 3 — Mène
      trickPhase1: (strong: ReactNode): ReactNode => `Une carte Score est ${strong}`,
      trickPhase1Keyword: 'révélée',
      trickPhase2: (strong: ReactNode): ReactNode => `Chacun pose sa carte ${strong}`,
      trickPhase2Keyword: 'face cachée',
      trickPhase3: (strong: ReactNode): ReactNode => `Toutes les cartes sont ${strong} en même temps`,
      trickPhase3Keyword: 'révélées',
      // Slide 4 — Doublons
      greenRule: '🟢 Carte verte — la plus haute valeur sans doublon gagne',
      redRule: '🔴 Carte rouge — la plus basse valeur sans doublon gagne',
      allCancelledLabel: 'Tout annulé → carte défaussée 🚫',
      greenExplain: (cancelled: ReactNode, winner: ReactNode): ReactNode => `Les ${cancelled} s'annulent → Cara gagne avec le ${winner} (plus haute valeur restante)`,
      redExplain: (winner: ReactNode): ReactNode => `Pas de doublon → Alice gagne avec le ${winner} (plus basse valeur)`,
      // Slide 5 — Cartes Score
      greenCardsLabel: '🟢 Vertes — points positifs',
      redCardsLabel: '🔴 Rouges — points négatifs',
      highestWins: 'Plus haute valeur gagne',
      lowestWins: 'Plus basse valeur gagne',
      specialsLabel: '✨ Spéciales — existent en version verte ET rouge',
      specialsFooter: '🟢 gagnée par la plus haute valeur  •  🔴 gagnée par la plus basse valeur',
      specialNames: { steal: 'VOL', double: 'DOUBLE', swap: 'ÉCHANGE' },
      // Slide 6 — Cartes spéciales
      stealDesc: "Le gagnant vole la carte du sommet de la pile d'un adversaire de son choix.",
      doubleDesc: 'La dernière carte Score gagnée par le vainqueur est doublée (valeur × 2).',
      swapDesc: 'Le gagnant choisit 2 joueurs : leurs cartes du sommet de pile sont échangées.',
      // Slide 7 — Étoiles
      roundEndLastCards: 'Fin de manche — dernières cartes',
      bobUniqueExplain: (unique: ReactNode): ReactNode => `Bob a la seule carte ${unique} → gagne 1 étoile bonus`,
      uniqueWord: 'unique',
      endGameBonus: 'Bonus fin de partie',
      mostStarsBonus: "Le joueur avec le plus d'étoiles gagne +5 points bonus",
      // Slide 9 — Nombre de manches
      roundsTitle: 'Nombre de manches',
      roundsPlayers: 'joueurs',
      roundsRounds: 'manches',
      roundsFormula: 'Plus il y a de joueurs, moins il y a de manches',
      roundsRows: [
        { players: 3, rounds: 9 },
        { players: 4, rounds: 7 },
        { players: 5, rounds: 6 },
        { players: 6, rounds: 5 },
      ] as { players: number; rounds: number }[],
      // Slide 10 — Fin de partie
      formulaCards: '🃏 Cartes',
      formulaStars: '⭐ Étoiles',
      formulaBonus: '🏆 Bonus',
      formulaTotal: 'Total',
    },
    btnPrev: '← Précédent',
    btnNext: 'Suivant →',
    btnClose: "C'est parti !",
    counter: (cur: number, total: number) => `${cur} / ${total}`,
    slides: [
      {
        icon: '🎯',
        title: 'But du jeu',
        text: 'Remportez un maximum de <em>cartes Score</em> positives et évitez les négatives. Le joueur avec le <strong>plus de points</strong> en fin de partie gagne !',
      },
      {
        icon: '🖐️',
        title: 'Distribution des cartes',
        text: 'Chaque joueur reçoit un paquet de cartes numérotées <strong>de 1 à N</strong>. Le nombre de cartes dépend du nombre de joueurs : <strong>Nb cartes = Nb joueurs + 2</strong>. Chaque valeur n\'existe qu\'<em>en un seul exemplaire</em> dans votre main !',
      },
      {
        icon: '🔍',
        title: 'Début de manche — carte mystère',
        text: 'En début de manche, chaque joueur <strong>écarte secrètement une carte</strong> de sa main. Son <em>voisin de droite</em> voit la valeur de cette carte écartée — une information précieuse à exploiter !',
      },
      {
        icon: '🃏',
        title: "Déroulement d'une mène",
        text: 'Une <em>carte Score</em> est révélée. Chaque joueur choisit une carte de sa main et la pose <strong>face cachée</strong>. Toutes les cartes sont ensuite <strong>révélées</strong> en même temps.',
      },
      {
        icon: '✕',
        title: "Les doublons s'annulent",
        text: "Si deux joueurs ou plus jouent la <strong>même valeur</strong>, leurs cartes <em>s'annulent</em>. La carte <strong class='green'>verte</strong> est remportée par la valeur la plus <strong>haute</strong> sans doublon. La carte <strong class='red'>rouge</strong> est remportée par la valeur la plus <strong>basse</strong> sans doublon. Si tout s'annule, la carte est <em>défaussée</em>.",
      },
      {
        icon: '🌟',
        title: 'Les cartes Score',
        text: 'Les cartes <strong class="green">vertes</strong> rapportent des points positifs. Les cartes <strong class="red">rouges</strong> donnent des points négatifs mais octroient des <em>étoiles bonus</em>. Les cartes <strong>spéciales</strong> existent en version <strong class="green">verte</strong> et <strong class="red">rouge</strong> — elles déclenchent des effets puissants !',
      },
      {
        icon: '✨',
        title: 'Les cartes spéciales',
        text: 'Chaque effet spécial existe en version <strong class="green">verte</strong> (gagnée par la plus haute valeur) et <strong class="red">rouge</strong> (gagnée par la plus basse). Une fois remportée, l\'effet se déclenche immédiatement !',
      },
      {
        icon: '⭐',
        title: 'Les étoiles',
        text: "En fin de manche, le joueur dont la dernière carte est <strong>unique</strong> (pas de doublon) gagne <em>1 étoile bonus</em>. Certaines cartes Score négatives donnent aussi des étoiles. Le joueur avec le <strong>plus d'étoiles</strong> en fin de partie gagne <em>+5 points</em> !",
      },
      {
        icon: '🏆',
        title: 'Fin de partie',
        text: "Après toutes les manches, on additionne les <em>points des cartes Score</em> + <em>1 pt par étoile</em> + le <strong>bonus étoiles (+5 pts)</strong> si applicable. Le joueur avec le <strong>total le plus élevé</strong> remporte la partie !",
      },
      {
        icon: '🔁',
        title: 'Nombre de manches',
        text: 'La partie dure un nombre de manches fixe selon le nombre de joueurs. <strong>Plus il y a de joueurs</strong>, moins il y a de manches — mais la compétition est d\'autant plus intense !',
      },
    ],
  },

  // ── Tutoriel Flux ─────────────────────────────────────
  fluxTutorial: {
    btnOpen: '📖 Règles',
    btnPrev: '← Précédent',
    btnNext: 'Suivant →',
    btnClose: "C'est parti !",
    counter: (cur: number, total: number) => `${cur} / ${total}`,
    slides: [
      {
        icon: '🎯',
        title: 'But du jeu',
        text: 'Soyez le premier à atteindre <strong>3 points de victoire</strong>. Chaque manche de <em>20 cartes Score</em>, trois compteurs sont comparés : <strong>étoiles</strong>, <strong>points des cartes</strong> et <strong>points bonus</strong>. Le joueur en tête de chaque compteur gagne <strong>1 point de victoire</strong>.',
      },
      {
        icon: '🖐️',
        title: 'Votre main',
        text: 'Chaque joueur commence avec les cartes <strong>1 à 8</strong> + <strong>1 carte YUMI</strong> + <strong>1 carte Recharge</strong>. En début de manche, votre <em>voisin de droite</em> pioche secrètement une carte de votre main — elle est bloquée pour toute la manche. La carte YUMI peut être tirée !',
      },
      {
        icon: '🌊',
        title: 'Le flux de cartes Score',
        text: '20 cartes Score arrivent en <strong>flux continu</strong>, une par une. Les cartes <strong class="green">vertes</strong> sont remportées par la <em>plus grande valeur</em>. Les cartes <strong class="red">rouges</strong> sont remportées par la <em>plus petite valeur</em>. Des cartes <strong>spéciales</strong> s\'y glissent aussi !',
      },
      {
        icon: '✕',
        title: "Les doublons s'annulent",
        text: "Si deux joueurs ou plus jouent la <strong>même valeur</strong>, leurs cartes <em>s'annulent mutuellement</em>. La carte Score est alors remportée par la valeur la plus haute (ou basse) <strong>restante</strong>. Si tout s'annule, la carte est <em>défaussée</em>.",
      },
      {
        icon: '🌟',
        title: 'La carte YUMI',
        text: 'La carte <strong>YUMI</strong> est la plus puissante de votre main. Sur une carte <strong class="green">verte</strong>, elle vaut comme la <em>plus grande</em> valeur jouée. Sur une carte <strong class="red">rouge</strong>, elle vaut comme la <em>plus petite</em>. Si deux joueurs jouent la YUMI, elles <strong>s\'annulent</strong>. Une fois jouée, elle est <em>définitivement écartée</em>.',
      },
      {
        icon: '🔄',
        title: 'La carte Recharge',
        text: 'Jouez votre <strong>carte Recharge</strong> à la place d\'une carte normale pour <em>récupérer toutes vos cartes jouées</em> (sauf la YUMI, définitivement écartée). Votre <strong>carte mystère est remplacée</strong>. Les joueurs ayant joué une <em>valeur unique</em> ce tour gagnent autant de points Bonus qu\'il y a de <strong>joueurs ayant rechargé</strong>.',
      },
      {
        icon: '⭐',
        title: 'Les 3 compteurs',
        text: 'En fin de manche, on compare <strong>3 compteurs</strong> : ⭐ <em>étoiles</em>, 🃏 <em>points des cartes Score</em>, 🎯 <em>points bonus (Recharge)</em>. Le joueur en tête de chaque compteur gagne <strong>1 point de victoire</strong>. <strong>Égalité en tête ?</strong> Les ex-æquo s\'annulent — le point va au joueur suivant.',
      },
      {
        icon: '🏆',
        title: 'Fin de partie',
        text: 'Le premier joueur à atteindre <strong>3 points de victoire</strong> remporte la partie ! Si plusieurs joueurs atteignent 3 PV lors de la même manche, on joue une <em>manche supplémentaire</em> pour les départager.',
      },
    ],
    illu: {
      // Slide 1 — But
      wonCards: 'Points de victoire',
      finalScore: '3 PV pour gagner',
      victory: 'Victoire !',
      // Slide 2 — Main
      handTitle: 'Votre main',
      handMin: 'Cartes 1 à 8',
      handMax: '+ carte YUMI',
      handRecharge: '+ 1 Recharge',
      handMystery: '1 carte bloquée (mystère)',
      // Slide 3 — Flux
      fluxGreen: 'Vertes → plus grande valeur',
      fluxRed: 'Rouges → plus petite valeur',
      fluxSpecial: 'Spéciales → effets !',
      fluxContinuous: '20 cartes par manche',
      // Slide 4 — Doublons
      dupCancel: 'Doublons annulés',
      dupWinner: 'Valeur unique gagne',
      dupDiscard: 'Tout annulé → défaussée',
      // Slide 5 — YUMI
      rechargePlay: 'Carte YUMI',
      rechargeGet: '🟢 = plus grande valeur',
      rechargeNewMystery: '🔴 = plus petite valeur',
      rechargeStarBonus: '2 YUMI → elles s\'annulent',
      // Slide 6 — Recharge
      starsOnCards: 'Jouer Recharge',
      starsMajority: 'Récupère les cartes jouées',
      starsRecharge: 'Valeur unique → étoiles',
      starsRechargeBonus: '× nb de rechargeurs',
      starsEndBonus: 'YUMI définitivement écartée',
      // Slide 7 — Compteurs
      formulaCards: '⭐ Étoiles',
      formulaRecharge: '🃏 Points cartes',
      formulaBonus: '🎯 Points bonus',
      formulaTotal: '→ 1 PV chacun',
      // Slide 4 — Textes hardcodés dans les illustrations
      dupExplain: 'Les 5 s\'annulent → Cara gagne avec le 7',
      rechargeScenarioTitle: 'Ce tour : 1 joueur recharge',
      caraUniqueLabel: 'Cara — valeur unique',
      caraUniqueRecharger: '1 rechargeur × valeur unique',
      aliceBobLabel: 'Alice & Bob — annulés',
      aliceBobResult: 'doublon → pas de point bonus',
    },
  },

  // ── FluxBoard ────────────────────────────────────────────
  fluxBoard: {
    loading: 'Chargement…',
    roundEndTitle: '🏁 Fin de manche',
    vpCatStars: 'Course aux étoiles',
    vpCatCards: 'Points des cartes',
    vpCatBonus: 'Points bonus',
    vpCancelled: 'Annulé (ex-æquo)',
    vpRankTitle: 'Points de victoire',
    nextRoundBtn: 'Manche suivante →',
    trickLabel: (trick: number) => `Mène ${trick}`,
    deckRemaining: (n: number) => `🃏 ${n} restantes`,
    mysteryOwner: (owner: string) => `🔍 ${owner} :`,
    scoreCardLabel: 'Carte Score',
    rechargeSlot: '🔄 Recharge',
    mysteryCardLabel: 'Carte mystère :',
    trickDiscarded: 'Carte défaussée — tout le monde a rechargé',
    trickWinner: (pseudo: string) => `${pseudo} remporte la carte !`,
    bonusPointInfo: (count: number, names: string) => `🪙×${count} Recharge — ${names}`,
    revealedUpcomingLabel: '📢 Prochaines cartes Score révélées :',
    stealPrompt: '🦅 Choisissez un adversaire à voler',
    swapPrompt1: '⇄ Choisissez le premier joueur à échanger',
    swapPrompt2: (pseudo: string) => `⇄ Choisissez le second joueur (A = ${pseudo})`,
    mysteryCardTitle: 'Votre carte mystère',
    mysteryCardPlayTitle: 'Cliquer pour jouer votre carte mystère',
    mysteryCardPlay: 'jouer',
    handLabel: 'Ma main',
    alreadyPlayed: 'Déjà jouées :',
    yumiHint: '✨ YUMI — vaut la + grande ou + petite valeur selon la carte Score. Usage unique, non récupérable.',
    playYumi: 'Jouer YUMI ✨',
    playValue: (value: number) => `Jouer le ${value}`,
    rechargeBtn: '🔄 Recharge',
    waitingMsg: 'En attente des autres joueurs…',
    // Oracle modal
    oracleTitle: 'Oracle',
    oracleSubtitle: 'Vision secrète — vous seul voyez ces cartes',
    oracleLabel: 'Les 3 prochaines cartes Score :',
    oracleWarning: 'Ces informations sont confidentielles. Les autres joueurs ne les voient pas.',
    oracleOkBtn: 'J\'ai mémorisé — Continuer',
    oracleCardNum: (n: number) => `#${n}`,
    revealedUpcomingNum: (n: number) => `#${n}`,
  },

  // ── SpecialCardInfo ──────────────────────────────────────
  specialCards: {
    effectLabel: '⚙️ Effet',
    tipLabel: '💡 Conseil',
    gainGreen: '🟢 + grande gagne',
    gainRed: '🔴 + petite gagne',
    taxeStolen: (n: number) => `×${n}🪙 volés`,
    DOUBLE: {
      icon: '×2', title: 'DOUBLE', role: 'Doublement de score',
      how: 'La valeur de ta dernière carte Score gagnée est multipliée par 2.',
      tip: 'Gagne-la après une carte à forte valeur pour maximiser l\'effet.',
    },
    STEAL: {
      icon: '🦅', title: 'VOL', role: 'Voler une carte adverse',
      how: 'Tu prends la carte du dessus de la pile d\'un adversaire de ton choix et tu la places dans ta propre pile.',
      tip: 'Cible le joueur avec la carte la plus précieuse au sommet.',
    },
    SWAP: {
      icon: '⇄', title: 'ÉCHANGE', role: 'Échanger deux piles',
      how: 'Tu choisis 2 joueurs (toi inclus) : leurs cartes du dessus de pile sont échangées.',
      tip: 'Utile pour te débarrasser d\'une carte négative ou voler un gros score.',
    },
    PIOCHE: {
      icon: '🎰', title: 'PIOCHE', role: 'Forcer une carte adverse',
      how: 'Tu regardes une carte au hasard dans la main d\'un adversaire. Il devra jouer cette carte à la prochaine mène.',
      tip: 'Cible un joueur fort pour lui imposer une carte qui ne l\'arrange pas.',
    },
    VERROU: {
      icon: '🔒', title: 'VERROU', role: 'Bloquer la carte d\'un adversaire',
      how: 'Tu désignes un adversaire. Selon la prochaine carte Score (verte → il joue sa plus haute, rouge → sa plus basse), il n\'a plus le choix.',
      tip: 'Parfait pour forcer un adversaire à se trahir sur une carte clé.',
    },
    REVELATION: {
      icon: '🕵️', title: 'RÉVÉLATION', role: 'Révéler une carte mystère',
      how: 'Tu choisis un adversaire : sa carte mystère (valeur cachée) est révélée à tous les joueurs.',
      tip: 'Brise l\'avantage informationnel d\'un adversaire discret.',
    },
    MYSTERE: {
      icon: '🎭', title: 'MYSTÈRE', role: 'Mène mystère',
      how: 'À la prochaine mène, tous les joueurs jouent obligatoirement leur carte mystère (valeur cachée) au lieu d\'une carte normale.',
      tip: 'Crée une mène imprévisible où personne ne contrôle sa carte.',
    },
    SURCHARGE: {
      icon: '⚡', title: 'SURCHARGE', role: 'Forcer une Recharge',
      how: 'Tu désignes un adversaire qui sera forcé de jouer Recharge à la prochaine mène, qu\'il le veuille ou non.',
      tip: 'Idéal pour priver un adversaire d\'une carte forte au moment crucial.',
    },
    INVERSION: {
      icon: '🌀', title: 'INVERSION', role: 'Inverser la condition de victoire',
      how: 'À la prochaine mène, la condition est inversée : si la carte Score est verte (plus grande gagne), c\'est la plus petite qui gagne, et vice versa.',
      tip: 'Surprend les adversaires qui ont déjà choisi leur stratégie.',
    },
    CONSTELLATION: {
      icon: '🌟', title: 'CONSTELLATION', role: 'Bonus d\'étoiles massif',
      how: 'Gagne immédiatement un grand nombre d\'étoiles bonus (⭐×5). Ces étoiles comptent pour la majorité et valent +1 pt chacune.',
      tip: 'Très puissante en fin de partie pour décrocher le bonus de majorité.',
    },
    ECLIPSE: {
      icon: '☄️', title: 'ÉCLIPSE', role: 'Donner des malus d\'étoiles',
      how: 'Tu choisis un joueur (toi inclus) qui reçoit la carte : il perd 3 étoiles mais gagne +1 point de score.',
      tip: 'Donne-la à un adversaire dominant en étoiles pour briser sa majorité.',
    },
    JACKPOT: {
      icon: '💰', title: 'JACKPOT', role: 'Points bonus immédiats',
      how: 'Tu gagnes immédiatement des points bonus (🪙) qui s\'ajoutent à ton score final, en plus de la valeur de la carte.',
      tip: 'Un gain sûr et immédiat, indépendant des étoiles.',
    },
    TAXE: {
      icon: '🧹', title: 'TAXE', role: 'Voler des points bonus',
      how: 'Tu choisis un adversaire qui possède des points bonus (🪙) : tu lui en prends 2 et tu les ajoutes à ton score.',
      tip: 'Cible le joueur avec le plus de points bonus accumulés.',
    },
    ORACLE: {
      icon: '👁️', title: 'ORACLE', role: 'Vision secrète',
      how: 'Tu consultes secrètement les 3 prochaines cartes Score du deck. Cette information n\'est visible que par toi.',
      tip: 'Planifie ta stratégie sur les prochaines mènes avec une longueur d\'avance.',
    },
    DEVOILEMENT: {
      icon: '📢', title: 'DÉVOILEMENT', role: 'Révéler les prochaines cartes',
      how: 'Les 3 prochaines cartes Score du deck sont révélées à tous les joueurs simultanément.',
      tip: 'Tout le monde voit la même chose — à toi de mieux l\'exploiter.',
    },
  },

  // ── Commun ──────────────────────────────────────────────
  common: {
    green: 'Vert',
    red: 'Rouge',
    bonusStar: '⭐ +1',
    vpUnit: 'PV',
    vpGain: '+1 PV',
    vpCount: (n: number) => `${n} PV`,
  },
};

export type Translations = typeof fr;
