import dotenv from 'dotenv';
import path from 'path';

// Load server/.env regardless of the process cwd.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined || value === '') {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function bool(name: string, fallback = false): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(raw.trim().toLowerCase());
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigins: (process.env.CLIENT_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  jwtSecret: required('JWT_SECRET', 'dev-insecure-secret-change-me'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',

  vapid: {
    publicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    privateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    subject: process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
  },

  features: {
    voiceCall: bool('FEATURE_VOICE_CALL', true),
    videoCall: bool('FEATURE_VIDEO_CALL', true),
  },

  maxUploadBytes: Number(process.env.MAX_UPLOAD_BYTES ?? 15 * 1024 * 1024),

  dataDir: path.resolve(__dirname, '../../data'),
  uploadsDir: path.resolve(__dirname, '../../data/uploads'),
  dbFile: path.resolve(__dirname, '../../data/nipo-chat.sqlite'),
};

export const pushEnabled = Boolean(env.vapid.publicKey && env.vapid.privateKey);
