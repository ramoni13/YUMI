# YUMI — Application Web Multijoueur

Jeu de plis en temps réel pour 3 à 6 joueurs.

## Structure du projet

```
yumi-app/
├── shared/          # Types TypeScript partagés client/serveur
├── server/          # Backend Node.js + Express + Socket.io
└── client/          # Frontend React + Vite + Zustand
```

## Démarrage

> ⚠️ **Le serveur DOIT être lancé en premier**, sinon le client affiche `Socket NON connecté`.

### 1. Installer les dépendances

```powershell
cd server
npm install
```

```powershell
cd ../client
npm install
```

### 2. Compiler et lancer le serveur (Terminal 1)

```powershell
cd server
npm run dev
# = tsc (compile TypeScript) + node dist/server/src/index.js
# ✅ Serveur YUMI démarré sur http://localhost:3001
```

> Laissez ce terminal ouvert. Si vous voyez une erreur TypeScript, corrigez-la avant de continuer.

### 3. Lancer le client (Terminal 2 — nouveau terminal)

```powershell
cd client
npx vite --port 5173
# ➜ Local: http://localhost:5173
```

### 4. Jouer

Ouvrir **http://localhost:5173** dans plusieurs onglets ou navigateurs.

---

## Architecture

| Couche | Technologie | Rôle |
|--------|-------------|------|
| Frontend | React 18 + Vite 8 | Interface utilisateur |
| État client | Zustand | Store global réactif |
| Temps réel | Socket.io-client | Communication WebSocket |
| Backend | Node.js + Express | Serveur HTTP + API |
| Temps réel | Socket.io | WebSocket serveur |
| Logique jeu | TypeScript pur | Moteur de jeu |
| Types | TypeScript partagé | `shared/types.ts` |

## Fichiers clés

### Serveur (`server/src/`)
| Fichier | Rôle |
|---------|------|
| `game/deck.ts` | Génération et mélange des paquets |
| `game/resolver.ts` | Algorithme de résolution des plis |
| `game/scoring.ts` | Calcul des scores, effets spéciaux |
| `game/engine.ts` | Moteur de jeu principal (machine à états) |
| `rooms/roomManager.ts` | Gestion des salles en mémoire |
| `socket/socketHandlers.ts` | Handlers WebSocket |
| `index.ts` | Point d'entrée serveur |

### Client (`client/src/`)
| Fichier | Rôle |
|---------|------|
| `store/gameStore.ts` | État global Zustand |
| `hooks/useSocket.ts` | Connexion et événements Socket.io |
| `components/Lobby/` | Écran d'accueil et salle d'attente |
| `components/Board/` | Table de jeu principale |
| `components/Card/` | Cartes joueurs et Score |
| `components/Player/` | Main du joueur et adversaires |
| `components/Yumi/` | Bouton YUMI ! |
| `components/Scores/` | Écran de fin de partie |

## Règles du jeu

Voir `specs/03_game_rules.md` pour les règles complètes.

## Auteur

Cédric Martinez
