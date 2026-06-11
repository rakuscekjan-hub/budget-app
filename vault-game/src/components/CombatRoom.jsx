// Tactical turn-based combat overlay. Every enemy telegraphs its next move,
// so each turn is a real decision: strike, guard the incoming volley, spend
// the special, or cut your losses and flee.

import { useState } from 'react'
import { useGame } from '../hooks/useGameState'
import { todayKey } from '../systems/fomoClock'
import { reviveOptions, REVIVE_COST_VC } from '../systems/monetizationLayer'

function IntentBadge({ enemy, defense }) {
  const i = enemy.intent
  if (i.type === 'attack') {
    const expected = Math.max(1, Math.round(i.value) - defense)
    return (
      <span className={`text-[10px] font-bold ${enemy.charged ? 'text-vault-legendary' : 'text-vault-hp'}`}>
        ⚔️ attacks for {expected}
      </span>
    )
  }
  if (i.type === 'charge') return <span className="text-[10px] font-bold text-vault-legendary">💢 charging up…</span>
  return <span className="text-[10px] font-bold text-vault-xp">🛡️ defending</span>
}

function EnemyCard({ enemy, onTap, armed, defense }) {
  return (
    <button
      onClick={() => onTap(enemy.uid)}
      className={`panel p-3 flex flex-col items-center gap-1.5 active:scale-95 transition-all ${
        enemy.isBoss ? 'border-vault-legendary/60' : ''
      } ${armed ? 'border-vault-gold/70 animate-glowPulse' : ''}`}
      style={armed ? { '--glow-color': 'rgba(245,200,66,0.3)' } : undefined}
    >
      <span className={enemy.isBoss ? 'text-5xl' : 'text-4xl'}>{enemy.glyph}</span>
      <span className="text-xs font-semibold">{enemy.name}</span>
      <IntentBadge enemy={enemy} defense={defense} />
      <div className="progress-track w-full">
        <div
          className="progress-fill !duration-200"
          style={{ width: `${(enemy.hp / enemy.maxHp) * 100}%`, background: '#EF4444' }}
        />
      </div>
      <span className="text-[10px] text-slate-400">
        {enemy.hp}/{enemy.maxHp} HP{enemy.defending ? ' · guarded' : ''}{enemy.charged ? ' · CHARGED' : ''}
      </span>
    </button>
  )
}

function ReviveModal({ onEnd }) {
  const { save, revive } = useGame()
  const opts = reviveOptions(save, todayKey())
  return (
    <div className="fixed inset-0 z-[60] bg-black/85 flex items-center justify-center p-6">
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

function EventLog({ event }) {
  if (!event) return null
  return (
    <div key={event.at} className="h-12 text-center relative overflow-visible">
      <div className="animate-floatUp absolute inset-x-0">
        {event.events.map((e, i) => {
          if (e.kind === 'attack' || e.kind === 'special')
            return (
              <span key={i} className={`mx-1 font-black ${e.crit ? 'text-vault-legendary' : 'text-white'}`}>
                −{e.dmg}{e.crit ? ' CRIT!' : ''}{e.kind === 'special' ? ' 💥' : ''}{e.blocked ? ' (guarded)' : ''}
              </span>
            )
          if (e.kind === 'kill') return <span key={i} className="mx-1 text-vault-gold font-bold">☠️ {e.name}</span>
          if (e.kind === 'hurt')
            return (
              <span key={i} className="mx-1 text-vault-hp font-bold">
                you took {e.dmg}{e.blocked ? ' (blocked!)' : ''}
              </span>
            )
          if (e.kind === 'defend') return <span key={i} className="mx-1 text-vault-xp font-bold">🛡️ guarding</span>
          return null
        })}
      </div>
    </div>
  )
}

export default function CombatRoom({ onEnd }) {
  const { run, combatAction, combatFlee } = useGame()
  const [specialArmed, setSpecialArmed] = useState(false)

  if (!run?.combat && !run?.defeated) return null
  const c = run.combat

  const tapEnemy = (uid) => {
    combatAction(specialArmed ? 'special' : 'attack', uid)
    setSpecialArmed(false)
  }

  return (
    <div className="fixed inset-0 z-50 bg-vault-bg/95 flex flex-col p-4 gap-2">
      {c && (
        <>
          <div className="flex items-center justify-between">
            <p className="font-bold text-sm">⚔️ Turn {c.turn}</p>
            <p className="text-[10px] text-slate-500">win in ≤3 turns → bonus chest</p>
            {run.combo >= 2 ? (
              <p className="font-black text-vault-gold text-sm animate-popIn">{run.combo}× COMBO</p>
            ) : (
              <span className="w-16" />
            )}
          </div>

          <div className={`flex-1 grid gap-2 content-center ${c.enemies.length === 1 ? 'grid-cols-1 px-12' : 'grid-cols-2'}`}>
            {c.enemies.map((e) => (
              <EnemyCard key={e.uid} enemy={e} onTap={tapEnemy} armed={specialArmed} defense={run.defense} />
            ))}
          </div>

          <EventLog event={c.lastEvent} />

          <p className="text-center text-[11px] text-slate-500">
            {specialArmed ? '💥 Special armed — tap an enemy to unleash it' : 'Tap an enemy to attack it'}
          </p>

          {/* action bar */}
          <div className="grid grid-cols-3 gap-2">
            <button
              className={`btn-ghost text-sm ${specialArmed ? 'border-vault-gold text-vault-gold' : ''}`}
              disabled={c.specialCd > 0}
              onClick={() => setSpecialArmed((v) => !v)}
            >
              💥 Special
              <span className="block text-[9px] text-slate-500">{c.specialCd > 0 ? `ready in ${c.specialCd}` : '2.2× damage'}</span>
            </button>
            <button className="btn-ghost text-sm" onClick={() => { setSpecialArmed(false); combatAction('defend') }}>
              🛡️ Defend
              <span className="block text-[9px] text-slate-500">block 60%</span>
            </button>
            <button className="btn-ghost text-sm" onClick={() => { setSpecialArmed(false); combatFlee() }}>
              🏃 Flee
              <span className="block text-[9px] text-slate-500">they strike once</span>
            </button>
          </div>

          {/* player status */}
          <div className="panel p-3">
            <div className="flex justify-between text-xs mb-1">
              <span>❤️ {run.hp}/{run.maxHp}</span>
              <span className="text-slate-400">⚔️ {run.attack} · 🛡️ {run.defense} · 🍀 {run.luck}%</span>
            </div>
            <div className="progress-track">
              <div
                className="progress-fill !duration-300"
                style={{ width: `${(run.hp / run.maxHp) * 100}%`, background: run.hp / run.maxHp < 0.3 ? '#EF4444' : '#10B981' }}
              />
            </div>
          </div>
        </>
      )}

      {run.defeated && <ReviveModal onEnd={onEnd} />}
    </div>
  )
}
