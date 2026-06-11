// MECHANIC 7 (identity) + MECHANIC 5 (showing off): customization, titles,
// artifact showcase, full codex, share card.

import { useState } from 'react'
import { useGame } from '../hooks/useGameState'
import { ARTIFACTS, RARITY_META, artifactById } from '../data/artifacts'
import { masteryRank, earnedTitles, TITLES } from '../systems/progressionSystem'
import { shareCard, witnessCount } from '../systems/socialSystem'
import { SHOP_POOL } from '../systems/fomoClock'

const BODY_TYPES = ['🧍', '🧍‍♀️', '🧍‍♂️']
const FREE_SKINS = [
  { id: 'default', name: 'Vault Initiate', glyph: '🥾' },
  { id: 'wanderer', name: 'Wanderer', glyph: '🧥' },
  { id: 'acolyte', name: 'Acolyte', glyph: '🪬' },
]
const FREE_WEAPONS = [
  { id: 'default', name: 'Rusted Blade', glyph: '🗡️' },
  { id: 'torch', name: 'Torch', glyph: '🕯️' },
]

function cosmeticsOfKind(ownedIds, kind) {
  return SHOP_POOL.filter((c) => c.kind === kind && ownedIds.includes(c.id))
}

function Section({ title, children }) {
  return (
    <div className="panel p-4 mb-3">
      <p className="font-bold text-sm mb-2">{title}</p>
      {children}
    </div>
  )
}

