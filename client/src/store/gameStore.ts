import { create } from 'zustand';
import type {
  PublicGameState,
  PublicRoom,
  PrivateInfo,
  FinalScore,
  GameEvent,
} from '../types';

interface GameStore {
  // Connexion
  playerId: string | null;
  roomCode: string | null;
  pseudo: string | null;

  // Salle
  room: PublicRoom | null;

  // État du jeu
  gameState: PublicGameState | null;

  // Infos privées
  privateInfo: PrivateInfo | null;

  // Notifications
  lastReveal: Record<string, number> | null;

  // Historique des événements
  eventLog: GameEvent[];
  _eventCounter: number;

  // Actions
  setPlayerId: (id: string) => void;
  setRoomCode: (code: string) => void;
  setPseudo: (pseudo: string) => void;
  setRoom: (room: PublicRoom) => void;
  setGameState: (state: PublicGameState) => void;
  // Fusionne les infos privées (préserve mysteryCard/Owner entre les broadcasts)
  mergePrivateInfo: (info: PrivateInfo) => void;
  setLastReveal: (cards: Record<string, number> | null) => void;
  clearLastReveal: () => void;
  pushEvent: (event: Omit<GameEvent, 'id'>) => void;
  clearEventLog: () => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  playerId: null,
  roomCode: null,
  pseudo: null,
  room: null,
  gameState: null,
  privateInfo: null,
  lastReveal: null,
  eventLog: [],
  _eventCounter: 0,

  setPlayerId: (id) => set({ playerId: id }),
  setRoomCode: (code) => set({ roomCode: code }),
  setPseudo: (pseudo) => set({ pseudo }),
  setRoom: (room) => set({ room }),
  setGameState: (gameState) => set({ gameState }),
  mergePrivateInfo: (info) =>
    set((state) => ({
      privateInfo: {
        // Conserver les champs existants, écraser uniquement ceux reçus
        ...state.privateInfo,
        ...info,
        // Ne pas effacer mysteryCard/Owner si le nouveau broadcast ne les contient pas
        mysteryCard: info.mysteryCard ?? state.privateInfo?.mysteryCard,
        mysteryCardOwner: info.mysteryCardOwner ?? state.privateInfo?.mysteryCardOwner,
        missingCardValue: info.missingCardValue ?? state.privateInfo?.missingCardValue,
      },
    })),
  setLastReveal: (lastReveal) => set({ lastReveal }),
  clearLastReveal: () => set({ lastReveal: null }),
  pushEvent: (event) =>
    set((state) => ({
      _eventCounter: state._eventCounter + 1,
      eventLog: [
        ...state.eventLog,
        { ...event, id: state._eventCounter + 1 },
      ],
    })),
  clearEventLog: () => set({ eventLog: [], _eventCounter: 0 }),
  reset: () =>
    set({
      playerId: null,
      roomCode: null,
      pseudo: null,
      room: null,
      gameState: null,
      privateInfo: null,
      lastReveal: null,
      eventLog: [],
      _eventCounter: 0,
    }),
}));
