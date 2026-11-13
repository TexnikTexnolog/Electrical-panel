import assert from 'node:assert/strict'
import test from 'node:test'
import { energize, barLinks, selfCheck, devices } from './circuit.js'

test('ширина реек', () => {
  const d = devices()
  const mods = (list) => list.reduce((n, x) => n + x.modules, 0)
  assert.equal(mods(d.apartmentRail1), 16)
  assert.equal(mods(d.apartmentRail2), 17)
  assert.equal(mods(d.storage), 12)
  assert.equal(d.apartmentRail2.at(-1).overflow, undefined)
  assert.equal(d.apartmentRail1[3].part, 'CDA263D')
})

test('кладовка I + квартира II это город, не Load', () => {
  const s = energize(1, 2)
  assert.equal(s.rail1, 'grid')
  assert.equal(s.rail2, 'grid')
  assert.equal(s.storageLoads, 'grid')
  assert.equal(s.returnPair, 'grid')
  assert.equal(s.deyeGrid, 'grid')
  assert.equal(s.fault, null)
})

test('кладовка 0 гасит возврат и оставляет город на рейке 1', () => {
  assert.equal(energize(0, 1).rail1, 'grid')
  assert.equal(energize(0, 1).rail2, 'dead')
  assert.equal(energize(0, 2).rail1, 'dead')
  assert.equal(energize(0, 2).returnPair, 'dead')
})

test('кладовка II переводит возврат на Load', () => {
  assert.equal(energize(2, 1).rail1, 'grid')
  assert.equal(energize(2, 1).rail2, 'load')
  assert.equal(energize(2, 2).rail1, 'load')
  assert.equal(energize(2, 2).storageLoads, 'load')
})

test('колодки нуля не соединены', () => {
  assert.deepEqual(barLinks(), [])
})

test('девять положений без встречи источников, PE не переключается', () => {
  for (const storage of [0, 1, 2]) {
    for (const apartment of [0, 1, 2]) {
      const s = energize(storage, apartment)
      assert.equal(s.fault, null)
      assert.equal(s.pe, 'bonded')
    }
  }
  assert.equal(energize(1, 0).rail1, 'dead')
  assert.equal(energize(1, 0).rail2, 'grid')
  assert.equal(energize(2, 0).rail2, 'load')
  assert.doesNotThrow(() => selfCheck())
})
