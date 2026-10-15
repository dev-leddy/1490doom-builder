import { describe, it, expect } from 'vitest'
import { CAMPAIGN_RULES } from '../../src/data/campaign.js'
import {
  normalizeCampaign, campaignProgress, spendableCapacity, validateEndOfGame, applyEndOfGame,
  undoLastGame, canUndoLastGame, hireIntoVacancy, vacancies,
  permanenceBlock, isPermanentUpgrade, undoLastUpgrade, lastUpgrade,
  endOfGameWarnings, minEarnedIP, removeSlotBlock,
  logUpgrade, syncUpgradeItem, unlogLastUpgrade, upgradeLabel,
  undoRecruit, undoRecruitBlock, nameWithClass,
  setGameScenario, endCampaignEarly, reopenCampaign,
  editOutcome, outcomeEditBlock, draftFromRecord, reRecordLatestGame, editLatestGameLosses,
  setCampaignLength, keepPlaying, campaignLength, MAX_CAMPAIGN_LENGTH,
  resurrectWarrior, resurrectBlock, isResurrected, resurrectDefaults,
} from '../../src/store/campaign.js'

const warrior = (type, extra = {}) => ({
  type, weapon1: 'Light Weapon', weapon2: null, consumable: null, climbing: null,
  ip: [], isCaptain: false, notes: [], customName: null, earnedIP: 0, statImproves: [], ...extra,
})
const company = (slots, extra = {}) => normalizeCampaign({
  companyMode: 'campaign', campaignGame: 0, mark: '', companyName: 'Test', ipLimit: 0, companyId: 'c1', slots, ...extra,
})
// Captain Fighter (0), Scout (1), Assassin (2)
const trio = () => company([warrior('Fighter', { isCaptain: true }), warrior('Scout', { weapon1: 'Bow' }), warrior('Assassin')])
const draft = (extra = {}) => ({ result: 'loss', scenario: '', fallenIndices: [], newCaptainIndex: null, survivorPick: 1, bonus: [], ...extra })
const ipOf = c => c.slots.map(s => s.earnedIP)
// A Fighter who has bought everything there is to buy
const maxedFighter = (extra = {}) => warrior('Fighter', {
  weapon2: 'Light Weapon', climbing: 'Ladder', consumable: 'Fog of War Flask',
  statImproves: ['MOV', 'VIT', 'SKL', 'DEF', 'COM'],
  ip: ['stat_0', 'stat_1', 'stat_2', 'stat_3', 'stat_4', 'weapon2', 'climbing', 'consumable'],
  earnedIP: 8, ...extra,
})

describe('end-of-game IP awards', () => {
  it('win: 1 IP to the chosen survivor and 1 to the surviving Captain', () => {
    const { company: c, record } = applyEndOfGame(trio(), draft({ result: 'win' }))
    expect(ipOf(c)).toEqual([1, 1, 0])
    expect(record.awards.map(a => a.reason).sort()).toEqual(['captain', 'survivor'])
    expect(c.campaignGame).toBe(1)
  })

  it('loss and draw: only the survivor point', () => {
    for (const result of ['loss', 'draw']) {
      const { company: c } = applyEndOfGame(trio(), draft({ result }))
      expect(ipOf(c)).toEqual([0, 1, 0])
    }
  })

  it('retreat: no IP at all, but deaths and the Captain change still happen', () => {
    const d = draft({ result: 'retreat', fallenIndices: [0], newCaptainIndex: 2, survivorPick: 1, bonus: [{ index: 1, ip: 2 }] })
    expect(validateEndOfGame(trio(), d)).toEqual([])
    const { company: c, record } = applyEndOfGame(trio(), d)
    expect(ipOf(c)).toEqual([0, 0, 0])
    expect(record.awards).toEqual([])
    expect(c.slots[0].type).toBeNull()
    expect(c.slots[2].isCaptain).toBe(true)
  })

  it('a dead Captain earns nothing, and a promoted Captain does not get the winner point', () => {
    const before = trio()
    const { company: c, record } = applyEndOfGame(before, draft({ result: 'win', fallenIndices: [0], newCaptainIndex: 2, survivorPick: 1 }))
    expect(ipOf(c)).toEqual([0, 1, 0])
    expect(record.awards.map(a => a.reason)).toEqual(['survivor'])
    expect(c.slots.map(s => s.isCaptain)).toEqual([false, false, true])
    expect(record.captainChange).toEqual({ from: before.slots[0].uid, to: before.slots[2].uid, reason: 'promoted' })
  })

  it('the survivor point may go to the Captain (2 IP on a win)', () => {
    const { company: c } = applyEndOfGame(trio(), draft({ result: 'win', survivorPick: 0 }))
    expect(ipOf(c)).toEqual([2, 0, 0])
  })

  it('a fallen Captain with survivors needs a surviving replacement', () => {
    expect(validateEndOfGame(trio(), draft({ fallenIndices: [0] })).length).toBeGreaterThan(0)
    expect(validateEndOfGame(trio(), draft({ fallenIndices: [0], newCaptainIndex: 0 })).length).toBeGreaterThan(0)
    expect(validateEndOfGame(trio(), draft({ fallenIndices: [0], newCaptainIndex: 1 }))).toEqual([])
  })

  it('the survivor point must go to a survivor', () => {
    expect(validateEndOfGame(trio(), draft({ survivorPick: null })).length).toBeGreaterThan(0)
    expect(validateEndOfGame(trio(), draft({ fallenIndices: [1], survivorPick: 1 })).length).toBeGreaterThan(0)
  })
})

