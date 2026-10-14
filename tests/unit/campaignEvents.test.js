import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { makeEvent, coalesce, newEventId, CLIENT_EVENT_TYPES, notesFor, rowActions } from '../../src/store/campaignEvents.js'
import { normalizeCampaign, applyEndOfGame, logUpgrade, hireIntoVacancy } from '../../src/store/campaign.js'
import { createSaver, MAX_EVENTS } from '../../src/store/builderPersistence.js'
import {
  validateEvents, unloggedEvent, CLIENT_EVENT_TYPES as SERVER_TYPES, MAX_PAYLOAD_BYTES,
} from '../../functions/lib/campaignEvents.js'
import { describeEvent, undoneIds, groupEvents, matchesFilter } from '../../src/builder/activityLog.js'

const ev = (type, payload = {}, n = 1, extra = {}) => makeEvent(type, payload, { id: newEventId(), now: n, ...extra })

describe('event builders', () => {
  it('makes an event with the agreed shape', () => {
    const e = makeEvent('upgrade.bought', { uid: 'u1', label: 'Combat' }, { afterGame: 2, ref: null, now: 123, id: 'x' })
    expect(e).toEqual({ id: 'x', type: 'upgrade.bought', v: 1, at: 123, afterGame: 2, ref: null, payload: { uid: 'u1', label: 'Combat' } })
    expect(newEventId()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })

  it('client and server agree on the event types', () => {
    expect([...SERVER_TYPES].sort()).toEqual([...CLIENT_EVENT_TYPES].sort())
  })
})

describe('coalesce', () => {
  it('merges unsent IP edits of the same warrior: first from, last to, in the first place', () => {
    const a = ev('ip.edited', { uid: 'u1', name: 'Fighter', from: 0, to: 1 }, 1)
    const b = ev('upgrade.bought', { uid: 'u2' }, 2)
    const c = ev('ip.edited', { uid: 'u1', name: 'Fighter', from: 1, to: 3 }, 3)
    const d = ev('ip.edited', { uid: 'u2', name: 'Scout', from: 0, to: 1 }, 4)
    const out = coalesce([a, b, c, d])
    expect(out.map(e => e.type)).toEqual(['ip.edited', 'upgrade.bought', 'ip.edited'])
    expect(out[0]).toMatchObject({ id: a.id, at: 3, payload: { uid: 'u1', from: 0, to: 3 } })
    expect(out[2].payload).toMatchObject({ uid: 'u2', from: 0, to: 1 })
  })

  it('merges renames per target and drops edits that end where they started', () => {
    const out = coalesce([
      ev('company.renamed', { from: 'Old', to: 'Ol' }),
      ev('company.renamed', { from: 'Ol', to: 'Old Guard' }),
      ev('warrior.renamed', { uid: 'u1', from: 'Fighter', to: 'Jo' }),
      ev('warrior.renamed', { uid: 'u1', from: 'Jo', to: 'Fighter' }),
      ev('game.renamed', { gameNumber: 1, from: null, to: 'Bell' }),
      ev('game.renamed', { gameNumber: 2, from: null, to: 'Moor' }),
    ])
    expect(out.map(e => [e.type, e.payload.from, e.payload.to])).toEqual([
      ['company.renamed', 'Old', 'Old Guard'],
      ['game.renamed', null, 'Bell'],
      ['game.renamed', null, 'Moor'],
    ])
  })

  it('leaves everything else alone, in order', () => {
    const list = [ev('game.recorded', { gameNumber: 1 }), ev('game.undone', { gameNumber: 1 }), ev('game.recorded', { gameNumber: 1 })]
    expect(coalesce(list)).toEqual(list)
  })
})

describe('save queue with events', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  const snap = (rev = 1, companyId = 'c1') => ({ companyId, companyName: 'Queue Co', companyMode: 'campaign', rev })
  function harness(responses) {
    const calls = []
    const save = vi.fn(payload => {
      calls.push(payload)
      const r = responses.shift()
      return typeof r === 'function' ? r(payload) : r instanceof Error ? Promise.reject(r) : Promise.resolve(r)
    })
    const onConflict = vi.fn()
    const onForbidden = vi.fn(s => ({ ...s, companyId: 'moved' }))
    const saver = createSaver({ onStatus: () => {}, onSaved: () => {}, onConflict, onForbidden, save })
    return { saver, calls, onConflict, onForbidden }
  }
  const ok = { status: 'ok', savedAt: 1 }

  it('sends queued events with the save and drops them once stored', async () => {
    const { saver, calls } = harness([ok, ok])
    const [a, b] = [ev('upgrade.bought'), ev('warrior.hired')]
    saver.schedule(snap(1), [a, b])
    await saver.flush()
    expect(calls[0].events).toEqual([a, b])
    saver.schedule(snap(2))
    await saver.flush()
    expect(calls[1].events).toBeUndefined()
  })

  it('keeps events after a network failure, in order, with events added while the request was out', async () => {
    let fail
    const { saver, calls } = harness([() => new Promise((_, reject) => { fail = reject }), ok])
    const [a, b] = [ev('upgrade.bought', {}, 1), ev('upgrade.bought', {}, 2)]
    saver.schedule(snap(1), [a])
    const first = saver.flush()
    saver.schedule(snap(2), [b])           // while the first request is in flight
    fail(new Error('offline'))
    await first
    await saver.flush()
    expect(calls[1].events).toEqual([a, b])
    expect(calls[1].data.rev).toBe(2)       // the newest snapshot goes with them
  })

  it('drops the events after a conflict (the server kept them as rejected)', async () => {
    const conflict = { status: 'conflict', company: { id: 'c1', name: 'Queue Co', saved_at: 5, data: { companyName: 'Queue Co' } } }
    const { saver, calls, onConflict } = harness([conflict, ok])
    saver.schedule(snap(1), [ev('upgrade.bought')])
    await saver.flush()
    expect(onConflict).toHaveBeenCalled()
    const later = ev('ip.edited', { uid: 'u1', from: 0, to: 1 })
    saver.schedule(snap(2), [later])
    await saver.flush()
    expect(calls[1].events).toEqual([later])
  })

  it(`sends at most ${MAX_EVENTS} events per request and the rest with the next one`, async () => {
    const { saver, calls } = harness([ok, ok])
    const many = Array.from({ length: MAX_EVENTS + 10 }, (_, i) => ev('upgrade.bought', { n: i }, i))
    saver.schedule(snap(1), many)
    await saver.flush()
    expect(calls.map(c => c.events.length)).toEqual([MAX_EVENTS, 10])
    expect([...calls[0].events, ...calls[1].events]).toEqual(many)
  })

  it('merges repeated edits while they wait', async () => {
    const { saver, calls } = harness([ok])
    saver.schedule(snap(1), [ev('ip.edited', { uid: 'u1', from: 0, to: 1 })])
    saver.schedule(snap(2), [ev('ip.edited', { uid: 'u1', from: 1, to: 2 })])
    await saver.flush()
    expect(calls[0].events.map(e => [e.payload.from, e.payload.to])).toEqual([[0, 2]])
  })

  it('moves the events when the company has to change id', async () => {
    const { saver, calls } = harness([{ status: 'forbidden' }, ok])
    const a = ev('warrior.hired')
    saver.schedule(snap(1), [a])
    await saver.flush()
    expect(calls[1].id).toBe('moved')
    expect(calls[1].events).toEqual([a])
  })
})

