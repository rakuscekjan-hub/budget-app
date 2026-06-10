// MECHANIC 4: FOMO — timers, daily resets, rotating shop, flash offers.
// Everything here is date-derived and deterministic so it survives reloads.

export function todayKey(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

export function weekKey(d = new Date()) {
  // ISO-ish week key: year + week number (resets Sunday→Monday boundary is fine for v1).
  const onejan = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d - onejan) / 86400000 + onejan.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${week}`
}

export function msUntilMidnight(now = new Date()) {
  const next = new Date(now)
  next.setHours(24, 0, 0, 0)
  return next - now
}

export function msUntilSunday(now = new Date()) {
  const next = new Date(now)
  next.setDate(now.getDate() + ((7 - now.getDay()) % 7 || 7))
  next.setHours(0, 0, 0, 0)
  return next - now
}

export function formatCountdown(ms) {
  if (ms < 0) ms = 0
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  const pad = (n) => String(n).padStart(2, '0')
  return h >= 24 ? `${Math.floor(h / 24)}d ${pad(h % 24)}:${pad(m)}:${pad(s)}` : `${pad(h)}:${pad(m)}:${pad(s)}`
}

// Daily rotating shop: 3 items, seeded by the date so everyone sees the same
// rotation and it can't be re-rolled by refreshing.
export const SHOP_POOL = [
  { id: 'skin_ember', name: 'Ember Plate Skin', glyph: '🔥', cost: 400, kind: 'skin' },
  { id: 'skin_frost', name: 'Frostbound Skin', glyph: '❄️', cost: 400, kind: 'skin' },
  { id: 'skin_gilded', name: 'Gilded Wanderer Skin', glyph: '✨', cost: 600, kind: 'skin' },
  { id: 'skin_shadow', name: 'Shadow Veil Skin', glyph: '🌑', cost: 600, kind: 'skin' },
  { id: 'weapon_dawn', name: 'Dawnbreaker Blade Skin', glyph: '🗡️', cost: 350, kind: 'weaponSkin' },
  { id: 'weapon_void', name: 'Void Edge Skin', glyph: '⚫', cost: 350, kind: 'weaponSkin' },
  { id: 'weapon_coral', name: 'Coral Fang Skin', glyph: '🪸', cost: 300, kind: 'weaponSkin' },
  { id: 'chest_extra', name: 'Extra Daily Chest (today)', glyph: '🎁', cost: 150, kind: 'consumable' },
  { id: 'fast_chests', name: 'Swift Hands (fast chest opening)', glyph: '⚡', cost: 250, kind: 'qol' },
  { id: 'emote_bow', name: 'Bow Emote', glyph: '🙇', cost: 120, kind: 'emote' },
  { id: 'emote_flex', name: 'Flex Emote', glyph: '💪', cost: 120, kind: 'emote' },
  { id: 'banner_crimson', name: 'Crimson Banner', glyph: '🚩', cost: 200, kind: 'banner' },
]

function seededIndexes(seedStr, count, max) {
  let seed = 0
  for (const c of seedStr) seed = (seed * 31 + c.charCodeAt(0)) >>> 0
  const picked = []
  while (picked.length < count) {
    seed = (seed * 1103515245 + 12345) >>> 0
    const idx = seed % max
    if (!picked.includes(idx)) picked.push(idx)
  }
  return picked
}

export function dailyShop(date = new Date()) {
  return seededIndexes(todayKey(date), 3, SHOP_POOL.length).map((i) => SHOP_POOL[i])
}

// Login bonus escalation: Day 1 = 50 → Day 7 = 500, Day 30 = legendary chest.
export function loginBonus(streakDay) {
  if (streakDay >= 30 && streakDay % 30 === 0) return { coins: 0, chest: 'legendary', label: 'Legendary Chest!' }
  const day = ((streakDay - 1) % 7) + 1
  const coins = [50, 75, 100, 150, 200, 300, 500][day - 1]
  return { coins, chest: day === 7 ? 'rare' : null, label: `${coins} Vault Coins${day === 7 ? ' + Rare Chest' : ''}` }
}

// Flash offer: triggers once per day after clearing floor 10. 30-minute window.
export const FLASH_OFFER = {
  id: 'flash_coins',
  label: '⚡ LIMITED: 500 Vault Coins',
  price: '€0.99',
  coins: 500,
  windowMs: 30 * 60 * 1000,
}

// Weekly event: The Crimson Vault — one exclusive artifact, this week only.
export function crimsonVaultEvent(date = new Date()) {
  return {
    name: 'The Crimson Vault',
    artifactName: `Crimson Sigil of ${weekKey(date)}`,
    endsIn: msUntilSunday(date),
    requirement: 'Reach Floor 15 this week',
  }
}

// Pseudo-scarcity copy. v1 has no backend, so this is a deterministic daily
// number — clearly a mock, swap for real telemetry later.
export function scarcityCount(date = new Date()) {
  let seed = 0
  for (const c of todayKey(date)) seed = (seed * 33 + c.charCodeAt(0)) >>> 0
  return 150 + (seed % 400)
}
