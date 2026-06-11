// The hub between runs: keys, streak, HUD bars, upgrades, daily rituals.

import { useEffect, useState } from 'react'
import { useGame } from '../hooks/useGameState'
import HUD from './HUD'
import LootChest from './LootChest'
import { UPGRADES, upgradeCost, milestoneReward, MILESTONE_EVERY } from '../systems/progressionSystem'
import { CLASSES } from '../systems/classes'
import { KEYS_MAX, msToNextKey } from '../systems/monetizationLayer'
import { todayKey, loginBonus, formatCountdown, crimsonVaultEvent, scarcityCount } from '../systems/fomoClock'

function Header() {
  const { save } = useGame()
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <h1 className="font-black text-lg tracking-wide">
          VAULT <span className="text-vault-gold">·</span> {save.vaultName}
        </h1>
        <p className="text-xs text-slate-500">🔥 {save.streak}-day streak</p>
      </div>
      <div className="text-right">
        <p className="gold-text">🪙 {save.coins.toLocaleString()}</p>
        <p className="text-xs text-slate-400">{save.monthlyPass ? '🗝️ ∞ keys (Pass)' : `🗝️ ${save.keys}/${KEYS_MAX} keys`}</p>
      </div>
    </div>
  )
}

function LoginBonusBanner() {
  // MECHANIC 4: escalating login bonus — Day 1 = 50 VC … Day 7 = 500 VC.
  const { save, claimLoginBonus, showToast } = useGame()
  if (save.loginBonusClaimedDate === todayKey()) return null
  const bonus = loginBonus(save.streak || 1)
  return (
    <button
      className="w-full panel p-4 mb-3 flex items-center justify-between border-vault-gold/30 animate-glowPulse"
      style={{ '--glow-color': 'rgba(245,200,66,0.15)' }}
      onClick={() => {
        const b = claimLoginBonus()
        if (b) showToast(`Day ${save.streak || 1} login bonus: ${b.label}`)
        // PLAY: level_up.mp3 — login bonus claim
      }}
    >
      <div className="text-left">
        <p className="font-bold text-sm">🎁 Day {save.streak || 1} Login Bonus</p>
        <p className="text-xs text-slate-400">{bonus.label} — tap to claim</p>
      </div>
      <span className="text-2xl">→</span>
    </button>
  )
}

