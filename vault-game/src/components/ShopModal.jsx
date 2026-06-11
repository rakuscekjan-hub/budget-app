// MECHANIC 4 + 6: daily rotating shop with countdown, simulated IAP shelf,
// spend-cap controls. Everything paid is cosmetic/convenience — never power.

import { useEffect, useState } from 'react'
import { useGame } from '../hooks/useGameState'
import { dailyShop, msUntilMidnight, formatCountdown, todayKey } from '../systems/fomoClock'
import { PRODUCTS } from '../systems/monetizationLayer'

function Countdown({ msFn, className }) {
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  return <span className={className}>{formatCountdown(msFn(now))}</span>
}

export default function ShopModal() {
  const { save, buyShopItem, simulatePurchase, updateSave } = useGame()
  const items = dailyShop()
  const today = todayKey()
  const spentToday = save.dailySpend.date === today ? save.dailySpend.amount : 0

  return (
    <div className="px-4 pt-4">
      <div className="flex items-baseline justify-between mb-3">
        <h1 className="font-black text-lg">🛒 Vault Shop</h1>
        <p className="gold-text">🪙 {save.coins.toLocaleString()}</p>
      </div>

      {/* daily rotation + FOMO countdown */}
      <div className="panel p-4 mb-3">
        <div className="flex justify-between items-center mb-3">
          <p className="font-bold text-sm">Today's Rotation</p>
          <p className="text-xs text-vault-hp font-mono">
            refreshes in <Countdown msFn={() => msUntilMidnight()} />
          </p>
        </div>
        <div className="space-y-2">
          {items.map((item) => {
            const owned = save.ownedCosmetics.includes(item.id) && item.kind !== 'consumable'
            return (
              <button
                key={item.id}
                className="btn-ghost w-full flex items-center justify-between"
                disabled={owned}
                onClick={() => buyShopItem(item)}
              >
                <span className="text-sm">
                  {item.glyph} {item.name}
                </span>
                <span className="gold-text text-sm">{owned ? 'Owned ✓' : `${item.cost} VC`}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* seasonal exclusivity */}
      <div className="panel p-4 mb-3 border-vault-rare/30">
        <p className="font-bold text-sm text-vault-rare">🐉 Season 1 Exclusives</p>
        <p className="text-xs text-slate-400 mt-1">
          Dragon Skin · Tier 21 of the Season Pass — marked <span className="text-vault-rare font-bold">SEASON 1, NEVER RETURNING</span>
        </p>
      </div>

      {/* simulated IAP shelf — v1 has no real money */}
      <div className="panel p-4 mb-3">
        <p className="font-bold text-sm mb-1">💎 Premium (simulated in v1)</p>
        <p className="text-[10px] text-slate-500 mb-3">No real money is charged. These buttons simulate purchases for testing.</p>
        <div className="space-y-2">
          {PRODUCTS.map((p) => {
            const owned = (p.id === 'monthly' && save.monthlyPass) || (p.id === 'starter' && save.starterPack)
            return (
              <button
                key={p.id}
                className="btn-ghost w-full flex items-center justify-between"
                disabled={owned}
                onClick={() => simulatePurchase(p.id)}
              >
                <span className="text-left">
                  <span className="text-sm font-semibold block">{p.name}</span>
                  <span className="text-[10px] text-slate-400">{p.desc}</span>
                </span>
                <span className="gold-text text-sm whitespace-nowrap">{owned ? 'Active ✓' : p.price}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ETHICAL GUARDRAIL: optional self-set daily spend cap */}
      <div className="panel p-4 mb-3">
        <p className="font-bold text-sm mb-1">🛡️ Daily Spend Limit</p>
        <p className="text-xs text-slate-400 mb-2">
          Optional cap on Vault Coins spent per day. Spent today: <span className="gold-text">{spentToday} VC</span>
        </p>
        <div className="flex gap-2">
          {[0, 200, 500, 1000].map((cap) => (
            <button
              key={cap}
              className={`btn-ghost flex-1 !py-2 text-xs ${save.settings.spendCapDaily === cap ? 'border-vault-gold text-vault-gold' : ''}`}
              onClick={() => updateSave((s) => ({ settings: { ...s.settings, spendCapDaily: cap } }))}
            >
              {cap === 0 ? 'No cap' : `${cap} VC`}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
