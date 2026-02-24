-- ══════════════════════════════════════════════════════════════════════════════
-- 001_initial_schema.sql
-- BudgetApp — initieel Postgres schema
-- ══════════════════════════════════════════════════════════════════════════════

-- Extensies
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Enums ─────────────────────────────────────────────────────────────────────

CREATE TYPE frequency_type AS ENUM (
  'weekly', 'biweekly', 'four_weekly', 'monthly', 'yearly'
);

CREATE TYPE tip_type AS ENUM (
  'quick_win', 'contract', 'category_heavy', 'annual_visibility', 'scenario'
);

CREATE TYPE tip_status AS ENUM (
  'new', 'seen', 'done', 'dismissed', 'snoozed'
);

-- ── Profiles ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS profiles (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name          TEXT,
  onboarding_completed  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ── Incomes ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS incomes (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  amount      NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  frequency   frequency_type NOT NULL DEFAULT 'monthly',
  start_date  DATE,
  notes       TEXT CHECK (char_length(notes) <= 500),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_incomes_user_id ON incomes (user_id);

-- ── Expenses ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS expenses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  amount              NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  frequency           frequency_type NOT NULL DEFAULT 'monthly',
  category            TEXT NOT NULL DEFAULT 'Overig',
  necessary           BOOLEAN NOT NULL DEFAULT TRUE,
  cancellable         BOOLEAN NOT NULL DEFAULT FALSE,
  contract_end_date   DATE,
  merchant_hint       TEXT CHECK (char_length(merchant_hint) <= 200),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  notes               TEXT CHECK (char_length(notes) <= 500),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_expenses_user_id      ON expenses (user_id);
CREATE INDEX idx_expenses_category     ON expenses (user_id, category);
CREATE INDEX idx_expenses_is_active    ON expenses (user_id, is_active);
CREATE INDEX idx_expenses_cancellable  ON expenses (user_id, cancellable);

-- ── Tips catalog ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS tips_catalog (
  tip_id        TEXT PRIMARY KEY,
  type          tip_type NOT NULL,
  template_key  TEXT NOT NULL,
  priority      INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  cooldown_days INTEGER NOT NULL DEFAULT 7  CHECK (cooldown_days >= 0),
  is_active     BOOLEAN NOT NULL DEFAULT TRUE
);

-- ── Generated tips ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS generated_tips (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                      DATE NOT NULL,
  tip_id                    TEXT NOT NULL REFERENCES tips_catalog(tip_id),
  title                     TEXT NOT NULL,
  message                   TEXT NOT NULL,
  estimated_saving_monthly  NUMERIC(10, 2) NOT NULL DEFAULT 0,
  action_cta                TEXT NOT NULL,
  status                    tip_status NOT NULL DEFAULT 'new',
  expense_id                UUID REFERENCES expenses(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE INDEX idx_generated_tips_user_date ON generated_tips (user_id, date);

-- ── Insights state ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS insights_state (
  user_id      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_tip_at  DATE,
  tip_history  JSONB NOT NULL DEFAULT '[]'::jsonb,
  cooldowns    JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- ── Updated_at trigger ────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
