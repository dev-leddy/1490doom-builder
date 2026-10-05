import { describe, it, expect } from 'vitest'
import { encodeCompany, decodeCompany } from '../../src/store/builderEncoding.js'
import { MARKS, WARRIORS } from '../../src/data/warriors.js'

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

describe('share links keep the whole company', () => {
  it('keeps every warrior (only the first 3 used to survive)', async () => {
    const five = ['Fighter', 'Scout', 'Brute', 'Knight', 'Assassin']
    const code = encodeCompany({ mark: MARKS[0].name, companyName: 'Five', ipLimit: 3, slots: five.map((t, i) => slot(t, 'Light Weapon', i === 0)) })
    expect(decodeCompany(code).slots.filter(s => s.type).map(s => s.type)).toEqual(five)
    const { decodeCompany: serverDecode } = await import('../../functions/lib/decode.js')
    expect(serverDecode(code).warriors.map(w => w.type)).toEqual(five)
  })

  it('a 3-warrior company still decodes to 3 places', () => {
    const code = encodeCompany({ mark: MARKS[0].name, companyName: 'Three', ipLimit: 3, slots: [slot('Fighter', 'Light Weapon', true), slot(null, null), slot(null, null)] })
    expect(decodeCompany(code).slots).toHaveLength(3)
  })

  it('the browser and the server decode every warrior the same way', async () => {
    const { decodeCompany: serverDecode } = await import('../../functions/lib/decode.js')
    const types = Object.keys(WARRIORS)
    const code = encodeCompany({ mark: MARKS[1].name, companyName: 'All', ipLimit: 3, slots: types.slice(0, 8).map((t, i) => slot(t, WARRIORS[t].fixedWeapon || 'Light Weapon', i === 0)) })
    const client = decodeCompany(code).slots.filter(s => s.type)
    const server = serverDecode(code).warriors
    expect(server.map(w => w.type)).toEqual(client.map(s => s.type))
    expect(server.map(w => w.weapon1)).toEqual(client.map(s => s.weapon1))
  })

  it('warrior order is a share-link contract: existing classes keep their positions', () => {
    expect(Object.keys(WARRIORS).slice(0, 14)).toEqual([
      'Assassin', 'Beekeeper', 'Blacksmith', 'Brute', 'Doom Hunter', 'Executioner', 'Fighter',
      'Hedge Knight', 'Knight', 'Saboteur', 'Scavenger', 'Scout', 'Reaver', 'Warrior Priest',
    ])
  })
})