describe('server: validateEvents', () => {
  const good = (extra = {}) => ({ id: newEventId(), type: 'upgrade.bought', v: 1, at: 1, afterGame: 0, ref: null, payload: { label: 'Combat' }, ...extra })

  it('keeps well-formed events, payload as JSON', () => {
    const e = good({ ref: newEventId() })
    const { valid, dropped } = validateEvents([e])
    expect(dropped).toBe(0)
    expect(valid).toEqual([{ id: e.id, type: e.type, afterGame: 0, ref: e.ref, payload: JSON.stringify(e.payload), at: 1 }])
  })

  it('drops unknown or server-only types, bad ids, repeats, bad numbers and big payloads', () => {
    const dup = good()
    const { valid, dropped } = validateEvents([
      good({ type: 'nope' }), good({ type: 'system.unlogged' }), good({ id: 'not-a-uuid' }),
      dup, { ...dup }, good({ afterGame: -1 }), good({ ref: 'x' }), good({ at: 'soon' }),
      good({ payload: { blob: 'x'.repeat(MAX_PAYLOAD_BYTES) } }), good({ payload: [1] }), null,
    ])
    expect(valid.map(v => v.id)).toEqual([dup.id])
    expect(dropped).toBe(10)
  })

  it('caps the count and copes with no events at all', () => {
    expect(validateEvents(Array.from({ length: 60 }, () => good())).valid).toHaveLength(50)
    expect(validateEvents(undefined)).toEqual({ valid: [], dropped: 0 })
  })

  it('flags a campaign save that changed the games without logging it', () => {
    const stored = { companyMode: 'campaign', campaign: { log: [{}, {}] } }
    const e = unloggedEvent(stored, { companyMode: 'campaign', campaign: { log: [{}] } }, { now: 9, id: 'sys' })
    expect(e).toMatchObject({ id: 'sys', type: 'system.unlogged', afterGame: 1, at: 9 })
    expect(JSON.parse(e.payload)).toEqual({ fromGames: 2, toGames: 1 })
    expect(unloggedEvent(stored, { companyMode: 'campaign', campaign: { log: [{}, {}] } })).toBeNull()
    expect(unloggedEvent(stored, { companyMode: 'standard', campaign: { log: [] } })).toBeNull()
    expect(unloggedEvent(null, { companyMode: 'campaign', campaign: { log: [] } })).toBeNull()
  })
})

