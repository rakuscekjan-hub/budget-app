// One fragment is revealed the first time a player reaches each floor.
// The mystery question — "who built this, and what waits at the bottom?" —
// is never fully answered: the story is itself a Zeigarnik loop.

const FRAGMENTS = [
  'A brass plaque, polished by countless hands: "DEPOSIT YOUR FEAR. WITHDRAW NOTHING."',
  'Scratched into the wall: tally marks. Thousands. They stop mid-stroke.',
  'The Architect signed the first floor. The signature is your handwriting.',
  'A ledger lies open. Every entry is a name. Every name is crossed out except the last page, which is blank.',
  'The rats here carry coins in their cheeks. They were not always rats.',
  'A child\'s drawing of the vault — but it shows 200 floors, not 100.',
  'The doors do not lock to keep you out. They lock behind you.',
  'Someone wrote "THE BOTTOM IS A DOOR" and someone else wrote "NO" beneath it.',
  'You find a key that fits nothing. You pocket it anyway. It hums.',
  'The Architect\'s Echo speaks: "You again. You always come back. That is the design."',
  'A mural: a thousand figures descending stairs. None ascending.',
  'The coins minted here bear no king. They bear a mirror.',
  'A diary: "Day 30. The streak must not break. The streak must not break. The st"',
  'The torches do not consume fuel. They consume time. Yours.',
  'Bones arranged in a circle around a single common chest, unopened.',
  'A sign hangs crooked: "NEXT MILESTONE: 2 FLOORS." The handwriting is fresh.',
  'You hear applause from the walls. Twelve distinct pairs of hands.',
  'The vault breathes. Inhale on your victories. Exhale on your defeats.',
  'Carved deep: "I FOUND THE BOTTOM. THERE IS ANOTHER VAULT BELOW."',
  'The Architect\'s Echo, fading: "I did not build this place. I am also playing."',
  'A guild banner, threadbare. Five names. The fifth has been stitched over four times.',
  'Treasure maps of this floor litter the ground. Each marks a different spot. All are correct.',
  'A skeleton clutches a note: "One more run. Just one more."',
  'The leaderboard is carved in stone here. The stone heals each Sunday.',
  'You find your own name in the ledger. The ink is still wet.',
  'A voice in the dark counts down from twenty-four hours. It never reaches zero.',
  'The walls below this point are warm, like something enormous is sleeping.',
  'Scrawled in gold dust: "The artifact at the bottom is the desire to reach it."',
  'The Echo whispers: "The vault is deepest where you stop measuring."',
  'Silence. For the first time, complete silence. Then, faintly: your own heartbeat, one floor down.',
]

export function loreForFloor(floor) {
  const base = FRAGMENTS[(floor - 1) % FRAGMENTS.length]
  const cycle = Math.floor((floor - 1) / FRAGMENTS.length)
  return cycle === 0 ? base : `${base} (The words have shifted since you last read them.)`
}
