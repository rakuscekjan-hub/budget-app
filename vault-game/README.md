# 🏛️ VAULT

A mobile-first roguelite dungeon crawler built around behavioral game design —
descend a procedurally generated vault, fight with one tap, collect 200
artifacts, and keep your progress across deaths.

React 18 · Tailwind CSS · Vite · localStorage persistence. No backend (v1):
leaderboards, friends, and guildmates are simulated locally behind clean system
modules that can be swapped for a real API.

## Run it

```bash
cd vault-game
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
```

## The game

- **Core loop** — 1-tap turn-based combat. Each floor holds 1–3 enemies; tap to
  strike, survivors hit back. Clear the room, open the chests, read the lore
  fragment, descend. Death ends the run but meta-progression (coins, artifacts,
  upgrades, rank) survives.
- **Meta-progression** — permanent Attack/Vitality/Luck upgrades bought with
  earned Vault Coins, a 200-artifact codex with passive buffs, mastery ranks,
  and a 50-tier season pass.

## The 7 engagement mechanics

| # | Mechanic | Where |
|---|----------|-------|
| 1 | Variable rewards — 70/25/5 chests, pity counters, speed-clear bonus chest, daily mystery chest | `systems/lootSystem.js`, `components/LootChest.jsx` |
| 2 | Flow state — silent dynamic difficulty (easy floors 1–5, death easing, no-damage push-back, late-session softening), Architect spike floors every 10 | `systems/difficultyAI.js` |
| 3 | Zeigarnik — seven always-visible progress bars (depth, daily, weekly, codex, mastery, season, streak) | `components/HUD.jsx` |
| 4 | FOMO — daily rotating shop with countdown, weekly Crimson Vault event, flash offer after floor 10, escalating login bonuses | `systems/fomoClock.js`, `components/ShopModal.jsx` |
| 5 | Social validation — global/friends/weekly boards, witness counts, guild score + chat, share cards | `systems/socialSystem.js`, `components/Leaderboard.jsx`, `components/GuildView.jsx` |
| 6 | Freemium — 5 vault keys (1/30 min), ad/free alternatives everywhere, cosmetic-only purchases (simulated in v1) | `systems/monetizationLayer.js` |
| 7 | Identity & stress relief — customization, titles, chill mode, lore, "beat your record" callbacks | `components/ProfilePage.jsx`, `data/lore.js` |

## Ethical guardrails (non-negotiable, implemented)

- Drop rates visible via the **?** button on every chest, pity rules included.
- Energy never hard-paywalls: a free (simulated ad) key is always one tap away.
- The flash offer's ✕ actually dismisses — no fake-close dark patterns.
- Optional self-set **daily spend cap** in the shop.
- **No real money in v1** — every "purchase" is simulated and labeled as such.
- Dismissable "take a break? 🧘" nudge after 45 minutes of play.
- Paid items are never stronger than earned items — cosmetics/convenience only.

## Structure

```
src/
  components/   GameScreen, CombatRoom, LootChest, HUD, ShopModal,
                ProfilePage, Leaderboard, GuildView
  systems/      lootSystem, difficultyAI, progressionSystem, fomoClock,
                socialSystem, monetizationLayer        (pure, unit-testable)
  data/         artifacts (200), enemies, lore
  hooks/        useGameState (central store), useLocalStorage, useDailyReset
```

Audio is annotated with `// PLAY: …` comments at every trigger point
(chest tiers, combat hits, level-ups) — drop in files and a tiny player to ship
sound.