describe('activity log display', () => {
  it('reads like the mock', () => {
    expect(describeEvent(ev('upgrade.bought', { name: 'Reaver', kind: 'gear', label: 'Grappling Hook' })).text).toBe('Reaver bought Grappling Hook')
    expect(describeEvent(ev('game.recorded', { gameNumber: 2, result: 'loss', awards: [] })).text).toBe('Game 2 recorded: Defeat')
    expect(describeEvent(ev('ip.edited', { name: 'Fighter', from: 0, to: 1 })).text).toBe('Fighter IP set by hand: 0 to 1')
  })

  it('marks events an undo took back, but not when the undo itself was rejected', () => {
    const bought = ev('upgrade.bought')
    const recorded = ev('game.recorded', { gameNumber: 1 })
    const undone = { ...ev('upgrade.undone'), ref: bought.id }
    const rejectedUndo = { ...ev('game.undone'), ref: recorded.id, status: 'rejected' }
    expect([...undoneIds([bought, recorded, undone, rejectedUndo])]).toEqual([bought.id])
  })

  it('groups by games played, newest first', () => {
    const list = [ev('warrior.hired', {}, 1, { afterGame: 0 }), ev('game.recorded', {}, 2, { afterGame: 0 }), ev('upgrade.bought', {}, 3, { afterGame: 1 })]
    const groups = groupEvents(list)
    expect(groups.map(g => g.title)).toEqual(['Before game 2', 'Before game 1'])
    expect(groups[1].events.map(e => e.type)).toEqual(['game.recorded', 'warrior.hired'])
    expect(matchesFilter(list[2], 'upgrades')).toBe(true)
    expect(matchesFilter(list[2], 'roster')).toBe(false)
  })
})

describe('notes on log entries', () => {
  const target = ev('game.recorded', { gameNumber: 1 })
  const note = (text, extra = {}) => ({ ...ev('entry.noted', { text }), ref: target.id, ...extra })

  it('the latest note wins and an empty one removes it', () => {
    expect(notesFor([target], target.id)).toBeNull()
    expect(notesFor([target, note('Won on the last roll'), note('Won on the very last roll')], target.id)).toBe('Won on the very last roll')
    expect(notesFor([target, note('Something'), note('')], target.id)).toBeNull()
    expect(notesFor([target, note('Kept'), note('Lost to another device', { status: 'rejected' })], target.id)).toBe('Kept')
    expect(notesFor([target, { ...note('Elsewhere'), ref: newEventId() }], target.id)).toBeNull()
  })

  it('the server takes notes about an event, up to 500 characters', () => {
    const good = { ...note('A fine note'), at: 1 }
    expect(validateEvents([good]).valid).toHaveLength(1)
    expect(validateEvents([{ ...good, id: newEventId(), payload: { text: '' } }]).valid).toHaveLength(1)
    expect(validateEvents([{ ...good, id: newEventId(), ref: null }]).valid).toHaveLength(0)
    expect(validateEvents([{ ...good, id: newEventId(), payload: { text: 'x'.repeat(501) } }]).valid).toHaveLength(0)
    expect(validateEvents([{ ...good, id: newEventId(), payload: { text: 42 } }]).valid).toHaveLength(0)
  })
})

