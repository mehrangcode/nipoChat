import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { env } from '../config/env';
import { anyCallEnabled } from '../config/features';
import { authService } from '../services/auth.service';
import { registerCall } from './call.socket';
import { registerChat } from './chat.socket';
import { registerPresence } from './presence.socket';
import { setIo, userRoom } from './registry';
import { AppSocket } from './types';

export function initSockets(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: { origin: env.clientOrigins, credentials: true },
  });
  setIo(io);

  // Authenticate every socket via JWT provided in the handshake.
  io.use((socket, next) => {
    const token = (socket.handshake.auth as { token?: string })?.token;
    if (!token) return next(new Error('Authentication required.'));
    try {
      const payload = authService.verify(token);
      (socket as AppSocket).data = { userId: payload.uid, username: payload.username };
      next();
    } catch {
      next(new Error('Invalid or expired token.'));
    }
  });

  const callsOn = anyCallEnabled();

  io.on('connection', (socket) => {
    const s = socket as AppSocket;
    // Join a personal room so REST + other sockets can reach this user's devices.
    s.join(userRoom(s.data.userId));

    registerPresence(io, s);
    registerChat(s);

    // Call signaling is only wired when a call feature is enabled.
    if (callsOn) registerCall(s);
  });

  return io;
}
