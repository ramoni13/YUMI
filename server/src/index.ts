import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { registerSocketHandlers } from './socket/socketHandlers';

const PORT = process.env.PORT ?? 3001;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  // Timeouts généreux pour éviter les déconnexions "transport error"
  pingTimeout: 30000,        // 30s sans réponse avant de couper (défaut: 20s)
  pingInterval: 10000,       // Ping toutes les 10s (défaut: 25s)
  // NE PAS forcer les transports côté serveur :
  // Render.com (et la plupart des reverse proxies) nécessite le handshake
  // HTTP polling initial avant l'upgrade WebSocket.
  // Le serveur doit accepter les deux sans ordre imposé.
  // transports: ['websocket', 'polling'],  ← retiré volontairement
  // Taille max des messages (utile si les états de jeu sont volumineux)
  maxHttpBufferSize: 1e6,    // 1 MB
  // Upgrade automatique polling → websocket (comportement par défaut, explicite ici)
  allowUpgrades: true,
  upgradeTimeout: 10000,
});

// Route de santé
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connexion WebSocket
io.on('connection', (socket) => {
  console.log(`[Socket] Connexion : ${socket.id} | rooms: ${io.engine.clientsCount}`);
  registerSocketHandlers(io, socket);
  socket.on('disconnect', (reason) => {
    console.log(`[Socket] Déconnexion : ${socket.id} | raison: ${reason}`);
  });
  // Logger TOUS les événements reçus de ce socket
  socket.onAny((event, ...args) => {
    // Filtrer les fonctions (callbacks Socket.IO internes) pour ne logger que les vraies données
    const dataArgs = args.filter(a => typeof a !== 'function');
    const preview = dataArgs.length
      ? JSON.stringify(dataArgs[0]).slice(0, 120)
      : '(no data)';
    console.log(`[Socket][${socket.id}] Événement reçu: "${event}"`, preview);
  });
});

httpServer.listen(PORT, () => {
  console.log(`✅ Serveur YUMI démarré sur http://localhost:${PORT}`);
});
