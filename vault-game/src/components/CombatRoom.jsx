// Turn-based, 1-tap combat. Tap an enemy to strike; survivors hit back.
// MECHANIC 2 surfaces here: the combo counter builds rhythm and tension.

import { useEffect, useState } from 'react'
import { useGame } from '../hooks/useGameState'
import LootChest from './LootChest'
import { isArchitectFloor } from '../data/enemies'
import { todayKey } from '../systems/fomoClock'
import { reviveOptions, REVIVE_COST_VC } from '../systems/monetizationLayer'

function EnemyCard({ enemy, onTap, hit }) {
  const dead = enemy.hp <= 0
  return (
    <button
      onClick={() => onTap(enemy.uid)}
      disabled={dead}
      className={`panel p-4 flex flex-col items-center gap-2 transition-all ${
        dead ? 'opacity-25 grayscale' : 'active:scale-95'
      } ${hit ? 'animate-shake' : ''} ${enemy.isBoss ? 'border-vault-legendary/60' : ''}`}
    >
      <span className={enemy.isBoss ? 'text-6xl' : 'text-5xl'}>{enemy.glyph}</span>
      <span className="text-xs font-semibold">{enemy.name}</span>
      <div className="progress-track w-full">
        <div
          className="progress-fill !duration-200"
          style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%`, background: '#EF4444' }}
        />
      </div>
      <span className="text-[10px] text-slate-400">
        {enemy.hp}/{enemy.maxHp} HP · {enemy.damage} DMG
      </span>
    </button>
  )
}

function ReviveModal({ onEnd }) {
  const { save, revive } = useGame()
  const opts = reviveOptions(save, todayKey())
  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-6">
      <div className="panel p-6 w-full max-w-sm text-center animate-popIn">
        <p className="text-5xl mb-2">💀</p>
        <h2 className="text-xl font-bold mb-1">You have fallen</h2>
        <p className="text-sm text-slate-400 mb-5">Rise again at half strength, or let the vault keep its secrets.</p>
        <div className="space-y-2">
          {/* Revive ladder: free daily → ad → coins. Never cash-only. */}
          {opts.freeAvailable && (
            <button className="btn-gold w-full" onClick={() => revive('free')}>
              ✨ Free Revive (1/day)
            </button>
          )}
          <button className="btn-ghost w-full" onClick={() => revive('ad')}>
            📺 Watch Ad to Revive (simulated)
          </button>
          <button className="btn-ghost w-full" disabled={save.coins < REVIVE_COST_VC} onClick={() => revive('coins')}>
            🪙 Revive for {REVIVE_COST_VC} VC
          </button>
          <button className="w-full py-3 text-sm text-slate-500" onClick={onEnd}>
            Accept death — keep coins, artifacts & XP
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CombatRoom({ onEnd }) {
  const { run, attackEnemy, openChest, descend, save, loreForFloor } = useGame()
  const [showChests, setShowChests] = useState(false)

  // Pop the chest sequence shortly after the room clears.
  useEffect(() => {
    if (run?.cleared && run.chestQueue.length > 0) {
      const id = setTimeout(() => setShowChests(true), 600)
      return () => clearTimeout(id)
    }
  }, [run?.cleared, run?.chestQueue.length])

  if (!run) return null

  const event = run.lastEvent
  const architect = isArchitectFloor(run.floor)

  return (
    <div className="min-h-screen flex flex-col p-4 gap-3">
      {/* top bar: depth, combo, escape hatch */}
      <div className="flex items-center justify-between">
        <button className="text-slate-500 text-sm" onClick={onEnd}>← Retreat</button>
        <div className="text-center">
          <p className="font-bold">{architect ? "⚠️ ARCHITECT'S CHALLENGE" : `Floor ${run.floor}`}</p>
          {architect && <p className="text-[10px] text-vault-legendary">massive reward awaits</p>}
        </div>
        <p className="text-sm gold-text">🪙 {run.coinsEarned}</p>
      </div>

      {/* combo counter — visible rhythm builder */}
      <div className="h-8 flex items-center justify-center">
        {run.combo >= 2 && (
          <p key={run.combo} className="font-black text-vault-gold text-xl animate-popIn">
            {run.combo}× COMBO
          </p>
        )}
        {run.speedBonus && run.cleared && (
          <p className="text-sm text-vault-rare font-bold animate-popIn">⚡ Speed clear — bonus chest!</p>
        )}
      </div>

      {/* enemies */}
      <div className={`flex-1 grid gap-3 content-center ${run.enemies.length === 1 ? 'grid-cols-1 px-10' : 'grid-cols-2'}`}>
        {run.enemies.map((e) => (
          <EnemyCard key={e.uid} enemy={e} onTap={attackEnemy} hit={event?.targetUid === e.uid && Date.now() - event.at < 400} />
        ))}
      </div>

      {/* floating combat feedback */}
      <div className="h-10 text-center relative">
        {event && (
          <div key={event.at} className="animate-floatUp absolute inset-x-0">
            <span className={`font-black text-lg ${event.crit ? 'text-vault-legendary' : 'text-white'}`}>
              −{event.dmg}{event.crit ? ' CRIT!' : ''}
            </span>
            {event.incoming > 0 && <span className="ml-3 text-vault-hp font-bold">you took {event.incoming}</span>}
          </div>
        )}
      </div>

      {/* cleared state: lore + descend */}
      {run.cleared && !showChests && run.chestQueue.length === 0 && (
        <div className="panel p-4 text-center animate-slideUp">
          <p className="text-sm text-slate-400 italic mb-3">“{loreForFloor(run.floor)}”</p>
          <button className="btn-gold w-full" onClick={descend}>
            Descend to Floor {run.floor + 1} ⬇️
          </button>
        </div>
      )}

      {/* player status */}
      <div className="panel p-4">
        <div className="flex justify-between text-xs mb-1">
          <span>
            ❤️ {run.hp}/{run.maxHp}
          </span>
          <span className="text-slate-400">
            ⚔️ {run.attack} · 🛡️ {run.defense} · 🍀 {run.luck}%
          </span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill !duration-300"
            style={{ width: `${(run.hp / run.maxHp) * 100}%`, background: run.hp / run.maxHp < 0.3 ? '#EF4444' : '#10B981' }}
          />
        </div>
        {save.settings.chillMode && <p className="text-[10px] text-slate-500 mt-2">🧘 Chill mode — no pressure, explore at your pace</p>}
      </div>

      {showChests && (
        <LootChest
          open={openChest}
          queueLength={run.chestQueue.length}
          label={`Floor ${run.floor} spoils`}
          onDone={() => {
            if (!run.chestQueue.length) setShowChests(false)
          }}
        />
      )}

      {run.defeated && <ReviveModal onEnd={onEnd} />}
    </div>
  )
}