describe('upgrade capacity', () => {
  it('counts the upgrades still open minus IP already banked', () => {
    expect(spendableCapacity(warrior('Fighter'))).toBe(8)               // 5 stats, off-hand, climbing, consumable
    expect(spendableCapacity(warrior('Fighter', { earnedIP: 3 }))).toBe(5)
    expect(spendableCapacity(warrior('Knight', { weapon2: 'Shield' }))).toBe(7) // the Knight's Shield is built in
    expect(spendableCapacity(maxedFighter())).toBe(0)
    expect(spendableCapacity({ type: null })).toBe(0)
  })

  it('refuses the survivor point for a warrior with nothing left to buy while another survivor can use it', () => {
    const c = company([maxedFighter({ isCaptain: true }), warrior('Scout', { weapon1: 'Bow' })])
    expect(validateEndOfGame(c, draft({ survivorPick: 0 })).length).toBeGreaterThan(0)
    expect(validateEndOfGame(c, draft({ survivorPick: 1 }))).toEqual([])
  })

  it('allows it when no survivor can use it', () => {
    const c = company([maxedFighter({ isCaptain: true }), warrior('Scout', { weapon1: 'Bow' })])
    expect(validateEndOfGame(c, draft({ fallenIndices: [1], survivorPick: 0 }))).toEqual([])
  })
})

describe('IP someone can use: Captain point and bonus', () => {
  it('a Captain with nothing left to buy still gets the winner point, with a warning', () => {
    const c = company([maxedFighter({ isCaptain: true }), warrior('Scout', { weapon1: 'Bow' })])
    const d = draft({ result: 'win', survivorPick: 1 })
    expect(validateEndOfGame(c, d)).toEqual([])
    expect(endOfGameWarnings(c, d)).toEqual({ captainCantSpend: true })
    expect(ipOf(applyEndOfGame(c, d).company)).toEqual([9, 1])
    expect(endOfGameWarnings(trio(), draft({ result: 'win' }))).toEqual({ captainCantSpend: false })
    expect(endOfGameWarnings(c, draft({ result: 'loss' }))).toEqual({ captainCantSpend: false }) // no Captain point
  })

  it('bonus IP may go to any survivor, even one with nothing left to buy (it is banked)', () => {
    const c = company([maxedFighter({ isCaptain: true }), warrior('Scout', { weapon1: 'Bow' })])
    expect(validateEndOfGame(c, draft({ bonus: [{ index: 0, ip: 5 }] }))).toEqual([])
    expect(spendableCapacity(warrior('Scout', { weapon1: 'Bow', earnedIP: 7 }))).toBe(1)
  })
})

describe('roster guards', () => {
  it('earned IP never goes below the IP already spent', () => {
    expect(minEarnedIP(warrior('Fighter', { ip: ['climbing', 'stat_0'], earnedIP: 3 }))).toBe(2)
    expect(minEarnedIP(warrior('Fighter'))).toBe(0)
  })

  it('only empty slots and plain warriors without upgrades can be removed', () => {
    expect(removeSlotBlock({ type: null, ip: [] })).toBeNull()
    expect(removeSlotBlock(warrior('Scout'))).toBeNull()
    expect(removeSlotBlock(warrior('Scout', { ip: ['climbing'], earnedIP: 1 }))).toBeTruthy()
    expect(removeSlotBlock(warrior('Fighter', { isCaptain: true }))).toBeTruthy()
  })
})

describe('everyone dies', () => {
  it('no survivor point; the first emptied slot holds the Captain place until a recruit is chosen', () => {
    const before = trio()
    const d = draft({ result: 'loss', fallenIndices: [0, 1, 2], survivorPick: null })
    expect(validateEndOfGame(before, d)).toEqual([])
    const { company: c, record } = applyEndOfGame(before, d)
    expect(record.awards).toEqual([])
    expect(c.campaign.needsCaptain).toBe(true)
    expect(c.slots.every(s => !s.type)).toBe(true)
    expect(c.slots[0].isCaptain).toBe(true)
    expect(c.slots[1].fallen).toMatchObject({ uid: before.slots[1].uid, type: 'Scout', name: 'Scout', game: 1 })
    expect(record.fallen.map(f => f.type)).toEqual(['Fighter', 'Scout', 'Assassin'])
    expect(vacancies(c).map(v => v.captainPlaceholder)).toEqual([true, false, false])

    // Recruit into the placeholder without making them Captain: the place moves on
    const c2 = hireIntoVacancy(c, 0, 'Knight')
    expect(c2.slots[0].isCaptain).toBe(false)
    expect(c2.slots[1].isCaptain).toBe(true)
    expect(c2.campaign.needsCaptain).toBe(true)
    // Choose a Captain among the recruits
    const c3 = hireIntoVacancy(c2, 2, 'Fighter', { makeCaptain: true })
    expect(c3.slots.map(s => s.isCaptain)).toEqual([false, false, true])
    expect(c3.campaign.needsCaptain).toBe(false)
  })
})

describe('bonus IP', () => {
  it('has no limit per game and goes to survivors only', () => {
    expect(validateEndOfGame(trio(), draft({ bonus: [{ index: 1, ip: 2 }, { index: 2, ip: 1 }] }))).toEqual([])
    expect(validateEndOfGame(trio(), draft({ bonus: [{ index: 1, ip: 10 }, { index: 2, ip: 12 }] }))).toEqual([])
    expect(validateEndOfGame(trio(), draft({ fallenIndices: [2], bonus: [{ index: 2, ip: 1 }] })).length).toBeGreaterThan(0)
    const { company: c, record } = applyEndOfGame(trio(), draft({ bonus: [{ index: 2, ip: 2 }] }))
    expect(ipOf(c)).toEqual([0, 1, 2])
    expect(record.awards.find(a => a.reason === 'bonus')).toMatchObject({ ip: 2 })
  })
})