export default function ProfilePage() {
  const { save, updateSave, showToast, ownedArtifacts } = useGame()
  const [editingName, setEditingName] = useState(false)
  const [nameDraft, setNameDraft] = useState(save.vaultName)
  const [showCodex, setShowCodex] = useState(false)

  const rank = masteryRank(save.masteryXP)
  const titles = earnedTitles(save, ownedArtifacts)
  const equipped = TITLES.find((t) => t.id === save.equippedTitle)
  const skins = [...FREE_SKINS, ...cosmeticsOfKind(save.ownedCosmetics, 'skin')]
  const weapons = [...FREE_WEAPONS, ...cosmeticsOfKind(save.ownedCosmetics, 'weaponSkin')]

  const share = () => {
    const text = shareCard(save)
    if (navigator.share) navigator.share({ text }).catch(() => {})
    else {
      navigator.clipboard?.writeText(text)
      showToast('Share card copied to clipboard')
    }
  }

  const toggleShowcase = (id) => {
    updateSave((s) => {
      const cur = s.showcase
      if (cur.includes(id)) return { showcase: cur.filter((x) => x !== id) }
      if (cur.length >= 3) return { showcase: [...cur.slice(1), id] } // keep newest 3
      return { showcase: [...cur, id] }
    })
  }

  return (
    <div className="px-4 pt-4">
      {/* identity card */}
      <div className="panel p-5 mb-3 text-center">
        <p className="text-6xl mb-1">{BODY_TYPES[save.bodyType]}</p>
        {editingName ? (
          <div className="flex gap-2 justify-center my-2">
            <input
              className="bg-black/30 border border-white/10 rounded-xl px-3 py-1 text-sm w-40 outline-none"
              value={nameDraft}
              maxLength={16}
              onChange={(e) => setNameDraft(e.target.value)}
            />
            <button
              className="btn-gold !py-1 !px-3 text-sm"
              onClick={() => {
                updateSave({ vaultName: nameDraft.trim() || 'Delver' })
                setEditingName(false)
              }}
            >
              ✓
            </button>
          </div>
        ) : (
          <h1 className="font-black text-xl" onClick={() => setEditingName(true)}>
            {save.vaultName} <span className="text-xs text-slate-500">✏️</span>
          </h1>
        )}
        {equipped && <p className="text-sm text-vault-rare">« {equipped.name} »</p>}
        <p className="text-xs text-slate-400 mt-1">
          🏅 {rank.name} · 🔥 {save.streak}-day streak · 🏛️ best Floor {save.bestFloor}
        </p>
        {save.bestFloor > 0 && (
          <p className="text-[10px] text-slate-500 mt-1">👁️ record witnessed by {witnessCount(save.bestFloor)} players</p>
        )}
        <button className="btn-ghost w-full mt-3 text-sm" onClick={share}>
          📤 Share profile card
        </button>
      </div>

      {/* artifact showcase: pick 3 to display */}
      <Section title={`🗿 Showcase (${save.showcase.length}/3) — tap owned artifacts in the codex to feature them`}>
        <div className="grid grid-cols-3 gap-2">
          {[0, 1, 2].map((i) => {
            const art = save.showcase[i] != null ? artifactById(save.showcase[i]) : null
            return (
              <div key={i} className="bg-black/30 rounded-xl p-3 text-center min-h-[72px]">
                {art ? (
                  <>
                    <p className="text-2xl">{art.glyph}</p>
                    <p className="text-[10px] font-semibold" style={{ color: RARITY_META[art.rarity].color }}>
                      {art.name}
                    </p>
                  </>
                ) : (
                  <p className="text-slate-600 text-2xl mt-3">＋</p>
                )}
              </div>
            )
          })}
        </div>
      </Section>

      {/* titles */}
      <Section title="🎖️ Titles">
        <div className="flex flex-wrap gap-2">
          {TITLES.map((t) => {
            const owned = titles.includes(t)
            return (
              <button
                key={t.id}
                className={`px-3 py-1.5 rounded-full text-xs border ${
                  save.equippedTitle === t.id
                    ? 'border-vault-gold text-vault-gold'
                    : owned
                      ? 'border-white/20 text-slate-300'
                      : 'border-white/5 text-slate-600'
                }`}
                disabled={!owned}
                title={t.condition}
                onClick={() => updateSave({ equippedTitle: save.equippedTitle === t.id ? '' : t.id })}
              >
                {t.name}
                {!owned && ' 🔒'}
              </button>
            )
          })}
        </div>
      </Section>

      {/* customization */}
      <Section title="🎭 Customization">
        <p className="text-xs text-slate-400 mb-1">Body type</p>
        <div className="flex gap-2 mb-3">
          {BODY_TYPES.map((g, i) => (
            <button
              key={i}
              className={`btn-ghost !py-2 flex-1 text-2xl ${save.bodyType === i ? 'border-vault-gold' : ''}`}
              onClick={() => updateSave({ bodyType: i })}
            >
              {g}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mb-1">Skin</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {skins.map((sk) => (
            <button
              key={sk.id}
              className={`btn-ghost !py-1.5 !px-3 text-xs ${save.skin === sk.id ? 'border-vault-gold text-vault-gold' : ''}`}
              onClick={() => updateSave({ skin: sk.id })}
            >
              {sk.glyph} {sk.name}
            </button>
          ))}
        </div>
        <p className="text-xs text-slate-400 mb-1">Weapon skin</p>
        <div className="flex flex-wrap gap-2">
          {weapons.map((w) => (
            <button
              key={w.id}
              className={`btn-ghost !py-1.5 !px-3 text-xs ${save.weaponSkin === w.id ? 'border-vault-gold text-vault-gold' : ''}`}
              onClick={() => updateSave({ weaponSkin: w.id })}
            >
              {w.glyph} {w.name}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-600 mt-2">More skins rotate daily in the Shop — cosmetic only, never stats.</p>
      </Section>

      {/* audio / comfort */}
      <Section title="🔊 Atmosphere">
        <label className="flex items-center justify-between text-sm py-1">
          <span>Calming dungeon ambience (default)</span>
          <input
            type="checkbox"
            checked={!save.settings.hypeAudio}
            onChange={() => updateSave((s) => ({ settings: { ...s.settings, hypeAudio: false } }))}
          />
        </label>
        <label className="flex items-center justify-between text-sm py-1">
          <span>Hype soundtrack</span>
          <input
            type="checkbox"
            checked={save.settings.hypeAudio}
            onChange={() => updateSave((s) => ({ settings: { ...s.settings, hypeAudio: true } }))}
          />
        </label>
        {/* PLAY: ambient_dungeon_loop.mp3 OR hype_track_loop.mp3 — per toggle */}
      </Section>

      {/* codex */}
      <Section title={`📖 Artifact Codex — ${save.artifactsOwned.length}/200`}>
        <button className="btn-ghost w-full text-sm mb-2" onClick={() => setShowCodex((v) => !v)}>
          {showCodex ? 'Hide codex' : 'Browse all 200 artifacts'}
        </button>
        {showCodex && (
          <div className="grid grid-cols-5 gap-1.5 max-h-80 overflow-y-auto">
            {ARTIFACTS.map((a) => {
              const owned = save.artifactsOwned.includes(a.id)
              const featured = save.showcase.includes(a.id)
              return (
                <button
                  key={a.id}
                  className={`rounded-lg p-1.5 text-center border ${
                    featured
                      ? 'border-vault-gold bg-vault-gold/10'
                      : owned
                        ? 'border-white/15 bg-white/5'
                        : 'border-white/5 opacity-30'
                  }`}
                  disabled={!owned}
                  title={owned ? `${a.name} — ${a.effect.label}` : `??? (found from Floor ${a.minFloor})`}
                  onClick={() => toggleShowcase(a.id)}
                >
                  <p className="text-lg">{owned ? a.glyph : '❔'}</p>
                  <p className="text-[8px] truncate" style={{ color: owned ? RARITY_META[a.rarity].color : undefined }}>
                    {owned ? a.name : '???'}
                  </p>
                </button>
              )
            })}
          </div>
        )}
      </Section>
    </div>
  )
}
