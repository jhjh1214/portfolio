-- Portfolio backend schema (SQLite / Cloudflare D1). Idempotent: safe to run again.
-- Everything is enforced by the API code; there is no direct database access from the browser.

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT '',
  theme        TEXT,
  mode         TEXT,
  progress     TEXT NOT NULL DEFAULT '{}',
  created_at   INTEGER NOT NULL
);

-- One live one-time code per email. Only a salted hash is stored.
CREATE TABLE IF NOT EXISTS otp_codes (
  email        TEXT PRIMARY KEY,
  code_hash    TEXT NOT NULL,
  expires_at   INTEGER NOT NULL,
  attempts     INTEGER NOT NULL DEFAULT 0,
  display_name TEXT
);

-- Session tokens are random 256-bit values; only their SHA-256 is stored.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  mfa        INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);

-- The owner's authenticator secret, encrypted at rest with a key derived from APP_SECRET.
CREATE TABLE IF NOT EXISTS owner_totp (
  user_id    TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  secret_enc TEXT NOT NULL,
  verified   INTEGER NOT NULL DEFAULT 0,
  last_step  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS site_content (
  id         TEXT PRIMARY KEY CHECK (id = 'main'),
  data       TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  user_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  whatsapp   TEXT,
  body       TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  read_at    INTEGER
);
CREATE INDEX IF NOT EXISTS messages_created ON messages(created_at DESC);

-- Uploaded photos as base64 text (D1 rows are limited to ~2 MB, so uploads are capped well below that).
CREATE TABLE IF NOT EXISTS media (
  id         TEXT PRIMARY KEY,
  mime       TEXT NOT NULL,
  data_b64   TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key      TEXT PRIMARY KEY,
  n        INTEGER NOT NULL,
  reset_at INTEGER NOT NULL
);