describe('campaign length', () => {
  const G = CAMPAIGN_RULES.games
  const playTo = (c, n) => {
    for (let g = campaignProgress(c).completed + 1; g <= n; g++) c = applyEndOfGame(c, draft({ scenario: `Scenario ${g}` }), { now: 1000 + g }).company
    return c
  }

  it(`game ${G} completes the campaign, and a game ${G + 1} is still allowed: the length grows to fit`, () => {
    let c = trio()
    expect(c.campaign.length).toBe(G)
    for (let g = 1; g <= G; g++) {
      expect(campaignProgress(c).nextGame).toBe(g)
      c = playTo(c, g)
    }
    expect(c.campaign.completedAt).toBe(1000 + G)
    expect(campaignProgress(c)).toEqual({ completed: G, total: G, isComplete: true, endedEarly: false, unlimited: false, nextGame: G + 1 })
    expect(c.campaign.log.map(r => r.scenario)).toEqual(Array.from({ length: G }, (_, i) => `Scenario ${i + 1}`))
    expect(validateEndOfGame(c, draft())).toEqual([])
    const more = applyEndOfGame(c, draft(), { now: 5000 }).company
    expect(more.campaign).toMatchObject({ length: G + 1, completedAt: 5000 })
    expect(campaignProgress(more)).toMatchObject({ completed: G + 1, total: G + 1, isComplete: true })
    expect(undoLastGame(more).campaign).toMatchObject({ length: G, completedAt: 1000 + G })   // undo takes the growth back
  })

  it('keep playing makes room for one more game', () => {
    const done = playTo(trio(), G)
    const on = keepPlaying(done)
    expect(on.campaign).toMatchObject({ length: G + 1, completedAt: null, endedEarly: false })
    expect(campaignProgress(on)).toMatchObject({ isComplete: false, nextGame: G + 1 })
    expect(() => keepPlaying(on)).toThrow()                                      // not complete
    const after = applyEndOfGame(on, draft(), { now: 7000 }).company
    expect(after.campaign).toMatchObject({ length: G + 1, completedAt: 7000 })
  })

  it('the length can be set, not below the games played, or removed', () => {
    const c = playTo(trio(), 3)
    expect(setCampaignLength(c, 8).campaign).toMatchObject({ length: 8, completedAt: null })
    expect(setCampaignLength(c, 3, { now: 9 }).campaign).toMatchObject({ length: 3, completedAt: 9 })
    expect(() => setCampaignLength(c, 2)).toThrow(/3 games are already played/)
    expect(() => setCampaignLength(c, MAX_CAMPAIGN_LENGTH + 1)).toThrow()
    expect(() => setCampaignLength(c, 2.5)).toThrow()
    const open = setCampaignLength(c, null)
    expect(campaignLength(open)).toBeNull()
    expect(campaignProgress(open)).toMatchObject({ total: null, unlimited: true, isComplete: false, nextGame: 4 })
    // Raising the length of a complete campaign reopens it
    const done = playTo(trio(), G)
    expect(setCampaignLength(done, G + 2).campaign).toMatchObject({ length: G + 2, completedAt: null })
  })

  it('with no limit the campaign never completes by itself', () => {
    const c = playTo(setCampaignLength(trio(), null), G + 2)
    expect(c.campaign).toMatchObject({ length: null, completedAt: null })
    expect(campaignProgress(c)).toMatchObject({ completed: G + 2, isComplete: false, unlimited: true })
  })

  it('companies from before the length setting count as 6 games and can carry on', () => {
    const legacy = { ...trio(), campaignGame: 8, campaign: { v: 1, log: [], completedAt: null, needsCaptain: false } }
    expect(campaignLength(legacy)).toBe(G)
    expect(campaignProgress(legacy)).toMatchObject({ completed: 8, isComplete: true, nextGame: 9 })
    const { company, record } = applyEndOfGame(legacy, draft())
    expect(record.gameNumber).toBe(9)
    expect(company.campaign.length).toBe(9)
  })
})

describe('undo last game', () => {
  it('restores the company exactly as it was', () => {
    const before = trio()
    const { company: after } = applyEndOfGame(before, draft({ result: 'win', fallenIndices: [0], newCaptainIndex: 2, bonus: [{ index: 1, ip: 1 }] }))
    expect(canUndoLastGame(after)).toBe(true)
    expect(undoLastGame(after)).toEqual(before)
  })

  it('only the latest game can be undone', () => {
    const g1 = applyEndOfGame(trio(), draft()).company
    const g2 = applyEndOfGame(g1, draft()).company
    expect(g2.campaign.log[0].before).toBeUndefined()
    const back = undoLastGame(g2)
    const { before: _snapshot, ...g1Record } = g1.campaign.log[0]
    expect(back).toEqual({ ...g1, campaign: { ...g1.campaign, log: [g1Record] } })
    expect(back.campaignGame).toBe(1)
    expect(back.campaign.log).toHaveLength(1)
    expect(canUndoLastGame(back)).toBe(false)
    expect(undoLastGame(back)).toBeNull()
  })
})

describe('older companies', () => {
  it('a campaign company without a log gets uids and a campaign, and keeps its game count', () => {
    const legacy = {
      companyMode: 'campaign', campaignGame: 3, mark: '', companyName: 'Old', ipLimit: 0, companyId: 'old',
      slots: [warrior('Fighter', { isCaptain: true, earnedIP: 2 }), warrior('Scout', { weapon1: 'Bow' })],
    }
    const c = normalizeCampaign(legacy)
    expect(c.slots.every(s => typeof s.uid === 'string' && s.uid)).toBe(true)
    expect(c.campaign).toEqual({ v: 1, length: CAMPAIGN_RULES.games, log: [], upgrades: [], roster: [], completedAt: null, needsCaptain: false })
    expect(campaignProgress(c)).toMatchObject({ completed: 3, nextGame: 4, isComplete: false })
    const { company: next, record } = applyEndOfGame(legacy, draft())
    expect(record.gameNumber).toBe(4)
    expect(next.campaignGame).toBe(4)
    expect(normalizeCampaign(c)).toEqual(c) // idempotent
  })

  it('standard companies are left alone', () => {
    const std = { companyMode: 'standard', slots: [warrior('Fighter')] }
    expect(normalizeCampaign(std)).toBe(std)
  })
})

