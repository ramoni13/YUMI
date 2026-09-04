import React, { useState } from 'react';
import { BotProfile, BOT_PROFILES_INFO, GameMode, GameOptions, DEFAULT_GAME_OPTIONS } from '../../types';
import { useGameStore } from '../../store/gameStore';
import { useLangStore } from '../../store/langStore';
import { getSocket, ensureConnected, saveSession, clearSession } from '../../hooks/useSocket';
import { useT } from '../../hooks/useT';
import { SoloSetup } from './SoloSetup';
import { Tutorial } from '../Tutorial/Tutorial';
import { FluxTutorial } from '../Tutorial/FluxTutorial';
import styles from './Lobby.module.css';

interface LobbyProps {
  onGameStart: () => void;
}

export function Lobby({ onGameStart }: LobbyProps) {
  const { room, playerId, setRoom, setPlayerId, setRoomCode, setPseudo, roomCode, setSelectedGameMode } = useGameStore();
  const [pseudoInput, setPseudoInput] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [view, setView] = useState<'home' | 'waiting' | 'solo_setup'>('home');
  const [error, setError] = useState('');
  const [soloError, setSoloError] = useState('');
  const [gameOptions, setGameOptions] = useState<GameOptions>({ ...DEFAULT_GAME_OPTIONS });
  const [gameMode, setGameMode] = useState<GameMode>('flux'); // Flux par défaut
  const [showTutorial, setShowTutorial] = useState(false);
  const [showFluxTutorial, setShowFluxTutorial] = useState(false);

  const t = useT();
  const { lang, toggleLang } = useLangStore();

  const socket = getSocket();

  const handleCreate = () => {
    if (!pseudoInput.trim()) return setError(t.lobby.errorNoPseudo);
    ensureConnected(() => {
      socket.emit('create_room', { pseudo: pseudoInput.trim(), gameMode }, (res: any) => {
        if ('error' in res) return setError(res.error);
        setSelectedGameMode(gameMode);
        setPlayerId(res.playerId);
        setRoomCode(res.roomCode);
        setPseudo(pseudoInput.trim());
        // Sauvegarder la session pour la reprise après déconnexion
        saveSession({ playerId: res.playerId, roomCode: res.roomCode, pseudo: pseudoInput.trim() });
        setView('waiting');
        setError('');
      });
    });
  };

  const handleSoloClick = () => {
    if (!pseudoInput.trim()) return setError(t.lobby.errorNoPseudoFirst);
    setError('');
    setSoloError('');
    setView('solo_setup');
  };

  const handleSoloConfirm = (bots: BotProfile[], opts: GameOptions) => {
    setGameOptions(opts);
    setSoloError('');

    const doEmit = () => {
      socket.emit('create_solo_room', { pseudo: pseudoInput.trim(), bots, gameOptions: opts, gameMode }, (res: any) => {
        if ('error' in res) return setSoloError(res.error);
        setSelectedGameMode(gameMode);
        setPlayerId(res.playerId);
        setRoomCode(res.roomCode);
        setPseudo(pseudoInput.trim());
        // Sauvegarder la session pour la reprise après déconnexion
        saveSession({ playerId: res.playerId, roomCode: res.roomCode, pseudo: pseudoInput.trim() });
        onGameStart();
      });
    };

    ensureConnected(doEmit);
  };

  const handleJoin = () => {
    if (!pseudoInput.trim()) return setError(t.lobby.errorNoPseudo);
    if (!codeInput.trim()) return setError(t.lobby.errorNoCode);
    const code = codeInput.trim().toUpperCase();
    socket.emit('join_room', { pseudo: pseudoInput.trim(), roomCode: code }, (res: any) => {
      if ('error' in res) return setError(res.error);
      // Le gameMode est déduit du code de salle (F = flux, C = classic)
      const joinedMode: GameMode = res.gameMode ?? (code.startsWith('F') ? 'flux' : 'classic');
      setSelectedGameMode(joinedMode);
      setPlayerId(res.playerId);
      setRoomCode(code);
      setPseudo(pseudoInput.trim());
      // Sauvegarder la session pour la reprise après déconnexion
      saveSession({ playerId: res.playerId, roomCode: code, pseudo: pseudoInput.trim() });
      setView('waiting');
      setError('');
    });
  };

  const [addBotProfile, setAddBotProfile] = useState<BotProfile>('HASARD');

  const handleReady = () => {
    socket.emit('player_ready', (res: any) => {
      if ('error' in res) setError(res.error);
    });
  };

  const handleStart = () => {
    socket.emit('start_game', { gameOptions }, (res: any) => {
      if ('error' in res) return setError(res.error);
      onGameStart();
    });
  };

  const handleAddBot = () => {
    socket.emit('add_bot', { profile: addBotProfile }, (res: any) => {
      if ('error' in res) setError(res.error);
    });
  };

  const handleRemoveBot = (botId: string) => {
    socket.emit('remove_bot', { botId }, (res: any) => {
      if ('error' in res) setError(res.error);
    });
  };

  const isHost = room?.hostId === playerId;
  // Les bots sont toujours prêts — seuls les humains comptent pour canStart
  const humanPlayers = room?.players.filter(p => !room.bots.some(b => b.id === p.id)) ?? [];
  const allHumansReady = humanPlayers.every(p => p.isReady);
  const totalPlayers = (room?.players.length ?? 0);
  const canStart = isHost && allHumansReady && totalPlayers >= 3;
  const myPlayer = room?.players.find(p => p.id === playerId);

  if (view === 'waiting' && room) {
    const botIds = new Set(room.bots.map(b => b.id));
    const humanPlayersList = room.players.filter(p => !botIds.has(p.id));
    const botPlayersList = room.players.filter(p => botIds.has(p.id));
    const isFull = room.players.length >= 6;

    return (
      <div className={styles.container}>
        <h1 className={styles.title}>{t.lobby.title}</h1>
        <div className={styles.roomInfo}>
          <span className={styles.label}>{t.waiting.roomCodeLabel}</span>
          <span className={styles.code}>{roomCode}</span>
        </div>

        {/* Compteur joueurs */}
        <p className={styles.playerCountInfo}>
          {t.waiting.playerCount(humanPlayersList.length, botPlayersList.length, 6)}
        </p>

        {/* Liste des joueurs humains */}
        <div className={styles.playerList}>
          {humanPlayersList.map(p => (
            <div key={p.id} className={`${styles.playerRow} ${styles[p.color]}`}>
              <span className={styles.colorDot} style={{ background: colorMap[p.color] }} />
              <span className={styles.playerName}>{p.pseudo}</span>
              {p.id === room.hostId && <span className={styles.badge}>{t.waiting.hostBadge}</span>}
              <span className={`${styles.readyBadge} ${p.isReady ? styles.ready : styles.notReady}`}>
                {p.isReady ? t.waiting.readyBadge : t.waiting.notReadyBadge}
              </span>
            </div>
          ))}
        </div>

        {/* Section bots */}
        {(botPlayersList.length > 0 || isHost) && (
          <div className={styles.botsSection}>
            <div className={styles.botsSectionTitle}>{t.waiting.botsTitle}</div>

            {/* Bots existants */}
            {botPlayersList.map(p => {
              const botSlot = room.bots.find(b => b.id === p.id);
              return (
                <div key={p.id} className={styles.botRow}>
                  <span className={styles.botEmoji}>{botSlot ? BOT_PROFILES_INFO[botSlot.profile].emoji : '🤖'}</span>
                  <span className={styles.botName}>{p.pseudo}</span>
                  <span className={styles.botProfile}>{botSlot?.profile}</span>
                  {isHost && (
                    <button
                      className={styles.removeBotBtn}
                      onClick={() => handleRemoveBot(p.id)}
                      title="Retirer ce bot"
                    >
                      {t.waiting.removeBotLabel}
                    </button>
                  )}
                </div>
              );
            })}

            {/* Ajouter un bot (hôte uniquement, si pas plein) */}
            {isHost && !isFull && (
              <div className={styles.addBotRow}>
                <select
                  className={styles.botSelect}
                  value={addBotProfile}
                  onChange={e => setAddBotProfile(e.target.value as BotProfile)}
                >
                  {Object.values(BOT_PROFILES_INFO).map(p => (
                    <option key={p.profile} value={p.profile}>
                      {p.emoji} {p.name} — {p.profile}
                    </option>
                  ))}
                </select>
                <button className={styles.addBotBtn} onClick={handleAddBot}>
                  {t.waiting.addBotLabel}
                </button>
              </div>
            )}
          </div>
        )}

        <div className={styles.info}>
          {room.players.length < 3 && <p>{t.waiting.waitingPlayers(room.players.length)}</p>}
        </div>

        {/* Options de partie — visibles uniquement pour l'hôte */}
        {/* [HIDDEN] Pavé d'options masqué — colorRule activé par défaut */}
        <div style={{ display: 'none' }}>
        {isHost && (
          <div className={styles.optionsBox}>
            <div className={styles.optionsTitle}>{t.waiting.optionsTitle}</div>
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
                  {t.waiting.optionColorRuleTitle(
                    t.common.green,
                    t.common.red,
                  )}
                </span>
                <span className={styles.optionDesc}>
                  {t.waiting.optionColorRuleDesc}
                </span>
              </div>
            </label>
          </div>
        )}
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actions}>
          <button
            className={`${styles.btn} ${myPlayer?.isReady ? styles.btnSecondary : styles.btnPrimary}`}
            onClick={handleReady}
          >
            {myPlayer?.isReady ? t.waiting.btnCancelReady : t.waiting.btnReady}
          </button>

          {canStart && (
            <button className={`${styles.btn} ${styles.btnStart}`} onClick={handleStart}>
              {t.waiting.btnStart}
            </button>
          )}
        </div>
      </div>
    );
  }

  if (view === 'solo_setup') {
    return (
      <div className={styles.container}>
        <h1 className={styles.title}>YUMI</h1>
        <SoloSetup
          pseudo={pseudoInput.trim()}
          onConfirm={handleSoloConfirm}
          onCancel={() => { setView('home'); setSoloError(''); }}
          error={soloError}
        />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Toggle langue */}
      <button className={styles.langToggle} onClick={toggleLang} title="Switch language">
        {lang === 'fr' ? '🇬🇧 EN' : '🇫🇷 FR'}
      </button>

      {/* Bouton Règles du jeu (mode Flux uniquement) */}
      <div style={{
        position: 'absolute',
        top: '1.25rem',
        left: '1.25rem',
        display: 'flex',
        gap: '0.5rem',
        zIndex: 10,
      }}>
        <button
          className={styles.tutorialBtn}
          style={{ borderColor: '#38bdf8', color: '#38bdf8' }}
          onClick={() => setShowFluxTutorial(true)}
        >
          {t.fluxTutorial.btnOpen}
        </button>
      </div>

      {/* Modales tutoriels */}
      {showTutorial && <Tutorial onClose={() => setShowTutorial(false)} />}
      {showFluxTutorial && <FluxTutorial onClose={() => setShowFluxTutorial(false)} />}

      <h1 className={styles.title}>{t.lobby.title}</h1>
      <p className={styles.subtitle}>{t.lobby.subtitle}</p>

      <div className={styles.form}>
        <input
          className={styles.input}
          type="text"
          placeholder={t.lobby.pseudoPlaceholder}
          value={pseudoInput}
          onChange={e => setPseudoInput(e.target.value)}
          maxLength={20}
          onKeyDown={e => e.key === 'Enter' && handleCreate()}
        />

        {/* Sélecteur de mode — masqué, Flux par défaut */}
        <div style={{ display: 'none' }} className={styles.modeSelector}>
          <button
            className={`${styles.modeBtn} ${gameMode === 'classic' ? styles.modeBtnActive : ''}`}
            onClick={() => setGameMode('classic')}
          >
            🎴 Classique
          </button>
          <button
            className={`${styles.modeBtn} ${gameMode === 'flux' ? styles.modeBtnActive : ''}`}
            onClick={() => setGameMode('flux')}
          >
            🔄 Flux
          </button>
        </div>

        <button className={`${styles.btn} ${styles.btnSolo}`} onClick={handleSoloClick}>
          {t.lobby.btnSolo}
        </button>

        <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleCreate}>
          {t.lobby.btnCreate}
        </button>

        <div className={styles.divider}>{t.lobby.dividerJoin}</div>

        <input
          className={styles.input}
          type="text"
          placeholder={t.lobby.codePlaceholder}
          value={codeInput}
          onChange={e => setCodeInput(e.target.value.toUpperCase())}
          maxLength={6}
        />

        <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={handleJoin}>
          {t.lobby.btnJoin}
        </button>

        {error && <p className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}

const colorMap: Record<string, string> = {
  red: '#ef4444',
  blue: '#3b82f6',
  green: '#22c55e',
  yellow: '#eab308',
  purple: '#a855f7',
  orange: '#f97316',
};
