// ============================================================
// YUMI — English translations
// ============================================================

import type { ReactNode } from 'react';
import type { Translations } from './fr';

export const en: Translations = {

  // ── Lobby — home screen ─────────────────────────────────
  lobby: {
    title: 'YUMI',
    subtitle: 'The trick-taking game where duplicates cancel out!',
    pseudoPlaceholder: 'Your username',
    btnSolo: '⚔️ Play solo against bots',
    btnCreate: 'Create a multiplayer game',
    dividerJoin: 'or join',
    codePlaceholder: 'Room code (e.g. ABC123)',
    btnJoin: 'Join a game',
    errorNoPseudo: 'Enter a username',
    errorNoPseudoFirst: 'Enter a username first',
    errorNoCode: 'Enter a room code',
  },

  // ── Lobby — waiting room ────────────────────────────────
  waiting: {
    roomCodeLabel: 'Room code:',
    hostBadge: 'Host',
    readyBadge: '✓ Ready',
    notReadyBadge: 'Waiting...',
    waitingPlayers: (count: number) => `Waiting for players... (${count}/3 minimum)`,
    optionsTitle: '⚙️ Game options',
    optionColorRuleTitle: (green: string, red: string) => `${green} = highest card • ${red} = lowest card`,
    optionColorRuleDesc: 'Positive cards won by the highest value, negative cards by the lowest.',
    btnReady: 'I\'m ready!',
    btnCancelReady: 'Cancel',
    btnStart: 'Start the game!',
    // Bots in multiplayer waiting room
    botsTitle: '🤖 Bots',
    addBotLabel: '+ Add a bot',
    removeBotLabel: '✕',
    botSlotLabel: (name: string, profile: string) => `${name} (${profile})`,
    playerCount: (humans: number, bots: number, max: number) => `${humans} player(s) + ${bots} bot(s) / ${max} max`,
  },

  // ── SoloSetup ───────────────────────────────────────────
  solo: {
    title: '⚔️ Solo Mode',
    subtitlePrefix: 'You play as',
    subtitleSuffix: 'against bots',
    opponentsLabel: 'Number of opponents',
    counterHint: (total: number, bots: number) =>
      `${total}-player game (you + ${bots} bots) • min 2, max 5 bots`,
    botsLabel: 'Choose your opponents',
    optionsLabel: 'Game options',
    optionColorRuleTitle: (green: string, red: string) => `${green} = highest card • ${red} = lowest card`,
    optionColorRuleDesc:
      'Positive Score cards (green) are won by the highest value, negative (red) by the lowest. Special cards always go to the highest.',
    profilesLegendTitle: 'Available profiles',
    btnCancel: 'Cancel',
    btnStart: 'Start the game!',
  },

  // ── Board — game board ──────────────────────────────────
  board: {
    loading: 'Loading...',
    round: (cur: number, total: number) => `Round ${cur}/${total}`,
    trick: (cur: number, total: number) => `Trick ${cur}/${total}`,
    deckCount: (n: number) => `🃏 ${n} card${n > 1 ? 's' : ''} left in round`,
    scoreColumnLabel: 'Score Cards',
    activeCardLabel: 'In play',
    trickDiscarded: 'Card discarded — everything cancelled!',
    trickWinner: (pseudo: string) => `${pseudo} wins the card!`,
    roundEndTitle: 'End of round — Star bonus',
    mysteryCard: (owner: string, value: number) => `🔍 ${owner}'s mystery card: ${value}`,
    missingCard: (value: number) => `⚠️ Your missing card: ${value}`,
    stealPrompt: '🦅 Choose an opponent to steal from!',
    swapPrompt1: '⇄ Choose the 1st player to swap',
    swapPrompt2: (pseudo: string) => `⇄ Choose the 2nd player to swap with ${pseudo}`,
    myStars: (n: number) => `⭐ ${n} stars`,
    myScorePile: (n: number) => `Score pile: ${n} card(s)`,
    myLastCard: (val: string) => `Last card: ${val}`,
    // Victory points
    vpCatStars: 'Star race',
    vpCatCards: 'Card points',
    vpCatBonus: 'Bonus points',
    vpCancelled: 'Cancelled (tie)',
    vpRankTitle: 'Victory points',
  },

  // ── MyHand ──────────────────────────────────────────────
  hand: {
    label: 'My hand',
    playBtn: (value: number) => `Play ${value}`,
    waiting: 'Card played — waiting for other players...',
  },

  // ── OpponentPanel ───────────────────────────────────────
  opponent: {
    swapOverlay: '⇄ Swap',
    stealOverlay: '🦅 Steal',
  },

  // ── GameOver ────────────────────────────────────────────
  gameover: {
    trophy: '🏆',
    titleWin: 'Victory!',
    titleLose: 'Game over',
    gameIcon: '🎮',
    winnerLine: (pseudo: string, vp: number) => `${pseudo} wins the game with ${vp} victory point${vp > 1 ? 's' : ''}!`,
    victoryPointsTitle: 'Victory points (1 per category won per round)',
    cardScoreTitle: 'Cumulative Score card points',
    bonusPointsTitle: 'Cumulative bonus points',
    starsTitle: 'Cumulative stars',
    rechargeStarScoreTitle: 'Recharge stars (+1 pt each)',
    starScoreTitle: 'Score card stars (majority only)',
    starBonusTitle: 'Bonus: most total stars (+5 pts)',
    pts: (n: number) => `${n} pts`,
    btnReplay: 'Play again',
  },

  // ── HistoryPanel ────────────────────────────────────────
  history: {
    panelTitle: 'Game log',
    panelSub: (cur: number, total: number) => `Round ${cur}/${total}`,
    empty: 'Waiting for events…',
    trickSepLabel: (trick: number) => `Trick ${trick}`,
    revealLabel: 'Reveal',
    me: 'Me',
    discardedText: 'Discarded — all cancelled',
    youWin: 'You win',
    wins: (pseudo: string) => `${pseudo} wins`,
    theCard: 'the card',
    withCard: (val: number) => `with\u00a0${val}`,
    cancelled: (pseudo: string, val: number) => `${pseudo} (${val}) cancelled`,
    roundEndTitle: 'End of round — last cards',
    noBonus: 'No star bonus',
    roundRankTitle: (round: number) => `Round ${round} standings`,
    cardDiscarded: 'discarded',
    youHave: 'You have',
    has: (pseudo: string) => `${pseudo} has`,
    won: 'won',
    // Dynamic messages from socket (useSocket.ts)
    socket: {
      roundSep: (cur: number, total: number) => `— Round ${cur} / ${total} —`,
      trickCard: (trick: number, card: string) => `Trick ${trick} — card: ${card}`,
      ruleGreenWins: ' — 🟢 highest wins',
      ruleRedWins: ' — 🔴 lowest wins',
      scoreDiscarded: (card: string) => `🚫 Card ${card} discarded — nobody wins it`,
      scoreWon: (pseudo: string, card: string) => `🏅 ${pseudo} won the card ${card}`,
      bonusStars: (pseudo: string, n: number) => `⭐ ${pseudo} gains ${n} bonus star(s)!`,
      steal: (thief: string, victim: string) => `🦅 ${thief} steals from ${victim}`,
      double: (pseudo: string) => `×2 applied to ${pseudo}'s last card`,
      swap: (a: string, b: string) => `⇄ Swap between ${a} and ${b}`,
      bonusStarWinners: (names: string) => `Star bonus: ${names}`,
      noBonusStar: 'No star bonus this round',
      roundRank: (pseudo: string, pts: number) => `Round standings: ${pseudo} in the lead (${pts} pts)`,
      stealChoosing: (pseudo: string) => `🦅 ${pseudo} is choosing a target to steal from...`,
      swapChoosing: (pseudo: string) => `⇄ ${pseudo} is choosing 2 players to swap...`,
      cardPlayed: (pseudo: string) => `${pseudo} played a card`,
      gameOver: (pseudo: string) => `🏆 ${pseudo} wins the game!`,
      gameOverFallback: 'Game over',
      // Flux mode — Recharge
      rechargeStars: (rechargers: string, winners: string, starCount: number) =>
        `🔄 ${rechargers} recharge${rechargers.includes(',') ? '' : 's'} — ⭐×${starCount} for ${winners} (unique value)`,
      rechargeStarsNoWinner: (rechargers: string) =>
        `🔄 ${rechargers} recharge${rechargers.includes(',') ? '' : 's'} — no stars (all values duplicated)`,
      rechargeAllDiscard: '🔄 Everyone recharges — Score card discarded',
    },
  },

  // ── Bot descriptions ────────────────────────────────
  botDescriptions: {
    LOGIQUE: 'Plays in a calculated way. Avoids duplicates and targets the best Score cards.',
    KAMIKAZE: 'Charges in headfirst! Always plays the highest card, no matter what.',
    HASARD: 'Completely unpredictable. Plays any card at random.',
    PRUDENT: 'Always plays the lowest card. Prefers not to win rather than risk losing.',
    SABOTEUR: 'Tries to cancel others\' cards by playing the same values.',
  },

  // ── Tutorial ────────────────────────────────────────────
  tutorial: {
    btnOpen: '📖 Rules',
    illu: {
      // Slide 1 — Goal
      wonCards: 'Cards won',
      finalScore: 'Final score',
      victory: 'Victory!',
      // Slide 2 — Hand distribution
      handTitle: 'Your hand',
      handFormula: 'No. of cards = No. of players + 2',
      handPlayers: 'players',
      handCards: 'cards',
      handRange: (n: number) => `from 1 to ${n}`,
      handRows: [
        { players: 3, cards: 5 },
        { players: 4, cards: 6 },
        { players: 5, cards: 7 },
        { players: 6, cards: 8 },
      ] as { players: number; cards: number }[],
      // Slide 3 — Mystery card
      roundStart: 'At the start of each round',
      discardsSecret: 'discards secretly',
      rightNeighbourSees: 'right neighbour sees',
      seesValue: 'sees the value!',
      discardedOutOfPlay: 'The discarded card is out of play',
      discardedDesc: (strong: ReactNode, em: ReactNode): ReactNode => `It will ${strong} during the round. Only the neighbour knows its value — a ${em}!`,
      notPlayed: 'not be played',
      strategicAdvantage: 'strategic advantage',
      // Slide 3 — Trick
      trickPhase1: (strong: ReactNode): ReactNode => `A Score card is ${strong}`,
      trickPhase1Keyword: 'revealed',
      trickPhase2: (strong: ReactNode): ReactNode => `Everyone places their card ${strong}`,
      trickPhase2Keyword: 'face down',
      trickPhase3: (strong: ReactNode): ReactNode => `All cards are ${strong} simultaneously`,
      trickPhase3Keyword: 'revealed',
      // Slide 4 — Duplicates
      greenRule: '🟢 Green card — highest unique value wins',
      redRule: '🔴 Red card — lowest unique value wins',
      allCancelledLabel: 'All cancelled → card discarded 🚫',
      greenExplain: (cancelled: ReactNode, winner: ReactNode): ReactNode => `The ${cancelled}s cancel out → Cara wins with ${winner} (highest remaining value)`,
      redExplain: (winner: ReactNode): ReactNode => `No duplicate → Alice wins with ${winner} (lowest value)`,
      // Slide 5 — Score cards
      greenCardsLabel: '🟢 Green — positive points',
      redCardsLabel: '🔴 Red — negative points',
      highestWins: 'Highest value wins',
      lowestWins: 'Lowest value wins',
      specialsLabel: '✨ Specials — exist in green AND red versions',
      specialsFooter: '🟢 won by the highest value  •  🔴 won by the lowest value',
      specialNames: { steal: 'STEAL', double: 'DOUBLE', swap: 'SWAP' },
      // Slide 6 — Special cards
      stealDesc: "The winner steals the top card from an opponent's pile of their choice.",
      doubleDesc: "The winner's last won Score card is doubled (value × 2).",
      swapDesc: 'The winner picks 2 players: their top pile cards are swapped.',
      // Slide 7 — Stars
      roundEndLastCards: 'End of round — last cards',
      bobUniqueExplain: (unique: ReactNode): ReactNode => `Bob has the only ${unique} card → earns 1 bonus star`,
      uniqueWord: 'unique',
      endGameBonus: 'End-of-game bonus',
      mostStarsBonus: 'The player with the most stars gains +5 bonus points',
      // Slide 9 — Number of rounds
      roundsTitle: 'Number of rounds',
      roundsPlayers: 'players',
      roundsRounds: 'rounds',
      roundsFormula: 'More players = fewer rounds',
      roundsRows: [
        { players: 3, rounds: 9 },
        { players: 4, rounds: 7 },
        { players: 5, rounds: 6 },
        { players: 6, rounds: 5 },
      ] as { players: number; rounds: number }[],
      // Slide 10 — Game over
      formulaCards: '🃏 Cards',
      formulaStars: '⭐ Stars',
      formulaBonus: '🏆 Bonus',
      formulaTotal: 'Total',
    },
    btnPrev: '← Previous',
    btnNext: 'Next →',
    btnClose: "Let's play!",
    counter: (cur: number, total: number) => `${cur} / ${total}`,
    slides: [
      {
        icon: '🎯',
        title: 'Goal of the game',
        text: 'Win as many <em>positive Score cards</em> as possible and avoid the negative ones. The player with the <strong>most points</strong> at the end wins!',
      },
      {
        icon: '🖐️',
        title: 'Card distribution',
        text: 'Each player receives a hand of cards numbered <strong>from 1 to N</strong>. The number of cards depends on the number of players: <strong>No. of cards = No. of players + 2</strong>. Each value exists <em>only once</em> in your hand!',
      },
      {
        icon: '🔍',
        title: 'Start of round — mystery card',
        text: 'At the start of each round, every player <strong>secretly sets aside one card</strong> from their hand. Their <em>right-hand neighbour</em> sees the value of that discarded card — precious information to use wisely!',
      },
      {
        icon: '🃏',
        title: 'How a trick works',
        text: 'A <em>Score card</em> is revealed. Each player picks a card from their hand and places it <strong>face down</strong>. All cards are then <strong>revealed</strong> simultaneously.',
      },
      {
        icon: '✕',
        title: 'Duplicates cancel out',
        text: "If two or more players play the <strong>same value</strong>, their cards <em>cancel out</em>. A <strong class='green'>green</strong> card is won by the <strong>highest</strong> unique value. A <strong class='red'>red</strong> card is won by the <strong>lowest</strong> unique value. If everything cancels, the card is <em>discarded</em>.",
      },
      {
        icon: '🌟',
        title: 'Score cards',
        text: '<strong class="green">Green</strong> cards give positive points. <strong class="red">Red</strong> cards give negative points but award <em>bonus stars</em>. <strong>Special</strong> cards come in both <strong class="green">green</strong> and <strong class="red">red</strong> versions — they trigger powerful effects!',
      },
      {
        icon: '✨',
        title: 'Special cards',
        text: 'Each special effect exists in a <strong class="green">green</strong> version (won by the highest value) and a <strong class="red">red</strong> version (won by the lowest value). Once won, the effect triggers immediately!',
      },
      {
        icon: '⭐',
        title: 'Stars',
        text: 'At the end of each round, the player whose last card is <strong>unique</strong> (no duplicate) earns <em>1 bonus star</em>. Some negative Score cards also give stars. The player with the <strong>most stars</strong> at the end gains <em>+5 points</em>!',
      },
      {
        icon: '🏆',
        title: 'End of game',
        text: 'After all rounds, add up <em>Score card points</em> + <em>1 pt per star</em> + the <strong>star bonus (+5 pts)</strong> if applicable. The player with the <strong>highest total</strong> wins the game!',
      },
      {
        icon: '🔁',
        title: 'Number of rounds',
        text: 'The game lasts a fixed number of rounds depending on the player count. <strong>More players</strong> means fewer rounds — but the competition is all the more intense!',
      },
    ],
  },

  // ── Flux Tutorial ─────────────────────────────────────
  fluxTutorial: {
    btnOpen: '📖 Rules',
    btnPrev: '← Previous',
    btnNext: 'Next →',
    btnClose: "Let's play!",
    counter: (cur: number, total: number) => `${cur} / ${total}`,
    slides: [
      {
        icon: '🎯',
        title: 'Goal of the game',
        text: 'Be the first to reach <strong>3 victory points</strong>. Each round of <em>20 Score cards</em>, three counters are compared: <strong>stars</strong>, <strong>card points</strong> and <strong>bonus points</strong>. The player leading each counter earns <strong>1 victory point</strong>.',
      },
      {
        icon: '🖐️',
        title: 'Your hand',
        text: 'Each player starts with cards <strong>1 to 8</strong> + <strong>1 YUMI card</strong> + <strong>1 Recharge card</strong>. At the start of each round, your <em>right-hand neighbour</em> secretly draws one card from your hand — it is locked for the whole round. The YUMI card can be drawn!',
      },
      {
        icon: '🌊',
        title: 'The Score card stream',
        text: '20 Score cards arrive in a <strong>continuous stream</strong>, one by one. <strong class="green">Green</strong> cards are won by the <em>highest value</em>. <strong class="red">Red</strong> cards are won by the <em>lowest value</em>. <strong>Special</strong> cards are mixed in too!',
      },
      {
        icon: '✕',
        title: 'Duplicates cancel out',
        text: "If two or more players play the <strong>same value</strong>, their cards <em>cancel each other out</em>. The Score card is then won by the highest (or lowest) <strong>remaining</strong> value. If everything cancels, the card is <em>discarded</em>.",
      },
      {
        icon: '🌟',
        title: 'The YUMI card',
        text: 'The <strong>YUMI</strong> card is the most powerful in your hand. On a <strong class="green">green</strong> card, it counts as the <em>highest</em> value played. On a <strong class="red">red</strong> card, it counts as the <em>lowest</em>. If two players play YUMI, they <strong>cancel out</strong>. Once played, it is <em>permanently discarded</em>.',
      },
      {
        icon: '🔄',
        title: 'The Recharge card',
        text: 'Play your <strong>Recharge card</strong> instead of a normal card to <em>recover all your played cards</em> (except YUMI, permanently discarded). Your <strong>mystery card is replaced</strong>. Players who played a <em>unique value</em> this turn earn as many Bonus points as there are <strong>players who recharged</strong>.',
      },
      {
        icon: '⭐',
        title: 'The 3 counters',
        text: 'At the end of each round, <strong>3 counters</strong> are compared: ⭐ <em>stars</em>, 🃏 <em>Score card points</em>, 🎯 <em>bonus points (Recharge)</em>. The player leading each counter earns <strong>1 victory point</strong>. <strong>Tied at the top?</strong> The tied players cancel out — the point goes to the next player.',
      },
      {
        icon: '🏆',
        title: 'End of game',
        text: 'The first player to reach <strong>3 victory points</strong> wins the game! If multiple players reach 3 VP in the same round, an <em>extra round</em> is played to break the tie.',
      },
    ],
    illu: {
      // Slide 1 — Goal
      wonCards: 'Victory points',
      finalScore: '3 VP to win',
      victory: 'Victory!',
      // Slide 2 — Hand
      handTitle: 'Your hand',
      handMin: 'Cards 1 to 8',
      handMax: '+ YUMI card',
      handRecharge: '+ 1 Recharge',
      handMystery: '1 locked card (mystery)',
      // Slide 3 — Stream
      fluxGreen: 'Green → highest value',
      fluxRed: 'Red → lowest value',
      fluxSpecial: 'Special → effects!',
      fluxContinuous: '20 cards per round',
      // Slide 4 — Duplicates
      dupCancel: 'Duplicates cancelled',
      dupWinner: 'Unique value wins',
      dupDiscard: 'All cancelled → discarded',
      // Slide 5 — YUMI
      rechargePlay: 'YUMI card',
      rechargeGet: '🟢 = highest value played',
      rechargeNewMystery: '🔴 = lowest value played',
      rechargeStarBonus: '2 YUMIs → they cancel out',
      // Slide 6 — Recharge
      starsOnCards: 'Play Recharge',
      starsMajority: 'Recover played cards',
      starsRecharge: 'Unique value → stars',
      starsRechargeBonus: '× number of rechargers',
      starsEndBonus: 'YUMI permanently discarded',
      // Slide 7 — Counters
      formulaCards: '⭐ Stars',
      formulaRecharge: '🃏 Card points',
      formulaBonus: '🎯 Bonus points',
      formulaTotal: '→ 1 VP each',
    },
  },

  // ── Common ──────────────────────────────────────────────
  common: {
    green: 'Green',
    red: 'Red',
    bonusStar: '⭐ +1',
  },
};