describe('hiring', () => {
  it('puts a new warrior in a vacancy with a new uid and optional starting IP', () => {
    const { company: c } = applyEndOfGame(trio(), draft({ fallenIndices: [2] }))
    const fallenUid = c.slots[2].fallen.uid
    const hired = hireIntoVacancy(c, 2, 'Knight', { startIP: 2 })
    expect(hired.slots[2]).toMatchObject({ type: 'Knight', weapon1: 'Light Weapon', weapon2: 'Shield', earnedIP: 2, ip: [] })
    expect(hired.slots[2].fallen).toBeUndefined()
    expect(hired.slots[2].uid).not.toBe(fallenUid)
    expect(hireIntoVacancy(c, 2, 'Knight').slots[2].earnedIP).toBe(0)
  })

  it('refuses a taken slot, a duplicate class, or a second Captain', () => {
    const { company: c } = applyEndOfGame(trio(), draft({ fallenIndices: [2] }))
    expect(() => hireIntoVacancy(c, 1, 'Knight')).toThrow()
    expect(() => hireIntoVacancy(c, 2, 'Scout')).toThrow()
    expect(() => hireIntoVacancy(c, 2, 'Knight', { makeCaptain: true })).toThrow()
  })
})

describe('permanent upgrades', () => {
  const bought = warrior('Fighter', {
    weapon2: 'Light Weapon', climbing: 'Ladder', statImproves: ['MOV', 'VIT'],
    ip: ['stat_0', 'climbing', 'weapon2', 'stat_1'], earnedIP: 4,
  })

  it("a bought item can't be removed or swapped", () => {
    expect(permanenceBlock(bought, 'climbing', null)).toBeTruthy()
    expect(permanenceBlock(bought, 'climbing', 'Grappling Hook')).toBeTruthy()
    expect(permanenceBlock(bought, 'weapon2', null)).toBeTruthy()
    expect(permanenceBlock(bought, 'weapon2', 'Shield')).toBeTruthy()
    expect(permanenceBlock(bought, 'consumable', 'Fog of War Flask')).toBeNull() // not bought yet: buying is fine
    expect(permanenceBlock(bought, 'customName', 'Grim')).toBeNull()
    for (const id of ['weapon2', 'climbing', 'consumable', 'stat_0', 'stat']) expect(isPermanentUpgrade(id)).toBe(true)
  })

  it("the main weapon can't change to one the bought off-hand can't go with", () => {
    expect(permanenceBlock(bought, 'weapon1', 'Heavy Weapon')).toBeTruthy()          // two-handed: off-hand would go
    expect(permanenceBlock(bought, 'weapon1', 'Polearm (one-handed)')).toBeTruthy()  // would swap it for a Shield
    const shield = { ...bought, weapon2: 'Shield' }
    expect(permanenceBlock(shield, 'weapon1', 'Polearm (one-handed)')).toBeNull()    // keeps the Shield
    expect(permanenceBlock(warrior('Fighter'), 'weapon1', 'Heavy Weapon')).toBeNull()
  })

  it('undo last upgrade takes back only the most recent one, in purchase order', () => {
    expect(lastUpgrade(bought)).toEqual({ id: 'stat_1', kind: 'stat', stat: 'VIT' })
    const u1 = undoLastUpgrade(bought)
    expect(u1).toMatchObject({ ip: ['stat_0', 'climbing', 'weapon2'], statImproves: ['MOV'], climbing: 'Ladder', weapon2: 'Light Weapon' })
    const u2 = undoLastUpgrade(u1)
    expect(u2).toMatchObject({ ip: ['stat_0', 'climbing'], weapon2: null, climbing: 'Ladder' })
    const u3 = undoLastUpgrade(u2)
    expect(u3).toMatchObject({ ip: ['stat_0'], climbing: null, statImproves: ['MOV'] })
    expect(undoLastUpgrade(undoLastUpgrade(u3))).toBeNull()
  })

  it("undoing a one-handed polearm's Shield takes the polearm back too", () => {
    const polearm = warrior('Fighter', { weapon1: 'Polearm (one-handed)', weapon2: 'Shield', ip: ['weapon2'], earnedIP: 1 })
    const undone = undoLastUpgrade(polearm)
    expect(undone).toMatchObject({ ip: [], weapon2: null, weapon1: 'Light Weapon' })
  })
})

