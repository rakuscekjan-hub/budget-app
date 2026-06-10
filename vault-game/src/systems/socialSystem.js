// MECHANIC 5: SOCIAL VALIDATION — leaderboards, friends, witnesses, guild.
// v1 is backendless: rivals are simulated locally and persisted, so the
// social fabric feels alive and is trivially swappable for a real API later.

import { todayKey } from './fomoClock'

const RIVAL_NAMES = [
  'Jonas', 'Mira', 'Kasper', 'Elif', 'Tomas', 'Anya', 'Borut', 'Lena',
  'Marko', 'Sif', 'Dario', 'Petra', 'Niko', 'Vera', 'Anže', 'Tia',
]

function hashStr(s) {
  let h = 0
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return h
}

// Global top 100 — static legends plus daily drift so ranks feel alive.
export function globalLeaderboard(playerEntry, date = new Date()) {
  const seed = hashStr(todayKey(date))
  const board = Array.from({ length: 100 }, (_, i) => {
    const wobble = (hashStr(`${i}-${seed}`) % 5) - 2
    return {
      name: `${RIVAL_NAMES[i % RIVAL_NAMES.length]}${i >= RIVAL_NAMES.length ? '_' + Math.floor(i / RIVAL_NAMES.length) : ''}`,
      floor: Math.max(5, 120 - i + wobble),
      isPlayer: false,
    }
  })
  board.push({ ...playerEntry, isPlayer: true })
  return board.sort((a, b) => b.floor - a.floor).slice(0, 100)
}

// Friends list: a small fixed cohort whose progress creeps forward each day —
// fuels "Jonas reached Floor 45! You're at Floor 23." notifications.
export function friendsBoard(playerEntry, date = new Date()) {
  const dayNum = Math.floor(date.getTime() / 86400000)
  const friends = ['Jonas', 'Mira', 'Kasper', 'Elif', 'Tomas'].map((name, i) => ({
    name,
    floor: 10 + ((hashStr(name) + dayNum * (i + 2)) % 8) + Math.floor((dayNum % 50) * (0.5 + i * 0.2)),
    isPlayer: false,
  }))
  friends.push({ ...playerEntry, isPlayer: true })
  return friends.sort((a, b) => b.floor - a.floor)
}

export function friendNotification(playerFloor, date = new Date()) {
  const friends = friendsBoard({ name: 'You', floor: playerFloor }, date).filter((f) => !f.isPlayer)
  const ahead = friends.filter((f) => f.floor > playerFloor)
  if (!ahead.length) return null
  const f = ahead[Math.floor(Math.random() * ahead.length)]
  return `${f.name} reached Floor ${f.floor}! You're at Floor ${playerFloor}.`
}

// Weekly board resets Sunday; top 3 earn a badge.
export function weeklyLeaderboard(playerWeeklyBest, date = new Date()) {
  const seed = hashStr(todayKey(date).slice(0, 7))
  const board = Array.from({ length: 20 }, (_, i) => ({
    name: RIVAL_NAMES[(i + seed) % RIVAL_NAMES.length] + (i >= RIVAL_NAMES.length ? '_w' : ''),
    floor: Math.max(3, 60 - i * 3 + (hashStr(`${i}${seed}`) % 4)),
    isPlayer: false,
  }))
  board.push({ name: 'You', floor: playerWeeklyBest, isPlayer: true })
  return board.sort((a, b) => b.floor - a.floor)
}

// "Witnessed by N players" — social proof on records. Deterministic mock.
export function witnessCount(floor) {
  return 4 + (hashStr(`witness${floor}`) % 20)
}

// Guild: fixed roster of 7 + the player. Weekly score accrues from rivals.
export const GUILD = {
  name: 'Order of the Last Coin',
  members: ['You', 'Jonas', 'Mira', 'Borut', 'Lena', 'Niko', 'Petra', 'Sif'],
}

export function guildWeeklyScore(playerContribution, date = new Date()) {
  const dayNum = Math.floor(date.getTime() / 86400000) % 7
  const memberScores = GUILD.members.map((name) =>
    name === 'You'
      ? { name, score: playerContribution, isPlayer: true }
      : { name, score: (hashStr(name) % 300) + dayNum * (hashStr(name) % 90), isPlayer: false }
  )
  return memberScores.sort((a, b) => b.score - a.score)
}

export const GUILD_CHAT_SEED = [
  { from: 'Jonas', text: 'Floor 45!! the Ember Knights are brutal 🔥' },
  { from: 'Mira', text: 'pity counter at 47 rares... legendary incoming 👀' },
  { from: 'Borut', text: 'anyone done the Crimson Vault yet?' },
  { from: 'Lena', text: 'guild chest unlocks at 2000 pts, we got this' },
]

export function shareCard(save) {
  return [
    `🏛️ VAULT — ${save.vaultName || 'Anonymous Delver'}`,
    `📉 Deepest descent: Floor ${save.bestFloor}`,
    `🗿 Artifacts: ${save.artifactsOwned.length}/200`,
    `🔥 Streak: ${save.streak} days`,
    `Can you go deeper?`,
  ].join('\n')
}
