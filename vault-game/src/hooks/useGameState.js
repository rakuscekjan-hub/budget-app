// Central game state: one persistent save (localStorage) + one ephemeral run.
// All gameplay actions live here; components stay presentational.
// Run state is mirrored in a ref and mutated through setRunNow so rapid taps
// never act on a stale snapshot.

import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { useDailyReset } from './useDailyReset'
import { artifactById } from '../data/artifacts'
import { spawnRoom } from '../data/enemies'
import { loreForFloor } from '../data/lore'
import { rollRarity, advancePity, buildChest, speedBonusEarned } from '../systems/lootSystem'
import { difficultyMultiplier } from '../systems/difficultyAI'
import {
  playerBaseStats,
  upgradeCost,
  milestoneReward,
  nextMilestone,
  DAILY_QUEST_TARGET,
  DAILY_QUEST_REWARD,
} from '../systems/progressionSystem'
import { todayKey, loginBonus, FLASH_OFFER } from '../systems/fomoClock'
import { regenKeys, KEYS_MAX, canSpend, REVIVE_COST_VC } from '../systems/monetizationLayer'
import { friendNotification } from '../systems/socialSystem'

export const DEFAULT_SAVE = {
  version: 1,
  coins: 100,
  keys: KEYS_MAX,
  lastKeyRegen: Date.now(),
  upgrades: { attack: 0, hp: 0, luck: 0 },
  masteryXP: 0,
  seasonXP: 0,
  artifactsOwned: [],
  pity: { commons: 0, rares: 0 },
  bestFloor: 0,
  weeklyBestFloor: 0,
  weekKey: '',
  totalKills: 0,
  totalRuns: 0,
  legendariesThisWeek: 0,
  dailyQuestKills: 0,
  dailyQuestDate: '',
  streak: 0,
  lastLoginDate: '',
  loginBonusClaimedDate: '',
  dailyChestDate: '',
  vaultName: 'Delver',
  bodyType: 0,
  skin: 'default',
  weaponSkin: 'default',
  ownedCosmetics: [],
  showcase: [],
  equippedTitle: '',
  monthlyPass: false,
  starterPack: false,
  reviveUsedDate: '',
  dailySpend: { date: '', amount: 0 },
  settings: { chillMode: false, hypeAudio: false, spendCapDaily: 0, fastChests: false },
  flashOffer: { date: '', shownAt: 0, purchased: false },
  loreSeen: 0,
  guildContribution: 0,
  claimedMilestones: [],
}

const GameContext = createContext(null)

export function useGame() {
  return useContext(GameContext)
}

