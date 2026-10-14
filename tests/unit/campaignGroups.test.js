import { describe, it, expect } from 'vitest'
import {
  generateInviteCode, formatCode, normalizeCode, CODE_ALPHABET, CODE_LENGTH,
  activeMembership, requireMember, progressOf, cleanGroupName,
} from '../../functions/lib/groups.js'
import { publicCampaignView, publicAvatar } from '../../functions/lib/campaignView.js'
import { memberSummary, expiresIn } from '../../src/builder/campaignGroupUi.js'

// A tiny stand-in for D1: answers .first() from `rows` and remembers what was asked
function fakeDb(answer = () => null) {
  const calls = []
  return {
    calls,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            first: async () => { calls.push({ sql, args }); return answer(sql, args) },
            all: async () => { calls.push({ sql, args }); return { results: [] } },
          }
        },
      }
    },
  }
}

describe('invite codes', () => {
  it('are 8 characters of the unambiguous alphabet', () => {
    expect(CODE_ALPHABET).toHaveLength(32)
    for (const ch of '01OI') expect(CODE_ALPHABET).not.toContain(ch)
    for (let i = 0; i < 50; i++) {
      const code = generateInviteCode()
      expect(code).toHaveLength(CODE_LENGTH)
      expect([...code].every(c => CODE_ALPHABET.includes(c))).toBe(true)
    }
  })

  it('map random bytes onto the alphabet without bias (byte % 32)', () => {
    const bytes = [0, 31, 32, 255, 8, 40, 100, 200]
    expect(generateInviteCode(n => bytes.slice(0, n))).toBe([0, 31, 0, 31, 8, 8, 4, 8].map(i => CODE_ALPHABET[i]).join(''))
  })

  it('are shown as XXXX-XXXX and read back however they were typed', () => {
    expect(formatCode('ABCD2345')).toBe('ABCD-2345')
    expect(normalizeCode('abcd-2345')).toBe('ABCD2345')
    expect(normalizeCode(' ABCD 2345 ')).toBe('ABCD2345')
    expect(normalizeCode('ABCD-234')).toBeNull()        // too short
    expect(normalizeCode('ABCD-2340')).toBeNull()       // 0 is never used
    expect(normalizeCode('ABCO-2345')).toBeNull()       // nor O
    expect(normalizeCode(null)).toBeNull()
  })
})

describe('publicCampaignView', () => {
  const data = {
    companyId: 'c1', companyName: 'Iron Wolves', mark: 'Mark of Fire', companyMode: 'campaign', ipLimit: 0, campaignGame: 2,
    companyAvatar: 'data:image/png;base64,AAAA',
    secretField: 'not for others',
    slots: [
      { uid: 'u1', type: 'Fighter', customName: 'Brakka', isCaptain: true, weapon1: 'Heavy Weapon', ip: ['stat'], earnedIP: 2, notes: ['owes me money'] },
      { uid: 'u2', type: null, notes: ['x'], fallen: { uid: 'u0', type: 'Scout', name: 'Pip', game: 2, extra: 'no' } },
    ],
    campaign: {
      v: 1, length: 6, completedAt: null, needsCaptain: false, privateThing: 1,
      log: [
        { id: 'g1', gameNumber: 1, result: 'win', scenario: 'Bridge', roster: [{ uid: 'u1', name: 'Brakka', type: 'Fighter', survived: true, note: 'x' }], awards: [{ uid: 'u1', ip: 1, reason: 'survivor' }], fallen: [] },
        { id: 'g2', gameNumber: 2, result: 'loss', roster: [], awards: [], fallen: [{ uid: 'u0', type: 'Scout', name: 'Pip', earnedIP: 0 }], before: { slots: [{ notes: ['secret'] }] } },
      ],
      upgrades: [{ afterGame: 1, uid: 'u1', name: 'Brakka', id: 'stat', label: 'Combat', note: 'hidden', nested: { a: 1 } }],
      roster: [{ afterGame: 2, uid: 'u3', name: 'Joss', action: 'recruited', replaced: { uid: 'u0', name: 'Pip', type: 'Scout', game: 2, notes: ['n'] } }],
    },
  }
  const view = publicCampaignView(data)
  const text = JSON.stringify(view)

  it('drops warrior notes, the undo snapshot and anything not listed', () => {
    expect(view.slots[0].notes).toBeUndefined()
    expect(view.campaign.log[1].before).toBeUndefined()
    expect(view.secretField).toBeUndefined()
    expect(view.campaign.privateThing).toBeUndefined()
    expect(view.campaign.upgrades[0].note).toBeUndefined()
    expect(view.campaign.upgrades[0].nested).toBeUndefined()
    expect(view.campaign.roster[0].replaced.notes).toBeUndefined()
    expect(view.slots[1].fallen.extra).toBeUndefined()
    for (const word of ['owes me money', 'secret', 'hidden', 'not for others']) expect(text).not.toContain(word)
  })

  it('drops an uploaded (data: URL) avatar but keeps preset ones', () => {
    expect(view.companyAvatar).toBeNull()
    expect(publicAvatar('battle')).toBe('battle')
    expect(publicAvatar('https://example.com/a.png')).toBe('https://example.com/a.png')
    expect(publicAvatar('javascript:alert(1)')).toBeNull()
  })

  it('keeps what members are meant to see', () => {
    expect(view).toMatchObject({ companyName: 'Iron Wolves', mark: 'Mark of Fire', companyMode: 'campaign', campaignGame: 2 })
    expect(view.slots[0]).toMatchObject({ uid: 'u1', type: 'Fighter', customName: 'Brakka', isCaptain: true, weapon1: 'Heavy Weapon', earnedIP: 2 })
    expect(view.campaign.log.map(r => r.result)).toEqual(['win', 'loss'])
    expect(view.campaign.log[0].scenario).toBe('Bridge')
    expect(view.campaign.upgrades[0].label).toBe('Combat')
    expect(view.campaign.roster[0].replaced.name).toBe('Pip')
  })

  it('copes with a company that has no campaign', () => {
    expect(publicCampaignView({ companyName: 'Plain', slots: [] }).campaign).toBeNull()
    expect(publicCampaignView(null).slots).toEqual([])
  })
})