describe('upgrade log', () => {
  const withSlot = (c, i, patch) => ({ ...c, slots: c.slots.map((s, k) => (k === i ? { ...s, ...patch } : s)) })
  const buy = (c, i, patch, id, now) => {
    const next = withSlot(c, i, patch)
    return { ...next, campaign: logUpgrade(next, i, id, { now }) }
  }

  it('logs what was bought, for whom and after how many games', () => {
    let c = buy(trio(), 1, { customName: 'Vex', earnedIP: 2, statImproves: ['COM'], ip: ['stat_0'] }, 'stat_0', 5)
    expect(c.campaign.upgrades).toEqual([
      { afterGame: 0, uid: c.slots[1].uid, name: 'Vex', id: 'stat_0', kind: 'stat', stat: 'COM', label: 'Combat', at: 5 },
    ])
    c = applyEndOfGame(c, draft()).company
    c = buy(c, 1, { climbing: 'Grappling Hook', ip: ['stat_0', 'climbing'] }, 'climbing', 6)
    expect(c.campaign.upgrades.at(-1)).toMatchObject({ afterGame: 1, name: 'Vex', kind: 'gear', item: 'Grappling Hook', label: 'Grappling Hook' })
    expect(upgradeLabel({ weapon2: 'Shield' }, 'weapon2')).toEqual({ kind: 'gear', item: 'Shield', label: 'Shield' })
  })

  it('a changed item updates its entry instead of adding one', () => {
    let c = buy(trio(), 2, { earnedIP: 1, consumable: 'Fog of War Flask', ip: ['consumable'] }, 'consumable')
    c = withSlot(c, 2, { consumable: 'Canister of Creeping Death' })
    const camp = syncUpgradeItem(c, 2, 'consumable')
    expect(camp.upgrades).toHaveLength(1)
    expect(camp.upgrades[0]).toMatchObject({ item: 'Canister of Creeping Death', label: 'Canister of Creeping Death' })
  })

  it("undo last upgrade removes only that warrior's latest entry", () => {
    let c = buy(trio(), 1, { earnedIP: 3, statImproves: ['MOV'], ip: ['stat_0'] }, 'stat_0')
    c = buy(c, 2, { earnedIP: 1, climbing: 'Ladder', ip: ['climbing'] }, 'climbing')
    c = buy(c, 1, { climbing: 'Ladder', ip: ['stat_0', 'climbing'] }, 'climbing')
    const camp = unlogLastUpgrade(c, c.slots[1])
    expect(camp.upgrades.map(e => [e.uid, e.id])).toEqual([[c.slots[1].uid, 'stat_0'], [c.slots[2].uid, 'climbing']])
  })

  it('undoing a game drops the upgrades bought after it', () => {
    let c = buy(trio(), 1, { earnedIP: 1, statImproves: ['MOV'], ip: ['stat_0'] }, 'stat_0')
    c = applyEndOfGame(c, draft()).company
    c = buy(c, 1, { climbing: 'Ladder', ip: ['stat_0', 'climbing'] }, 'climbing')
    expect(c.campaign.upgrades.map(e => e.afterGame)).toEqual([0, 1])
    const back = undoLastGame(c)
    expect(back.campaign.upgrades.map(e => e.id)).toEqual(['stat_0'])
    expect(back.campaign.log[0]?.before).toBeUndefined()
    expect(back.slots[1].ip).toEqual(['stat_0'])
  })

  it('standard companies log nothing', () => {
    const std = { companyMode: 'standard', campaign: null, slots: [warrior('Fighter', { ip: ['climbing'], climbing: 'Ladder' })] }
    expect(logUpgrade(std, 0, 'climbing')).toBeNull()
  })
})

describe('recruits and the roster log', () => {
  it('names warriors with their class only when they have a custom name', () => {
    expect(nameWithClass({ customName: 'Joss', type: 'Scout' })).toBe('Joss (Scout)')
    expect(nameWithClass({ name: 'Scout', type: 'Scout' })).toBe('Scout')
    expect(nameWithClass({ customName: null, type: 'Scout' })).toBe('Scout')
  })

  it('hiring is logged with the starting IP and the fallen warrior it replaces', () => {
    const { company: c } = applyEndOfGame(trio(), draft({ fallenIndices: [2] }))
    const hired = hireIntoVacancy(c, 2, 'Knight', { startIP: 1, now: 7 })
    expect(hired.campaign.roster).toEqual([{
      afterGame: 1, uid: hired.slots[2].uid, name: 'Knight', type: 'Knight', action: 'recruited',
      startIP: 1, replaced: c.slots[2].fallen, at: 7,
    }])
  })

  it("a recruit with upgrades can't be undone until the upgrades are", () => {
    expect(undoRecruitBlock(warrior('Scout', { ip: ['climbing'], earnedIP: 1 }))).toBeTruthy()
    expect(undoRecruitBlock({ type: null })).toBeTruthy()
    expect(undoRecruitBlock(warrior('Scout'))).toBeNull()
    const c = company([warrior('Fighter', { isCaptain: true, ip: ['climbing'], climbing: 'Ladder', earnedIP: 1 })])
    expect(() => undoRecruit(c, 0)).toThrow()
  })

  it('undoing a recruit puts the fallen record back and is logged', () => {
    const { company: c } = applyEndOfGame(trio(), draft({ fallenIndices: [2] }))
    const fallen = c.slots[2].fallen
    const hired = hireIntoVacancy(c, 2, 'Knight', { startIP: 1 })
    const back = undoRecruit({ ...hired, slots: hired.slots.map((s, i) => (i === 2 ? { ...s, customName: 'Ser Dunk' } : s)) }, 2, { now: 9 })
    expect(back.slots[2]).toMatchObject({ type: null, isCaptain: false, earnedIP: 0, fallen })
    expect(back.campaign.roster.map(e => e.action)).toEqual(['recruited', 'recruit undone'])
    expect(back.campaign.roster[1]).toMatchObject({ afterGame: 1, name: 'Ser Dunk (Knight)', type: 'Knight', at: 9 })
  })

  it('undoing a founding recruit leaves an empty slot that keeps the Captain place', () => {
    let c = company([{ ...warrior(null), type: null, isCaptain: true }, { ...warrior(null), type: null }])
    c = hireIntoVacancy(c, 0, 'Fighter')
    expect(c.slots[0].isCaptain).toBe(true)
    const back = undoRecruit(c, 0)
    expect(back.slots[0]).toMatchObject({ type: null, isCaptain: true })
    expect('fallen' in back.slots[0]).toBe(false)
    expect(back.campaign.needsCaptain).toBe(false)
  })

  it('undoing a Captain recruit after a game leaves the company needing a Captain', () => {
    const { company: dead } = applyEndOfGame(trio(), draft({ fallenIndices: [0, 1, 2], survivorPick: null }))
    const led = hireIntoVacancy(dead, 1, 'Knight', { makeCaptain: true })
    expect(led.campaign.needsCaptain).toBe(false)
    const back = undoRecruit(led, 1)
    expect(back.slots[1].isCaptain).toBe(true)
    expect(back.campaign.needsCaptain).toBe(true)
  })

  it('undoing a game drops the roster changes made after it', () => {
    let c = hireIntoVacancy(company([warrior('Fighter', { isCaptain: true }), { ...warrior(null), type: null }]), 1, 'Scout')
    c = applyEndOfGame(c, draft({ survivorPick: 0, fallenIndices: [1] })).company
    c = hireIntoVacancy(c, 1, 'Knight')
    expect(c.campaign.roster.map(e => e.afterGame)).toEqual([0, 1])
    const back = undoLastGame(c)
    expect(back.campaign.roster.map(e => e.type)).toEqual(['Scout'])
    expect(back.slots[1].type).toBe('Scout')
  })
})

