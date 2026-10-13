import { describe, it, expect } from 'vitest'
import { getPlayLoadout, playUnit, afterUseOf } from '../../src/store/trackerLoadout.js'
import { getEffectiveStats } from '../../src/utils/stats.js'
import { WEAPONS } from '../../src/data/weapons.js'
import { WARRIORS, NO_RESTORE_OPG } from '../../src/data/warriors.js'

const hedge = (opgUsed = {}, extra = {}) => ({ type: 'Hedge Knight', weapon1: 'Polearm (one-handed)', weapon2: 'Shield', ip: [], opgUsed, ...extra })
const SHATTER = 'THE SHATTERED SHIELD'

describe('The Shattered Shield (play-mode loadout)', () => {
  it('leaves the gear alone until the ability is used', () => {
    expect(getPlayLoadout(hedge())).toEqual({ weapon1: 'Polearm (one-handed)', weapon2: 'Shield', destroyed: [] })
  })

  it('destroys the Shield and makes the Polearm two-handed once used', () => {
    expect(getPlayLoadout(hedge({ [SHATTER]: true }))).toEqual({ weapon1: 'Polearm (two-handed)', weapon2: null, destroyed: ['Shield'] })
  })

  it('drops the one-handed polearm COMBAT penalty (5+ back to 4+)', () => {
    expect(getEffectiveStats(playUnit(hedge())).COM.display).toBe('5+')
    expect(getEffectiveStats(playUnit(hedge({ [SHATTER]: true }))).COM.display).toBe('4+')
  })

  it('keeps Sundered: its -1 COMBAT stacks with everything else', () => {
    const sundered = [{ name: 'SUNDERED' }]
    expect(getEffectiveStats(playUnit(hedge()), { statuses: sundered }).COM.display).toBe('6+')
    expect(getEffectiveStats(playUnit(hedge({ [SHATTER]: true })), { statuses: sundered }).COM.display).toBe('5+')
  })

  it("only applies to the class that has the ability, and only to gear it carries", () => {
    const fighter = { type: 'Fighter', weapon1: 'Polearm (one-handed)', weapon2: 'Shield', opgUsed: { [SHATTER]: true } }
    expect(getPlayLoadout(fighter).destroyed).toEqual([])
    expect(getPlayLoadout(hedge({ [SHATTER]: true }, { weapon2: null })).destroyed).toEqual([])
    expect(() => getPlayLoadout({ type: 'Hedge Knight', weapon1: 'Polearm (one-handed)', weapon2: 'Shield' })).not.toThrow()
  })

  it('data guard: gear swaps name real weapons, and a Reliquary can never restore them', () => {
    for (const [type, w] of Object.entries(WARRIORS)) {
      for (const ab of w.abilities || []) {
        if (!ab.afterUse) continue
        expect(afterUseOf(type, ab.name)).toBe(ab.afterUse)
        for (const [from, to] of Object.entries(ab.afterUse.gear)) {
          expect(WEAPONS[from]).toBeTruthy()
          if (to !== null) expect(WEAPONS[to]).toBeTruthy()
        }
        expect(NO_RESTORE_OPG.has(ab.name)).toBe(true)
      }
    }
  })
})