describe('group access', () => {
  it('activeMembership asks for an active row of this user in this group', async () => {
    const db = fakeDb(() => ({ group_id: 'g', company_id: 'c', user_id: 'u' }))
    expect(await activeMembership(db, 'g', 'u')).toMatchObject({ company_id: 'c' })
    expect(db.calls[0].args).toEqual(['g', 'u'])
    expect(db.calls[0].sql).toMatch(/left_at IS NULL/)
    expect(await activeMembership(db, 'g', null)).toBeNull()
  })

  it('requireMember: 401 signed out, 403 not a member (or left), ok for a member', async () => {
    const member = { group_id: 'g', company_id: 'c', user_id: 'u1' }
    const db = fakeDb((sql, [groupId, userId]) => (groupId === 'g' && userId === 'u1' ? member : null))
    const ctx = user => ({ data: { user }, env: { DB: db } })

    expect((await requireMember(ctx(null), 'g')).response.status).toBe(401)
    expect((await requireMember(ctx({ id: 'u2' }), 'g')).response.status).toBe(403)
    expect((await requireMember(ctx({ id: 'u1' }), 'other')).response.status).toBe(403)
    const ok = await requireMember(ctx({ id: 'u1' }), 'g')
    expect(ok.response).toBeUndefined()
    expect(ok.membership).toEqual(member)
  })
})

describe('progress and display', () => {
  it('counts games and results from the stored company', () => {
    const p = progressOf({ campaignGame: 1, campaign: { length: null, completedAt: null, log: [{ result: 'win' }, { result: 'loss' }, { result: 'win' }] } })
    expect(p).toEqual({ completed: 3, total: null, tally: { win: 2, loss: 1, draw: 0, retreat: 0 }, completedAt: null })
    expect(progressOf({ campaignGame: 2 }).total).toBe(6)
  })

  it('summarises a member and the code expiry for the player', () => {
    expect(memberSummary({ completed: 3, total: 6, tally: { win: 2, loss: 1 } })).toBe('3 of 6 games · 2W 1L')
    expect(memberSummary({ completed: 1, total: null, tally: {} })).toBe('1 game')
    expect(memberSummary(null)).toBe('')
    const now = 1_000_000_000
    expect(expiresIn(now + 7 * 86_400_000, now)).toBe('Expires in 7 days')
    expect(expiresIn(now + 2 * 3_600_000, now)).toBe('Expires in 2 hours')
    expect(expiresIn(now - 1, now)).toMatch(/expired/)
  })

  it('tidies group names', () => {
    expect(cleanGroupName('  The   Long  Night ')).toBe('The Long Night')
    expect(cleanGroupName('   ')).toBeNull()
    expect(cleanGroupName(42)).toBeNull()
  })
})
