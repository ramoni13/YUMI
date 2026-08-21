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
    console.log(`[Socket][${socket.id}] Événement reçu: "${event}"`, args.length ? (JSON.stringify(args[0]) ?? String(args[0])).slice(0, 120) : '');
  });
});

httpServer.listen(PORT, () => {
  console.log(`✅ Serveur YUMI démarré sur http://localhost:${PORT}`);
});
