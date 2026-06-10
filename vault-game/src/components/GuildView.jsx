// MECHANIC 5: guild — shared weekly score, vault chest, chat.
// Guildmates are simulated locally in v1; swap socialSystem for a real API later.

import { useState } from 'react'
import { useGame } from '../hooks/useGameState'
import { GUILD, guildWeeklyScore, GUILD_CHAT_SEED } from '../systems/socialSystem'
import { msUntilSunday, formatCountdown } from '../systems/fomoClock'

const GUILD_CHEST_TARGET = 2000

export default function GuildView() {
  const { save } = useGame()
  const [messages, setMessages] = useState(GUILD_CHAT_SEED)
  const [draft, setDraft] = useState('')

  const scores = guildWeeklyScore(save.guildContribution)
  const total = scores.reduce((sum, m) => sum + m.score, 0)

  const send = () => {
    const text = draft.trim()
    if (!text) return
    setMessages((m) => [...m, { from: 'You', text }])
    setDraft('')
  }

  return (
    <div className="px-4 pt-4">
      <h1 className="font-black text-lg mb-1">⚜️ {GUILD.name}</h1>
      <p className="text-xs text-slate-500 mb-3">{GUILD.members.length}/10 members</p>

      {/* weekly guild score + shared chest goal */}
      <div className="panel p-4 mb-3">
        <div className="flex justify-between items-baseline mb-2">
          <p className="font-bold text-sm">Weekly Guild Score</p>
          <p className="text-xs text-vault-hp font-mono">resets in {formatCountdown(msUntilSunday())}</p>
        </div>
        <div className="progress-track mb-1">
          <div
            className="progress-fill"
            style={{ width: `${Math.min(100, (total / GUILD_CHEST_TARGET) * 100)}%`, background: '#F5C842' }}
          />
        </div>
        <p className="text-xs text-slate-400">
          {total.toLocaleString()} / {GUILD_CHEST_TARGET.toLocaleString()} pts — Guild Vault Chest unlocks at{' '}
          {GUILD_CHEST_TARGET.toLocaleString()}
        </p>
      </div>

      {/* member contributions */}
      <div className="panel p-2 mb-3 space-y-1">
        {scores.map((m, i) => (
          <div
            key={m.name}
            className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm ${m.isPlayer ? 'bg-vault-gold/10 border border-vault-gold/40' : ''}`}
          >
            <span className="w-6 text-center text-slate-500 font-bold">{i + 1}</span>
            <span className={`flex-1 ${m.isPlayer ? 'gold-text' : ''}`}>{m.name}</span>
            <span className="font-semibold">{m.score.toLocaleString()} pts</span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-600 mb-3">Your score grows by 1 per floor cleared this week.</p>

      {/* guild chat (local-only in v1) */}
      <div className="panel p-4 mb-4">
        <p className="font-bold text-sm mb-2">💬 Guild Chat</p>
        <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
          {messages.map((m, i) => (
            <p key={i} className="text-xs">
              <span className={m.from === 'You' ? 'gold-text' : 'text-vault-rare font-semibold'}>{m.from}:</span>{' '}
              <span className="text-slate-300">{m.text}</span>
            </p>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-sm outline-none focus:border-vault-gold/50"
            placeholder="Message your guild…"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button className="btn-gold !py-2 text-sm" onClick={send}>Send</button>
        </div>
      </div>
    </div>
  )
}
