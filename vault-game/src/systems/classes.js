// RPG layer: playable classes and in-run perk choices (equipment-flavored).
// Classes are a persistent identity choice; perks last one run and make every
// descent a different build.

export const CLASSES = {
  warrior: {
    id: 'warrior',
    name: 'Warrior',
    glyph: '🛡️',
    desc: 'Tough frontliner. High HP and armor.',
    hpMult: 1.3,
    atkMult: 1.0,
    luckBonus: 0,
    defenseBonus: 2,
    special: { name: 'Crushing Blow', desc: '2.8× damage to one enemy', mult: 2.8, target: 'single' },
  },
  rogue: {
    id: 'rogue',
    name: 'Rogue',
    glyph: '🗡️',
    desc: 'Fast and lethal. High crit chance.',
    hpMult: 0.85,
    atkMult: 1.15,
    luckBonus: 12,
    defenseBonus: 0,
    special: { name: 'Fan of Blades', desc: '1.4× damage to ALL enemies', mult: 1.4, target: 'all' },
  },
  mystic: {
    id: 'mystic',
    name: 'Mystic',
    glyph: '🔮',
    desc: 'Drains life from the vault itself.',
    hpMult: 1.0,
    atkMult: 1.0,
    luckBonus: 5,
    defenseBonus: 1,
    special: { name: 'Soul Siphon', desc: '1.8× damage, heal half of it', mult: 1.8, target: 'single', lifesteal: 0.5 },
  },
}

// Perks offered on level-up during a run: pick 1 of 3. They read as gear the
// delver straps on, and they stack.
export const PERKS = [
  { id: 'blade', name: 'Sharpened Blade', glyph: '⚔️', desc: '+20% attack' },
  { id: 'plate', name: 'Vault Plate', glyph: '🛡️', desc: '+2 defense' },
  { id: 'heart', name: 'Troll Heart', glyph: '❤️', desc: '+25 max HP and heal to full' },
  { id: 'eye', name: "Assassin's Eye", glyph: '🎯', desc: '+10% crit chance' },
  { id: 'fang', name: 'Leech Fang', glyph: '🩸', desc: 'heal 4 HP on every kill' },
  { id: 'greed', name: 'Greed Engine', glyph: '🪙', desc: '+30% coins from kills' },
  { id: 'boots', name: 'Swift Boots', glyph: '👢', desc: '+18% move speed' },
  { id: 'focus', name: 'Battle Focus', glyph: '💥', desc: 'special cooldown −1 turn' },
]

export function perkById(id) {
  return PERKS.find((p) => p.id === id)
}

export function rollPerkChoices(ownedCounts = {}) {
  // Offer 3 distinct perks, lightly preferring ones not stacked yet.
  const pool = [...PERKS].sort(
    () => Math.random() - 0.5
  ).sort((a, b) => (ownedCounts[a.id] || 0) - (ownedCounts[b.id] || 0))
  const picks = []
  for (const p of pool) {
    if (picks.length >= 3) break
    if (!picks.includes(p.id)) picks.push(p.id)
  }
  return picks
}

// Applies one perk to a live run object (returns the patch).
export function applyPerk(run, perkId) {
  switch (perkId) {
    case 'blade':
      return { attack: Math.round(run.attack * 1.2) }
    case 'plate':
      return { defense: run.defense + 2 }
    case 'heart':
      return { maxHp: run.maxHp + 25, hp: run.maxHp + 25 }
    case 'eye':
      return { luck: run.luck + 10 }
    case 'fang':
      return { healPerKill: (run.healPerKill || 0) + 4 }
    case 'greed':
      return { coinGain: run.coinGain * 1.3 }
    case 'boots':
      return { moveSpeed: (run.moveSpeed || 1) * 1.18 }
    case 'focus':
      return { specialCooldownBase: Math.max(1, (run.specialCooldownBase || 3) - 1) }
    default:
      return {}
  }
}

export function xpForLevel(level) {
  return 20 + level * 15
}

export function xpForKill(enemy) {
  return 3 + Math.ceil(enemy.maxHp / 5)
}
