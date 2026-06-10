// Meta-progression: everything that survives death.
// Also feeds MECHANIC 3 (Zeigarnik): ranks, milestones, season pass, titles.

export const MASTERY_RANKS = [
  'Bronze III', 'Bronze II', 'Bronze I',
  'Silver III', 'Silver II', 'Silver I',
  'Gold III', 'Gold II', 'Gold I',
  'Platinum III', 'Platinum II', 'Platinum I',
  'Diamond', 'Vaultlord',
]

export const XP_PER_RANK = 500

export function masteryRank(totalXP) {
  const idx = Math.min(Math.floor(totalXP / XP_PER_RANK), MASTERY_RANKS.length - 1)
  return {
    name: MASTERY_RANKS[idx],
    next: MASTERY_RANKS[Math.min(idx + 1, MASTERY_RANKS.length - 1)],
    xpInRank: totalXP - idx * XP_PER_RANK,
    xpNeeded: XP_PER_RANK,
    maxed: idx === MASTERY_RANKS.length - 1,
  }
}

// Permanent upgrades bought with Vault Coins. Earnable-only power: paid
// currency never buys stats (ethical guardrail — cosmetics only).
export const UPGRADES = {
  attack: { label: 'Attack', glyph: '⚔️', baseCost: 100, perLevel: 2, unit: '+2 ATK' },
  hp: { label: 'Vitality', glyph: '❤️', baseCost: 100, perLevel: 10, unit: '+10 Max HP' },
  luck: { label: 'Luck', glyph: '🍀', baseCost: 150, perLevel: 1, unit: '+1% Luck' },
}

export function upgradeCost(key, currentLevel) {
  return Math.round(UPGRADES[key].baseCost * Math.pow(1.5, currentLevel))
}

export function playerBaseStats(upgrades, artifacts) {
  // Artifacts contribute tiny passive percentages, summed by stat.
  const bonus = { attack: 0, maxHp: 0, luck: 0, coinGain: 0 }
  for (const a of artifacts) bonus[a.effect.stat] += a.effect.value

  const baseAttack = 5 + upgrades.attack * UPGRADES.attack.perLevel
  const baseHp = 50 + upgrades.hp * UPGRADES.hp.perLevel
  return {
    attack: Math.round(baseAttack * (1 + bonus.attack / 100)),
    maxHp: Math.round(baseHp * (1 + bonus.maxHp / 100)),
    luck: upgrades.luck + bonus.luck,
    coinGain: 1 + bonus.coinGain / 100,
  }
}

// Daily / weekly quest tuning (Zeigarnik bars #2 and #3).
export const DAILY_QUEST_TARGET = 10
export const DAILY_QUEST_REWARD = 100 // VC, paid out on completion
export const WEEKLY_LEGENDARY_TARGET = 5

// Depth milestones — "next milestone: Floor 25 reward" (Zeigarnik bar #1).
export const MILESTONE_EVERY = 5
export const VAULT_MAX_FLOOR = 100

export function nextMilestone(bestFloor) {
  return Math.min(Math.ceil((bestFloor + 1) / MILESTONE_EVERY) * MILESTONE_EVERY, VAULT_MAX_FLOOR)
}

export function milestoneReward(floor) {
  return { coins: floor * 20 }
}

// Season pass: 50 tiers, cosmetic-only rewards.
export const SEASON_TIERS = 50
export const SEASON_XP_PER_TIER = 100
export const SEASON_TIER_REWARDS = ['Vault Coins ×40', 'Emote', 'Chest Skin', 'Title Fragment', 'Weapon Skin']

export function seasonTier(seasonXP) {
  return Math.min(Math.floor(seasonXP / SEASON_XP_PER_TIER), SEASON_TIERS)
}

// MECHANIC 7: identity — earnable titles displayed under the username.
export const TITLES = [
  { id: 'novice', name: 'Vault Novice', condition: 'Start your first run', test: (s) => s.totalRuns >= 1 },
  { id: 'depth10', name: 'Depth Seeker', condition: 'Reach Floor 10', test: (s) => s.bestFloor >= 10 },
  { id: 'depth25', name: 'Abyss Walker', condition: 'Reach Floor 25', test: (s) => s.bestFloor >= 25 },
  { id: 'depth50', name: 'The Descended', condition: 'Reach Floor 50', test: (s) => s.bestFloor >= 50 },
  { id: 'kills100', name: 'Vault Cleaner', condition: 'Defeat 100 enemies', test: (s) => s.totalKills >= 100 },
  { id: 'coins1000', name: 'Coin Hoarder', condition: 'Hold 1,000 Vault Coins', test: (s) => s.coins >= 1000 },
  { id: 'streak7', name: 'The Faithful', condition: '7-day login streak', test: (s) => s.streak >= 7 },
  { id: 'codex50', name: 'Curator', condition: 'Own 50 artifacts', test: (s) => s.artifactsOwned.length >= 50 },
  { id: 'legendary1', name: 'Goldtouched', condition: 'Own a legendary artifact', test: (s, arts) => arts.some((a) => a.rarity === 'legendary') },
]

export function earnedTitles(save, ownedArtifacts) {
  return TITLES.filter((t) => t.test(save, ownedArtifacts))
}
