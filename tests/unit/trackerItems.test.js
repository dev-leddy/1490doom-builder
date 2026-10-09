import { describe, it, expect } from 'vitest'
import { expendHerbs, expendReliquary, expendCacheItem, undoCacheItem } from '../../src/store/trackerItems.js'

const warrior = (extra = {}) => ({ currentVit: 5, maxVit: 7, dead: false, opgUsed: {}, cacheItems: [], ...extra })
const item = (id, name) => ({ id, name, desc: '', used: false })

describe('expending and undoing cache items', () => {
  it('an expended item stays in place, marked used; undo makes it usable again', () => {
    const w = warrior({ cacheItems: [item(1, 'Food'), item(2, 'Map')] })
    const spent = expendCacheItem(w, 1)
    expect(spent.cacheItems.map(c => [c.id, c.used])).toEqual([[1, true], [2, false]])
    const { warrior: back } = undoCacheItem(spent, 1)
    expect(back.cacheItems.map(c => [c.id, c.used])).toEqual([[1, false], [2, false]])
  })

  it('Herbs & Tonic: undo takes back exactly what it healed', () => {
    const w = warrior({ currentVit: 2, cacheItems: [item(1, 'Herbs & Tonic')] })
    const healed = expendHerbs(w, 1)
    expect(healed.currentVit).toBe(5)
    expect(undoCacheItem(healed, 1).warrior.currentVit).toBe(2)
  })

  it('Herbs & Tonic: a capped heal records the real gain', () => {
    const healed = expendHerbs(warrior({ currentVit: 6, cacheItems: [item(1, 'Herbs & Tonic')] }), 1)
    expect(healed.currentVit).toBe(7)
    expect(healed.cacheItems[0].effect.healed).toBe(1)
    expect(undoCacheItem(healed, 1).warrior.currentVit).toBe(6)
  })

  it('Herbs & Tonic: hits taken since still count, and VIT never goes below 0', () => {
    const healed = expendHerbs(warrior({ currentVit: 2, cacheItems: [item(1, 'Herbs & Tonic')] }), 1)
    expect(undoCacheItem({ ...healed, currentVit: 4 }, 1).warrior.currentVit).toBe(1)
    expect(undoCacheItem({ ...healed, currentVit: 1 }, 1).warrior.currentVit).toBe(0)
  })

  it('Reliquary: undo marks the restored ability used again', () => {
    const w = warrior({ opgUsed: { Rage: true }, cacheItems: [item(1, 'Reliquary')] })
    const spent = expendReliquary(w, 1, 'Rage')
    expect(spent.opgUsed.Rage).toBe(false)
    const { warrior: back } = undoCacheItem(spent, 1)
    expect(back.opgUsed.Rage).toBe(true)
    expect(back.cacheItems[0].used).toBe(false)
  })

  it('Reliquary: can\'t be undone once the restored ability was used again', () => {
    const spent = expendReliquary(warrior({ opgUsed: { Rage: true }, cacheItems: [item(1, 'Reliquary')] }), 1, 'Rage')
    const result = undoCacheItem({ ...spent, opgUsed: { Rage: true } }, 1)
    expect(result.error).toMatch(/used again/)
    expect(result.warrior).toBeUndefined()
  })

  it('nothing to undo for an unused or unknown item', () => {
    const w = warrior({ cacheItems: [item(1, 'Food')] })
    expect(undoCacheItem(w, 1).error).toBeTruthy()
    expect(undoCacheItem(w, 99).error).toBeTruthy()
  })
})
