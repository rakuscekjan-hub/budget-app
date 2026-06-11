// First-person dungeon view: a software raycaster (Wolfenstein-style DDA)
// drawn on a low-res canvas, grid-based movement with smooth easing, and a
// minimap of explored corridors. No 3D library — runs on any phone.

import { useEffect, useRef, useState } from 'react'
import { useGame } from '../hooks/useGameState'
import CombatRoom from './CombatRoom'
import LootChest from './LootChest'
import { isArchitectFloor } from '../data/enemies'

const VIEW_W = 240
const VIEW_H = 150
const FOV = 0.66
const COMPASS = ['N', 'E', 'S', 'W']

function shade(hex, k) {
  // darken an [r,g,b] triple by factor k (0..1)
  return `rgb(${hex.map((c) => Math.round(c * k)).join(',')})`
}

// Wall palette shifts as you descend: navy → purple → crimson → ember.
function wallPalette(floor) {
  const band = Math.min(Math.floor((floor - 1) / 10), 3)
  return [
    [58, 66, 110], // floors 1-10: cold navy stone
    [84, 58, 122], // 11-20: violet depths
    [120, 48, 64], // 21-30: crimson vault
    [130, 78, 40], // 31+: ember core
  ][band]
}

function renderFrame(ctx, world, posR, dirAngle, time) {
  const { grid, size, sprites, floor } = world
  const base = wallPalette(floor)
  const flicker = 1 + Math.sin(time / 260) * 0.04 // torchlight breathing

  // ceiling + floor
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_H / 2)
  sky.addColorStop(0, '#05060d')
  sky.addColorStop(1, '#10131f')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, VIEW_W, VIEW_H / 2)
  const ground = ctx.createLinearGradient(0, VIEW_H / 2, 0, VIEW_H)
  ground.addColorStop(0, '#13101c')
  ground.addColorStop(1, '#221c2e')
  ctx.fillStyle = ground
  ctx.fillRect(0, VIEW_H / 2, VIEW_W, VIEW_H / 2)

  const fx = Math.sin(dirAngle)
  const fy = -Math.cos(dirAngle)
  const px = -fy * FOV
  const py = fx * FOV

  const zbuffer = new Array(VIEW_W)

  for (let x = 0; x < VIEW_W; x++) {
    const cameraX = (2 * x) / VIEW_W - 1
    const rx = fx + px * cameraX
    const ry = fy + py * cameraX

    let mapX = Math.floor(posR.x)
    let mapY = Math.floor(posR.y)
    const deltaX = Math.abs(1 / (rx || 1e-9))
    const deltaY = Math.abs(1 / (ry || 1e-9))
    const stepX = rx < 0 ? -1 : 1
    const stepY = ry < 0 ? -1 : 1
    let sideX = rx < 0 ? (posR.x - mapX) * deltaX : (mapX + 1 - posR.x) * deltaX
    let sideY = ry < 0 ? (posR.y - mapY) * deltaY : (mapY + 1 - posR.y) * deltaY
    let side = 0
    let guard = 0
    while (guard++ < size * 3) {
      if (sideX < sideY) {
        sideX += deltaX
        mapX += stepX
        side = 0
      } else {
        sideY += deltaY
        mapY += stepY
        side = 1
      }
      if (grid[mapY]?.[mapX] !== 0) break
    }
    const dist = Math.max(0.05, side === 0 ? sideX - deltaX : sideY - deltaY)
    zbuffer[x] = dist

    const lineH = Math.min(VIEW_H * 2.5, VIEW_H / dist)
    const y0 = (VIEW_H - lineH) / 2
    const fog = Math.max(0.06, Math.min(1, 1.25 - dist / 7)) * (side === 0 ? 1 : 0.72) * flicker
    ctx.fillStyle = shade(base, fog)
    ctx.fillRect(x, y0, 1, lineH)
  }

  // sprites (enemies, chests, stairs), far → near, occluded by zbuffer
  const order = sprites
    .map((s) => ({ ...s, d2: (s.x - posR.x) ** 2 + (s.y - posR.y) ** 2 }))
    .sort((a, b) => b.d2 - a.d2)
  const invDet = 1 / (px * fy - fx * py)
  for (const s of order) {
    const relX = s.x - posR.x
    const relY = s.y - posR.y
    const tx = invDet * (fy * relX - fx * relY)
    const ty = invDet * (-py * relX + px * relY)
    if (ty <= 0.25) continue
    const screenX = Math.round((VIEW_W / 2) * (1 + tx / ty))
    const col = Math.max(0, Math.min(VIEW_W - 1, screenX))
    if (zbuffer[col] < ty - 0.2) continue
    const sz = Math.min(VIEW_H * 1.3, VIEW_H / ty) * (s.scale || 0.78)
    ctx.globalAlpha = Math.max(0.25, Math.min(1, 1.35 - ty / 7))
    ctx.font = `${sz}px serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(s.glyph, screenX, VIEW_H / 2 + sz * 0.12)
    if (s.label && ty < 3) {
      ctx.font = `bold ${Math.max(7, sz * 0.14)}px sans-serif`
      ctx.fillStyle = s.labelColor || '#F5C842'
      ctx.fillText(s.label, screenX, VIEW_H / 2 - sz * 0.55)
    }
    ctx.globalAlpha = 1
  }

  // subtle vignette
  const vin = ctx.createRadialGradient(VIEW_W / 2, VIEW_H / 2, VIEW_H * 0.45, VIEW_W / 2, VIEW_H / 2, VIEW_W * 0.75)
  vin.addColorStop(0, 'rgba(0,0,0,0)')
  vin.addColorStop(1, 'rgba(0,0,0,0.55)')
  ctx.fillStyle = vin
  ctx.fillRect(0, 0, VIEW_W, VIEW_H)
}

function Minimap({ run }) {
  const { dungeon, pos, dir, visited } = run
  const cell = 7
  return (
    <svg
      width={dungeon.size * cell}
      height={dungeon.size * cell}
      className="rounded-lg border border-white/10 bg-black/60"
      style={{ maxWidth: 110, maxHeight: 110 }}
      viewBox={`0 0 ${dungeon.size * cell} ${dungeon.size * cell}`}
    >
      {dungeon.grid.map((row, y) =>
        row.map((v, x) => {
          if (!visited[`${x},${y}`]) return null
          return <rect key={`${x},${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill="#2a2f4a" />
        })
      )}
      {visited[`${dungeon.stairs.x},${dungeon.stairs.y}`] && (
        <rect x={dungeon.stairs.x * cell + 1} y={dungeon.stairs.y * cell + 1} width={cell - 2} height={cell - 2} fill="#F5C842" />
      )}
      {dungeon.chests.map((c) =>
        visited[`${c.x},${c.y}`] ? (
          <rect key={c.id} x={c.x * cell + 2} y={c.y * cell + 2} width={cell - 4} height={cell - 4} fill="#8B5CF6" />
        ) : null
      )}
      <circle cx={pos.x * cell + cell / 2} cy={pos.y * cell + cell / 2} r={cell / 2.6} fill="#10B981" />
      <line
        x1={pos.x * cell + cell / 2}
        y1={pos.y * cell + cell / 2}
        x2={pos.x * cell + cell / 2 + [0, 1, 0, -1][dir] * cell * 0.6}
        y2={pos.y * cell + cell / 2 + [-1, 0, 1, 0][dir] * cell * 0.6}
        stroke="#10B981"
        strokeWidth="1.5"
      />
    </svg>
  )
}

