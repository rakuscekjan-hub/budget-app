// Procedural dungeon generator: one maze per floor.
// Grid cells: 1 = wall, 0 = open. Entities live on open cells.

import { spawnRoom } from '../data/enemies'

function mazeSize(floor) {
  if (floor <= 3) return 11
  if (floor <= 10) return 13
  return 15
}

// Randomized DFS maze on an odd-sized grid, then ~12% of interior walls
// removed so corridors loop instead of being a single solution path.
function carveMaze(size, rng) {
  const grid = Array.from({ length: size }, () => Array(size).fill(1))
  const stack = [[1, 1]]
  grid[1][1] = 0
  while (stack.length) {
    const [x, y] = stack[stack.length - 1]
    const dirs = [
      [0, -2], [2, 0], [0, 2], [-2, 0],
    ].sort(() => rng() - 0.5)
    let carved = false
    for (const [dx, dy] of dirs) {
      const nx = x + dx
      const ny = y + dy
      if (nx > 0 && ny > 0 && nx < size - 1 && ny < size - 1 && grid[ny][nx] === 1) {
        grid[ny][nx] = 0
        grid[y + dy / 2][x + dx / 2] = 0
        stack.push([nx, ny])
        carved = true
        break
      }
    }
    if (!carved) stack.pop()
  }
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (grid[y][x] === 1 && rng() < 0.12) {
        // only knock through walls that connect two open cells
        const openNS = grid[y - 1]?.[x] === 0 && grid[y + 1]?.[x] === 0
        const openEW = grid[y][x - 1] === 0 && grid[y][x + 1] === 0
        if (openNS || openEW) grid[y][x] = 0
      }
    }
  }
  return grid
}

function bfsDistances(grid, sx, sy) {
  const dist = grid.map((row) => row.map(() => -1))
  const q = [[sx, sy]]
  dist[sy][sx] = 0
  while (q.length) {
    const [x, y] = q.shift()
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = x + dx
      const ny = y + dy
      if (grid[ny]?.[nx] === 0 && dist[ny][nx] === -1) {
        dist[ny][nx] = dist[y][x] + 1
        q.push([nx, ny])
      }
    }
  }
  return dist
}

export function generateFloor(floor, multiplier, rng = Math.random) {
  const size = mazeSize(floor)
  const grid = carveMaze(size, rng)
  const spawn = { x: 1, y: 1 }
  const dist = bfsDistances(grid, spawn.x, spawn.y)

  // Stairs go on the farthest reachable cell: the player must cross the maze.
  let stairs = { x: 1, y: 1 }
  let best = 0
  const openCells = []
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      if (grid[y][x] !== 0 || dist[y][x] < 0) continue
      openCells.push({ x, y, d: dist[y][x] })
      if (dist[y][x] > best) {
        best = dist[y][x]
        stairs = { x, y }
      }
    }
  }

  // Free cells for entities: not spawn, not stairs, not right next to spawn.
  const free = openCells.filter(
    (c) => c.d >= 3 && !(c.x === stairs.x && c.y === stairs.y)
  )
  const take = () => {
    if (!free.length) return null
    const i = Math.floor(rng() * free.length)
    return free.splice(i, 1)[0]
  }

  // Enemy groups: 1-tap fodder early, real packs deeper. The group on the
  // stairs' approach is implicit — placement is random but they gate progress
  // because stairs stay locked until the floor is cleared.
  const groupCount = floor <= 3 ? 1 : floor <= 8 ? 2 : 3
  const enemies = []
  for (let g = 0; g < groupCount; g++) {
    const cell = take()
    if (!cell) break
    enemies.push({ gid: g + 1, x: cell.x, y: cell.y, group: spawnRoom(floor, multiplier, rng) })
  }

  const chestCount = 1 + Math.floor(rng() * 2) // 1-2 world chests per floor
  const chests = []
  for (let c = 0; c < chestCount; c++) {
    const cell = take()
    if (!cell) break
    chests.push({ id: c + 1, x: cell.x, y: cell.y })
  }

  return { grid, size, spawn, stairs, enemies, chests }
}
