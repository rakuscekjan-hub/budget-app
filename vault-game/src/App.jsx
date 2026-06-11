import { useEffect, useState } from 'react'
import { GameProvider, useGame } from './hooks/useGameState'
import GameScreen from './components/GameScreen'
import DungeonView from './components/DungeonView'
import ShopModal from './components/ShopModal'
import Leaderboard from './components/Leaderboard'
import GuildView from './components/GuildView'
import ProfilePage from './components/ProfilePage'
import { FLASH_OFFER, formatCountdown } from './systems/fomoClock'

const TABS = [
  { id: 'vault', label: 'Vault', glyph: '🏛️' },
  { id: 'shop', label: 'Shop', glyph: '🛒' },
  { id: 'ranks', label: 'Ranks', glyph: '🏆' },
  { id: 'guild', label: 'Guild', glyph: '⚜️' },
  { id: 'profile', label: 'Profile', glyph: '🎭' },
]

function FlashOfferPopup() {
  // MECHANIC 4: time-limited flash offer after clearing floor 10.
  const { save, simulatePurchase } = useGame()
  const [now, setNow] = useState(Date.now())
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const offer = save.flashOffer
  const remaining = offer.shownAt + FLASH_OFFER.windowMs - now
  const active = offer.shownAt > 0 && !offer.purchased && remaining > 0 && !dismissed
  if (!active) return null

  return (
    <div className="fixed inset-x-4 bottom-24 z-40 animate-slideUp">
      <div className="panel p-4 border-vault-gold/40 shadow-lg" style={{ '--glow-color': 'rgba(245,200,66,0.4)' }}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="gold-text">{FLASH_OFFER.label}</p>
            <p className="text-xs text-slate-400">
              for {FLASH_OFFER.price} — expires in <span className="text-vault-hp font-mono">{formatCountdown(remaining)}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {/* ETHICAL GUARDRAIL: the X is a real dismiss, never a purchase trap */}
            <button className="btn-ghost !px-3 !py-2 text-sm" onClick={() => setDismissed(true)}>✕</button>
            <button className="btn-gold !px-3 !py-2 text-sm" onClick={() => simulatePurchase(FLASH_OFFER.id)}>
              Get it
            </button>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-2">Simulated purchase — no real money in v1.</p>
      </div>
    </div>
  )
}

function BreakReminder() {
  // ETHICAL GUARDRAIL: session-time nudge after 45 minutes, fully dismissable.
  const { breakReminder, dismissBreakReminder } = useGame()
  if (!breakReminder) return null
  return (
    <div className="fixed inset-x-4 top-4 z-50 animate-slideUp">
      <div className="panel p-4 flex items-center justify-between gap-3">
        <p className="text-sm">You've been playing 45 min — take a break? 🧘</p>
        <button className="btn-ghost !px-3 !py-2 text-sm" onClick={dismissBreakReminder}>
          Dismiss
        </button>
      </div>
    </div>
  )
}

function Toast() {
  const { toast } = useGame()
  if (!toast) return null
  return (
    <div className="fixed inset-x-0 top-16 z-50 flex justify-center pointer-events-none">
      <div className="bg-vault-panel2 border border-white/10 rounded-full px-4 py-2 text-sm animate-popIn">{toast.msg}</div>
    </div>
  )
}

function Shell() {
  const { run, endRun } = useGame()
  const [tab, setTab] = useState('vault')
  const [summary, setSummary] = useState(null)

  // A run hijacks the whole screen — full immersion, no nav distractions.
  if (run) {
    return (
      <div className="max-w-md mx-auto min-h-screen">
        <DungeonView onEnd={() => setSummary(endRun())} />
        <BreakReminder />
        <Toast />
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto min-h-screen pb-24">
      {tab === 'vault' && <GameScreen />}
      {tab === 'shop' && <ShopModal />}
      {tab === 'ranks' && <Leaderboard />}
      {tab === 'guild' && <GuildView />}
      {tab === 'profile' && <ProfilePage />}

      {summary && <RunSummary summary={summary} onClose={() => setSummary(null)} />}
      <FlashOfferPopup />
      <BreakReminder />
      <Toast />

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-vault-panel/95 backdrop-blur border-t border-white/5">
        <div className="max-w-md mx-auto grid grid-cols-5">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`py-3 flex flex-col items-center gap-0.5 text-[11px] transition-colors ${
                tab === t.id ? 'text-vault-gold' : 'text-slate-500'
              }`}
            >
              <span className="text-xl">{t.glyph}</span>
              {t.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  )
}

function RunSummary({ summary, onClose }) {
  const { save } = useGame()
  const share = () => {
    const text = `🏛️ VAULT — I reached Floor ${summary.floorsCleared}! My record: Floor ${Math.max(save.bestFloor, summary.floorsCleared)}. Can you go deeper?`
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else navigator.clipboard?.writeText(text)
  }
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6">
      <div className="panel p-6 w-full max-w-sm text-center animate-popIn">
        {summary.newRecord ? (
          <>
            {/* PLAY: legendary_explosion.mp3 — new personal record celebration */}
            <p className="text-4xl mb-2">🎉</p>
            <h2 className="text-xl gold-text mb-1">NEW RECORD!</h2>
          </>
        ) : (
          <h2 className="text-xl font-bold mb-1">Run Complete</h2>
        )}
        <p className="text-slate-400 text-sm mb-4">The vault reclaims you… but your progress remains.</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-black/30 rounded-xl p-3">
            <p className="text-2xl font-bold">{summary.floorsCleared}</p>
            <p className="text-[10px] text-slate-500">FLOORS</p>
          </div>
          <div className="bg-black/30 rounded-xl p-3">
            <p className="text-2xl font-bold text-vault-gold">{summary.coins}</p>
            <p className="text-[10px] text-slate-500">COINS</p>
          </div>
          <div className="bg-black/30 rounded-xl p-3">
            <p className="text-2xl font-bold text-vault-xp">{summary.xp}</p>
            <p className="text-[10px] text-slate-500">XP</p>
          </div>
        </div>
        {summary.friendNote && (
          <p className="text-xs text-vault-rare mb-4">👥 {summary.friendNote}</p>
        )}
        <div className="flex gap-2">
          <button className="btn-ghost flex-1" onClick={share}>Share 📤</button>
          <button className="btn-gold flex-1" onClick={onClose}>Continue</button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <GameProvider>
      <Shell />
    </GameProvider>
  )
}
