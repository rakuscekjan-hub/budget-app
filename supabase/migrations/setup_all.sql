-- BudgetApp: alle migrations in één keer
-- Plak dit in Supabase SQL Editor en klik Run

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TYPE frequency_type AS ENUM ('weekly','biweekly','four_weekly','monthly','yearly');
CREATE TYPE tip_type AS ENUM ('quick_win','contract','category_heavy','annual_visibility','scenario');
CREATE TYPE tip_status AS ENUM ('new','seen','done','dismissed','snoozed');

CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS incomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  frequency frequency_type NOT NULL DEFAULT 'monthly',
  start_date DATE,
  notes TEXT CHECK (char_length(notes) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  frequency frequency_type NOT NULL DEFAULT 'monthly',
  category TEXT NOT NULL DEFAULT 'Overig',
  necessary BOOLEAN NOT NULL DEFAULT TRUE,
  cancellable BOOLEAN NOT NULL DEFAULT FALSE,
  contract_end_date DATE,
  merchant_hint TEXT CHECK (char_length(merchant_hint) <= 200),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT CHECK (char_length(notes) <= 500),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tips_catalog (
  tip_id TEXT PRIMARY KEY,
  type tip_type NOT NULL,
  template_key TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  cooldown_days INTEGER NOT NULL DEFAULT 7 CHECK (cooldown_days >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS generated_tips (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tip_id TEXT NOT NULL REFERENCES tips_catalog(tip_id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  estimated_saving_monthly NUMERIC(10,2) NOT NULL DEFAULT 0,
  action_cta TEXT NOT NULL,
  status tip_status NOT NULL DEFAULT 'new',
  expense_id UUID REFERENCES expenses(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

CREATE TABLE IF NOT EXISTS insights_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_tip_at DATE,
  tip_history JSONB NOT NULL DEFAULT '[]',
  cooldowns JSONB NOT NULL DEFAULT '{}'
);

CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);

CREATE POLICY "incomes_select" ON incomes FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "incomes_insert" ON incomes FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "incomes_update" ON incomes FOR UPDATE USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "incomes_delete" ON incomes FOR DELETE USING (auth.uid()=user_id);

CREATE POLICY "expenses_select" ON expenses FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "expenses_insert" ON expenses FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "expenses_update" ON expenses FOR UPDATE USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "expenses_delete" ON expenses FOR DELETE USING (auth.uid()=user_id);

CREATE POLICY "generated_tips_select" ON generated_tips FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "generated_tips_insert" ON generated_tips FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "generated_tips_update" ON generated_tips FOR UPDATE USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "generated_tips_delete" ON generated_tips FOR DELETE USING (auth.uid()=user_id);

CREATE POLICY "insights_state_select" ON insights_state FOR SELECT USING (auth.uid()=user_id);
CREATE POLICY "insights_state_insert" ON insights_state FOR INSERT WITH CHECK (auth.uid()=user_id);
CREATE POLICY "insights_state_update" ON insights_state FOR UPDATE USING (auth.uid()=user_id) WITH CHECK (auth.uid()=user_id);
CREATE POLICY "tips_catalog_select" ON tips_catalog FOR SELECT TO authenticated USING (TRUE);

CREATE INDEX IF NOT EXISTS idx_incomes_user ON incomes(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_active ON expenses(user_id,is_active);
CREATE INDEX IF NOT EXISTS idx_tips_user_date ON generated_tips(user_id,date);

INSERT INTO tips_catalog VALUES
('qw_01','quick_win','highest_cancellable',9,14,true),
('qw_02','quick_win','streaming_bundle',7,21,true),
('qw_03','quick_win','gym_unused',8,30,true),
('qw_04','quick_win','software_subscription',7,21,true),
('qw_05','quick_win','magazine_subscription',6,14,true),
('qw_06','quick_win','gaming_subscription',7,14,true),
('qw_07','quick_win','cloud_storage',6,30,true),
('qw_08','quick_win','news_app',5,14,true),
('ct_01','contract','contract_expiring_soon',10,7,true),
('ct_02','contract','energy_contract',9,14,true),
('ct_03','contract','telecom_contract',9,14,true),
('ct_04','contract','insurance_renewal',8,7,true),
('ct_05','contract','housing_contract',7,30,true),
('ca_01','category_heavy','housing_over_threshold',8,14,true),
('ca_02','category_heavy','subscriptions_cluster',8,14,true),
('ca_03','category_heavy','transport_heavy',7,21,true),
('ca_04','category_heavy','insurance_heavy',7,21,true),
('ca_05','category_heavy','food_heavy',6,14,true),
('av_01','annual_visibility','highest_annual',8,30,true),
('av_02','annual_visibility','annual_bundle_check',7,30,true),
('av_03','annual_visibility','annual_insurance',7,60,true),
('av_04','annual_visibility','annual_subscription',6,30,true),
('sc_01','scenario','top2_cancellable',9,7,true),
('sc_02','scenario','all_nicetohave',8,14,true),
('sc_03','scenario','streaming_only',7,14,true)
ON CONFLICT (tip_id) DO NOTHING;
