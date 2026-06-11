// MECHANIC 5: SOCIAL VALIDATION — global / friends / weekly boards.
// Rivals are simulated locally in v1 (see socialSystem.js).

import { useState } from 'react'
import { useGame } from '../hooks/useGameState'
import { globalLeaderboard, friendsBoard, weeklyLeaderboard, witnessCount } from '../systems/socialSystem'
import { msUntilSunday, formatCountdown } from '../systems/fomoClock'

const VIEWS = ['Global', 'Friends', 'Weekly']

function Row({ entry, rank }) {
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2 rounded-xl ${
        entry.isPlayer ? 'bg-vault-gold/10 border border-vault-gold/40' : rank <= 3 ? 'bg-white/5' : ''
      }`}
    >
      <span className={`w-8 text-center font-bold ${rank <= 3 ? 'text-vault-gold' : 'text-slate-500'}`}>
        {rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank}
      </span>
      <span className={`flex-1 text-sm ${entry.isPlayer ? 'gold-text' : ''}`}>{entry.isPlayer ? 'You' : entry.name}</span>
      <span className="text-sm font-semibold">Floor {entry.floor}</span>
    </div>
  )
}

export default function Leaderboard() {
  const { save } = useGame()
  const [view, setView] = useState('Global')

  const playerEntry = { name: save.vaultName, floor: save.bestFloor }
  const board =
    view === 'Global'
      ? globalLeaderboard(playerEntry)
      : view === 'Friends'
        ? friendsBoard(playerEntry)
        : weeklyLeaderboard(save.weeklyBestFloor)

  return (
    <div className="px-4 pt-4">
      <h1 className="font-black text-lg mb-3">🏆 Rankings</h1>

      <div className="grid grid-cols-3 gap-2 mb-3">
        {VIEWS.map((v) => (
          <button
            key={v}
            className={`btn-ghost !py-2 text-sm ${view === v ? 'border-vault-gold text-vault-gold' : ''}`}
            onClick={() => setView(v)}
          >
            {v}
          </button>
        ))}
      </div>

      {view === 'Weekly' && (
        <div className="panel p-3 mb-3 flex justify-between items-center text-xs">
          <span className="text-slate-400">Top 3 earn an exclusive badge 🎖️</span>
          <span className="text-vault-hp font-mono">resets in {formatCountdown(msUntilSunday())}</span>
        </div>
      )}

      {save.bestFloor > 0 && view !== 'Weekly' && (
        // "Witnessed by" — social proof on your record run.
        <div className="panel p-3 mb-3 text-xs text-slate-400">
          👁️ Your Floor {save.bestFloor} record was witnessed by{' '}
          <span className="text-vault-rare font-bold">{witnessCount(save.bestFloor)} players</span>
        </div>
      )}

      <div className="panel p-2 space-y-1 mb-4">
        {board.slice(0, 50).map((entry, i) => (
          <Row key={`${entry.name}-${i}`} entry={entry} rank={i + 1} />
        ))}
      </div>
    </div>
  )
}
