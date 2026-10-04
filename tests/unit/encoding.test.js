import { describe, it, expect } from 'vitest'
import { encodeCompany, decodeCompany } from '../../src/store/builderEncoding.js'
import { MARKS } from '../../src/data/warriors.js'

const slot = (type, weapon1, isCaptain = false) => ({
  type, weapon1, weapon2: null, consumable: null, climbing: null, ip: [], isCaptain, notes: [],
})

describe('share-link encoding', () => {
  it('round-trips a company', () => {
    const company = { mark: MARKS[2].name, companyName: 'The Hollow Watch', ipLimit: 3, slots: [slot('Fighter', 'Light Weapon', true), slot('Scout', 'Bow')] }
    const decoded = decodeCompany(encodeCompany(company))
    expect(decoded.mark).toBe(company.mark)
    expect(decoded.companyName).toBe(company.companyName)
    expect(decoded.slots.filter(s => s.type).map(s => s.type)).toEqual(['Fighter', 'Scout'])
  })

  it('keeps "no mark" as no mark (it used to become the first mark, Ashbound)', () => {
    const code = encodeCompany({ mark: '', companyName: 'Markless', ipLimit: 3, slots: [slot('Fighter', 'Light Weapon', true)] })
    expect(decodeCompany(code).mark).toBe('')
  })

  it('still decodes links that never had a "no mark" code', () => {
    for (const m of MARKS) {
      const code = encodeCompany({ mark: m.name, companyName: 'X', ipLimit: 3, slots: [slot('Fighter', 'Light Weapon', true)] })
      expect(decodeCompany(code).mark).toBe(m.name)
    }
  })

  it('rejects garbage', () => {
    expect(decodeCompany('not-a-company')).toBeNull()
  })
})
