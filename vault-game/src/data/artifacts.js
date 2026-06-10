// 200 artifacts, deterministically generated so the codex is always 200 deep.
// Rarity split: 140 common / 50 rare / 10 legendary.

export const RARITY = {
  COMMON: 'common',
  RARE: 'rare',
  LEGENDARY: 'legendary',
}

export const RARITY_META = {
  common: { label: 'Common', color: '#9CA3AF', glow: 'rgba(156,163,175,0.4)' },
  rare: { label: 'Rare', color: '#8B5CF6', glow: 'rgba(139,92,246,0.6)' },
  legendary: { label: 'Legendary', color: '#F97316', glow: 'rgba(249,115,22,0.7)' },
}

const PREFIXES = [
  'Ashen', 'Gilded', 'Hollow', 'Whispering', 'Sunken', 'Forgotten', 'Iron',
  'Velvet', 'Cracked', 'Burning', 'Frozen', 'Silent', 'Howling', 'Ancient',
  'Shattered', 'Radiant', 'Obsidian', 'Pale', 'Crimson', 'Wandering',
]

const ITEMS = [
  'Locket', 'Idol', 'Crown', 'Lantern', 'Blade Shard', 'Chalice', 'Mask',
  'Compass', 'Tome', 'Ring', 'Hourglass', 'Talisman', 'Key', 'Mirror',
  'Censer', 'Sigil', 'Orb', 'Quill', 'Coin', 'Reliquary',
]

const EFFECT_POOL = [
  { stat: 'attack', label: 'Attack' },
  { stat: 'maxHp', label: 'Max HP' },
  { stat: 'luck', label: 'Luck' },
  { stat: 'coinGain', label: 'Coin Gain' },
]

function rarityForIndex(i) {
  if (i % 20 === 19) return RARITY.LEGENDARY // 10 of 200
  if ([3, 7, 11, 15, 18].includes(i % 20)) return RARITY.RARE // 50 of 200
  return RARITY.COMMON // 140 of 200
}

const GLYPHS = ['🗝️', '🏺', '👑', '🕯️', '⚔️', '🏆', '🎭', '🧭', '📜', '💍', '⏳', '🔮', '🗿', '🪞', '⚱️', '🔱', '🪙', '🪶', '💠', '🛡️']

export const ARTIFACTS = Array.from({ length: 200 }, (_, i) => {
  const prefix = PREFIXES[i % 20]
  const item = ITEMS[(Math.floor(i / 20) + i * 7) % 20]
  const rarity = rarityForIndex(i)
  const effect = EFFECT_POOL[i % 4]
  const power = rarity === RARITY.LEGENDARY ? 5 : rarity === RARITY.RARE ? 2 : 1
  return {
    id: i,
    name: `${prefix} ${item}`,
    rarity,
    glyph: GLYPHS[i % GLYPHS.length],
    effect: { stat: effect.stat, value: power, label: `+${power}% ${effect.label}` },
    // Floor where this artifact first becomes droppable — spreads the codex across the descent.
    minFloor: Math.floor(i / 4) + 1,
  }
})

export function artifactById(id) {
  return ARTIFACTS[id]
}

export function droppableArtifacts(floor, rarity) {
  return ARTIFACTS.filter((a) => a.rarity === rarity && a.minFloor <= Math.max(floor, 8))
}
