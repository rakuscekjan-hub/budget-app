// MECHANIC 2: FLOW STATE — dynamic difficulty adjustment.
// All adjustments are silent; the player only ever feels "in the zone".

export function difficultyMultiplier({
  floor,
  deathsOnFloor = 0, // deaths on this exact floor this session
  noDamageClears = 0, // consecutive rooms cleared without taking damage
  sessionMinutes = 0,
  chillMode = false,
}) {
  let mult

  if (floor <= 5) {
    // Rooms 1-5: trivially easy. Teach mechanics, build confidence.
    mult = 0.55 + floor * 0.05
  } else if (floor <= 15) {
    // Rooms 6-15: gentle linear curve.
    mult = 0.8 + (floor - 5) * 0.04
  } else {
    // Room 16+: real scaling begins.
    mult = 1.2 + (floor - 15) * 0.025
  }

  // Died 3+ times on the same floor → quietly shave 10% per cluster of 3.
  if (deathsOnFloor >= 3) {
    mult *= Math.pow(0.9, Math.floor(deathsOnFloor / 3))
  }

  // Cruising untouched for 5+ rooms → push back 15%.
  if (noDamageClears >= 5) {
    mult *= 1.15
  }

  // Invisible session timer: past 20 minutes, ease off slightly so a tired
  // player ends on a win, not a rage-quit.
  if (sessionMinutes > 20) {
    mult *= 0.93
  }

  // Chill mode: explicit player choice for low-pressure exploration.
  if (chillMode) {
    mult *= 0.8
  }

  return mult
}
