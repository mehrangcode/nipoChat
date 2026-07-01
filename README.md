# Nipo Chat

A full-stack, RTL, PWA web chat app.

- **Backend**: Express + TypeScript + SQLite (`better-sqlite3`) + Socket.IO + JWT + Web Push
- **Frontend**: React + TypeScript + Vite + PWA (`vite-plugin-pwa`, custom service worker)
- **Features**: 1-on-1 chat, presence (who's online), message delete, user search, offline
  reading (IndexedDB + service worker), push notifications, dark/light themes, indigo palette,
  RTL layout, and a **feature-flagged** voice/video call skeleton (WebRTC over Socket.IO).

## Quick start

```bash
# 1. Install everything (npm workspaces)
npm install

# 2. Generate VAPID keys for Web Push and create server/.env
npm run vapid          # prints keys
cp server/.env.example server/.env
#   -> paste VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY into server/.env
#   -> set a strong JWT_SECRET

# 3. Run both apps
npm run dev            # server :4000, client :5173
```

Open <http://localhost:5173>. Sign up (the app shows a generated password once — copy it),
then log in. Use two browser profiles to chat between two users.

## Feature flags (voice / video calls)

Calls are isolated and toggled from the backend. In `server/.env`:

```
FEATURE_VOICE_CALL=true
FEATURE_VIDEO_CALL=true
```

Restart the server. `GET /api/features` reflects the state and the client hides/shows call
UI accordingly. When both are `false`, no signaling handlers are registered server-side and
no WebRTC code runs on the client.

## Push notifications — notes

- Requires **HTTPS** in production. `localhost` is exempt, so dev works over `http://localhost`.
- Permission is requested from a **user gesture** (button in Settings), never on page load.
- **iOS Safari** (16.4+) only delivers push to an **installed** PWA (Add to Home Screen).
- Notifications are only sent when the recipient has **no active socket** (i.e. is offline).

## Project layout

```
server/   Express API + Socket.IO + SQLite
client/   React PWA
```

## Limitations / scaling path

- Calls use public STUN only (no TURN) — may fail across strict NATs. Skeleton scope.
- SQLite + local `server/data/uploads/` suits single-node/dev. For scale, move to Postgres and
  object storage (S3/GCS), and run Socket.IO with a Redis adapter.
