import { test } from 'node:test'
import assert from 'node:assert/strict'
import { moonPhase, moonPhaseAt, MOON_CYCLE_SECONDS } from '../shared/utils/moon-phase'

test('the accelerated moon cycle has new, crescent, quarter, full and waning phases', () => {
  const phases = Array.from({ length: 8 }, (_, i) => moonPhase((i * Math.PI) / 4))
  assert.deepEqual(
    phases.map((p) => p.name),
    [
      'New moon',
      'Waxing crescent',
      'First quarter',
      'Waxing gibbous',
      'Full moon',
      'Waning gibbous',
      'Last quarter',
      'Waning crescent',
    ],
  )
  assert.equal(phases[0]!.illuminated, 0)
  assert.equal(phases[4]!.illuminated, 1)
  assert.ok(Math.abs(phases[2]!.illuminated - 0.5) < 1e-10)
  assert.ok(Math.abs(phases[6]!.illuminated - 0.5) < 1e-10)
  assert.ok(phases[1]!.illuminated > 0 && phases[1]!.illuminated < 0.5)
  assert.ok(
    Math.abs(moonPhaseAt(0).illuminated - moonPhaseAt(MOON_CYCLE_SECONDS).illuminated) < 1e-10,
  )
  assert.equal(moonPhase(-Math.PI / 2).name, 'Last quarter')
})
