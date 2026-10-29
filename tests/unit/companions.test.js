import { describe, it, expect } from 'vitest'
import { encodeCompany, decodeCompany } from '../../src/store/builderEncoding.js'
import { decodeCompany as serverDecode } from '../../functions/lib/decode.js'
import { WARRIORS, canRestoreWithReliquary } from '../../src/data/warriors.js'
import { COMPANIONS, COMPANION_NAMES, defaultCompanion, withCompanion, companionState, companionDisplayName } from '../../src/data/companions.js'
import { getEffectiveStats } from '../../src/utils/stats.js'
import { normalizeCampaign, applyEndOfGame, undoLastGame, draftFromRecord, hireIntoVacancy, reRecordLatestGame } from '../../src/store/campaign.js'

const slot = (type, extra = {}) => ({
  type, weapon1: WARRIORS[type].fixedWeapon || 'Light Weapon', weapon2: null, consumable: null, climbing: null,
  ip: [], isCaptain: false, notes: [], ...extra,
})

describe('companion data', () => {
  it('every option of every companion class is a known animal', () => {
    for (const [type, w] of Object.entries(WARRIORS)) {
      if (!w.companion) continue
      for (const name of w.companion.options) expect(COMPANIONS[name], `${type}: ${name}`).toBeDefined()
    }
  })

  it('the server keeps the same animal order as the browser (share-link contract)', async () => {
    const { readFileSync } = await import('node:fs')
    const server = [...readFileSync('functions/lib/decode.js', 'utf8').match(/const COMPANION_NAMES = \[([^\]]*)\]/)[1].matchAll(/'([^']+)'/g)].map(m => m[1])
    expect(server).toEqual(COMPANION_NAMES)
  })

  it('classes with a companion always get a valid one; others never have one', () => {
    expect(defaultCompanion('Beastmaster')).toBe('Raptor')
    expect(defaultCompanion('Fighter')).toBeNull()
    for (let i = 0; i < 20; i++) expect(COMPANION_NAMES).toContain(defaultCompanion('Beastmaster', { random: true }))
    expect(withCompanion(slot('Beastmaster', { companion: 'Dragon' })).companion).toBe('Raptor')
    expect(withCompanion(slot('Beastmaster', { companion: 'Cat' })).companion).toBe('Cat')
    expect(withCompanion(slot('Fighter', { companion: 'Cat' })).companion).toBeNull()
  })
})

describe('companion share links', () => {
  for (const animal of COMPANION_NAMES) {
    it(`a Beastmaster with the ${animal} survives a share link (browser and server)`, () => {
      const code = encodeCompany({ mark: '', companyName: 'Menagerie', ipLimit: 3, slots: [slot('Beastmaster', { isCaptain: true, companion: animal }), slot('Fighter')] })
      const client = decodeCompany(code).slots.filter(s => s.type)
      expect(client[0].companion).toBe(animal)
      expect(client[1].companion).toBeNull()
      const server = serverDecode(code).warriors
      expect(server[0].companion).toBe(animal)
      expect(server[1].companion).toBeUndefined()
    })
  }

  it('links made before companions existed still decode, and a Beastmaster gets the default animal', () => {
    const code = encodeCompany({ mark: '', companyName: 'Old', ipLimit: 3, slots: [slot('Beastmaster', { isCaptain: true, companion: 'Cat' }), slot('Fighter')] })
    // drop the 12th slot field, as older links never had it
    const raw = atob(code).split('|')
    const old = btoa(raw.map((p, i) => i < 3 ? p : p.split(':').slice(0, 11).join(':')).join('|')).replace(/=/g, '')
    expect(old).not.toBe(code)
    const slots = decodeCompany(old).slots.filter(s => s.type)
    expect(slots.map(s => s.type)).toEqual(['Beastmaster', 'Fighter'])
    expect(slots[0].companion).toBe('Raptor')
  })
})

