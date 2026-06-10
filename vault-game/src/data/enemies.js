// Enemy archetypes per floor band. Stats scale with floor; the difficulty AI
// (systems/difficultyAI.js) applies a final multiplier on top.

const ARCHETYPES = [
  // floors 1-5: tutorial fodder
  { minFloor: 1, name: 'Vault Rat', glyph: '🐀', hp: 8, damage: 1, coins: 3 },
  { minFloor: 1, name: 'Dust Slime', glyph: '🟢', hp: 10, damage: 1, coins: 4 },
  { minFloor: 3, name: 'Rust Beetle', glyph: '🪲', hp: 14, damage: 2, coins: 5 },
  // floors 6-15: gentle curve
  { minFloor: 6, name: 'Hollow Sentry', glyph: '🛡️', hp: 22, damage: 3, coins: 8 },
  { minFloor: 8, name: 'Crypt Bat', glyph: '🦇', hp: 18, damage: 4, coins: 8 },
  { minFloor: 10, name: 'Bone Warden', glyph: '💀', hp: 30, damage: 5, coins: 12 },
  { minFloor: 13, name: 'Wisp of Greed', glyph: '👻', hp: 26, damage: 6, coins: 15 },
  // floors 16+: the vault fights back
  { minFloor: 16, name: 'Gilded Golem', glyph: '🗿', hp: 45, damage: 7, coins: 20 },
  { minFloor: 20, name: 'Vault Stalker', glyph: '🕷️', hp: 40, damage: 9, coins: 24 },
  { minFloor: 25, name: 'Ember Knight', glyph: '🔥', hp: 60, damage: 11, coins: 30 },
  { minFloor: 32, name: 'Abyss Maw', glyph: '🦈', hp: 75, damage: 13, coins: 38 },
  { minFloor: 40, name: 'The Unminted', glyph: '🪙', hp: 95, damage: 16, coins: 50 },
  { minFloor: 50, name: 'Depth Horror', glyph: '🐙', hp: 120, damage: 20, coins: 65 },
]

const ARCHITECT_BOSS = { name: "Architect's Echo", glyph: '👁️', hp: 40, damage: 5, coins: 100 }

function scale(base, floor, rate) {
  return Math.round(base * (1 + (floor - 1) * rate))
}

let nextEnemyUid = 1

export function buildEnemy(archetype, floor, multiplier) {
  const hp = Math.max(1, Math.round(scale(archetype.hp, floor, 0.16) * multiplier))
  return {
    uid: nextEnemyUid++,
    name: archetype.name,
    glyph: archetype.glyph,
    hp,
    maxHp: hp,
    damage: Math.max(1, Math.round(scale(archetype.damage, floor, 0.13) * multiplier)),
    coins: scale(archetype.coins, floor, 0.1),
  }
}

// Every 10th floor is an "Architect's Challenge" spike room: one boss, huge reward.
export function isArchitectFloor(floor) {
  return floor % 10 === 0
}

export function spawnRoom(floor, multiplier, rng = Math.random) {
  if (isArchitectFloor(floor)) {
    const boss = buildEnemy(ARCHITECT_BOSS, floor, multiplier * 1.2)
    boss.isBoss = true
    return [boss]
  }
  const pool = ARCHETYPES.filter((a) => a.minFloor <= floor).slice(-5)
  const count = floor <= 5 ? 1 : 1 + Math.floor(rng() * 3) // 1-3 enemies
  return Array.from({ length: count }, () => buildEnemy(pool[Math.floor(rng() * pool.length)], floor, multiplier))
}
