-- ══════════════════════════════════════════════════════════════════════════════
-- 003_seed_tips_catalog.sql
-- 25 tip-templates verdeeld over alle types
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO tips_catalog (tip_id, type, template_key, priority, cooldown_days, is_active) VALUES

-- ── Quick wins (opzegbaar + niet noodzakelijk) ─────────────────────────────
('qw_01', 'quick_win', 'highest_cancellable',         9, 14, true),
('qw_02', 'quick_win', 'streaming_bundle',            7, 21, true),
('qw_03', 'quick_win', 'gym_unused',                  8, 30, true),
('qw_04', 'quick_win', 'software_subscription',       7, 21, true),
('qw_05', 'quick_win', 'magazine_subscription',       6, 14, true),
('qw_06', 'quick_win', 'gaming_subscription',         7, 14, true),
('qw_07', 'quick_win', 'cloud_storage',               6, 30, true),
('qw_08', 'quick_win', 'news_app',                    5, 14, true),

-- ── Contract soon (binnen 30 dagen aflopend) ───────────────────────────────
('ct_01', 'contract',  'contract_expiring_soon',      10, 7,  true),
('ct_02', 'contract',  'energy_contract',             9,  14, true),
('ct_03', 'contract',  'telecom_contract',            9,  14, true),
('ct_04', 'contract',  'insurance_renewal',           8,  7,  true),
('ct_05', 'contract',  'housing_contract',            7,  30, true),

-- ── Category heavy (>35% van inkomen in één categorie) ────────────────────
('ca_01', 'category_heavy', 'housing_over_threshold', 8,  14, true),
('ca_02', 'category_heavy', 'subscriptions_cluster',  8,  14, true),
('ca_03', 'category_heavy', 'transport_heavy',        7,  21, true),
('ca_04', 'category_heavy', 'insurance_heavy',        7,  21, true),
('ca_05', 'category_heavy', 'food_heavy',             6,  14, true),

-- ── Annual visibility (jaarlijkse kosten zichtbaar maken) ─────────────────
('av_01', 'annual_visibility', 'highest_annual',       8,  30, true),
('av_02', 'annual_visibility', 'annual_bundle_check',  7,  30, true),
('av_03', 'annual_visibility', 'annual_insurance',     7,  60, true),
('av_04', 'annual_visibility', 'annual_subscription',  6,  30, true),

-- ── Scenario (combinatie opzegbare posten) ─────────────────────────────────
('sc_01', 'scenario', 'top2_cancellable',              9,  7,  true),
('sc_02', 'scenario', 'all_nicetohaave',               8,  14, true),
('sc_03', 'scenario', 'streaming_only',                7,  14, true)

ON CONFLICT (tip_id) DO NOTHING;
