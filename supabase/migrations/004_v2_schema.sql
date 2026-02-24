-- ══════════════════════════════════════════════════════════════════════════════
-- 004_v2_schema.sql  —  Variabele uitgaven, Household, Push notificaties
-- Voer dit uit NA 001/002/003 (of setup_all.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Households ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS households (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 80),
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS household_members (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id    UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id         UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  invited_email   TEXT,
  role            TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','declined')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (household_id, user_id),
  CHECK (user_id IS NOT NULL OR invited_email IS NOT NULL)
);

-- ── Transactions (variabele uitgaven) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id    UUID REFERENCES households(id) ON DELETE SET NULL,
  name            TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  amount          NUMERIC(12,2) NOT NULL,
  type            TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense','income')),
  category        TEXT NOT NULL DEFAULT 'Overig',
  date            DATE NOT NULL DEFAULT CURRENT_DATE,
  notes           TEXT CHECK (char_length(notes) <= 500),
  imported        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_user_date  ON transactions (user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category   ON transactions (user_id, category);
CREATE INDEX IF NOT EXISTS idx_transactions_household  ON transactions (household_id);

-- ── Push subscriptions ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint      TEXT NOT NULL,
  p256dh        TEXT NOT NULL,
  auth_key      TEXT NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, endpoint)
);

-- ── RLS ───────────────────────────────────────────────────────────────────────
ALTER TABLE households         ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions       ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Households: alleen zien als je lid bent of de eigenaar
CREATE POLICY "households_select" ON households FOR SELECT
  USING (
    auth.uid() = created_by OR
    EXISTS (SELECT 1 FROM household_members m
            WHERE m.household_id = id AND m.user_id = auth.uid() AND m.status = 'active')
  );
CREATE POLICY "households_insert" ON households FOR INSERT
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "households_update" ON households FOR UPDATE
  USING (auth.uid() = created_by);
CREATE POLICY "households_delete" ON households FOR DELETE
  USING (auth.uid() = created_by);

-- Household members
CREATE POLICY "hm_select" ON household_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    invited_email = auth.email() OR
    EXISTS (SELECT 1 FROM households h WHERE h.id = household_id AND h.created_by = auth.uid())
  );
CREATE POLICY "hm_insert" ON household_members FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM households h WHERE h.id = household_id AND h.created_by = auth.uid())
  );
CREATE POLICY "hm_update" ON household_members FOR UPDATE
  USING (
    user_id = auth.uid() OR
    invited_email = auth.email() OR
    EXISTS (SELECT 1 FROM households h WHERE h.id = household_id AND h.created_by = auth.uid())
  );
CREATE POLICY "hm_delete" ON household_members FOR DELETE
  USING (
    user_id = auth.uid() OR
    EXISTS (SELECT 1 FROM households h WHERE h.id = household_id AND h.created_by = auth.uid())
  );

-- Transactions: eigen + huishouden
CREATE POLICY "tx_select" ON transactions FOR SELECT
  USING (
    user_id = auth.uid() OR
    (household_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM household_members m
      WHERE m.household_id = transactions.household_id
        AND m.user_id = auth.uid() AND m.status = 'active'
    ))
  );
CREATE POLICY "tx_insert" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tx_update" ON transactions FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "tx_delete" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- Push subscriptions
CREATE POLICY "push_select" ON push_subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "push_insert" ON push_subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "push_delete" ON push_subscriptions FOR DELETE USING (auth.uid() = user_id);
