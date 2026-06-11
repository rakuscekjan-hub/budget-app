# 🏛️ VAULT

A mobile-first **first-person 3D** roguelite RPG built around behavioral game
design — walk freely through a procedurally generated, torch-lit maze on every
floor (three.js/WebGL: textured walls, fog, flickering light), pick a class,
level up mid-run with gear perks, fight tactical turn-based battles against
enemies that telegraph their moves, collect 200 artifacts, and keep your
progress across deaths.

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

- **Core loop** — explore each floor's 3D maze in first person (virtual
  joystick + look-drag on touch, WASD + mouse on desktop), find chests in the
  world, walk into enemy groups to engage. Combat is tactical and turn-based:
  every enemy telegraphs its next move (attack for X / charging / defending)
  and you choose attack, defend (block 60%), your class special, or flee
  (they strike once). The stair-portal stays sealed until the floor is
  cleared. Death ends the run but meta-progression survives.
- **RPG layer** — three classes (Warrior 🛡️ / Rogue 🗡️ / Mystic 🔮) with
  distinct stats and specials (Crushing Blow / Fan of Blades / Soul Siphon);
  kills grant run-XP, and each level-up offers a pick-1-of-3 gear perk
  (`systems/classes.js`) so every descent is a different build.
- **Meta-progression** — permanent Attack/Vitality/Luck upgrades bought with
  earned Vault Coins, a 200-artifact codex with passive buffs, mastery ranks,
  and a 50-tier season pass.

## The 7 engagement mechanics

| # | Mechanic | Where |
|---|----------|-------|
| 1 | Variable rewards — 70/25/5 chests, pity counters, fast-win (≤3 turns) bonus chest, daily mystery chest | `systems/lootSystem.js`, `components/LootChest.jsx` |
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
  components/   World3D (three.js renderer, controls, minimap), DungeonView
                (run screen + overlays), CombatRoom (tactical battles),
                GameScreen, LootChest, HUD, ShopModal, ProfilePage,
                Leaderboard, GuildView
  systems/      dungeonGenerator (maze per floor), classes (classes + perks),
                lootSystem, difficultyAI, progressionSystem, fomoClock,
                socialSystem, monetizationLayer        (pure, unit-testable)
  data/         artifacts (200), enemies, lore
  hooks/        useGameState (central store), useLocalStorage, useDailyReset
```

Audio is annotated with `// PLAY: …` comments at every trigger point
(chest tiers, combat hits, level-ups) — drop in files and a tiny player to ship
sound.
