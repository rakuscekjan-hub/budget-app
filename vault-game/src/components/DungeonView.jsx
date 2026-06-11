// The in-run screen: 3D world viewport with HUD, plus every overlay a run
// can spawn — tactical combat, chest reveals, level-up perk picks, lore.

import { useEffect, useState } from 'react'
import { useGame } from '../hooks/useGameState'
import World3D from './World3D'
import CombatRoom from './CombatRoom'
import LootChest from './LootChest'
import { isArchitectFloor } from '../data/enemies'
import { CLASSES, perkById, xpForLevel } from '../systems/classes'

function PerkChoice() {
  // RPG layer: level-up → pick 1 of 3 pieces of gear for this run.
  const { run, choosePerk } = useGame()
  const choices = run?.perkChoices[0]
  if (!choices) return null
  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-5">
      <div className="w-full max-w-sm animate-popIn">
        <p className="text-center text-2xl mb-1">⬆️</p>
        <h2 className="text-center text-lg font-bold gold-text mb-1">Level {run.level}!</h2>
        <p className="text-center text-xs text-slate-400 mb-4">Choose your spoils — it lasts this run.</p>
        <div className="space-y-2">
          {choices.map((id) => {
            const p = perkById(id)
            return (
              <button key={id} className="panel w-full p-4 flex items-center gap-3 active:scale-95 transition-transform text-left" onClick={() => choosePerk(id)}>
                <span className="text-3xl">{p.glyph}</span>
                <span>
                  <span className="font-bold text-sm block">{p.name}</span>
                  <span className="text-xs text-slate-400">{p.desc}</span>
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default function DungeonView({ onEnd }) {
  const { run, openChest, loreForFloor, save } = useGame()
  const [banner, setBanner] = useState(null)
  // chest overlay stays mounted until the last reveal is collected
  const [chestVisible, setChestVisible] = useState(false)
  useEffect(() => {
    if (run?.chestQueue.length && !run.combat && !run.defeated) setChestVisible(true)
  }, [run?.chestQueue.length, run?.combat, run?.defeated])

  // lore banner on each new floor
  useEffect(() => {
    if (!run) return
    setBanner({ floor: run.floor, lore: loreForFloor(run.floor) })
    const id = setTimeout(() => setBanner(null), 4500)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.floor])

  if (!run) return null

  const enemiesLeft = run.dungeon.enemies.reduce((n, g) => n + g.group.length, 0)
  const architect = isArchitectFloor(run.floor)
  const cls = CLASSES[run.classId]
  const xpNeed = xpForLevel(run.level)
  const inOverlay = run.combat || run.defeated || chestVisible || run.perkChoices.length > 0

  return (
    <div className="h-screen flex flex-col p-3 gap-2 select-none">
      {/* top bar */}
      <div className="flex items-center justify-between">
        <button className="text-slate-500 text-sm" onClick={onEnd}>← Retreat</button>
        <div className="text-center leading-tight">
          <p className="font-bold text-sm">{architect ? "⚠️ ARCHITECT'S FLOOR" : `Floor ${run.floor}`}</p>
          <p className="text-[10px] text-slate-500">
            {enemiesLeft > 0 ? `${enemiesLeft} enemies haunt this floor` : 'cleared — find the golden portal'}
          </p>
        </div>
        <p className="text-sm gold-text">🪙 {run.coinsEarned}</p>
      </div>

      {/* 3D world */}
      <div className="relative flex-1 min-h-0">
        <World3D />
        {banner && !inOverlay && (
          <div className="absolute inset-x-3 bottom-3 panel p-3 animate-slideUp bg-black/80 pointer-events-none">
            <p className="text-xs font-bold gold-text mb-0.5">Floor {banner.floor}</p>
            <p className="text-[11px] text-slate-300 italic">“{banner.lore}”</p>
          </div>
        )}
      </div>

      {/* player status */}
      <div className="panel p-3">
        <div className="flex justify-between items-center text-xs mb-1">
          <span>
            {cls.glyph} <b>{cls.name}</b> · Lv {run.level}
          </span>
          {run.combo >= 2 && <span className="font-black text-vault-gold">{run.combo}× COMBO</span>}
          <span className="text-slate-400">⚔️ {run.attack} · 🛡️ {run.defense} · 🍀 {run.luck}%</span>
        </div>
        <div className="progress-track mb-1.5">
          <div
            className="progress-fill !duration-300"
            style={{ width: `${(run.hp / run.maxHp) * 100}%`, background: run.hp / run.maxHp < 0.3 ? '#EF4444' : '#10B981' }}
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="progress-track flex-1 !h-1.5">
            <div className="progress-fill" style={{ width: `${(run.xp / xpNeed) * 100}%`, background: '#38BDF8' }} />
          </div>
          <span className="text-[9px] text-slate-500">
            ❤️ {run.hp}/{run.maxHp} · XP {run.xp}/{xpNeed}
          </span>
        </div>
        {save.settings.chillMode && <p className="text-[10px] text-slate-500 mt-1.5">🧘 Chill mode — explore at your own pace</p>}
      </div>

      <p className="text-center text-[10px] text-slate-600">
        🕹️ left thumb = walk · drag right = look · WASD + mouse on desktop · walk into enemies to fight
      </p>

      {/* overlays */}
      {(run.combat || run.defeated) && <CombatRoom onEnd={onEnd} />}
      {!run.combat && !run.defeated && run.perkChoices.length > 0 && <PerkChoice />}
      {!run.combat && !run.defeated && run.perkChoices.length === 0 && chestVisible && (
        <LootChest
          open={openChest}
          queueLength={run.chestQueue.length}
          label={`Floor ${run.floor} spoils`}
          onDone={() => {
            if (!run.chestQueue.length) setChestVisible(false)
          }}
        />
      )}
    </div>
  )
}
