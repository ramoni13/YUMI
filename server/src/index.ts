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
  // Augmenter les timeouts pour éviter les déconnexions "transport error" sur réseau instable
  pingTimeout: 30000,   // 30s avant de considérer la connexion morte (défaut: 20s)
  pingInterval: 10000,  // Ping toutes les 10s (défaut: 25s)
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
