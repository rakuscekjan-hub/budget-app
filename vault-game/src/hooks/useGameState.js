// Central game state: one persistent save (localStorage) + one ephemeral run.
// A run is a first-person descent: per floor a generated maze the player
// walks through; touching an enemy group opens tactical turn-based combat.
// Run state is mirrored in a ref and mutated through setRunNow so rapid
// inputs never act on a stale snapshot.

import { createContext, createElement, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useLocalStorage } from './useLocalStorage'
import { useDailyReset } from './useDailyReset'
import { artifactById } from '../data/artifacts'
import { loreForFloor } from '../data/lore'
import { generateFloor } from '../systems/dungeonGenerator'
import { rollRarity, advancePity, buildChest } from '../systems/lootSystem'
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
  version: 2,
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

// dir: 0 = north (-y), 1 = east (+x), 2 = south (+y), 3 = west (-x)
export const DIR_VECTORS = [
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]

const SPECIAL_COOLDOWN = 3
const SPECIAL_MULT = 2.2
const BLOCK_FACTOR = 0.4 // defending player takes 40% of the volley
const FAST_WIN_TURNS = 3 // win combat this fast → bonus chest

function rollIntent(enemy) {
  const roll = Math.random()
  if (enemy.charged) return { type: 'attack', value: enemy.damage * 2 }
  if (roll < 0.7) return { type: 'attack', value: enemy.damage }
  if (roll < 0.85) return { type: 'charge' }
  return { type: 'defend' }
}

