// MECHANIC 6: FREEMIUM — energy keys, offers, revive.
// v1 has NO real money: "purchases" are simulated and clearly labeled.
// Hard rules: free/ad path always exists, paid never beats earned (cosmetic
// only), drop rates public, optional daily spend cap.

export const KEYS_MAX = 5
export const KEY_REGEN_MS = 30 * 60 * 1000 // 1 key per 30 minutes

export function regenKeys(keys, lastRegenAt, now = Date.now(), unlimited = false) {
  if (unlimited) return { keys: KEYS_MAX, lastRegenAt: now }
  if (keys >= KEYS_MAX) return { keys, lastRegenAt: now }
  const earned = Math.floor((now - lastRegenAt) / KEY_REGEN_MS)
  if (earned <= 0) return { keys, lastRegenAt }
  return {
    keys: Math.min(KEYS_MAX, keys + earned),
    lastRegenAt: keys + earned >= KEYS_MAX ? now : lastRegenAt + earned * KEY_REGEN_MS,
  }
}

export function msToNextKey(lastRegenAt, now = Date.now()) {
  return Math.max(0, lastRegenAt + KEY_REGEN_MS - now)
}

export const PRODUCTS = [
  { id: 'starter', name: 'Starter Pack', price: '€1.99', desc: '300 VC + exclusive Novice Banner (cosmetic)' },
  { id: 'monthly', name: 'Monthly Pass', price: '€4.99', desc: 'Unlimited Vault Keys + Season Pass tiers' },
  { id: 'coins_s', name: '500 Vault Coins', price: '€0.99', desc: 'Coin bundle' },
  { id: 'coins_m', name: '1,200 Vault Coins', price: '€1.99', desc: 'Coin bundle' },
]

export const REVIVE_COST_VC = 50

// Revive priority: 1 free per day → watch ad → 50 VC. Never cash-only.
export function reviveOptions(save, today) {
  return {
    freeAvailable: save.reviveUsedDate !== today,
    adAvailable: true,
    coinCost: REVIVE_COST_VC,
  }
}

// Optional self-set daily spend cap (in VC spent in shop). 0 = no cap.
export function canSpend(save, amount, today) {
  if (!save.settings.spendCapDaily) return true
  const spentToday = save.dailySpend.date === today ? save.dailySpend.amount : 0
  return spentToday + amount <= save.settings.spendCapDaily
}
