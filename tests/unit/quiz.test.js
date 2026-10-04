import { describe, it, expect } from 'vitest'
import { COMPANIES, RESULT_REDIRECTS } from '../../src/data/quizData.js'

describe('quiz result redirects', () => {
  it('maps the four unreleased companies exactly as agreed with the devs', () => {
    expect(RESULT_REDIRECTS).toEqual({
      ashbound: 'graveborn',
      doomed_choir: 'silent_pact',
      tower_born: 'fog_walkers',
      wretched_survivors: 'relic_bitten',
    })
  })

  it('only redirects to companies that exist and are not themselves redirected', () => {
    const ids = new Set(COMPANIES.map(c => c.id))
    for (const [from, to] of Object.entries(RESULT_REDIRECTS)) {
      expect(ids.has(from)).toBe(true)
      expect(ids.has(to)).toBe(true)
      expect(RESULT_REDIRECTS[to]).toBeUndefined()
    }
  })
})
