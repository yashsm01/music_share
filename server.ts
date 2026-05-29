import { config } from 'dotenv';
config({ path: '.env.local' });

import { createServer } from 'node:http';
import next from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { registerSocketHandlers } from './src/server/socket-handlers';
import connectDB from './src/lib/mongodb';

const dev = process.env.NODE_ENV !== 'production';
const hostname = dev ? 'localhost' : '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(async () => {
  // Connect to MongoDB
  try {
    await connectDB();
  } catch (err) {
    console.error('❌ Failed to connect to MongoDB:', err);
    console.log('⚠️  Server will continue without database — some features may not work');
  }

  const httpServer = createServer(handler);

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  // Register all socket event handlers
  registerSocketHandlers(io);

  httpServer.listen(port, () => {
    console.log(`
  ╔═══════════════════════════════════════════╗
  ║                                           ║
  ║   🎵  SyncTunes Server Ready!             ║
  ║                                           ║
  ║   ➜  http://${hostname}:${port}              ║
  ║   ➜  Socket.IO attached                   ║
  ║   ➜  Mode: ${dev ? 'Development' : 'Production'}               ║
  ║                                           ║
  ╚═══════════════════════════════════════════╝
    `);
  });
});
