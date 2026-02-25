-- Phase 2: Savings goals + Subscriptions
-- Run via: /opt/homebrew/opt/libpq/bin/psql "$DATABASE_URL" -f supabase/migrations/006_phase2_schema.sql

-- ── Savings goals ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS savings_goals (
  id             UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name           TEXT         NOT NULL,
  icon           TEXT         NOT NULL DEFAULT '🎯',
  color          TEXT         NOT NULL DEFAULT '#6366f1',
  target_amount  NUMERIC(12,2) NOT NULL CHECK (target_amount > 0),
  current_amount NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (current_amount >= 0),
  deadline       DATE,
  created_at     TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE savings_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sg_all" ON savings_goals USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ── Subscriptions ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID         NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name             TEXT         NOT NULL,
  icon             TEXT         NOT NULL DEFAULT '📱',
  color            TEXT         NOT NULL DEFAULT '#6366f1',
  amount           NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  billing_cycle    TEXT         NOT NULL DEFAULT 'monthly'
                   CHECK (billing_cycle IN ('weekly','monthly','quarterly','yearly')),
  next_billing_date DATE,
  category         TEXT         NOT NULL DEFAULT 'Abonnementen',
  is_active        BOOLEAN      NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sub_all" ON subscriptions USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
