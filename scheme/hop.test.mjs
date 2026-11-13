import assert from 'node:assert/strict'
import test from 'node:test'
import { applyHops } from './hop.js'

test('фаза перешагивает ноль полукругом', () => {
  const wires = [
    { pts: [{ x: 0, y: 0 }, { x: 40, y: 0 }], pole: 0, kind: 'grid' },
    { pts: [{ x: 20, y: -20 }, { x: 20, y: 20 }], pole: 1, kind: 'grid' },
  ]
  applyHops(wires)
  assert.match(wires[0].d, / A6 6 0 0 [01] /)
  assert.doesNotMatch(wires[1].d, /A6/)
})

test('параллельные жилы не получают дугу', () => {
  const wires = [
    { pts: [{ x: 0, y: 0 }, { x: 40, y: 0 }], pole: 0, kind: 'grid' },
    { pts: [{ x: 0, y: 8 }, { x: 40, y: 8 }], pole: 1, kind: 'grid' },
  ]
  applyHops(wires)
  assert.doesNotMatch(wires[0].d, /A6/)
})