describe('companion names', () => {
  it('names survive a share link (browser and server), including commas and colons', () => {
    const names = { Raptor: 'Clawfoot', Cat: 'Mrs: Whiskers, the Third|' }
    const code = encodeCompany({ mark: '', companyName: 'Named', ipLimit: 3, slots: [slot('Beastmaster', { isCaptain: true, companion: 'Cat', companionNames: names }), slot('Fighter')] })
    const client = decodeCompany(code).slots.filter(s => s.type)
    expect(client[0].companionNames).toEqual(names)
    expect(client[0].companion).toBe('Cat')
    expect(client[1].companionNames).toBeUndefined()
    expect(serverDecode(code).warriors[0].companionNames).toEqual(names)
  })

  it('an unnamed animal shows its own name', () => {
    expect(companionDisplayName(slot('Beastmaster', { companion: 'Raptor' }))).toBe('Raptor')
    expect(companionDisplayName(slot('Beastmaster', { companion: 'Raptor', companionNames: { Raptor: '  ' } }))).toBe('Raptor')
    expect(companionDisplayName(slot('Beastmaster', { companion: 'Raptor', companionNames: { Cat: 'Tom' } }), 'Cat')).toBe('Tom')
    expect(companionDisplayName({ companion: { name: 'Cat' }, companionNames: { Cat: 'Tom' } })).toBe('Tom')
  })
})

describe('companion stats', () => {
  it('the animal adds its bonus while it lives', () => {
    const base = WARRIORS.Beastmaster.stats
    const s = getEffectiveStats(slot('Beastmaster', { companion: 'Raptor' }))
    expect(s.MOV.value).toBe(parseInt(base.MOV) + 1)
    expect(s.MOV.mods.map(m => m.source)).toEqual(['companion'])
    expect(getEffectiveStats(slot('Beastmaster', { companion: 'Raptor' }), { companionAlive: false }).MOV.net).toBe(0)
  })

  it('a check bonus improves the target number (SKL 4+ → 3+)', () => {
    expect(getEffectiveStats(slot('Beastmaster', { companion: 'Monkey' })).SKL.display).toBe('3+')
    expect(getEffectiveStats(slot('Beastmaster', { companion: 'Cat' })).COM.display).toBe('4+')
  })

  it('a bought improvement stacks with the animal bonus', () => {
    const s = getEffectiveStats(slot('Beastmaster', { companion: 'Raptor', statImprove: 'MOV', ip: ['stat'] }))
    expect(s.MOV.value).toBe(parseInt(WARRIORS.Beastmaster.stats.MOV) + 2)
    expect(s.MOV.mods.map(m => m.source).sort()).toEqual(['companion', 'statImprove'])
  })

  it('the animal costs no IP', () => {
    expect(slot('Beastmaster', { companion: 'Cat' }).ip).toEqual([])
  })
})

describe('companion in play', () => {
  const tw = (vit, cVit, extra = {}) => ({ type: 'Beastmaster', currentVit: vit, dead: false, companion: { name: 'Raptor', maxVit: 4, currentVit: cVit }, ...extra })

  it('is slain at 0, removed while its owner is down, alive otherwise', () => {
    expect(companionState(tw(5, 4))).toBe('alive')
    expect(companionState(tw(5, 0))).toBe('slain')
    expect(companionState(tw(0, 3))).toBe('removed')
    expect(companionState(tw(5, 3, { dead: true }))).toBe('removed')
    expect(companionState({ type: 'Fighter', currentVit: 5 })).toBeNull()
  })

  it('a Reliquary never restores the animal ability (animals cannot EXPEND)', () => {
    for (const name of COMPANION_NAMES) expect(canRestoreWithReliquary(`companion:${name}`)).toBe(false)
  })

  it('stats read the play-mode companion object too', () => {
    const unit = { ...slot('Beastmaster'), companion: { name: 'Raptor', currentVit: 4 } }
    expect(getEffectiveStats(unit).MOV.value).toBe(parseInt(WARRIORS.Beastmaster.stats.MOV) + 1)
  })
})

describe('campaign: an animal that died sits out the next game', () => {
  it('the resting animal is never the chosen one', () => {
    expect(withCompanion(slot('Beastmaster', { companion: 'Raptor', restingCompanion: 'Raptor' })).companion).toBe('Monkey')
    expect(withCompanion(slot('Beastmaster', { companion: 'Cat', restingCompanion: 'Raptor' })).companion).toBe('Cat')
    expect(withCompanion(slot('Beastmaster', { companion: 'Monkey', restingCompanion: 'Monkey' })).companion).toBe('Raptor')
  })
})

