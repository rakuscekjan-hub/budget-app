-- ══════════════════════════════════════════════════════════════════════════════
-- 002_rls_policies.sql
-- Row Level Security — elke user ziet en bewerkt alleen eigen data
-- ══════════════════════════════════════════════════════════════════════════════

-- RLS inschakelen
ALTER TABLE profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE incomes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses       ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights_state ENABLE ROW LEVEL SECURITY;
-- tips_catalog is publiek leesbaar (geen RLS nodig)

-- ── Profiles ──────────────────────────────────────────────────────────────────

CREATE POLICY "profiles: select own"
  ON profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "profiles: insert own"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "profiles: update own"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── Incomes ───────────────────────────────────────────────────────────────────

CREATE POLICY "incomes: select own"
  ON incomes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "incomes: insert own"
  ON incomes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "incomes: update own"
  ON incomes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "incomes: delete own"
  ON incomes FOR DELETE
  USING (auth.uid() = user_id);

-- ── Expenses ──────────────────────────────────────────────────────────────────

CREATE POLICY "expenses: select own"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "expenses: insert own"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses: update own"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "expenses: delete own"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- ── Generated tips ────────────────────────────────────────────────────────────

CREATE POLICY "generated_tips: select own"
  ON generated_tips FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "generated_tips: insert own"
  ON generated_tips FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "generated_tips: update own"
  ON generated_tips FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "generated_tips: delete own"
  ON generated_tips FOR DELETE
  USING (auth.uid() = user_id);

-- ── Insights state ────────────────────────────────────────────────────────────

CREATE POLICY "insights_state: select own"
  ON insights_state FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "insights_state: insert own"
  ON insights_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "insights_state: update own"
  ON insights_state FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "insights_state: upsert own"
  ON insights_state FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── Tips catalog (publiek leesbaar voor ingelogde users) ──────────────────────

ALTER TABLE tips_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tips_catalog: select authenticated"
  ON tips_catalog FOR SELECT
  TO authenticated
  USING (TRUE);
