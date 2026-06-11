// Real-time 3D dungeon (three.js/WebGL): textured walls, flickering torch
// light, depth fog, billboard creatures, a humming stair-portal. Movement is
// continuous — virtual joystick + look-drag on touch, WASD/arrows + mouse
// drag on desktop. The player pose lives in poseRef and is mutated here every
// frame; React state only changes on discrete events (engage/loot/stairs).

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { useGame } from '../hooks/useGameState'

const WALL_H = 1.3
const EYE = 0.52
const MARGIN = 0.24 // collision radius
const SPEED = 2.3 // cells per second
const TURN = 2.6 // rad/s with arrow keys

function wallPalette(floor) {
  const band = Math.min(Math.floor((floor - 1) / 10), 3)
  return [
    { wall: [96, 104, 150], bg: 0x0b0d18, torch: 0xffb46a }, // 1-10 navy stone
    { wall: [120, 92, 168], bg: 0x100a1c, torch: 0xc59aff }, // 11-20 violet depths
    { wall: [160, 76, 96], bg: 0x190a10, torch: 0xff8a6a }, // 21-30 crimson vault
    { wall: [170, 116, 70], bg: 0x1a1208, torch: 0xffc36a }, // 31+ ember core
  ][band]
}

function stoneTexture(rgb, brickW = 32, brickH = 26) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = `rgb(${rgb.map((v) => Math.round(v * 0.4)).join(',')})` // mortar
  g.fillRect(0, 0, 128, 128)
  for (let row = 0; row * brickH < 128 + brickH; row++) {
    const off = row % 2 ? brickW / 2 : 0
    for (let col = -1; col * brickW < 128 + brickW; col++) {
      const x = col * brickW + off
      const y = row * brickH
      const k = 0.7 + Math.random() * 0.55
      g.fillStyle = `rgb(${rgb.map((v) => Math.min(255, Math.round(v * k))).join(',')})`
      g.fillRect(x + 1, y + 1, brickW - 2, brickH - 2)
      for (let i = 0; i < 26; i++) {
        g.fillStyle = `rgba(0,0,0,${Math.random() * 0.3})`
        g.fillRect(x + 2 + Math.random() * (brickW - 4), y + 2 + Math.random() * (brickH - 4), 2, 2)
      }
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function slabTexture(rgb) {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')
  g.fillStyle = `rgb(${rgb.map((v) => Math.round(v * 0.32)).join(',')})`
  g.fillRect(0, 0, 128, 128)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 2; col++) {
      const k = 0.5 + Math.random() * 0.35
      g.fillStyle = `rgb(${rgb.map((v) => Math.round(v * k * 0.6)).join(',')})`
      g.fillRect(col * 64 + 2, row * 64 + 2, 60, 60)
      for (let i = 0; i < 40; i++) {
        g.fillStyle = `rgba(0,0,0,${Math.random() * 0.35})`
        g.fillRect(col * 64 + Math.random() * 62, row * 64 + Math.random() * 62, 2, 2)
      }
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function glyphSprite(glyph, size = 0.85, yOffset = 0.5) {
  const c = document.createElement('canvas')
  c.width = c.height = 256
  const g = c.getContext('2d')
  g.font = '200px serif'
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.shadowColor = 'rgba(0,0,0,0.6)'
  g.shadowBlur = 18
  g.fillText(glyph, 128, 140)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true }))
  sprite.scale.set(size, size, 1)
  sprite.position.y = yOffset
  return sprite
}