export function GameProvider({ children }) {
  const [save, setSave] = useLocalStorage('vault_save_v1', DEFAULT_SAVE)
  const [run, setRun] = useState(null) // null = between runs
  const runRef = useRef(null)
  const [toast, setToast] = useState(null)
  const [breakReminder, setBreakReminder] = useState(false)
  const sessionStartRef = useRef(Date.now())

  const setRunNow = useCallback((next) => {
    runRef.current = next
    setRun(next)
  }, [])

  useDailyReset(save, setSave)

  const sessionMinutes = useCallback(() => (Date.now() - sessionStartRef.current) / 60000, [])

  // Key regeneration tick (1 per 30 min, max 5; Monthly Pass = unlimited).
  useEffect(() => {
    const tick = () => {
      setSave((s) => {
        const r = regenKeys(s.keys, s.lastKeyRegen, Date.now(), s.monthlyPass)
        return r.keys === s.keys && r.lastRegenAt === s.lastKeyRegen ? s : { ...s, keys: r.keys, lastKeyRegen: r.lastRegenAt }
      })
    }
    tick()
    const id = setInterval(tick, 10_000)
    return () => clearInterval(id)
  }, [setSave])

  // ETHICAL GUARDRAIL: gentle, dismissable break nudge after 45 minutes.
  useEffect(() => {
    const id = setTimeout(() => setBreakReminder(true), 45 * 60 * 1000)
    return () => clearTimeout(id)
  }, [])

  const showToast = useCallback((msg) => {
    setToast({ msg, at: Date.now() })
    setTimeout(() => setToast((t) => (t && Date.now() - t.at >= 2900 ? null : t)), 3000)
  }, [])

  const ownedArtifacts = save.artifactsOwned.map(artifactById)
  const stats = playerBaseStats(save.upgrades, ownedArtifacts)

  // ---------------------------------------------------------------- run flow

  const startRun = useCallback(() => {
    if (runRef.current) return false
    if (!save.monthlyPass && save.keys < 1) return false
    setSave((s) => ({
      ...s,
      keys: s.monthlyPass ? s.keys : s.keys - 1,
      totalRuns: s.totalRuns + 1,
    }))
    const floor = 1
    const mult = difficultyMultiplier({ floor, sessionMinutes: sessionMinutes(), chillMode: save.settings.chillMode })
    setRunNow({
      floor,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      attack: stats.attack,
      defense: 1 + Math.floor(save.upgrades.hp / 2),
      luck: stats.luck,
      coinGain: stats.coinGain,
      enemies: spawnRoom(floor, mult),
      combo: 0,
      roomStartedAt: Date.now(),
      tookDamageThisRoom: false,
      noDamageClears: 0,
      deathsByFloor: {},
      coinsEarned: 0,
      chestQueue: [],
      cleared: false,
      speedBonus: false,
      defeated: false,
      reviveUsedThisRun: false,
      startedAt: Date.now(),
      lastEvent: null,
    })
    return true
  }, [save.keys, save.monthlyPass, save.settings.chillMode, save.upgrades.hp, sessionMinutes, setRunNow, setSave, stats])

  const attackEnemy = useCallback((uid) => {
    const r = runRef.current
    if (!r || r.defeated || r.cleared) return
    const enemies = r.enemies.map((e) => ({ ...e }))
    const target = enemies.find((e) => e.uid === uid && e.hp > 0)
    if (!target) return

    // Player swing: ±20% variance, luck% chance to crit for double damage.
    const variance = 0.8 + Math.random() * 0.4
    const crit = Math.random() * 100 < r.luck
    const dmg = Math.max(1, Math.round(r.attack * variance * (crit ? 2 : 1)))
    target.hp = Math.max(0, target.hp - dmg)
    // PLAY: combat_hit.mp3 — each attack

    let { combo, coinsEarned, chestQueue, hp, tookDamageThisRoom } = r
    const killed = target.hp === 0

    if (killed) {
      combo += 1
      // Combo sweetens coins: +5% per combo step (visible counter = rhythm).
      coinsEarned += Math.round(target.coins * r.coinGain * (1 + combo * 0.05))
      chestQueue = [...chestQueue, { floor: r.floor }]
    }

    // Survivors strike back as one volley.
    const alive = enemies.filter((e) => e.hp > 0)
    let incoming = 0
    if (alive.length) {
      incoming = alive.reduce((sum, e) => sum + Math.max(1, e.damage - r.defense), 0)
      hp = Math.max(0, hp - incoming)
      if (incoming > 0) {
        tookDamageThisRoom = true
        combo = 0 // taking a hit breaks the combo
      }
    }

    const cleared = alive.length === 0
    const next = {
      ...r,
      enemies,
      hp,
      combo,
      coinsEarned,
      chestQueue,
      tookDamageThisRoom,
      defeated: hp === 0,
      cleared,
      lastEvent: { dmg, crit, incoming, targetUid: uid, at: Date.now() },
    }

    if (cleared) {
      next.noDamageClears = tookDamageThisRoom ? 0 : r.noDamageClears + 1
      // MECHANIC 1: cascading combo — sub-10-second clear = bonus chest.
      if (speedBonusEarned(r.roomStartedAt, Date.now())) {
        next.chestQueue = [...next.chestQueue, { floor: r.floor, bonus: true }]
        next.speedBonus = true
      }
    }

    setRunNow(next)
    if (killed) {
      setSave((s) => {
        const dailyQuestKills = s.dailyQuestKills + 1
        // Daily quest pays out the moment the 10th kill lands.
        const questBonus = dailyQuestKills === DAILY_QUEST_TARGET ? DAILY_QUEST_REWARD : 0
        return { ...s, totalKills: s.totalKills + 1, dailyQuestKills, coins: s.coins + questBonus }
      })
      if (save.dailyQuestKills + 1 === DAILY_QUEST_TARGET) {
        showToast(`🗡️ Daily quest complete! +${DAILY_QUEST_REWARD} VC`)
      }
    }
  }, [save.dailyQuestKills, setRunNow, setSave, showToast])

  // Pops one chest from the queue: rolls rarity (pity-aware), banks rewards.
  const openChest = useCallback(() => {
    const r = runRef.current
    if (!r || !r.chestQueue.length) return null
    const [entry, ...rest] = r.chestQueue
    const rarity = rollRarity(save.pity, r.luck)
    const chest = buildChest(entry.floor, rarity, save.artifactsOwned)
    setRunNow({ ...r, chestQueue: rest })
    setSave((s) => ({
      ...s,
      pity: advancePity(s.pity, rarity),
      coins: s.coins + Math.round(chest.coins * r.coinGain),
      masteryXP: s.masteryXP + chest.xp,
      seasonXP: s.seasonXP + chest.xp,
      legendariesThisWeek: s.legendariesThisWeek + (rarity === 'legendary' ? 1 : 0),
      artifactsOwned:
        chest.artifact && !s.artifactsOwned.includes(chest.artifact.id)
          ? [...s.artifactsOwned, chest.artifact.id]
          : s.artifactsOwned,
    }))
    return { ...chest, bonus: entry.bonus }
  }, [save.artifactsOwned, save.pity, setRunNow, setSave])

  const descend = useCallback(() => {
    const r = runRef.current
    if (!r || !r.cleared || r.chestQueue.length) return
    const floor = r.floor + 1
    const mult = difficultyMultiplier({
      floor,
      deathsOnFloor: r.deathsByFloor[floor] || 0,
      noDamageClears: r.noDamageClears,
      sessionMinutes: sessionMinutes(),
      chillMode: save.settings.chillMode,
    })
    setRunNow({
      ...r,
      floor,
      enemies: spawnRoom(floor, mult),
      cleared: false,
      speedBonus: false,
      tookDamageThisRoom: false,
      roomStartedAt: Date.now(),
      lastEvent: null,
    })
    setSave((s) => {
      const next = { ...s, guildContribution: s.guildContribution + 1 }
      // Reveal this floor's lore fragment on first-ever visit.
      if (floor > s.loreSeen) next.loreSeen = floor
      // FOMO flash offer: fires once per day, after descending past floor 10.
      if (floor > 10 && s.flashOffer.date !== todayKey()) {
        next.flashOffer = { date: todayKey(), shownAt: Date.now(), purchased: false }
      }
      return next
    })
  }, [save.settings.chillMode, sessionMinutes, setRunNow, setSave])

  const revive = useCallback((method) => {
    const r = runRef.current
    if (!r || !r.defeated) return false
    const today = todayKey()
    if (method === 'free' && save.reviveUsedDate === today) return false
    if (method === 'coins' && save.coins < REVIVE_COST_VC) return false

    setSave((s) => {
      if (method === 'free') return { ...s, reviveUsedDate: today }
      if (method === 'coins') return { ...s, coins: s.coins - REVIVE_COST_VC }
      return s // 'ad': simulated ad watch, no cost
    })
    setRunNow({
      ...r,
      defeated: false,
      reviveUsedThisRun: true,
      hp: Math.round(r.maxHp * 0.5),
      combo: 0,
      deathsByFloor: { ...r.deathsByFloor, [r.floor]: (r.deathsByFloor[r.floor] || 0) + 1 },
    })
    return true
  }, [save.coins, save.reviveUsedDate, setRunNow, setSave])

  // Ends the run and banks meta-progression. Returns a summary for the UI.
  const endRun = useCallback(() => {
    const r = runRef.current
    if (!r) return null
    const floorsCleared = r.cleared ? r.floor : r.floor - 1
    const xp = 10 + floorsCleared * 5
    const summary = {
      floor: r.floor,
      floorsCleared,
      coins: r.coinsEarned,
      xp,
      newRecord: floorsCleared > save.bestFloor,
      friendNote: Math.random() < 0.5 ? friendNotification(Math.max(floorsCleared, 1)) : null,
    }
    setSave((s) => ({
      ...s,
      coins: s.coins + r.coinsEarned,
      masteryXP: s.masteryXP + xp,
      seasonXP: s.seasonXP + xp,
      bestFloor: Math.max(s.bestFloor, floorsCleared),
      weeklyBestFloor: Math.max(s.weeklyBestFloor, floorsCleared),
    }))
    setRunNow(null)
    return summary
  }, [save.bestFloor, setRunNow, setSave])

  // ---------------------------------------------------------- economy / meta

  const buyUpgrade = useCallback((key) => {
    setSave((s) => {
      const cost = upgradeCost(key, s.upgrades[key])
      if (s.coins < cost) return s
      // PLAY: level_up.mp3 — rank increase
      return { ...s, coins: s.coins - cost, upgrades: { ...s.upgrades, [key]: s.upgrades[key] + 1 } }
    })
  }, [setSave])

  const claimLoginBonus = useCallback(() => {
    const today = todayKey()
    if (save.loginBonusClaimedDate === today) return null
    const bonus = loginBonus(save.streak || 1)
    setSave((s) => ({ ...s, loginBonusClaimedDate: today, coins: s.coins + bonus.coins }))
    return bonus
  }, [save.loginBonusClaimedDate, save.streak, setSave])

  // Daily mystery chest: free once per day, rarity unknown until opened.
  const claimDailyChest = useCallback(() => {
    const today = todayKey()
    if (save.dailyChestDate === today) return null
    const rarity = rollRarity(save.pity, stats.luck)
    const chest = buildChest(Math.max(save.bestFloor, 3), rarity, save.artifactsOwned)
    setSave((s) => ({
      ...s,
      dailyChestDate: today,
      pity: advancePity(s.pity, rarity),
      coins: s.coins + chest.coins,
      masteryXP: s.masteryXP + chest.xp,
      seasonXP: s.seasonXP + chest.xp,
      legendariesThisWeek: s.legendariesThisWeek + (rarity === 'legendary' ? 1 : 0),
      artifactsOwned:
        chest.artifact && !s.artifactsOwned.includes(chest.artifact.id)
          ? [...s.artifactsOwned, chest.artifact.id]
          : s.artifactsOwned,
    }))
    return chest
  }, [save.artifactsOwned, save.bestFloor, save.dailyChestDate, save.pity, setSave, stats.luck])

  const buyShopItem = useCallback((item) => {
    const today = todayKey()
    let ok = false
    setSave((s) => {
      if (s.ownedCosmetics.includes(item.id) && item.kind !== 'consumable') return s
      if (s.coins < item.cost) return s
      if (!canSpend(s, item.cost, today)) return s
      ok = true
      const spent = s.dailySpend.date === today ? s.dailySpend.amount : 0
      return {
        ...s,
        coins: s.coins - item.cost,
        dailySpend: { date: today, amount: spent + item.cost },
        ownedCosmetics: item.kind === 'consumable' ? s.ownedCosmetics : [...s.ownedCosmetics, item.id],
        settings: item.id === 'fast_chests' ? { ...s.settings, fastChests: true } : s.settings,
      }
    })
    showToast(ok ? `Purchased: ${item.name}` : 'Cannot purchase (coins or daily cap)')
    return ok
  }, [setSave, showToast])

  // v1: no real money. "Buying" a product is simulated and labeled as such.
  const simulatePurchase = useCallback((productId) => {
    setSave((s) => {
      if (productId === 'starter') return s.starterPack ? s : { ...s, starterPack: true, coins: s.coins + 300, ownedCosmetics: [...s.ownedCosmetics, 'banner_novice'] }
      if (productId === 'monthly') return { ...s, monthlyPass: true, keys: KEYS_MAX }
      if (productId === 'coins_s') return { ...s, coins: s.coins + 500 }
      if (productId === 'coins_m') return { ...s, coins: s.coins + 1200 }
      if (productId === FLASH_OFFER.id) return { ...s, coins: s.coins + FLASH_OFFER.coins, flashOffer: { ...s.flashOffer, purchased: true } }
      return s
    })
    showToast('Simulated purchase — no real money in v1')
  }, [setSave, showToast])

  const watchAdForKey = useCallback(() => {
    // Simulated ad: a free key path must always exist (ethical guardrail).
    setSave((s) => ({ ...s, keys: Math.min(KEYS_MAX, s.keys + 1) }))
    showToast('+1 Vault Key (ad watched)')
  }, [setSave, showToast])

  const claimMilestone = useCallback((floor) => {
    setSave((s) => {
      if (s.claimedMilestones.includes(floor) || s.bestFloor < floor) return s
      return { ...s, claimedMilestones: [...s.claimedMilestones, floor], coins: s.coins + milestoneReward(floor).coins }
    })
  }, [setSave])

  const updateSave = useCallback((patch) => {
    setSave((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }))
  }, [setSave])

  const value = {
    save,
    updateSave,
    run,
    stats,
    ownedArtifacts,
    toast,
    showToast,
    breakReminder,
    dismissBreakReminder: () => setBreakReminder(false),
    sessionMinutes,
    nextMilestoneFloor: nextMilestone(save.bestFloor),
    loreForFloor,
    // actions
    startRun,
    attackEnemy,
    openChest,
    descend,
    revive,
    endRun,
    buyUpgrade,
    claimLoginBonus,
    claimDailyChest,
    buyShopItem,
    simulatePurchase,
    watchAdForKey,
    claimMilestone,
  }

  return createElement(GameContext.Provider, { value }, children)
}