describe('campaign settings', () => {
  it('renames a recorded game, and clears the name when empty', () => {
    const c = applyEndOfGame(trio(), draft({ scenario: 'The Bell Tower' })).company
    expect(setGameScenario(c, 1, '  The Drowned Chapel ').campaign.log[0].scenario).toBe('The Drowned Chapel')
    expect(setGameScenario(c, 1, '   ').campaign.log[0].scenario).toBeNull()
    expect(setGameScenario(c, 2, 'Nope')).toBeNull()
  })

  it('ending early completes the campaign; it can be reopened', () => {
    const c = applyEndOfGame(trio(), draft()).company
    const ended = endCampaignEarly(c, { now: 50 })
    expect(ended.campaign).toMatchObject({ completedAt: 50, endedEarly: true })
    expect(campaignProgress(ended)).toMatchObject({ completed: 1, isComplete: true, endedEarly: true, nextGame: 2 })
    // Another game is still allowed; it takes the early end back
    expect(validateEndOfGame(ended, draft())).toEqual([])
    expect(applyEndOfGame(ended, draft()).company.campaign).toMatchObject({ endedEarly: false, completedAt: null })
    expect(keepPlaying(ended).campaign).toMatchObject({ endedEarly: false, completedAt: null, length: CAMPAIGN_RULES.games })
    expect(() => endCampaignEarly(ended)).toThrow()
    const open = reopenCampaign(ended)
    expect(open.campaign).toMatchObject({ completedAt: null, endedEarly: false })
    expect(campaignProgress(open)).toMatchObject({ isComplete: false, nextGame: 2 })
  })

  it('an early end counts as complete even without completedAt', () => {
    const c = { ...trio(), campaign: { ...trio().campaign, endedEarly: true } }
    expect(campaignProgress(c).isComplete).toBe(true)
  })

  it("a campaign that played every game can't be reopened, and an open one has nothing to reopen", () => {
    let c = trio()
    expect(() => reopenCampaign(c)).toThrow()
    for (let g = 0; g < CAMPAIGN_RULES.games; g++) c = applyEndOfGame(c, draft()).company
    expect(() => reopenCampaign(c)).toThrow()
  })

  it('a game records the activity event it was logged with', () => {
    const { record } = applyEndOfGame(trio(), draft(), { eventId: 'e-1' })
    expect(record.eventId).toBe('e-1')
  })
})

describe('editing a game outcome (any game)', () => {
  const uidOf = (c, i) => c.slots[i].uid

  it('win to loss takes the Captain point back', () => {
    const c = applyEndOfGame(trio(), draft({ result: 'win' })).company
    expect(ipOf(c)).toEqual([1, 1, 0])
    const { company: e, record, deltas } = editOutcome(c, 1, { result: 'loss' })
    expect(ipOf(e)).toEqual([0, 1, 0])
    expect(record.awards.map(a => a.reason)).toEqual(['survivor'])
    expect(record.result).toBe('loss')
    expect(deltas).toEqual([{ uid: uidOf(c, 0), name: 'Fighter', ip: -1 }])
  })

  it('loss to win adds the Captain point, but only if the Captain survived that game', () => {
    const c = applyEndOfGame(trio(), draft()).company
    expect(ipOf(editOutcome(c, 1, { result: 'win' }).company)).toEqual([1, 1, 0])
    const fell = applyEndOfGame(trio(), draft({ fallenIndices: [0], newCaptainIndex: 2 })).company
    const { company: e, deltas } = editOutcome(fell, 1, { result: 'win' })
    expect(deltas).toEqual([])
    expect(e.campaign.log[0].awards.map(a => a.reason)).toEqual(['survivor'])
  })

  it('moves the survivor point to another survivor of that game', () => {
    const c = applyEndOfGame(trio(), draft()).company
    expect(ipOf(editOutcome(c, 1, { survivorPick: uidOf(c, 2) }).company)).toEqual([0, 0, 1])
    const fell = applyEndOfGame(trio(), draft({ fallenIndices: [2] })).company
    expect(() => editOutcome(fell, 1, { survivorPick: fell.campaign.log[0].fallen[0].uid })).toThrow()
  })

  it('a retreat takes every point back, bonus included', () => {
    const c = applyEndOfGame(trio(), draft({ result: 'win', bonus: [{ index: 2, ip: 1 }] })).company
    expect(ipOf(c)).toEqual([1, 1, 1])
    const { company: e, record } = editOutcome(c, 1, { result: 'retreat' })
    expect(ipOf(e)).toEqual([0, 0, 0])
    expect(record.awards).toEqual([])
  })

  it('is refused when the warrior has spent that IP', () => {
    let c = applyEndOfGame(trio(), draft()).company
    c = { ...c, slots: c.slots.map((s, i) => (i === 1 ? { ...s, climbing: 'Ladder', ip: ['climbing'] } : s)) }
    expect(() => editOutcome(c, 1, { result: 'retreat' })).toThrow(/Scout has spent that IP/)
    expect(outcomeEditBlock(c, 1, { result: 'retreat' })).toMatch(/Undo one of their upgrades first/)
    expect(outcomeEditBlock(c, 1, { result: 'win' })).toBeNull()
    expect(outcomeEditBlock(c, 9, { result: 'win' })).toBeTruthy()
  })

  it('skips warriors who have fallen since, with a warning', () => {
    const g1 = applyEndOfGame(trio(), draft()).company                                    // Scout +1
    const g2 = applyEndOfGame(g1, draft({ fallenIndices: [1], survivorPick: 2 })).company  // Scout falls, Assassin +1
    const { company: e, deltas, warnings } = editOutcome(g2, 1, { survivorPick: uidOf(g1, 2) })
    expect(deltas).toEqual([{ uid: uidOf(g1, 2), name: 'Assassin', ip: 1 }])
    expect(warnings).toHaveLength(1)
    expect(e.slots[2].earnedIP).toBe(2)
    expect(e.campaign.log[0].awards[0].uid).toBe(uidOf(g1, 2))
  })
})

