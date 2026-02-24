-- ══════════════════════════════════════════════════════════════════════════════
-- 005_phase1_schema.sql  —  Wallets, Budgetten, Transactie-uitbreidingen
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Wallets ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  type         TEXT NOT NULL DEFAULT 'checking'
                 CHECK (type IN ('checking','savings','credit','cash','shared')),
  balance      NUMERIC(12,2) NOT NULL DEFAULT 0,   -- startbalans
  color        TEXT NOT NULL DEFAULT '#6366f1',
  icon         TEXT NOT NULL DEFAULT '💳',
  is_default   BOOLEAN NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets (user_id);

-- ── Budgetten ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS budgets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category     TEXT NOT NULL,
  amount       NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  period       TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly','monthly')),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, category, period)
);

-- ── Transacties uitbreiden ────────────────────────────────────────────────────
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS wallet_id    UUID REFERENCES wallets(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS subcategory  TEXT,
  ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS transfer_to  UUID REFERENCES wallets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON transactions (wallet_id);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE wallets  ENABLE ROW LEVEL SECURITY;
ALTER TABLE budgets  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wallets_select" ON wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "wallets_insert" ON wallets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "wallets_update" ON wallets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "wallets_delete" ON wallets FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "budgets_select" ON budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "budgets_insert" ON budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "budgets_update" ON budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "budgets_delete" ON budgets FOR DELETE USING (auth.uid() = user_id);