describe('campaign: recording a game where the animal died', () => {
  const company = () => normalizeCampaign({
    companyMode: 'campaign', campaignGame: 0,
    slots: [slot('Beastmaster', { isCaptain: true, companion: 'Raptor', earnedIP: 0, statImproves: [] }), slot('Fighter', { earnedIP: 0, statImproves: [] })],
  })
  const game = extra => ({ result: 'loss', fallenIndices: [], survivorPick: 0, bonus: [], ...extra })

  it('the animal sits out the next game and the chosen one goes instead', () => {
    const { company: c, record } = applyEndOfGame(company(), game({ companionFallen: [0], companionNext: { 0: 'Cat' } }))
    expect(c.slots[0]).toMatchObject({ companion: 'Cat', restingCompanion: 'Raptor' })
    expect(record.companionsFallen).toEqual([{ uid: c.slots[0].uid, name: 'Raptor', next: 'Cat' }])
  })

  it('with no choice the first other animal goes; after the next game the rested one is back to choose', () => {
    const { company: c1 } = applyEndOfGame(company(), game({ companionFallen: [0] }))
    expect(c1.slots[0]).toMatchObject({ companion: 'Monkey', restingCompanion: 'Raptor' })
    const { company: c2, record } = applyEndOfGame(c1, game())
    expect(c2.slots[0]).toMatchObject({ companion: 'Monkey', restingCompanion: null })
    expect(record.companionsFallen).toBeUndefined()
  })

  it('an animal whose owner fell is not asked about (it leaves with them)', () => {
    const { company: c, record } = applyEndOfGame(company(), game({ fallenIndices: [0], newCaptainIndex: 1, survivorPick: 1, companionFallen: [0] }))
    expect(c.slots[0].type).toBe(null)
    expect(record.companionsFallen).toBeUndefined()
  })

  it('undo puts the animal back; editing the game prefills it', () => {
    const before = company()
    const { company: c } = applyEndOfGame(before, game({ companionFallen: [0], companionNext: { 0: 'Cat' } }))
    expect(undoLastGame(c).slots[0]).toMatchObject({ companion: 'Raptor' })
    expect(undoLastGame(c).slots[0].restingCompanion).toBeFalsy()
    expect(draftFromRecord(c)).toMatchObject({ companionFallen: [0], companionNext: { 0: 'Cat' } })
    const { company: edited } = reRecordLatestGame(c, game())
    expect(edited.slots[0]).toMatchObject({ companion: 'Raptor' })
    expect(edited.slots[0].restingCompanion).toBeFalsy()
  })

  it('a new or resurrected Beastmaster comes with an animal', () => {
    const empty = normalizeCampaign({ companyMode: 'campaign', campaignGame: 1, slots: [slot('Fighter', { isCaptain: true, earnedIP: 0, statImproves: [] }), { type: null, ip: [], isCaptain: false, notes: [] }] })
    expect(hireIntoVacancy(empty, 1, 'Beastmaster').slots[1].companion).toBe('Raptor')
    expect(hireIntoVacancy(empty, 1, 'Scout').slots[1].companion).toBe(null)
  })
})

describe('campaign: the resting animal in share links', () => {
  it('survives a share link (browser and server); older links have none', () => {
    const code = encodeCompany({ mark: '', companyName: 'Rest', ipLimit: 0, companyMode: 'campaign', campaignGame: 1, slots: [slot('Beastmaster', { isCaptain: true, companion: 'Cat', restingCompanion: 'Raptor' }), slot('Fighter')] })
    const client = decodeCompany(code).slots.filter(s => s.type)
    expect(client[0].companion).toBe('Cat')
    expect(client[0].restingCompanion).toBe('Raptor')
    expect(client[1].restingCompanion).toBeUndefined()
    expect(serverDecode(code).warriors[0].restingCompanion).toBe('Raptor')
  })
})
