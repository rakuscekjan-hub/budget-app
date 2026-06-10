// MECHANIC 1: VARIABLE REWARD SCHEDULE
// Every kill drops a chest. Rarity is random but pity-protected, and the
// drop table is always inspectable in-game (ethical guardrail: tap "?").

import { RARITY, droppableArtifacts } from '../data/artifacts'

export const DROP_RATES = {
  common: 0.7,
  rare: 0.25,
  legendary: 0.05,
}

export const PITY_RULES = {
  rareAfterCommons: 10, // guaranteed rare after 10 commons in a row
  legendaryAfterRares: 50, // guaranteed legendary after 50 rares without one
}

// pity = { commons, rares } counters carried in the persistent save.
export function rollRarity(pity, luckPercent = 0) {
  if (pity.commons >= PITY_RULES.rareAfterCommons) return RARITY.RARE
  if (pity.rares >= PITY_RULES.legendaryAfterRares) return RARITY.LEGENDARY

  // Luck nudges weight from common toward rare/legendary, capped so the
  // published drop table stays honest within a few points.
  const luck = Math.min(luckPercent, 20) / 100
  const roll = Math.random()
  if (roll < DROP_RATES.legendary * (1 + luck)) return RARITY.LEGENDARY
  if (roll < (DROP_RATES.legendary + DROP_RATES.rare) * (1 + luck)) return RARITY.RARE
  return RARITY.COMMON
}

export function advancePity(pity, rarity) {
  if (rarity === RARITY.LEGENDARY) return { commons: 0, rares: 0 }
  if (rarity === RARITY.RARE) return { commons: 0, rares: pity.rares + 1 }
  return { commons: pity.commons + 1, rares: pity.rares }
}

const COIN_RANGES = { common: [5, 15], rare: [20, 50], legendary: [80, 200] }

export function buildChest(floor, rarity, ownedIds) {
  const [lo, hi] = COIN_RANGES[rarity]
  const coins = lo + Math.floor(Math.random() * (hi - lo + 1))

  // ~40% of rare+ chests (and a sliver of commons) also hold an artifact,
  // preferring ones the player doesn't own yet — the codex must keep moving.
  let artifact = null
  const artifactChance = rarity === RARITY.LEGENDARY ? 1 : rarity === RARITY.RARE ? 0.4 : 0.08
  if (Math.random() < artifactChance) {
    const pool = droppableArtifacts(floor, rarity)
    const unowned = pool.filter((a) => !ownedIds.includes(a.id))
    const pick = (unowned.length ? unowned : pool)[Math.floor(Math.random() * (unowned.length ? unowned.length : pool.length))]
    if (pick) artifact = pick
  }

  return { rarity, coins, artifact, xp: rarity === RARITY.LEGENDARY ? 60 : rarity === RARITY.RARE ? 25 : 10 }
}

// MECHANIC 1: cascading combo — clear the room fast, get a bonus chest.
export const SPEED_BONUS_MS = 10_000

export function speedBonusEarned(roomStartedAt, clearedAt) {
  return clearedAt - roomStartedAt < SPEED_BONUS_MS
}
