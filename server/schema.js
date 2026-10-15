const { sql } = require('./db');

async function createSchema() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name   TEXT NOT NULL,
      email       TEXT UNIQUE NOT NULL,
      password    TEXT NOT NULL,
      role        TEXT NOT NULL DEFAULT 'user',
      kyc_status  TEXT NOT NULL DEFAULT 'pending',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Profile photo — URL for display, public id so the image can be deleted from Cloudinary
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`;
  await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_public_id TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      balance     NUMERIC(15,2) NOT NULL DEFAULT 50000.00,
      currency    TEXT NOT NULL DEFAULT 'USD',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS transactions (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      account_id    UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      merchant      TEXT NOT NULL,
      category      TEXT NOT NULL,
      amount        NUMERIC(15,2) NOT NULL,
      type          TEXT NOT NULL CHECK (type IN ('credit','debit')),
      icon          TEXT NOT NULL DEFAULT 'swap-horizontal-outline',
      note          TEXT,
      reference_id  TEXT UNIQUE NOT NULL,
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS cards (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      label       TEXT NOT NULL,
      number      TEXT NOT NULL,
      holder      TEXT NOT NULL,
      expiry      TEXT NOT NULL,
      color       TEXT NOT NULL DEFAULT '#4F46E5',
      card_type   TEXT NOT NULL DEFAULT 'visa',
      frozen      BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS otps (
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email       TEXT NOT NULL,
      code        TEXT NOT NULL,
      expires_at  TIMESTAMPTZ NOT NULL,
      used        BOOLEAN NOT NULL DEFAULT FALSE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS orders (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      account_id   UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
      items        JSONB NOT NULL,
      total        NUMERIC(15,2) NOT NULL,
      status       TEXT NOT NULL DEFAULT 'paid',
      reference_id TEXT UNIQUE NOT NULL,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Push tokens — one row per user device
  await sql`
    CREATE TABLE IF NOT EXISTS push_tokens (
      id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token      TEXT NOT NULL,
      platform   TEXT NOT NULL DEFAULT 'unknown',
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE(user_id)
    )
  `;

  // Messages — 2-way chat between users
  await sql`
    CREATE TABLE IF NOT EXISTS messages (
      id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sender_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body         TEXT NOT NULL CHECK (char_length(body) <= 100),
      read         BOOLEAN NOT NULL DEFAULT FALSE,
      created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;

  // Index for fast conversation lookup
  await sql`
    CREATE INDEX IF NOT EXISTS idx_messages_sender_recipient
    ON messages(sender_id, recipient_id)
  `;

  console.log('✅ Schema created / verified');
}

module.exports = { createSchema };