export default function DungeonView({ onEnd }) {
  const { run, stepPlayer, turnPlayer, openChest, loreForFloor, save } = useGame()
  const canvasRef = useRef(null)
  const worldRef = useRef(null)
  const easeRef = useRef({ x: 0, y: 0, angle: 0, floor: 0 })
  const [banner, setBanner] = useState(null)
  // chest overlay stays mounted until the last reveal is collected
  const [chestVisible, setChestVisible] = useState(false)
  useEffect(() => {
    if (run?.chestQueue.length && !run.combat && !run.defeated) setChestVisible(true)
  }, [run?.chestQueue.length, run?.combat, run?.defeated])

  // keep the render loop fed with the latest world without re-creating it
  useEffect(() => {
    if (!run) return
    const sprites = [
      ...run.dungeon.enemies.map((g) => ({
        x: g.x + 0.5,
        y: g.y + 0.5,
        glyph: g.group[0].glyph,
        scale: g.group[0].isBoss ? 1.05 : 0.78,
        label: g.group.length > 1 ? `×${g.group.length}` : g.group[0].isBoss ? 'BOSS' : null,
        labelColor: '#EF4444',
      })),
      ...run.dungeon.chests.map((c) => ({ x: c.x + 0.5, y: c.y + 0.5, glyph: '📦', scale: 0.5 })),
      {
        x: run.dungeon.stairs.x + 0.5,
        y: run.dungeon.stairs.y + 0.5,
        glyph: run.dungeon.enemies.length ? '🔒' : '🌀',
        scale: 0.6,
        label: run.dungeon.enemies.length ? 'sealed' : 'descend',
      },
    ]
    worldRef.current = {
      grid: run.dungeon.grid,
      size: run.dungeon.size,
      sprites,
      floor: run.floor,
      pos: { x: run.pos.x + 0.5, y: run.pos.y + 0.5 },
      angle: (run.dir * Math.PI) / 2,
    }
  }, [run])

  // floor banner with lore fragment on every new floor
  useEffect(() => {
    if (!run) return
    setBanner({ floor: run.floor, lore: loreForFloor(run.floor) })
    const id = setTimeout(() => setBanner(null), 4200)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run?.floor])

  // render loop
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    let raf
    const loop = (t) => {
      const w = worldRef.current
      if (w) {
        const e = easeRef.current
        if (e.floor !== w.floor) {
          // new floor: teleport, don't glide through walls
          e.x = w.pos.x
          e.y = w.pos.y
          e.angle = w.angle
          e.floor = w.floor
        }
        e.x += (w.pos.x - e.x) * 0.22
        e.y += (w.pos.y - e.y) * 0.22
        let da = w.angle - e.angle
        da = ((da + Math.PI) % (2 * Math.PI)) - Math.PI
        if (da < -Math.PI) da += 2 * Math.PI
        e.angle += da * 0.25
        renderFrame(ctx, w, { x: e.x, y: e.y }, e.angle, t)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  // desktop keys: WASD / arrows
  useEffect(() => {
    const onKey = (ev) => {
      if (ev.key === 'ArrowUp' || ev.key === 'w') stepPlayer(1)
      else if (ev.key === 'ArrowDown' || ev.key === 's') stepPlayer(-1)
      else if (ev.key === 'ArrowLeft' || ev.key === 'a') turnPlayer(-1)
      else if (ev.key === 'ArrowRight' || ev.key === 'd') turnPlayer(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [stepPlayer, turnPlayer])

  if (!run) return null

  const enemiesLeft = run.dungeon.enemies.reduce((n, g) => n + g.group.length, 0)
  const architect = isArchitectFloor(run.floor)
  const inOverlay = run.combat || run.defeated || chestVisible

  return (
    <div className="min-h-screen flex flex-col p-3 gap-2 select-none">
      {/* top bar */}
      <div className="flex items-center justify-between">
        <button className="text-slate-500 text-sm" onClick={onEnd}>← Retreat</button>
        <div className="text-center leading-tight">
          <p className="font-bold text-sm">{architect ? "⚠️ ARCHITECT'S FLOOR" : `Floor ${run.floor}`}</p>
          <p className="text-[10px] text-slate-500">
            {enemiesLeft > 0 ? `${enemiesLeft} enemies haunt this floor` : 'floor cleared — find the stairs'}
          </p>
        </div>
        <p className="text-sm gold-text">🪙 {run.coinsEarned}</p>
      </div>

      {/* 3D viewport */}
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={VIEW_W}
          height={VIEW_H}
          className="w-full rounded-2xl border border-white/10"
          style={{ imageRendering: 'pixelated', aspectRatio: `${VIEW_W}/${VIEW_H}` }}
        />
        <div className="absolute top-2 right-2 opacity-90">
          <Minimap run={run} />
        </div>
        <div className="absolute top-2 left-2 bg-black/50 rounded-lg px-2 py-0.5 text-xs font-bold text-vault-gold">
          {COMPASS[run.dir]}
        </div>
        {banner && !inOverlay && (
          <div className="absolute inset-x-3 bottom-3 panel p-3 animate-slideUp bg-black/80">
            <p className="text-xs font-bold gold-text mb-0.5">Floor {banner.floor}</p>
            <p className="text-[11px] text-slate-300 italic">“{banner.lore}”</p>
          </div>
        )}
      </div>

      {/* player status */}
      <div className="panel p-3">
        <div className="flex justify-between text-xs mb-1">
          <span>❤️ {run.hp}/{run.maxHp}</span>
          {run.combo >= 2 && <span className="font-black text-vault-gold">{run.combo}× COMBO</span>}
          <span className="text-slate-400">⚔️ {run.attack} · 🛡️ {run.defense} · 🍀 {run.luck}%</span>
        </div>
        <div className="progress-track">
          <div
            className="progress-fill !duration-300"
            style={{ width: `${(run.hp / run.maxHp) * 100}%`, background: run.hp / run.maxHp < 0.3 ? '#EF4444' : '#10B981' }}
          />
        </div>
        {save.settings.chillMode && <p className="text-[10px] text-slate-500 mt-1.5">🧘 Chill mode — explore at your own pace</p>}
      </div>

      {/* movement pad */}
      <div className="flex-1 flex items-end justify-center pb-2">
        <div className="grid grid-cols-3 gap-2 w-64">
          <button aria-label="Turn left" className="btn-ghost text-2xl !py-4" onClick={() => turnPlayer(-1)}>⟲</button>
          <button aria-label="Step forward" className="btn-gold text-2xl !py-4" onClick={() => stepPlayer(1)}>▲</button>
          <button aria-label="Turn right" className="btn-ghost text-2xl !py-4" onClick={() => turnPlayer(1)}>⟳</button>
          <div />
          <button aria-label="Step back" className="btn-ghost text-xl !py-3" onClick={() => stepPlayer(-1)}>▼</button>
          <div />
        </div>
      </div>
      <p className="text-center text-[10px] text-slate-600 -mt-1">walk into enemies to fight · 📦 = loot · 🌀 = stairs down</p>

      {/* overlays */}
      {(run.combat || run.defeated) && <CombatRoom onEnd={onEnd} />}
      {!run.combat && !run.defeated && chestVisible && (
        <LootChest
          open={openChest}
          queueLength={run.chestQueue.length}
          label={`Floor ${run.floor} spoils`}
          onDone={() => {
            if (!run.chestQueue.length) setChestVisible(false)
          }}
        />
      )}
    </div>
  )
}
