// MECHANIC 1: VARIABLE REWARD — suspenseful chest reveal.
// `open` rolls the chest (pity-aware) and returns the result; this component
// owns the 2-second wobble → burst → reveal sequence.

import { useState } from 'react'
import { useGame } from '../hooks/useGameState'
import { RARITY_META } from '../data/artifacts'
import { DROP_RATES, PITY_RULES } from '../systems/lootSystem'

function Particles({ color, count = 18 }) {
  return (
    <div className="absolute inset-0 pointer-events-none">
      {Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2
        const dist = 60 + Math.random() * 80
        return (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 w-2 h-2 rounded-full animate-particle"
            style={{
              background: color,
              '--px': `${Math.cos(angle) * dist}px`,
              '--py': `${Math.sin(angle) * dist}px`,
              animationDelay: `${Math.random() * 0.15}s`,
            }}
          />
        )
      })}
    </div>
  )
}

function DropRatesInfo({ onClose }) {
  // ETHICAL GUARDRAIL: drop rates are always one tap away.
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6" onClick={onClose}>
      <div className="panel p-5 w-full max-w-xs animate-popIn" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold mb-3">📊 Drop Rates</h3>
        <ul className="text-sm space-y-2">
          <li className="flex justify-between"><span className="text-slate-400">Common</span><span>{DROP_RATES.common * 100}%</span></li>
          <li className="flex justify-between"><span style={{ color: RARITY_META.rare.color }}>Rare</span><span>{DROP_RATES.rare * 100}%</span></li>
          <li className="flex justify-between"><span style={{ color: RARITY_META.legendary.color }}>Legendary</span><span>{DROP_RATES.legendary * 100}%</span></li>
        </ul>
        <p className="text-xs text-slate-500 mt-3">
          Pity protection: a Rare is guaranteed after {PITY_RULES.rareAfterCommons} Commons in a row, and a Legendary after{' '}
          {PITY_RULES.legendaryAfterRares} Rares without one.
        </p>
        <button className="btn-ghost w-full mt-4 text-sm" onClick={onClose}>Close</button>
      </div>
    </div>
  )
}

// queueLength counts the un-opened chests including the one on screen while
// idle; after `open` pops one it reflects what's still waiting.
export default function LootChest({ open, onDone, queueLength = 1, label = 'Loot Chest' }) {
  const { save } = useGame()
  const [phase, setPhase] = useState('idle') // idle | opening | revealed
  const [result, setResult] = useState(null)
  const [showRates, setShowRates] = useState(false)

  // Swift Hands (paid QoL) shortens the suspense — convenience, never power.
  const suspenseMs = save.settings.fastChests ? 500 : 2000

  const startOpen = () => {
    if (phase !== 'idle') return
    const chest = open()
    if (!chest) return
    setResult(chest)
    setPhase('opening')
    setTimeout(() => {
      setPhase('revealed')
      // PLAY: soft_chime.mp3 — common chest open
      // PLAY: rare_fanfare.mp3 — rare item reveal
      // PLAY: legendary_explosion.mp3 — legendary drop
    }, suspenseMs)
  }

  const meta = result ? RARITY_META[result.rarity] : null

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex flex-col items-center justify-center p-6">
      {phase === 'idle' && (
        <>
          <button onClick={startOpen} className="text-8xl active:scale-90 transition-transform" aria-label="Open chest">
            📦
          </button>
          <p className="mt-4 text-slate-300 font-semibold">{label}</p>
          {queueLength > 1 && <p className="text-xs text-slate-500">+{queueLength - 1} more waiting</p>}
          <div className="flex gap-2 mt-6">
            <button className="btn-gold" onClick={startOpen}>Open</button>
            <button className="btn-ghost" onClick={() => setShowRates(true)} aria-label="Drop rates">?</button>
          </div>
        </>
      )}

      {phase === 'opening' && (
        <div className="text-8xl animate-chestWobble" style={{ animationDuration: `${suspenseMs}ms` }}>
          📦
        </div>
      )}

      {phase === 'revealed' && result && (
        <div className="relative text-center animate-popIn">
          <Particles color={meta.color} count={result.rarity === 'legendary' ? 36 : result.rarity === 'rare' ? 24 : 12} />
          <p
            className="text-sm font-bold tracking-widest uppercase mb-2"
            style={{ color: meta.color, textShadow: `0 0 16px ${meta.glow}` }}
          >
            {meta.label}{result.bonus ? ' · SPEED BONUS' : ''}
          </p>
          <p className="text-7xl mb-3">{result.artifact ? result.artifact.glyph : '🪙'}</p>
          {result.artifact && (
            <div className="mb-2">
              <p className="font-bold" style={{ color: meta.color }}>{result.artifact.name}</p>
              <p className="text-xs text-slate-400">{result.artifact.effect.label} · added to Codex</p>
            </div>
          )}
          <p className="gold-text text-lg">+{result.coins} Vault Coins</p>
          <p className="text-xs text-vault-xp mb-6">+{result.xp} XP</p>
          <button
            className="btn-gold w-48"
            onClick={() => {
              setPhase('idle')
              setResult(null)
              onDone?.()
            }}
          >
            {queueLength > 0 ? `Next chest (${queueLength})` : 'Collect'}
          </button>
        </div>
      )}

      {showRates && <DropRatesInfo onClose={() => setShowRates(false)} />}
    </div>
  )
}
