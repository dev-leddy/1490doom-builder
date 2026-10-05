import { describe, it, expect } from 'vitest'
import { getEffectiveStats, improvedStats, statTone } from '../../src/utils/stats.js'
import { WARRIORS } from '../../src/data/warriors.js'

const unit = (type, extra = {}) => ({ type, weapon1: WARRIORS[type].fixedWeapon || 'Light Weapon', weapon2: null, ip: [], ...extra })

describe('getEffectiveStats', () => {
  it('returns the printed profile when nothing applies', () => {
    const s = getEffectiveStats(unit('Fighter'))
    for (const [k, v] of Object.entries(WARRIORS.Fighter.stats)) {
      expect(String(s[k].display)).toBe(String(v))
      expect(s[k].net).toBe(0)
    }
  })

  it('dual wield adds exactly +1 ATK (print used to add it twice)', () => {
    const s = getEffectiveStats(unit('Fighter', { weapon2: 'Light Weapon', ip: ['weapon2'] }))
    expect(s.ATK.value).toBe(parseInt(WARRIORS.Fighter.stats.ATK) + 1)
    expect(s.ATK.mods).toHaveLength(1)
  })

  it("the Reaver's built-in second Light Weapon is already in its profile", () => {
    const s = getEffectiveStats(unit('Reaver', { weapon2: 'Light Weapon' }))
    expect(s.ATK.value).toBe(parseInt(WARRIORS.Reaver.stats.ATK))
  })

  it('standard mode: the improvement counts only when the stat upgrade is bought', () => {
    expect(getEffectiveStats(unit('Fighter', { statImprove: 'VIT', ip: ['stat'] })).VIT.value).toBe(parseInt(WARRIORS.Fighter.stats.VIT) + 1)
    expect(getEffectiveStats(unit('Fighter', { statImprove: 'VIT', ip: [] })).VIT.net).toBe(0)
  })

  it('campaign mode: every improvement counts, not just the first (VIT adds vitality)', () => {
    const s = getEffectiveStats(unit('Fighter', { statImproves: ['MOV', 'VIT', 'COM'], ip: ['stat_0', 'stat_1', 'stat_2'] }))
    expect(s.MOV.net).toBe(1)
    expect(s.VIT.value).toBe(parseInt(WARRIORS.Fighter.stats.VIT) + 1)
    expect(s.COM.value).toBe(parseInt(WARRIORS.Fighter.stats.COM) - 1)
    expect([...improvedStats(unit('Fighter', { statImproves: ['MOV', 'VIT'] }))]).toEqual(['MOV', 'VIT'])
  })

  it('a buff and a debuff on the same stat cancel to the base value, tone neutral', () => {
    const s = getEffectiveStats(unit('Fighter', { weapon1: 'Polearm (one-handed)', statImprove: 'COM', ip: ['stat'] }))
    expect(s.COM.display).toBe(WARRIORS.Fighter.stats.COM)
    expect(s.COM.mods).toHaveLength(2)
    expect(statTone(s.COM)).toBe('')
  })

  it('one-handed polearm makes COMBAT one worse', () => {
    const s = getEffectiveStats(unit('Fighter', { weapon1: 'Polearm (one-handed)' }))
    expect(s.COM.value).toBe(parseInt(WARRIORS.Fighter.stats.COM) + 1)
    expect(statTone(s.COM)).toBe('debuffed')
  })

  it('statuses: Sundered −1 COM, Swarmed −1 MOV and DEF, vitality untouched', () => {
    const base = WARRIORS.Fighter.stats
    const s = getEffectiveStats(unit('Fighter'), { statuses: [{ name: 'SUNDERED' }, { name: 'SWARMED' }] })
    expect(s.COM.value).toBe(parseInt(base.COM) + 1)
    expect(s.MOV.value).toBe(parseInt(base.MOV) - 1)
    expect(s.DEF.value).toBe(parseInt(base.DEF) + 1)
    expect(s.VIT.net).toBe(0)
  })

  it('no check ever gets easier than 2+', () => {
    for (const type of Object.keys(WARRIORS)) {
      const s = getEffectiveStats(unit(type, { statImproves: ['SKL', 'DEF', 'COM'] }))
      for (const k of ['SKL', 'DEF', 'COM']) expect(s[k].value).toBeGreaterThanOrEqual(2)
    }
  })
})
