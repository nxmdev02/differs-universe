const TAU = Math.PI * 2
export const MOON_CYCLE_SECONDS = 60
const names = [
  'New moon',
  'Waxing crescent',
  'First quarter',
  'Waxing gibbous',
  'Full moon',
  'Waning gibbous',
  'Last quarter',
  'Waning crescent',
]

/** An accelerated Earth-view phase illustration, not a calendar or an ephemeris. */
export function moonPhase(angle: number) {
  const radians = ((angle % TAU) + TAU) % TAU
  return {
    radians,
    illuminated: (1 - Math.cos(radians)) / 2,
    name: names[Math.round((radians / TAU) * 8) % 8]!,
  }
}

export function moonPhaseAt(elapsed: number) {
  return moonPhase(0.65 + (elapsed * TAU) / MOON_CYCLE_SECONDS)
}