describe('editing the latest game in full', () => {
  it('rebuilds the draft from the record', () => {
    const c = applyEndOfGame(trio(), draft({ result: 'win', scenario: 'Bell Tower', bonus: [{ index: 2, ip: 1 }] })).company
    expect(draftFromRecord(c)).toEqual({ result: 'win', scenario: 'Bell Tower', fallenIndices: [], newCaptainIndex: null, survivorPick: 1, bonus: [{ index: 2, ip: 1 }] })
    const promoted = applyEndOfGame(trio(), draft({ fallenIndices: [0], newCaptainIndex: 2 })).company
    expect(draftFromRecord(promoted)).toMatchObject({ fallenIndices: [0], newCaptainIndex: 2, survivorPick: 1 })
  })

  it('enters the game again: same number, id and scenario; later upgrades are lost like an undo', () => {
    const first = applyEndOfGame(trio(), draft({ result: 'win', scenario: 'Bell Tower' }), { eventId: 'ev-1' }).company
    const record1 = first.campaign.log[0]
    const c = { ...first, slots: first.slots.map((s, i) => (i === 0 ? { ...s, statImproves: ['COM'], ip: ['stat_0'] } : s)) }
    const bought = { ...c, campaign: logUpgrade(c, 0, 'stat_0') }
    expect(editLatestGameLosses(bought).any).toBe(true)
    expect(editLatestGameLosses(bought).upgrades).toHaveLength(1)

    const { scenario: _s, ...rest } = draftFromRecord(bought)
    const { company: e, record, deltas } = reRecordLatestGame(bought, { ...rest, fallenIndices: [1], survivorPick: 2 })
    expect(record).toMatchObject({ gameNumber: 1, id: record1.id, eventId: 'ev-1', scenario: 'Bell Tower', finishedAt: record1.finishedAt })
    expect(e.campaign.log).toHaveLength(1)
    expect(e.campaignGame).toBe(1)
    expect(e.slots[1].type).toBeNull()
    expect(ipOf(e)).toEqual([1, 0, 1])
    expect(e.slots[0].ip).toEqual([])                     // the upgrade bought after the game is gone
    expect(e.campaign.upgrades).toEqual([])
    expect([...deltas].sort((a, b) => a.ip - b.ip)).toEqual([{ uid: first.slots[1].uid, ip: -1 }, { uid: first.slots[2].uid, ip: 1 }])
    expect(canUndoLastGame(e)).toBe(true)
  })

  it('keeps the scenario when the draft leaves it out, clears it when emptied', () => {
    const c = applyEndOfGame(trio(), draft({ scenario: 'Bell Tower' })).company
    const { scenario: _s, ...rest } = draftFromRecord(c)
    expect(reRecordLatestGame(c, rest).record.scenario).toBe('Bell Tower')
    expect(reRecordLatestGame(c, { ...rest, scenario: '' }).record.scenario).toBeNull()
    expect(reRecordLatestGame(c, { ...rest, scenario: 'Moor' }).record.scenario).toBe('Moor')
  })

  it('uses the same checks as recording a game', () => {
    const c = applyEndOfGame(trio(), draft()).company
    expect(() => reRecordLatestGame(c, { ...draftFromRecord(c), survivorPick: null })).toThrow()
  })

  it('a game without its snapshot (older ones) can only have its outcome edited', () => {
    const g1 = applyEndOfGame(trio(), draft()).company
    const g2 = applyEndOfGame(g1, draft()).company
    expect(draftFromRecord(g2, g2.campaign.log[0])).toBeNull()
    const legacy = { ...g1, campaign: { ...g1.campaign, log: g1.campaign.log.map(({ before: _b, ...r }) => r) } }
    expect(() => reRecordLatestGame(legacy, draft())).toThrow()
    expect(ipOf(editOutcome(legacy, 1, { result: 'win' }).company)).toEqual([1, 1, 0])
  })
})