function withIntents(enemies) {
  return enemies.map((e) => {
    const intent = rollIntent(e)
    return { ...e, intent, defending: intent.type === 'defend' }
  })
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

  // Read-only debug handle for tests/tooling.
  useEffect(() => {
    window.__vault = { get run() { return runRef.current } }
    return () => { delete window.__vault }
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

  // ---------------------------------------------------------------- helpers

  const floorMultiplier = useCallback(
    (floor, r) =>
      difficultyMultiplier({
        floor,
        deathsOnFloor: r?.deathsByFloor[floor] || 0,
        noDamageClears: r?.noDamageClears || 0,
        sessionMinutes: sessionMinutes(),
        chillMode: save.settings.chillMode,
      }),
    [save.settings.chillMode, sessionMinutes]
  )

  function spawnDirFor(dungeon) {
    // Face the first open corridor from the spawn cell.
    const { x, y } = dungeon.spawn
    return dungeon.grid[y][x + 1] === 0 ? 1 : 2
  }

  const registerKills = useCallback(
    (count) => {
      if (!count) return
      setSave((s) => {
        const dailyQuestKills = s.dailyQuestKills + count
        // Daily quest pays out the moment the 10th kill lands.
        const crossed = s.dailyQuestKills < DAILY_QUEST_TARGET && dailyQuestKills >= DAILY_QUEST_TARGET
        return { ...s, totalKills: s.totalKills + count, dailyQuestKills, coins: s.coins + (crossed ? DAILY_QUEST_REWARD : 0) }
      })
      if (save.dailyQuestKills < DAILY_QUEST_TARGET && save.dailyQuestKills + count >= DAILY_QUEST_TARGET) {
        showToast(`🗡️ Daily quest complete! +${DAILY_QUEST_REWARD} VC`)
      }
    },
    [save.dailyQuestKills, setSave, showToast]
  )

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
    const dungeon = generateFloor(floor, floorMultiplier(floor, null))
    setRunNow({
      floor,
      hp: stats.maxHp,
      maxHp: stats.maxHp,
      attack: stats.attack,
      defense: 1 + Math.floor(save.upgrades.hp / 2),
      luck: stats.luck,
      coinGain: stats.coinGain,
      dungeon,
      pos: { ...dungeon.spawn },
      dir: spawnDirFor(dungeon),
      visited: { [`${dungeon.spawn.x},${dungeon.spawn.y}`]: true },
      combat: null,
      combo: 0,
      floorStartedAt: Date.now(),
      tookDamageThisFloor: false,
      noDamageClears: 0,
      deathsByFloor: {},
      coinsEarned: 0,
      chestQueue: [],
      defeated: false,
      reviveUsedThisRun: false,
      startedAt: Date.now(),
      lastEvent: null,
    })
    return true
  }, [floorMultiplier, save.keys, save.monthlyPass, save.upgrades.hp, setRunNow, setSave, stats])

  const turnPlayer = useCallback(
    (delta) => {
      const r = runRef.current
      if (!r || r.combat || r.defeated) return
      setRunNow({ ...r, dir: (r.dir + delta + 4) % 4 })
    },
    [setRunNow]
  )

  const descendFloor = useCallback(() => {
    const r = runRef.current
    if (!r) return
    const floor = r.floor + 1
    const dungeon = generateFloor(floor, floorMultiplier(floor, r))
    setRunNow({
      ...r,
      floor,
      dungeon,
      pos: { ...dungeon.spawn },
      dir: spawnDirFor(dungeon),
      visited: { [`${dungeon.spawn.x},${dungeon.spawn.y}`]: true },
      combat: null,
      floorStartedAt: Date.now(),
      tookDamageThisFloor: false,
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
  }, [floorMultiplier, setRunNow, setSave])

  // Move one cell forward (sign 1) or backward (sign -1). Walking into an
  // enemy group engages combat; chests collect; cleared stairs descend.
  const stepPlayer = useCallback(
    (sign) => {
      const r = runRef.current
      if (!r || r.combat || r.defeated || r.chestQueue.length) return
      const [dx, dy] = DIR_VECTORS[r.dir]
      const tx = r.pos.x + dx * sign
      const ty = r.pos.y + dy * sign
      const d = r.dungeon
      if (d.grid[ty]?.[tx] !== 0) return // wall

      const group = d.enemies.find((g) => g.x === tx && g.y === ty)
      if (group) {
        // PLAY: combat_engage.mp3 — enemy encounter sting
        setRunNow({
          ...r,
          combat: {
            gid: group.gid,
            enemies: withIntents(group.group.map((e) => ({ ...e }))),
            turn: 1,
            playerBlock: false,
            specialCd: 0,
            lastEvent: null,
          },
        })
        return
      }

      const next = { ...r, pos: { x: tx, y: ty }, visited: { ...r.visited, [`${tx},${ty}`]: true } }

      const chestIdx = d.chests.findIndex((c) => c.x === tx && c.y === ty)
      if (chestIdx >= 0) {
        next.dungeon = { ...d, chests: d.chests.filter((_, i) => i !== chestIdx) }
        next.chestQueue = [...r.chestQueue, { floor: r.floor }]
        setRunNow(next)
        return
      }

      if (tx === d.stairs.x && ty === d.stairs.y) {
        if (d.enemies.length > 0) {
          const left = d.enemies.reduce((n, g) => n + g.group.length, 0)
          showToast(`🔒 The stairs are sealed — ${left} ${left === 1 ? 'enemy' : 'enemies'} remain`)
          setRunNow(next)
          return
        }
        runRef.current = next
        descendFloor()
        return
      }

      setRunNow(next)
    },
    [descendFloor, setRunNow, showToast]
  )

  // One tactical combat turn: the player acts, deaths resolve, survivors
  // execute their telegraphed intents, then new intents are drawn.
  const combatAction = useCallback(
    (action, targetUid) => {
      const r = runRef.current
      if (!r || !r.combat || r.defeated) return
      const c = r.combat
      if (action === 'special' && c.specialCd > 0) return

      let enemies = c.enemies.map((e) => ({ ...e }))
      const events = []
      let playerBlock = false

      if (action === 'defend') {
        playerBlock = true
        events.push({ kind: 'defend' })
        // PLAY: shield_up.mp3 — player guards
      } else {
        const target = enemies.find((e) => e.uid === targetUid && e.hp > 0) || enemies.find((e) => e.hp > 0)
        if (!target) return
        const crit = action === 'attack' && Math.random() * 100 < r.luck
        const base = action === 'special' ? r.attack * SPECIAL_MULT : r.attack * (0.85 + Math.random() * 0.3) * (crit ? 2 : 1)
        const dmg = Math.max(1, Math.round(target.defending ? base / 2 : base))
        target.hp = Math.max(0, target.hp - dmg)
        events.push({ kind: action, dmg, crit, targetUid: target.uid, blocked: target.defending })
        // PLAY: combat_hit.mp3 — each attack
      }

      // resolve deaths → loot
      const died = enemies.filter((e) => e.hp <= 0)
      enemies = enemies.filter((e) => e.hp > 0)
      let { combo, coinsEarned, chestQueue, hp, tookDamageThisFloor } = r
      for (const dead of died) {
        combo += 1
        coinsEarned += Math.round(dead.coins * r.coinGain * (1 + combo * 0.05))
        chestQueue = [...chestQueue, { floor: r.floor }]
        events.push({ kind: 'kill', name: dead.name })
      }
      registerKills(died.length)

      if (!enemies.length) {
        // victory — fast wins (≤3 turns) cascade into a bonus chest
        if (c.turn <= FAST_WIN_TURNS) {
          chestQueue = [...chestQueue, { floor: r.floor, bonus: true }]
        }
        const remaining = r.dungeon.enemies.filter((g) => g.gid !== c.gid)
        const floorCleared = remaining.length === 0
        const next = {
          ...r,
          combat: null,
          combo,
          coinsEarned,
          chestQueue,
          dungeon: { ...r.dungeon, enemies: remaining },
          noDamageClears: floorCleared ? (tookDamageThisFloor ? 0 : r.noDamageClears + 1) : r.noDamageClears,
          lastEvent: { events, at: Date.now() },
        }
        setRunNow(next)
        if (floorCleared) showToast('🔓 Floor cleared — the stairs are open')
        return
      }

      // enemy phase: telegraphed intents fire
      let incoming = 0
      for (const e of enemies) {
        if (e.intent.type === 'attack') {
          let dmg = Math.max(1, Math.round(e.intent.value) - r.defense)
          if (playerBlock) dmg = Math.max(0, Math.ceil(dmg * BLOCK_FACTOR))
          incoming += dmg
          e.charged = false
        } else if (e.intent.type === 'charge') {
          e.charged = true
        }
        // 'defend' already set when the intent was drawn
      }
      hp = Math.max(0, hp - incoming)
      if (incoming > 0) {
        combo = 0
        tookDamageThisFloor = true
        events.push({ kind: 'hurt', dmg: incoming, blocked: playerBlock })
      }

      setRunNow({
        ...r,
        hp,
        combo,
        coinsEarned,
        chestQueue,
        tookDamageThisFloor,
        defeated: hp === 0,
        combat: {
          ...c,
          enemies: withIntents(enemies),
          turn: c.turn + 1,
          playerBlock: false,
          specialCd: action === 'special' ? SPECIAL_COOLDOWN : Math.max(0, c.specialCd - 1),
          lastEvent: { events, at: Date.now() },
        },
        lastEvent: null,
      })
    },
    [registerKills, setRunNow, showToast]
  )

  // Fleeing is allowed but not free: the enemies get one parting volley and
  // keep their wounds; the player steps back out of the cell they came from.
  const combatFlee = useCallback(() => {
    const r = runRef.current
    if (!r || !r.combat || r.defeated) return
    let incoming = 0
    for (const e of r.combat.enemies) {
      if (e.intent.type === 'attack') incoming += Math.max(1, Math.round(e.intent.value) - r.defense)
    }
    const hp = Math.max(0, r.hp - incoming)
    const dungeon = {
      ...r.dungeon,
      enemies: r.dungeon.enemies.map((g) =>
        g.gid === r.combat.gid ? { ...g, group: r.combat.enemies.map(({ intent, ...e }) => ({ ...e, defending: false })) } : g
      ),
    }
    setRunNow({
      ...r,
      hp,
      combo: 0,
      tookDamageThisFloor: incoming > 0 ? true : r.tookDamageThisFloor,
      defeated: hp === 0,
      combat: null,
      dungeon,
      lastEvent: { events: [{ kind: 'flee', dmg: incoming }], at: Date.now() },
    })
    if (incoming > 0) showToast(`You fled — and took ${incoming} damage on the way out`)
  }, [setRunNow, showToast])

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

  const revive = useCallback(
    (method) => {
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
    },
    [save.coins, save.reviveUsedDate, setRunNow, setSave]
  )

  // Ends the run and banks meta-progression. Returns a summary for the UI.
  const endRun = useCallback(() => {
    const r = runRef.current
    if (!r) return null
    const floorsCleared = Math.max(0, r.floor - 1)
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

  const buyUpgrade = useCallback(
    (key) => {
      setSave((s) => {
        const cost = upgradeCost(key, s.upgrades[key])
        if (s.coins < cost) return s
        // PLAY: level_up.mp3 — rank increase
        return { ...s, coins: s.coins - cost, upgrades: { ...s.upgrades, [key]: s.upgrades[key] + 1 } }
      })
    },
    [setSave]
  )

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

  const buyShopItem = useCallback(
    (item) => {
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
    },
    [setSave, showToast]
  )

  // v1: no real money. "Buying" a product is simulated and labeled as such.
  const simulatePurchase = useCallback(
    (productId) => {
      setSave((s) => {
        if (productId === 'starter') return s.starterPack ? s : { ...s, starterPack: true, coins: s.coins + 300, ownedCosmetics: [...s.ownedCosmetics, 'banner_novice'] }
        if (productId === 'monthly') return { ...s, monthlyPass: true, keys: KEYS_MAX }
        if (productId === 'coins_s') return { ...s, coins: s.coins + 500 }
        if (productId === 'coins_m') return { ...s, coins: s.coins + 1200 }
        if (productId === FLASH_OFFER.id) return { ...s, coins: s.coins + FLASH_OFFER.coins, flashOffer: { ...s.flashOffer, purchased: true } }
        return s
      })
      showToast('Simulated purchase — no real money in v1')
    },
    [setSave, showToast]
  )

  const watchAdForKey = useCallback(() => {
    // Simulated ad: a free key path must always exist (ethical guardrail).
    setSave((s) => ({ ...s, keys: Math.min(KEYS_MAX, s.keys + 1) }))
    showToast('+1 Vault Key (ad watched)')
  }, [setSave, showToast])

  const claimMilestone = useCallback(
    (floor) => {
      setSave((s) => {
        if (s.claimedMilestones.includes(floor) || s.bestFloor < floor) return s
        return { ...s, claimedMilestones: [...s.claimedMilestones, floor], coins: s.coins + milestoneReward(floor).coins }
      })
    },
    [setSave]
  )

  const updateSave = useCallback(
    (patch) => {
      setSave((s) => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) }))
    },
    [setSave]
  )

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
    turnPlayer,
    stepPlayer,
    combatAction,
    combatFlee,
    openChest,
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
