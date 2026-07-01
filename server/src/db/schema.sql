-- Nipo Chat schema (SQLite)

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  username      TEXT    NOT NULL UNIQUE,            -- unique login handle (lowercased)
  nickname      TEXT    NOT NULL,                   -- user-editable display name
  password_hash TEXT    NOT NULL,
  avatar_url    TEXT,
  created_at    INTEGER NOT NULL,                   -- epoch ms
  last_seen_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

-- Canonical 1-on-1 conversation: user_lo < user_hi enforces a single row per pair.
CREATE TABLE IF NOT EXISTS conversations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_lo    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_hi    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  UNIQUE (user_lo, user_hi),
  CHECK (user_lo < user_hi)
);

CREATE TABLE IF NOT EXISTS messages (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id INTEGER NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type            TEXT    NOT NULL DEFAULT 'text',  -- text | image | file | voice
  body            TEXT,                             -- text content / caption
  media_url       TEXT,                             -- attachment url (image/file/voice)
  media_meta      TEXT,                             -- JSON: { name, size, mime, durationMs, width, height }
  created_at      INTEGER NOT NULL,
  read_at         INTEGER,                          -- epoch ms when peer read it
  deleted_at      INTEGER,                          -- soft delete timestamp
  deleted_scope   TEXT                              -- 'self' | 'all'  (self stores who via message_hides)
);

CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages (conversation_id, id);

-- "Delete for me" — per-user hidden messages (delete-for-all uses messages.deleted_scope='all').
CREATE TABLE IF NOT EXISTS message_hides (
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (message_id, user_id)
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint   TEXT    NOT NULL UNIQUE,
  p256dh     TEXT    NOT NULL,
  auth       TEXT    NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions (user_id);