export default function World3D() {
  const { run, poseRef, engageGroup, collectChestAt, tryStairs, showToast } = useGame()
  const mountRef = useRef(null)
  const mapRef = useRef(null)
  const compassRef = useRef(null)
  const stickRef = useRef(null)
  const nubRef = useRef(null)
  const apiRef = useRef({}) // latest run + actions for the rAF loop
  const threeRef = useRef(null)

  apiRef.current = { run, engageGroup, collectChestAt, tryStairs, showToast }

  // --- renderer + camera, once -------------------------------------------
  useEffect(() => {
    const mount = mountRef.current
    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    // filmic rolloff keeps the torch from blowing out close-up walls
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    renderer.domElement.style.borderRadius = '16px'
    renderer.domElement.style.touchAction = 'none'
    mount.appendChild(renderer.domElement)
    const camera = new THREE.PerspectiveCamera(72, mount.clientWidth / mount.clientHeight, 0.05, 60)

    const torch = new THREE.PointLight(0xffb46a, 9, 8, 2)
    camera.add(torch)
    torch.position.set(0.12, 0.05, 0.1)

    threeRef.current = { renderer, camera, torch, scene: null, entities: null, portal: null }

    const onResize = () => {
      renderer.setSize(mount.clientWidth, mount.clientHeight)
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(onResize)
    ro.observe(mount)

    return () => {
      ro.disconnect()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  // --- (re)build the floor's scene on floor change ------------------------
  const floorKey = run?.floor
  useEffect(() => {
    const t = threeRef.current
    const r = apiRef.current.run
    if (!t || !r) return
    const pal = wallPalette(r.floor)
    const { grid, size } = r.dungeon

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(pal.bg)
    scene.fog = new THREE.Fog(pal.bg, 2.2, 9.5)
    scene.add(new THREE.AmbientLight(0x8890b0, 0.5))
    scene.add(t.camera)
    t.torch.color.set(pal.torch)

    // walls: one instanced mesh, one draw call
    const cells = []
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (grid[y][x] === 1) cells.push([x, y])
    const wallMat = new THREE.MeshLambertMaterial({ map: stoneTexture(pal.wall) })
    const walls = new THREE.InstancedMesh(new THREE.BoxGeometry(1, WALL_H, 1), wallMat, cells.length)
    const m = new THREE.Matrix4()
    cells.forEach(([x, y], i) => {
      m.setPosition(x + 0.5, WALL_H / 2, y + 0.5)
      walls.setMatrixAt(i, m)
    })
    walls.instanceMatrix.needsUpdate = true
    scene.add(walls)

    // floor + ceiling
    const floorTex = slabTexture(pal.wall)
    floorTex.repeat.set(size, size)
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshLambertMaterial({ map: floorTex }))
    floorMesh.rotation.x = -Math.PI / 2
    floorMesh.position.set(size / 2, 0, size / 2)
    scene.add(floorMesh)
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(size, size),
      new THREE.MeshLambertMaterial({ color: new THREE.Color(pal.bg).multiplyScalar(2) })
    )
    ceil.rotation.x = Math.PI / 2
    ceil.position.set(size / 2, WALL_H, size / 2)
    scene.add(ceil)

    // stair portal: spinning ring + glow light (lock glyph handled in sync)
    const portal = new THREE.Group()
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.32, 0.05, 10, 28),
      new THREE.MeshBasicMaterial({ color: 0xf5c842 })
    )
    ring.position.y = 0.55
    portal.add(ring)
    const glow = new THREE.PointLight(0xf5c842, 6, 4, 1.6)
    glow.position.y = 0.6
    portal.add(glow)
    portal.position.set(r.dungeon.stairs.x + 0.5, 0, r.dungeon.stairs.y + 0.5)
    portal.userData = { ring, glow }
    scene.add(portal)

    const entities = new THREE.Group()
    scene.add(entities)

    t.scene = scene
    t.entities = entities
    t.portal = portal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floorKey])

  // --- sync world entities with run.dungeon -------------------------------
  useEffect(() => {
    const t = threeRef.current
    if (!t?.entities || !run) return
    const group = t.entities
    while (group.children.length) {
      const ch = group.children.pop()
      ch.material?.map?.dispose?.()
      ch.material?.dispose?.()
    }
    for (const g of run.dungeon.enemies) {
      const s = glyphSprite(g.group[0].glyph, g.group[0].isBoss ? 1.15 : 0.85, g.group[0].isBoss ? 0.62 : 0.5)
      s.position.x = g.x + 0.5
      s.position.z = g.y + 0.5
      s.userData = { kind: 'enemy', gid: g.gid, bob: Math.random() * 6, baseY: s.position.y }
      group.add(s)
      if (g.group.length > 1) {
        const badge = glyphSprite(`×${g.group.length}`, 0.001, 0) // replaced below
        badge.material.map.dispose()
        const c = document.createElement('canvas')
        c.width = 128
        c.height = 64
        const gg = c.getContext('2d')
        gg.font = 'bold 44px sans-serif'
        gg.textAlign = 'center'
        gg.fillStyle = '#EF4444'
        gg.fillText(`×${g.group.length}`, 64, 48)
        badge.material.map = new THREE.CanvasTexture(c)
        badge.material.map.colorSpace = THREE.SRGBColorSpace
        badge.scale.set(0.5, 0.25, 1)
        badge.position.set(g.x + 0.5, 1.05, g.y + 0.5)
        badge.userData = { kind: 'badge' }
        group.add(badge)
      }
    }
    for (const ch of run.dungeon.chests) {
      const s = glyphSprite('📦', 0.45, 0.28)
      s.position.x = ch.x + 0.5
      s.position.z = ch.y + 0.5
      s.userData = { kind: 'chest', id: ch.id, bob: Math.random() * 6, baseY: s.position.y }
      group.add(s)
    }
    // portal lock state
    const locked = run.dungeon.enemies.length > 0
    const { ring, glow } = t.portal.userData
    ring.material.color.set(locked ? 0x5a2430 : 0xf5c842)
    glow.color.set(locked ? 0xaa3050 : 0xf5c842)
    glow.intensity = locked ? 0.9 : 6
    glow.distance = locked ? 2.5 : 4
    t.portal.userData.locked = locked
  }, [run])

  // --- input ---------------------------------------------------------------
  const inputRef = useRef({ keys: new Set(), joy: { active: false, id: -1, ox: 0, oy: 0, vx: 0, vy: 0 }, look: { active: false, id: -1, lx: 0 } })
  useEffect(() => {
    const input = inputRef.current
    const kd = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault()
      input.keys.add(e.key.toLowerCase())
    }
    const ku = (e) => input.keys.delete(e.key.toLowerCase())
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)

    const mount = mountRef.current
    const pd = (e) => {
      const rect = mount.getBoundingClientRect()
      const isTouch = e.pointerType === 'touch'
      if (isTouch && e.clientX - rect.left < rect.width * 0.45 && !input.joy.active) {
        input.joy = { active: true, id: e.pointerId, ox: e.clientX, oy: e.clientY, vx: 0, vy: 0 }
        if (stickRef.current) {
          stickRef.current.style.display = 'block'
          stickRef.current.style.left = `${e.clientX - rect.left - 44}px`
          stickRef.current.style.top = `${e.clientY - rect.top - 44}px`
        }
      } else if (!input.look.active) {
        input.look = { active: true, id: e.pointerId, lx: e.clientX }
      }
      mount.setPointerCapture?.(e.pointerId)
    }
    const pm = (e) => {
      if (input.joy.active && e.pointerId === input.joy.id) {
        const dx = e.clientX - input.joy.ox
        const dy = e.clientY - input.joy.oy
        const len = Math.hypot(dx, dy) || 1
        const cl = Math.min(len, 44)
        input.joy.vx = (dx / len) * (cl / 44)
        input.joy.vy = (dy / len) * (cl / 44)
        if (nubRef.current) nubRef.current.style.transform = `translate(${(dx / len) * cl}px, ${(dy / len) * cl}px)`
      } else if (input.look.active && e.pointerId === input.look.id) {
        const dx = e.clientX - input.look.lx
        input.look.lx = e.clientX
        const pose = poseRef.current
        pose.yaw += dx * 0.006
      }
    }
    const pu = (e) => {
      if (e.pointerId === input.joy.id) {
        input.joy = { active: false, id: -1, ox: 0, oy: 0, vx: 0, vy: 0 }
        if (stickRef.current) stickRef.current.style.display = 'none'
        if (nubRef.current) nubRef.current.style.transform = 'translate(0,0)'
      }
      if (e.pointerId === input.look.id) input.look = { active: false, id: -1, lx: 0 }
    }
    mount.addEventListener('pointerdown', pd)
    mount.addEventListener('pointermove', pm)
    mount.addEventListener('pointerup', pu)
    mount.addEventListener('pointercancel', pu)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      mount.removeEventListener('pointerdown', pd)
      mount.removeEventListener('pointermove', pm)
      mount.removeEventListener('pointerup', pu)
      mount.removeEventListener('pointercancel', pu)
    }
  }, [poseRef])

  // push the player back when they flee so they don't instantly re-engage
  const lastCombatGid = useRef(null)
  useEffect(() => {
    if (run?.combat) {
      lastCombatGid.current = run.combat.gid
      return
    }
    if (!run || lastCombatGid.current == null) return
    const group = run.dungeon.enemies.find((g) => g.gid === lastCombatGid.current)
    lastCombatGid.current = null
    if (!group) return // group died — no pushback needed
    // Snap to the center of the nearest open cell that's outside the enemy's
    // engage radius — cell centers can never wedge into wall margins.
    const pose = poseRef.current
    const grid = run.dungeon.grid
    let bestCell = null
    let bestD = Infinity
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0], [0, -2], [2, 0], [0, 2], [-2, 0]]) {
      const cx = group.x + dx
      const cy = group.y + dy
      if (grid[cy]?.[cx] !== 0) continue
      const d = Math.hypot(cx + 0.5 - pose.x, cy + 0.5 - pose.y)
      if (d < bestD) {
        bestD = d
        bestCell = { x: cx, y: cy }
      }
    }
    if (bestCell) {
      pose.x = bestCell.x + 0.5
      pose.y = bestCell.y + 0.5
    }
  }, [run, poseRef])

  // --- main loop -----------------------------------------------------------
  useEffect(() => {
    let raf
    let last = performance.now()
    let lastMap = 0
    let lockToastAt = 0
    let walkPhase = 0

    const blocked = (grid, x, y) => {
      for (const [mx, my] of [
        [x - MARGIN, y - MARGIN],
        [x + MARGIN, y - MARGIN],
        [x - MARGIN, y + MARGIN],
        [x + MARGIN, y + MARGIN],
      ]) {
        if (grid[Math.floor(my)]?.[Math.floor(mx)] !== 0) return true
      }
      return false
    }

    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const t = threeRef.current
      const { run: r, engageGroup, collectChestAt, tryStairs, showToast } = apiRef.current
      if (!t?.scene || !r) return
      const pose = poseRef.current
      const input = inputRef.current
      const overlayOpen = r.combat || r.defeated || r.chestQueue.length > 0 || r.perkChoices.length > 0

      if (!overlayOpen) {
        // turning
        if (input.keys.has('arrowleft') || input.keys.has('q')) pose.yaw -= TURN * dt
        if (input.keys.has('arrowright') || input.keys.has('e')) pose.yaw += TURN * dt
        // movement intent (joystick beats keys)
        let mvF = 0
        let mvS = 0
        if (input.joy.active) {
          mvF = -input.joy.vy
          mvS = input.joy.vx
        } else {
          if (input.keys.has('w') || input.keys.has('arrowup')) mvF += 1
          if (input.keys.has('s') || input.keys.has('arrowdown')) mvF -= 1
          if (input.keys.has('a')) mvS -= 1
          if (input.keys.has('d')) mvS += 1
        }
        const mag = Math.hypot(mvF, mvS)
        if (mag > 0.05) {
          const sp = (SPEED * (r.moveSpeed || 1) * Math.min(1, mag) * dt) / (mag || 1)
          const fx = Math.sin(pose.yaw)
          const fz = -Math.cos(pose.yaw)
          const dx = (fx * mvF + -fz * mvS) * sp
          const dz = (fz * mvF + fx * mvS) * sp
          const grid = r.dungeon.grid
          if (!blocked(grid, pose.x + dx, pose.y)) pose.x += dx
          if (!blocked(grid, pose.x, pose.y + dz)) pose.y += dz
          walkPhase += dt * 9 * Math.min(1, mag)
          pose.visited.add(`${Math.floor(pose.x)},${Math.floor(pose.y)}`)
        }

        // triggers
        for (const g of r.dungeon.enemies) {
          if (Math.hypot(g.x + 0.5 - pose.x, g.y + 0.5 - pose.y) < 0.95) {
            engageGroup(g.gid)
            break
          }
        }
        for (const ch of r.dungeon.chests) {
          if (Math.hypot(ch.x + 0.5 - pose.x, ch.y + 0.5 - pose.y) < 0.6) {
            collectChestAt(ch.id)
            break
          }
        }
        const st = r.dungeon.stairs
        if (Math.hypot(st.x + 0.5 - pose.x, st.y + 0.5 - pose.y) < 0.62) {
          const res = tryStairs()
          if (res === 'locked' && now - lockToastAt > 2500) {
            lockToastAt = now
            const left = r.dungeon.enemies.reduce((n, g) => n + g.group.length, 0)
            showToast(`🔒 The portal is sealed — ${left} ${left === 1 ? 'enemy' : 'enemies'} remain`)
          }
        }
      }

      // camera
      t.camera.position.set(pose.x, EYE + Math.sin(walkPhase) * 0.022, pose.y)
      t.camera.rotation.set(0, -pose.yaw, 0)
      // torch flicker
      t.torch.intensity = 8.5 + Math.sin(now * 0.011) * 1.1 + Math.random() * 0.6

      // entity idle animation + portal spin
      for (const ch of t.entities.children) {
        if (ch.userData.bob != null) {
          ch.userData.bob += dt * 2.4
          ch.position.y = ch.userData.baseY + Math.sin(ch.userData.bob) * 0.045
        }
      }
      t.portal.userData.ring.rotation.y += dt * (t.portal.userData.locked ? 0.4 : 2.2)
      t.portal.userData.ring.rotation.x = Math.PI / 2 + Math.sin(now * 0.001) * 0.2

      t.renderer.render(t.scene, t.camera)

      // compass + minimap (throttled)
      if (compassRef.current) {
        const idx = Math.round(((pose.yaw % (2 * Math.PI)) + 2 * Math.PI) / (Math.PI / 2)) % 4
        compassRef.current.textContent = ['N', 'E', 'S', 'W'][idx]
      }
      if (now - lastMap > 120 && mapRef.current) {
        lastMap = now
        const mc = mapRef.current
        const g2 = mc.getContext('2d')
        const size = r.dungeon.size
        const cs = Math.floor(mc.width / size)
        g2.clearRect(0, 0, mc.width, mc.height)
        g2.fillStyle = 'rgba(0,0,0,0.55)'
        g2.fillRect(0, 0, mc.width, mc.height)
        g2.fillStyle = '#2a2f4a'
        for (const key of pose.visited) {
          const [vx, vy] = key.split(',').map(Number)
          g2.fillRect(vx * cs, vy * cs, cs, cs)
        }
        const st2 = r.dungeon.stairs
        if (pose.visited.has(`${st2.x},${st2.y}`) || r.dungeon.enemies.length === 0) {
          g2.fillStyle = '#F5C842'
          g2.fillRect(st2.x * cs + 1, st2.y * cs + 1, cs - 2, cs - 2)
        }
        g2.fillStyle = '#8B5CF6'
        for (const ch of r.dungeon.chests) {
          if (pose.visited.has(`${ch.x},${ch.y}`)) g2.fillRect(ch.x * cs + 1, ch.y * cs + 1, cs - 2, cs - 2)
        }
        g2.fillStyle = '#10B981'
        g2.beginPath()
        g2.arc(pose.x * cs, pose.y * cs, cs * 0.4, 0, Math.PI * 2)
        g2.fill()
        g2.strokeStyle = '#10B981'
        g2.beginPath()
        g2.moveTo(pose.x * cs, pose.y * cs)
        g2.lineTo(pose.x * cs + Math.sin(pose.yaw) * cs, pose.y * cs - Math.cos(pose.yaw) * cs)
        g2.stroke()
      }
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [poseRef])

  return (
    <div ref={mountRef} className="relative w-full h-full overflow-hidden rounded-2xl border border-white/10">
      <canvas ref={mapRef} width={96} height={96} className="absolute top-2 right-2 rounded-lg pointer-events-none" />
      <div ref={compassRef} className="absolute top-2 left-2 bg-black/50 rounded-lg px-2 py-0.5 text-xs font-bold text-vault-gold pointer-events-none">
        N
      </div>
      {/* virtual joystick (appears under the thumb) */}
      <div ref={stickRef} className="absolute hidden w-[88px] h-[88px] rounded-full border-2 border-white/25 bg-white/5 pointer-events-none">
        <div ref={nubRef} className="absolute left-1/2 top-1/2 -ml-4 -mt-4 w-8 h-8 rounded-full bg-white/30" />
      </div>
    </div>
  )
}