function ClassPicker() {
  // RPG identity: pick your class. Persistent, swappable between runs.
  const { save, updateSave } = useGame()
  return (
    <div className="panel p-4 mb-3">
      <p className="font-bold text-sm mb-2">🎭 Your Class</p>
      <div className="grid grid-cols-3 gap-2">
        {Object.values(CLASSES).map((c) => (
          <button
            key={c.id}
            className={`btn-ghost !px-2 !py-3 text-center ${save.classId === c.id ? 'border-vault-gold' : ''}`}
            onClick={() => updateSave({ classId: c.id })}
          >
            <p className="text-2xl">{c.glyph}</p>
            <p className={`text-xs font-bold ${save.classId === c.id ? 'text-vault-gold' : ''}`}>{c.name}</p>
            <p className="text-[9px] text-slate-500 leading-tight mt-1">{c.desc}</p>
          </button>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 mt-2">
        💥 Special: <b>{CLASSES[save.classId]?.special.name}</b> — {CLASSES[save.classId]?.special.desc}
      </p>
    </div>
  )
}

function StartRunCard() {
  const { save, startRun, watchAdForKey, updateSave } = useGame()
  const [, force] = useState(0)
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const canRun = save.monthlyPass || save.keys > 0

  return (
    <div className="panel p-4 mb-3 text-center">
      {save.bestFloor > 0 && (
        // MECHANIC 7: the game remembers your best — a personal challenge.
        <p className="text-sm text-slate-300 mb-2">
          Your record is <span className="gold-text">Floor {save.bestFloor}</span> — can you beat it today?
        </p>
      )}
      <button className="btn-gold w-full text-lg py-4" disabled={!canRun} onClick={startRun}>
        ⬇️ DESCEND {save.monthlyPass ? '' : '(1 🗝️)'}
      </button>
      {!save.monthlyPass && save.keys < KEYS_MAX && (
        <p className="text-xs text-slate-500 mt-2">next key in {formatCountdown(msToNextKey(save.lastKeyRegen))}</p>
      )}
      {!canRun && (
        // ETHICAL GUARDRAIL: out of keys is never a hard paywall.
        <button className="btn-ghost w-full mt-2 text-sm" onClick={watchAdForKey}>
          📺 Watch ad → +1 key (free, always available)
        </button>
      )}
      <label className="flex items-center justify-center gap-2 mt-3 text-xs text-slate-400">
        <input
          type="checkbox"
          checked={save.settings.chillMode}
          onChange={(e) => updateSave((s) => ({ settings: { ...s.settings, chillMode: e.target.checked } }))}
        />
        🧘 Chill mode (no pressure, gentler vault)
      </label>
    </div>
  )
}

function DailyChestCard() {
  // MECHANIC 1: daily mystery chest — rarity unknown until opened.
  const { save, claimDailyChest } = useGame()
  const [open, setOpen] = useState(false)
  const claimed = save.dailyChestDate === todayKey()
  return (
    <>
      <button
        className="w-full panel p-4 mb-3 flex items-center justify-between disabled:opacity-50"
        disabled={claimed}
        onClick={() => setOpen(true)}
      >
        <div className="text-left">
          <p className="font-bold text-sm">🎁 Daily Mystery Chest</p>
          <p className="text-xs text-slate-400">{claimed ? 'opened — a new one appears at midnight' : 'free · rarity unknown until opened'}</p>
        </div>
        <span className="text-3xl">{claimed ? '✅' : '📦'}</span>
      </button>
      {open && (
        <LootChest
          open={claimDailyChest}
          queueLength={claimed ? 0 : 1}
          label="Daily Mystery Chest"
          onDone={() => setOpen(false)}
        />
      )}
    </>
  )
}

function Milestones() {
  const { save, claimMilestone } = useGame()
  const claimable = []
  for (let f = MILESTONE_EVERY; f <= save.bestFloor; f += MILESTONE_EVERY) {
    if (!save.claimedMilestones.includes(f)) claimable.push(f)
  }
  if (!claimable.length) return null
  return (
    <div className="panel p-4 mb-3">
      <p className="font-bold text-sm mb-2">🏛️ Depth Milestones</p>
      {claimable.slice(0, 3).map((f) => (
        <button key={f} className="btn-ghost w-full mb-2 flex justify-between text-sm" onClick={() => claimMilestone(f)}>
          <span>Floor {f} reached</span>
          <span className="gold-text">+{milestoneReward(f).coins} VC</span>
        </button>
      ))}
    </div>
  )
}

function EventBanner() {
  // MECHANIC 4: weekly exclusive — gone Sunday, never identical again.
  const event = crimsonVaultEvent()
  return (
    <div className="panel p-4 mb-3 border-red-500/30">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-sm text-red-400">🩸 {event.name}</p>
          <p className="text-xs text-slate-400">
            Exclusive: <span className="text-red-300">{event.artifactName}</span> · {event.requirement}
          </p>
          <p className="text-[10px] text-slate-500 mt-1">Only {scarcityCount()} players earned this today</p>
        </div>
        <p className="text-xs font-mono text-red-400">{formatCountdown(event.endsIn)}</p>
      </div>
    </div>
  )
}

function Upgrades() {
  // Meta-progression: permanent, earned-currency-only stat upgrades.
  const { save, buyUpgrade } = useGame()
  return (
    <div className="panel p-4 mb-3">
      <p className="font-bold text-sm mb-2">⚒️ Permanent Upgrades</p>
      <div className="grid grid-cols-3 gap-2">
        {Object.entries(UPGRADES).map(([key, u]) => {
          const lvl = save.upgrades[key]
          const cost = upgradeCost(key, lvl)
          return (
            <button
              key={key}
              className="btn-ghost !px-2 text-center"
              disabled={save.coins < cost}
              onClick={() => buyUpgrade(key)}
            >
              <p className="text-xl">{u.glyph}</p>
              <p className="text-xs font-bold">{u.label} {lvl}</p>
              <p className="text-[10px] text-slate-400">{u.unit}</p>
              <p className="text-[10px] gold-text">{cost} VC</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function LoreTeaser() {
  const { save, loreForFloor } = useGame()
  if (!save.loreSeen) return null
  return (
    <div className="panel p-4 mb-3">
      <p className="font-bold text-sm mb-1">📜 Last fragment · Floor {save.loreSeen}</p>
      <p className="text-xs text-slate-400 italic">“{loreForFloor(save.loreSeen)}”</p>
      <p className="text-[10px] text-slate-600 mt-2">Who built this vault? What waits at the bottom? Descend to learn more.</p>
    </div>
  )
}

export default function GameScreen() {
  return (
    <div className="px-4">
      <Header />
      <LoginBonusBanner />
      <ClassPicker />
      <StartRunCard />
      <HUD />
      <div className="h-3" />
      <Milestones />
      <DailyChestCard />
      <EventBanner />
      <Upgrades />
      <LoreTeaser />
    </div>
  )
}
