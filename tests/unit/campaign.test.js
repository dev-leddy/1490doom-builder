import { describe, it, expect } from 'vitest'
import { CAMPAIGN_RULES } from '../../src/data/campaign.js'
import {
  normalizeCampaign, campaignProgress, spendableCapacity, validateEndOfGame, applyEndOfGame,
  undoLastGame, canUndoLastGame, hireIntoVacancy, vacancies,
  permanenceBlock, isPermanentUpgrade, undoLastUpgrade, lastUpgrade,
  endOfGameWarnings, minEarnedIP, removeSlotBlock,
  logUpgrade, syncUpgradeItem, unlogLastUpgrade, upgradeLabel,
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

  it('refuses bonus IP for a warrior with nothing left to buy while another survivor can use it', () => {
    const c = company([maxedFighter({ isCaptain: true }), warrior('Scout', { weapon1: 'Bow' })])
    expect(validateEndOfGame(c, draft({ bonus: [{ index: 0, ip: 1 }] })).length).toBeGreaterThan(0)
    expect(validateEndOfGame(c, draft({ bonus: [{ index: 1, ip: 1 }] }))).toEqual([])
  })

  it('allows it when no survivor can use it', () => {
    const c = company([maxedFighter({ isCaptain: true }), warrior('Scout', { weapon1: 'Bow' })])
    expect(validateEndOfGame(c, draft({ fallenIndices: [1], survivorPick: 0, bonus: [{ index: 0, ip: 1 }] }))).toEqual([])
  })

  it('counts the other points already going to that warrior', () => {
    // Scout with 1 upgrade left: the survivor point fills it, so bonus on top is refused
    const nearlyDone = warrior('Scout', { weapon1: 'Bow', earnedIP: 7 })
    const c = company([warrior('Fighter', { isCaptain: true }), nearlyDone])
    expect(spendableCapacity(nearlyDone)).toBe(1)
    expect(validateEndOfGame(c, draft({ survivorPick: 1, bonus: [{ index: 1, ip: 1 }] })).length).toBeGreaterThan(0)
    expect(validateEndOfGame(c, draft({ survivorPick: 1, bonus: [{ index: 0, ip: 1 }] }))).toEqual([])
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
  it(`is capped at ${CAMPAIGN_RULES.maxBonusIP} per game and goes to survivors only`, () => {
    expect(validateEndOfGame(trio(), draft({ bonus: [{ index: 1, ip: 2 }, { index: 2, ip: 1 }] }))).toEqual([])
    expect(validateEndOfGame(trio(), draft({ bonus: [{ index: 1, ip: 2 }, { index: 2, ip: 2 }] })).length).toBeGreaterThan(0)
    expect(validateEndOfGame(trio(), draft({ fallenIndices: [2], bonus: [{ index: 2, ip: 1 }] })).length).toBeGreaterThan(0)
    const { company: c, record } = applyEndOfGame(trio(), draft({ bonus: [{ index: 2, ip: 2 }] }))
    expect(ipOf(c)).toEqual([0, 1, 2])
    expect(record.awards.find(a => a.reason === 'bonus')).toMatchObject({ ip: 2 })
  })
})

describe('campaign length', () => {
  it(`game ${CAMPAIGN_RULES.games} completes the campaign and the next game is refused`, () => {
    let c = trio()
    for (let g = 1; g <= CAMPAIGN_RULES.games; g++) {
      expect(campaignProgress(c).nextGame).toBe(g)
      c = applyEndOfGame(c, draft({ scenario: `Scenario ${g}` }), { now: 1000 + g }).company
    }
    expect(c.campaign.completedAt).toBe(1000 + CAMPAIGN_RULES.games)
    expect(campaignProgress(c)).toEqual({ completed: CAMPAIGN_RULES.games, total: CAMPAIGN_RULES.games, isComplete: true, nextGame: null })
    expect(c.campaign.log.map(r => r.scenario)).toEqual(Array.from({ length: CAMPAIGN_RULES.games }, (_, i) => `Scenario ${i + 1}`))
    expect(validateEndOfGame(c, draft()).length).toBeGreaterThan(0)
    expect(() => applyEndOfGame(c, draft())).toThrow()
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
    expect(c.campaign).toEqual({ v: 1, log: [], upgrades: [], completedAt: null, needsCaptain: false })
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
