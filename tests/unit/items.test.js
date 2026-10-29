import { describe, it, expect } from 'vitest'
import { FALL_BANDS, fallDamage } from '../../src/data/items.js'

// The falling grid (quick reference and print) reads VIT lost off the D6 and the distance
describe('falling damage (updated rulebook)', () => {
  const grid = band => [1, 2, 3, 4, 5, 6].map(roll => fallDamage(roll + FALL_BANDS[band].bonus))

  it('follows the rulebook table: 1–2: 0, 3–4: 1, 5–6: 2, 7: 3, 8+: perished', () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(fallDamage)).toEqual([0, 0, 1, 1, 2, 2, 3, 'dead', 'dead'])
  })

  it('2–3″ is the plain D6', () => {
    expect(grid(0)).toEqual([0, 0, 1, 1, 2, 2])
  })

  it('4–5″ adds 1', () => {
    expect(grid(1)).toEqual([0, 1, 1, 2, 2, 3])
  })

  it('6″+ adds 3 (instead of the 1) and immobilizes', () => {
    expect(grid(2)).toEqual([1, 2, 2, 3, 'dead', 'dead'])
    expect(FALL_BANDS[2].immobilized).toBe(true)
  })
})
