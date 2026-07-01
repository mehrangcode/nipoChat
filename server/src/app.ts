import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { authRoutes } from './routes/auth.routes';
import { conversationsRoutes } from './routes/conversations.routes';
import { featuresRoutes } from './routes/features.routes';
import { messagesRoutes } from './routes/messages.routes';
import { pushRoutes } from './routes/push.routes';
import { uploadsRoutes } from './routes/uploads.routes';
import { usersRoutes } from './routes/users.routes';

export function createApp() {
  const app = express();

  app.use(
    helmet({
      // Allow the SPA/service worker + cross-origin media from this server.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
  app.use(cors({ origin: env.clientOrigins, credentials: true }));
  app.use(express.json({ limit: '1mb' }));

  // Uploaded media (served with permissive CORS via helmet setting above).
  app.use('/uploads', express.static(env.uploadsDir));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/conversations', conversationsRoutes);
  app.use('/api/messages', messagesRoutes);
  app.use('/api/uploads', uploadsRoutes);
  app.use('/api/push', pushRoutes);
  app.use('/api/features', featuresRoutes);

  app.use(errorHandler);
  return app;
}