describe('resurrecting the fallen', () => {
  // Scout (slot 1) with gear and upgrades, named
  const geared = () => company([
    warrior('Fighter', { isCaptain: true }),
    warrior('Scout', { customName: 'Joss', weapon1: 'Bow', weapon2: null, climbing: 'Ladder', consumable: 'Fog of War Flask', statImproves: ['MOV'], ip: ['climbing', 'stat_0', 'consumable'], earnedIP: 4, notes: ['Sharp eyes'] }),
    warrior('Assassin'),
  ])
  const scoutFalls = (c = geared()) => applyEndOfGame(c, draft({ fallenIndices: [1], survivorPick: 0 })).company

  it('the record keeps a full snapshot of each fallen warrior', () => {
    const before = geared()
    const entry = scoutFalls(before).campaign.log[0].fallen[0]
    expect(entry).toMatchObject({ uid: before.slots[1].uid, type: 'Scout', name: 'Joss', customName: 'Joss', weapon1: 'Bow', climbing: 'Ladder', earnedIP: 4, notes: ['Sharp eyes'] })
  })

  it('brings them back as themselves with their old IP to spend and nothing bought', () => {
    const before = geared()
    const c = scoutFalls(before)
    const uid = before.slots[1].uid
    expect(resurrectDefaults(c, { gameNumber: 1, uid })).toEqual({ ip: 4, slotIndex: 1 })
    expect(resurrectBlock(c, { gameNumber: 1, uid })).toBeNull()
    const { company: back, slotIndex, warnings } = resurrectWarrior(c, { gameNumber: 1, uid }, { now: 77 })
    expect(slotIndex).toBe(1)
    expect(warnings).toEqual([])
    expect(back.slots[1]).toMatchObject({
      uid, type: 'Scout', customName: 'Joss', notes: ['Sharp eyes'], earnedIP: 4, isCaptain: false,
      weapon1: 'Light Weapon', weapon2: null, climbing: null, consumable: null, ip: [], statImproves: [],
    })
    expect('fallen' in back.slots[1]).toBe(false)
    const entry = back.campaign.log[0].fallen[0]
    expect(isResurrected(entry)).toBe(true)
    expect(entry.resurrected).toEqual({ at: 77, slotIndex: 1, afterGame: 1 })
    expect(() => resurrectWarrior(back, { gameNumber: 1, uid })).toThrow(/already back/)
    expect(resurrectBlock(back, { gameNumber: 1, uid })).toMatch(/already back/)
  })

  it('the player chooses how much IP they come back with', () => {
    const c = scoutFalls()
    const uid = c.campaign.log[0].fallen[0].uid
    expect(resurrectWarrior(c, { gameNumber: 1, uid }, { ip: 0 }).company.slots[1].earnedIP).toBe(0)
    expect(resurrectWarrior(c, { gameNumber: 1, uid }, { ip: 7 }).company.slots[1].earnedIP).toBe(7)
    expect(() => resurrectWarrior(c, { gameNumber: 1, uid }, { ip: -1 })).toThrow(/between 0 and 99/)
    expect(() => resurrectWarrior(c, { gameNumber: 1, uid }, { ip: 1.5 })).toThrow()
    expect(resurrectBlock(c, { gameNumber: 1, uid }, { ip: 100 })).toBeTruthy()
  })

  it('class gear comes back, bought gear does not', () => {
    const before = company([warrior('Fighter', { isCaptain: true }), warrior('Knight', { weapon2: 'Shield', climbing: 'Ladder', ip: ['climbing'], earnedIP: 1 })])
    const c = applyEndOfGame(before, draft({ fallenIndices: [1], survivorPick: 0 })).company
    const back = resurrectWarrior(c, { gameNumber: 1, uid: before.slots[1].uid }).company
    expect(back.slots[1]).toMatchObject({ weapon1: 'Light Weapon', weapon2: 'Shield', climbing: null, ip: [], earnedIP: 1 })
  })

  it('uses another empty slot when theirs is taken, and refuses with none or a duplicate class', () => {
    const before = company([...geared().slots, { ...warrior(null), type: null }])
    const uid = before.slots[1].uid
    const c = hireIntoVacancy(scoutFalls(before), 1, 'Knight')
    expect(resurrectDefaults(c, { gameNumber: 1, uid })).toEqual({ ip: 4, slotIndex: 3 })
    expect(resurrectWarrior(c, { gameNumber: 1, uid }).slotIndex).toBe(3)
    const full = hireIntoVacancy(c, 3, 'Reaver')
    expect(resurrectDefaults(full, { gameNumber: 1, uid }).slotIndex).toBe(-1)
    expect(() => resurrectWarrior(full, { gameNumber: 1, uid })).toThrow('No empty slot. Remove or free a slot first.')
    const sameClass = hireIntoVacancy(scoutFalls(before), 1, 'Scout')
    expect(() => resurrectWarrior(sameClass, { gameNumber: 1, uid })).toThrow(/already has a Scout/)
    expect(() => resurrectWarrior(c, { gameNumber: 2, uid })).toThrow(/not among the fallen/)
    expect(resurrectDefaults(c, { gameNumber: 2, uid })).toBeNull()
  })

  it('older fallen entries (no snapshot) come back the same way, without a warning', () => {
    const c = scoutFalls()
    const legacyEntry = ({ weapon1: _a, weapon2: _b, consumable: _c, climbing: _d, customName: _e, notes: _f, ...rest }) => rest
    const legacy = { ...c, campaign: { ...c.campaign, log: c.campaign.log.map(r => ({ ...r, fallen: r.fallen.map(legacyEntry) })) } }
    const { company: back, warnings } = resurrectWarrior(legacy, { gameNumber: 1, uid: c.campaign.log[0].fallen[0].uid })
    expect(back.slots[1]).toMatchObject({ type: 'Scout', customName: 'Joss', weapon1: 'Light Weapon', climbing: null, consumable: null, statImproves: [], ip: [], earnedIP: 4 })
    expect(warnings).toEqual([])
  })

  it('a fallen Captain comes back without the Captaincy', () => {
    const before = trio()
    const dead = applyEndOfGame(before, draft({ fallenIndices: [0, 1, 2], survivorPick: null })).company
    const { company: back } = resurrectWarrior(dead, { gameNumber: 1, uid: before.slots[0].uid })
    expect(back.slots[0]).toMatchObject({ type: 'Fighter', isCaptain: false })
    expect(back.campaign.needsCaptain).toBe(true)
    expect(back.slots[1].isCaptain).toBe(true)       // the Captain's place moved to another empty slot
  })

  it('undoing the game they fell in never makes a second copy', () => {
    const c = scoutFalls()
    const uid = c.campaign.log[0].fallen[0].uid
    const back = resurrectWarrior(c, { gameNumber: 1, uid }).company
    const undone = undoLastGame(back)
    expect(undone.slots.filter(s => s.uid === uid)).toHaveLength(1)
    expect(undone.campaign.log).toHaveLength(0)
  })

  it('undoing a later game also undoes a resurrection made after it', () => {
    const g1 = scoutFalls()
    const uid = g1.campaign.log[0].fallen[0].uid
    const g2 = applyEndOfGame(g1, draft({ survivorPick: 0 })).company
    const back = resurrectWarrior(g2, { gameNumber: 1, uid }).company
    const undone = undoLastGame(back)
    expect(undone.slots[1].type).toBeNull()
    expect(isResurrected(undone.campaign.log[0].fallen[0])).toBe(false)
    expect(resurrectBlock(undone, { gameNumber: 1, uid })).toBeNull()
  })
})