describe('rowActions', () => {
  const warrior = (type, extra = {}) => ({
    type, weapon1: 'Light Weapon', weapon2: null, consumable: null, climbing: null,
    ip: [], isCaptain: false, notes: [], customName: null, earnedIP: 0, statImproves: [], ...extra,
  })
  const base = () => normalizeCampaign({
    companyMode: 'campaign', campaignGame: 0, companyId: 'c1',
    slots: [warrior('Fighter', { isCaptain: true, earnedIP: 2 }), warrior('Scout', { weapon1: 'Bow' })],
  })
  const loss = { result: 'loss', fallenIndices: [], newCaptainIndex: null, survivorPick: 0, bonus: [] }
  const recordedEvent = (c, id, n) => ({ id, type: 'game.recorded', payload: { gameNumber: n, awards: [{ uid: c.slots[0].uid, ip: 1 }] } })
  const buy = (c, i, patch, ipId, eventId) => {
    const next = { ...c, slots: c.slots.map((s, k) => (k === i ? { ...s, ...patch } : s)) }
    return { ...next, campaign: logUpgrade(next, i, ipId, { eventId }) }
  }

  it('the latest game can be undone and renamed; an older one only renamed', () => {
    const [e1, e2] = [newEventId(), newEventId()]
    const g1 = applyEndOfGame(base(), loss, { eventId: e1 }).company
    expect(rowActions(g1, recordedEvent(g1, e1, 1))).toMatchObject({ undoGame: true, renameGame: 1, fixIP: [0] })
    const g2 = applyEndOfGame(g1, loss, { eventId: e2 }).company
    expect(rowActions(g2, recordedEvent(g2, e1, 1))).toMatchObject({ undoGame: false, renameGame: 1 })
    expect(rowActions(g2, recordedEvent(g2, e2, 2)).undoGame).toBe(true)
  })

  it("an upgrade can be undone only while it is that warrior's latest", () => {
    const [u1, u2] = [newEventId(), newEventId()]
    let c = buy(base(), 0, { statImproves: ['COM'], ip: ['stat_0'] }, 'stat_0', u1)
    const bought1 = { id: u1, type: 'upgrade.bought', payload: { uid: c.slots[0].uid, id: 'stat_0' } }
    expect(rowActions(c, bought1).undoUpgrade).toEqual({ slotIndex: 0 })
    expect(rowActions(c, bought1).fixIP).toEqual([0])
    c = buy(c, 0, { climbing: 'Ladder', ip: ['stat_0', 'climbing'] }, 'climbing', u2)
    expect(rowActions(c, bought1).undoUpgrade).toBeNull()
    expect(rowActions(c, { id: u2, type: 'upgrade.bought', payload: { uid: c.slots[0].uid, id: 'climbing' } }).undoUpgrade).toEqual({ slotIndex: 0 })
  })

  it('a recruit can be undone while present and without upgrades', () => {
    const h = newEventId()
    const fell = applyEndOfGame(base(), { ...loss, fallenIndices: [1] }).company
    let c = hireIntoVacancy(fell, 1, 'Knight', { startIP: 1, eventId: h })
    const hired = { id: h, type: 'warrior.hired', payload: { uid: c.slots[1].uid } }
    expect(rowActions(c, hired).undoRecruit).toEqual({ slotIndex: 1 })
    c = buy(c, 1, { climbing: 'Ladder', ip: ['climbing'] }, 'climbing', newEventId())
    expect(rowActions(c, hired).undoRecruit).toBeNull()
  })

  it('rejected events offer nothing, and fixIP only names living warriors', () => {
    const c = base()
    const e = { id: newEventId(), type: 'ip.edited', payload: { uid: c.slots[1].uid, from: 0, to: 1 } }
    expect(rowActions(c, e)).toEqual({ undoGame: false, undoUpgrade: null, undoRecruit: null, renameGame: null, fixIP: [1] })
    expect(rowActions(c, { ...e, status: 'rejected' }).fixIP).toEqual([])
    expect(rowActions(c, { ...e, payload: { uid: 'gone' } }).fixIP).toEqual([])
  })
})
