// ── Campaign engine ───────────────────────────────────────────────────────────
// Pure (company in, company out) so it's unit-testable; builderStore wraps it in actions.
//
// A campaign company carries, besides campaignGame (games played):
//   slot.uid         stable id of the warrior in that slot (a new recruit gets a new one)
//   slot.fallen      on an empty slot: { uid, type, name, game } of the warrior who died there
//   campaign         { v, length, log, upgrades, roster, completedAt, endedEarly, needsCaptain }
//   campaign.length  games planned (default CAMPAIGN_RULES.games), null = no limit. Never a
//                    hard stop: recording past it extends it (see applyEndOfGame)
//   campaign.upgrades[] every upgrade bought, when and by whom (see logUpgrade)
//   campaign.roster[]   recruits hired and recruits undone (see hireIntoVacancy / undoRecruit)
//   campaign.log[]   one record per game, see applyEndOfGame. Only the latest record keeps
//                    `before` (the company as it was), which is what makes undoLastGame exact.
//
// Upgrade order: in a campaign, slot.ip is appended to as upgrades are bought, so it doubles
// as the purchase log. Campaign stat keys (stat_0, stat_1, ...) are numbered in the order the
// stats were taken, matching slot.statImproves. undoLastUpgrade reverts slot.ip's last entry.

import { WARRIORS, STAT_IMPROVEMENT } from '../data/warriors.js'
import { CAMPAIGN_RULES, GAME_RESULTS } from '../data/campaign.js'
import { getEffectiveStats, improvedStats } from '../utils/stats.js'
import { getAllowedWeapons, getSecondWeaponOptions, defaultLoadout } from '../utils/loadout.js'

// iOS Safari <15.4 doesn't have crypto.randomUUID
const newId = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`

const nameOf = slot => (slot.customName && slot.customName.trim()) || slot.type

// "Brother Aldric (Warrior Priest)" with a custom name, else just the class.
// Takes a slot ({ customName, type }) or a record entry ({ name, type }).
export function nameWithClass(w) {
  if (!w) return 'A warrior'
  const name = (w.customName ?? w.name ?? '').trim()
  return name && name !== w.type ? `${name} (${w.type})` : (w.type || name || 'A warrior')
}

// Gear bought with IP. In a campaign it is kept for good (stats too, as stat_N keys).
export const PERMANENT_GEAR = ['weapon2', 'climbing', 'consumable']
const GEAR_LABEL = { weapon2: 'The off-hand', climbing: 'The climbing item', consumable: 'The consumable' }

function vacantSlot(fallen) {
  return {
    type: null, weapon1: null, weapon2: null, consumable: null,
    climbing: null, ip: [], isCaptain: false,
    notes: [], customName: null,
    earnedIP: 0, statImproves: [],
    uid: newId(), fallen,
  }
}

// ── Shape & progress ──────────────────────────────────────────────────────────

// Fills in what older campaign companies lack (uids, the campaign object). Standard
// companies are returned untouched. Safe to call repeatedly.
export function normalizeCampaign(company) {
  if (!company || company.companyMode !== 'campaign') return company
  const slots = (company.slots || []).map(s => (s.uid ? s : { ...s, uid: newId() }))
  const c = company.campaign || {}
  const campaign = {
    v: 1, length: CAMPAIGN_RULES.games, completedAt: null, needsCaptain: false,
    ...c,
    log: Array.isArray(c.log) ? c.log : [],
    upgrades: Array.isArray(c.upgrades) ? c.upgrades : [],
    roster: Array.isArray(c.roster) ? c.roster : [],
  }
  return { ...company, slots, campaign, campaignGame: company.campaignGame || 0 }
}

export const MAX_CAMPAIGN_LENGTH = 99

// The planned number of games: campaign.length, the default when missing, null = no limit
export function campaignLength(company) {
  const c = company?.campaign
  return c && 'length' in c ? c.length : CAMPAIGN_RULES.games
}

// completed counts campaignGame too, so companies from before the log keep their count.
// total is the planned length (null = no limit). Complete = the planned games are played,
// or it was ended early. Being complete never stops another game: nextGame is always set.
export function campaignProgress(company) {
  const completed = Math.max(company?.campaignGame || 0, company?.campaign?.log?.length || 0)
  const total = campaignLength(company)
  const unlimited = total == null
  const endedEarly = !!company?.campaign?.endedEarly
  const isComplete = endedEarly || (!unlimited && completed >= total)
  return { completed, total, isComplete, endedEarly, unlimited, nextGame: completed + 1 }
}

// completedAt for a campaign of this length with this many games played
function completedAtFor(campaign, completed, length, now) {
  if (campaign.endedEarly) return campaign.completedAt ?? now
  return length != null && completed >= length ? (campaign.completedAt ?? now) : null
}

// Sets the planned number of games: at least the games already played (and 1), at most
// MAX_CAMPAIGN_LENGTH, or null for no limit. Throws with the reason otherwise.
export function setCampaignLength(company, length, { now = Date.now() } = {}) {
  const c = normalizeCampaign(company)
  const { completed } = campaignProgress(c)
  if (length !== null) {
    if (!Number.isInteger(length) || length < 1 || length > MAX_CAMPAIGN_LENGTH) throw new Error(`Choose between 1 and ${MAX_CAMPAIGN_LENGTH} games, or no limit.`)
    if (length < completed) throw new Error(`${completed} games are already played.`)
  }
  return { ...c, campaign: { ...c.campaign, length, completedAt: completedAtFor(c.campaign, completed, length, now) } }
}

// After the campaign is complete: carry on. The planned length grows to fit one more game
// (an early end is simply taken back) and the campaign is no longer complete.
export function keepPlaying(company) {
  const c = normalizeCampaign(company)
  const { completed, total, isComplete } = campaignProgress(c)
  if (!isComplete) throw new Error('The campaign is not complete.')
  const length = total == null ? null : Math.max(total, completed + 1)
  return { ...c, campaign: { ...c.campaign, length, completedAt: null, endedEarly: false } }
}

// ── Campaign settings ─────────────────────────────────────────────────────────

// Edits a recorded game's scenario name. Returns the new company, or null if no such game.
export function setGameScenario(company, gameNumber, name) {
  const log = company?.campaign?.log || []
  const at = log.findIndex(r => r.gameNumber === gameNumber)
  if (at < 0) return null
  const scenario = (name || '').trim().slice(0, 80) || null
  const next = log.map((r, i) => (i === at ? { ...r, scenario } : r))
  return { ...company, campaign: { ...company.campaign, log: next } }
}

// Ends the campaign before all games are played. Throws if it is already complete.
export function endCampaignEarly(company, { now = Date.now() } = {}) {
  const c = normalizeCampaign(company)
  if (campaignProgress(c).isComplete) throw new Error('The campaign is already complete.')
  return { ...c, campaign: { ...c.campaign, completedAt: now, endedEarly: true } }
}

// Undoes endCampaignEarly. A campaign that played all its games can't be reopened.
export function reopenCampaign(company) {
  const c = normalizeCampaign(company)
  const { completed, total, isComplete } = campaignProgress(c)
  if (!isComplete) throw new Error('The campaign is not complete.')
  if (!c.campaign.endedEarly && total != null && completed >= total) throw new Error(`All ${total} games are played. Use Keep playing to add more.`)
  return { ...c, campaign: { ...c.campaign, completedAt: null, endedEarly: false } }
}

// ── Upgrade capacity ──────────────────────────────────────────────────────────

// Upgrades this warrior could still buy (ignoring IP): 'stat:MOV', 'weapon2', 'climbing', ...
// A stat already at its best (2+) is not an option; neither is an off-hand the class can't carry.
export function openUpgrades(slot) {
  const wdata = WARRIORS[slot?.type]
  if (!wdata) return []
  const ip = slot.ip || []
  const open = []
  const taken = improvedStats(slot)
  const now = getEffectiveStats(slot)
  for (const k of Object.keys(STAT_IMPROVEMENT)) {
    if (taken.has(k)) continue
    const withIt = getEffectiveStats({ ...slot, statImproves: [...(slot.statImproves || []), k] })
    if (withIt[k].value !== now[k].value) open.push(`stat:${k}`)
  }
  const canOffhand = !wdata.fixedShield && !wdata.fixedDualWield &&
    getAllowedWeapons(wdata).some(w => getSecondWeaponOptions(wdata, w).length > 0)
  if (canOffhand && !ip.includes('weapon2')) open.push('weapon2')
  if (!ip.includes('climbing')) open.push('climbing')
  if (!ip.includes('consumable')) open.push('consumable')
  return open
}

// How many more IP this warrior could usefully receive: open upgrades minus IP already
// banked (earned, not yet spent). 0 means another point would be wasted on them.
export function spendableCapacity(slot) {
  if (!slot?.type) return 0
  const banked = Math.max(0, (slot.earnedIP || 0) - (slot.ip?.length || 0))
  return Math.max(0, openUpgrades(slot).length - banked)
}

// ── End of game ───────────────────────────────────────────────────────────────
// Draft: {
//   result:          'win' | 'loss' | 'draw' | 'retreat'  (opponent retreated = 'win')
//   scenario:        optional free text
//   fallenIndices:   slot indices of warriors that died
//   newCaptainIndex: surviving slot index to promote when the Captain fell (and someone survived)
//   survivorPick:    slot index of the survivor who gets the survivor IP (null if nobody survived / retreat)
//   bonus:           [{ index, ip }] scenario / objective IP to survivors (total <= maxBonusIP)
// }

function planGame(company, draft) {
  const slots = company.slots || []
  const fallen = new Set((draft.fallenIndices || []).filter(i => slots[i]?.type))
  const active = slots.map((s, i) => (s.type ? i : -1)).filter(i => i >= 0)
  const survivors = active.filter(i => !fallen.has(i))
  const captainIdx = active.find(i => slots[i].isCaptain) ?? null
  const captainFell = captainIdx != null && fallen.has(captainIdx)
  const earns = draft.result !== 'retreat' || CAMPAIGN_RULES.retreatGivesIP

  // Dead warriors never earn, so the winner's point needs the Captain alive (not a promoted one)
  const awards = []
  if (earns && survivors.length && draft.survivorPick != null && CAMPAIGN_RULES.survivorIP > 0) {
    awards.push({ index: draft.survivorPick, ip: CAMPAIGN_RULES.survivorIP, reason: 'survivor' })
  }
  if (earns && draft.result === 'win' && captainIdx != null && !captainFell && CAMPAIGN_RULES.winnerCaptainIP > 0) {
    awards.push({ index: captainIdx, ip: CAMPAIGN_RULES.winnerCaptainIP, reason: 'captain' })
  }
  if (earns) {
    for (const b of draft.bonus || []) {
      if (b && b.ip > 0) awards.push({ index: b.index, ip: b.ip, reason: 'bonus' })
    }
  }
  return { fallen, active, survivors, captainIdx, captainFell, earns, awards }
}

// Every reason the draft can't be recorded yet (empty = OK)
export function validateEndOfGame(company, draft = {}) {
  if (company?.companyMode !== 'campaign') return ['This company is not playing a campaign.']

  const errors = []
  const slots = company.slots || []
  if (!GAME_RESULTS.includes(draft.result)) errors.push('Choose how the game ended.')
  for (const i of draft.fallenIndices || []) {
    if (!slots[i]?.type) errors.push(`Slot ${i + 1} has no warrior in it.`)
  }

  const plan = planGame(company, draft)
  const { survivors, earns } = plan
  if (plan.captainFell && survivors.length) {
    if (draft.newCaptainIndex == null) errors.push('The Captain fell. Choose a surviving warrior to become Captain.')
    else if (!survivors.includes(draft.newCaptainIndex)) errors.push('The new Captain must be a warrior who survived.')
  }

  if (earns && survivors.length) {
    const pick = draft.survivorPick
    if (pick == null) errors.push('Choose a surviving warrior to receive the survivor IP.')
    else if (!survivors.includes(pick)) errors.push('The survivor IP must go to a warrior who survived.')
    else {
      // A point a warrior can't spend must go to someone who can (if anyone can)
      const otherAwards = i => plan.awards.filter(a => a.index === i && a.reason !== 'survivor').reduce((n, a) => n + a.ip, 0)
      const room = i => spendableCapacity(slots[i]) - otherAwards(i)
      if (room(pick) <= 0 && survivors.some(j => j !== pick && room(j) > 0)) {
        errors.push(`${nameOf(slots[pick])} has no upgrades left to buy. Give the survivor IP to another warrior.`)
      }
    }
  }

  if (earns) {
    let total = 0
    for (const b of draft.bonus || []) {
      if (!b) continue
      if (!Number.isInteger(b.ip) || b.ip < 0) errors.push('Bonus IP must be a whole number.')
      else if (b.ip > 0 && !survivors.includes(b.index)) errors.push('Bonus IP can only go to warriors who survived.')
      else total += b.ip
    }
    if (total > CAMPAIGN_RULES.maxBonusIP) errors.push(`At most ${CAMPAIGN_RULES.maxBonusIP} bonus IP can be awarded in one game.`)

    // Bonus IP a warrior can't spend must go to someone who can (if anyone can)
    const awardedTo = (i, keep = () => true) => plan.awards.filter(a => a.index === i && keep(a)).reduce((n, a) => n + a.ip, 0)
    const bonusIdx = [...new Set(plan.awards.filter(a => a.reason === 'bonus').map(a => a.index))]
    for (const i of bonusIdx) {
      if (!survivors.includes(i)) continue
      const room = spendableCapacity(slots[i]) - awardedTo(i, a => a.reason !== 'bonus')
      const others = survivors.some(j => j !== i && spendableCapacity(slots[j]) - awardedTo(j) > 0)
      if (awardedTo(i, a => a.reason === 'bonus') > room && others) {
        errors.push(`${nameOf(slots[i])} can't use that much bonus IP. Give it to another warrior.`)
      }
    }
  }
  return errors
}

// Things worth telling the player that don't stop the game being recorded:
//   captainCantSpend: the winner's Captain point goes to a Captain with no upgrade left to buy
//                     (it is the Captain's by rule, so it is still awarded)
export function endOfGameWarnings(company, draft = {}) {
  const plan = planGame(company || {}, draft)
  const slots = company?.slots || []
  const captainPoint = plan.awards.find(a => a.reason === 'captain')
  const captainCantSpend = !!captainPoint &&
    spendableCapacity(slots[captainPoint.index]) - plan.awards.filter(a => a.index === captainPoint.index && a.reason !== 'captain').reduce((n, a) => n + a.ip, 0) <= 0
  return { captainCantSpend }
}

const withoutBefore = ({ before: _b, ...record }) => record

// Records a finished game. Returns { company, record }; throws if validateEndOfGame objects.
// Atomic: awards, deaths (slot -> vacancy), captain change and the log entry together.
// eventId: the activity-log event for this game, kept on the record so an undo can refer to it
export function applyEndOfGame(company, draft, { now = Date.now(), eventId = null } = {}) {
  const errors = validateEndOfGame(company, draft)
  if (errors.length) throw new Error(errors.join(' '))

  const c = normalizeCampaign(company)
  const plan = planGame(c, draft)
  const gameNumber = campaignProgress(c).completed + 1
  // The log and the upgrade list are rebuilt on undo, so the snapshot leaves them out
  const { log: _log, upgrades: _upgrades, roster: _roster, ...campaignState } = c.campaign
  const before = { slots: c.slots, campaignGame: c.campaignGame, campaign: campaignState }

  // Awards
  const gained = {}
  for (const a of plan.awards) gained[a.index] = (gained[a.index] || 0) + a.ip
  let slots = c.slots.map((s, i) => (gained[i] ? { ...s, earnedIP: (s.earnedIP || 0) + gained[i] } : s))

  // Deaths: the slot becomes a vacancy that remembers who fell there
  const fallenIdx = [...plan.fallen].sort((a, b) => a - b)
  // A full snapshot of each fallen warrior, so resurrectWarrior can bring them back exactly
  const fallen = fallenIdx.map(i => {
    const s = c.slots[i]
    return {
      uid: s.uid, type: s.type, name: nameOf(s), customName: s.customName ?? null,
      earnedIP: s.earnedIP || 0, statImproves: [...(s.statImproves || [])], ip: [...(s.ip || [])],
      weapon1: s.weapon1 ?? null, weapon2: s.weapon2 ?? null, consumable: s.consumable ?? null, climbing: s.climbing ?? null,
      notes: [...(s.notes || [])],
    }
  })
  fallenIdx.forEach((i, n) => {
    slots[i] = vacantSlot({ uid: fallen[n].uid, type: fallen[n].type, name: fallen[n].name, game: gameNumber })
  })

  // Captain: a survivor rises; with no survivors the first emptied slot holds the place
  // until the player picks a Captain among the recruits
  let captainChange = null
  let needsCaptain = !!c.campaign.needsCaptain
  if (plan.captainFell) {
    const from = c.slots[plan.captainIdx].uid
    if (plan.survivors.length) {
      const to = draft.newCaptainIndex
      slots = slots.map((s, i) => (s.isCaptain === (i === to) ? s : { ...s, isCaptain: i === to }))
      captainChange = { from, to: slots[to].uid, reason: 'promoted' }
    } else {
      slots[fallenIdx[0]] = { ...slots[fallenIdx[0]], isCaptain: true }
      needsCaptain = true
      captainChange = { from, to: null, reason: 'needsCaptain' }
    }
  }

  const record = {
    id: newId(),
    eventId,
    gameNumber,
    scenario: (draft.scenario || '').trim().slice(0, 80) || null,
    result: draft.result,
    finishedAt: now,
    roster: plan.active.map(i => {
      const s = c.slots[i]
      return { uid: s.uid, type: s.type, name: nameOf(s), wasCaptain: !!s.isCaptain, survived: !plan.fallen.has(i) }
    }),
    awards: plan.awards.map(a => ({ uid: c.slots[a.index].uid, ip: a.ip, reason: a.reason })),
    captainChange,
    fallen,
    before,
  }

  // Only the newest record can be undone, so older ones drop their snapshot
  const log = c.campaign.log.map((r, i, all) => (i === all.length - 1 ? withoutBefore(r) : r))
  // Playing on is always allowed: past the planned length it grows to this game, and a game
  // after an early end takes the early end back
  const planned = campaignLength(c)
  const length = planned != null && gameNumber > planned ? gameNumber : planned
  const base = { ...c.campaign, endedEarly: false, completedAt: null } // complete again (if so) as of this game
  const campaign = {
    ...base,
    needsCaptain,
    length,
    completedAt: completedAtFor(base, gameNumber, length, now),
    log: [...log, record],
  }
  return { company: { ...c, slots, campaignGame: gameNumber, campaign }, record }
}

export function canUndoLastGame(company) {
  return !!company?.campaign?.log?.at(-1)?.before
}

// Puts the company back exactly as it was before the latest game (anything changed since,
// such as upgrades bought or recruits hired, is lost too). Only the latest game; null if none.
// Upgrades and roster changes logged after that game go too: the restored slots predate them.
export function undoLastGame(company) {
  if (!canUndoLastGame(company)) return null
  const log = company.campaign.log
  const last = log.at(-1)
  const { slots, campaignGame, campaign } = last.before
  const upgrades = (company.campaign.upgrades || []).filter(e => e.afterGame < last.gameNumber)
  const roster = (company.campaign.roster || []).filter(e => e.afterGame < last.gameNumber)
  // Resurrections made after that game are undone with it (the restored slots predate them)
  const kept = log.slice(0, -1).map(r => (r.fallen || []).some(f => f.resurrected?.afterGame >= last.gameNumber)
    ? { ...r, fallen: r.fallen.map(f => (f.resurrected?.afterGame >= last.gameNumber ? withoutResurrected(f) : f)) }
    : r)
  return { ...company, slots, campaignGame, campaign: { ...campaign, log: kept, upgrades, roster } }
}

const withoutResurrected = ({ resurrected: _r, ...f }) => f

// ── Editing a recorded game ───────────────────────────────────────────────────
// Latest game (with its `before` snapshot): re-enter it completely. draftFromRecord prefills
// the End of Game sheet, editLatestGameLosses says what the re-record throws away (the same
// as an undo), reRecordLatestGame does it. Any game: editOutcome changes only the result
// and who got the survivor point, and moves the IP difference.

// What re-recording (or undoing) the latest game would throw away: upgrades bought and
// roster changes made since. { upgrades, roster, any }
export function editLatestGameLosses(company) {
  const last = company?.campaign?.log?.at(-1)
  if (!last) return { upgrades: [], roster: [], any: false }
  const upgrades = (company.campaign.upgrades || []).filter(e => e.afterGame >= last.gameNumber)
  const roster = (company.campaign.roster || []).filter(e => e.afterGame >= last.gameNumber)
  return { upgrades, roster, any: upgrades.length > 0 || roster.length > 0 }
}

// The End of Game draft that produced the latest record, in the indices of its `before`
// snapshot (the company as it was when the game was entered). null without `before`.
export function draftFromRecord(company, record = company?.campaign?.log?.at(-1)) {
  const slots = record?.before?.slots
  if (!slots) return null
  const indexOf = uid => slots.findIndex(s => s.uid === uid)
  const valid = i => i >= 0
  const award = reason => (record.awards || []).filter(a => a.reason === reason)
  const survivor = award('survivor')[0]
  return {
    result: record.result,
    scenario: record.scenario || '',
    fallenIndices: (record.fallen || []).map(f => indexOf(f.uid)).filter(valid),
    newCaptainIndex: record.captainChange?.reason === 'promoted' && valid(indexOf(record.captainChange.to)) ? indexOf(record.captainChange.to) : null,
    survivorPick: survivor && valid(indexOf(survivor.uid)) ? indexOf(survivor.uid) : null,
    bonus: award('bonus').map(a => ({ index: indexOf(a.uid), ip: a.ip })).filter(b => valid(b.index)),
  }
}

// IP change per warrior between two award lists: [{ uid, ip }] (non-zero only)
function awardDeltas(fromAwards = [], toAwards = []) {
  const sum = new Map()
  for (const a of fromAwards) sum.set(a.uid, (sum.get(a.uid) || 0) - a.ip)
  for (const a of toAwards) sum.set(a.uid, (sum.get(a.uid) || 0) + a.ip)
  return [...sum.entries()].filter(([, ip]) => ip !== 0).map(([uid, ip]) => ({ uid, ip }))
}

// The company with its latest game entered again from `draft` (same rules as recording).
// Same game number, record id and activity event; the scenario stays when the draft leaves
// it out (undefined) and is cleared by ''. Throws with the reasons if it can't be done.
// → { company, record, previous, deltas }
export function reRecordLatestGame(company, draft, { now = Date.now() } = {}) {
  const previous = company?.campaign?.log?.at(-1)
  if (!previous?.before) throw new Error('Only the result and the survivor point of this game can be changed.')
  const restored = undoLastGame(company)
  // scenario left out (undefined) keeps the recorded one; '' (or null) clears it
  const full = { ...draft, scenario: draft.scenario === undefined ? previous.scenario ?? '' : draft.scenario }
  const errors = validateEndOfGame(restored, full)
  if (errors.length) throw new Error(errors.join(' '))
  const { company: next, record: fresh } = applyEndOfGame(restored, full, { now, eventId: previous.eventId ?? null })
  const record = { ...fresh, id: previous.id, finishedAt: previous.finishedAt, editedAt: now }
  const log = [...next.campaign.log.slice(0, -1), record]
  const campaign = { ...next.campaign, log, ...(company.campaign.eventLog ? { eventLog: company.campaign.eventLog } : {}) }
  return { company: { ...next, campaign }, record, previous, deltas: awardDeltas(previous.awards, record.awards) }
}

// Changes the result and/or the survivor point (change.survivorPick is a uid) of any
// recorded game. Who fell and the Captain stay as recorded. The game's awards are worked
// out again under the same rules and the difference goes to the warriors still in the
// company; one who has fallen since is skipped (see warnings). Throws with the reason if
// it can't be done (e.g. the IP is already spent).
// → { company, record, previous, deltas: [{ uid, name, ip }], warnings: string[] }
export function editOutcome(company, gameNumber, change = {}, { now = Date.now() } = {}) {
  const log = company?.campaign?.log || []
  const at = log.findIndex(r => r.gameNumber === gameNumber)
  if (at < 0) throw new Error('There is no such game in the log.')
  const previous = log[at]
  const result = change.result ?? previous.result
  if (!GAME_RESULTS.includes(result)) throw new Error('Choose how the game ended.')

  const roster = previous.roster || []
  const survivors = roster.filter(r => r.survived)
  const captain = roster.find(r => r.wasCaptain)
  const earns = result !== 'retreat' || CAMPAIGN_RULES.retreatGivesIP
  const oldPick = (previous.awards || []).find(a => a.reason === 'survivor')?.uid ?? null
  const pick = change.survivorPick !== undefined ? change.survivorPick : oldPick

  const awards = []
  if (earns && survivors.length && CAMPAIGN_RULES.survivorIP > 0) {
    if (pick == null) throw new Error('Choose a surviving warrior to receive the survivor IP.')
    if (!survivors.some(r => r.uid === pick)) throw new Error('The survivor IP must go to a warrior who survived that game.')
    awards.push({ uid: pick, ip: CAMPAIGN_RULES.survivorIP, reason: 'survivor' })
  }
  if (earns && result === 'win' && captain?.survived && CAMPAIGN_RULES.winnerCaptainIP > 0) {
    awards.push({ uid: captain.uid, ip: CAMPAIGN_RULES.winnerCaptainIP, reason: 'captain' })
  }
  // Bonus IP stays as recorded (a retreat takes it away)
  if (earns) awards.push(...(previous.awards || []).filter(a => a.reason === 'bonus'))

  const nameIn = uid => roster.find(r => r.uid === uid)?.name || 'A warrior'
  const warnings = []
  const deltas = []
  let slots = company.slots
  for (const d of awardDeltas(previous.awards, awards)) {
    const i = slots.findIndex(s => s.type && s.uid === d.uid)
    if (i < 0) {
      warnings.push(`${nameIn(d.uid)} is no longer in the company, so their IP is not changed.`)
      continue
    }
    const slot = slots[i]
    const earned = (slot.earnedIP || 0) + d.ip
    if (earned < minEarnedIP(slot)) throw new Error(`${nameOf(slot)} has spent that IP. Undo one of their upgrades first.`)
    slots = slots.map((s, k) => (k === i ? { ...s, earnedIP: earned } : s))
    deltas.push({ uid: d.uid, name: nameIn(d.uid), ip: d.ip })
  }

  const record = { ...previous, result, awards, editedAt: now }
  const campaign = { ...company.campaign, log: log.map((r, k) => (k === at ? record : r)) }
  return { company: { ...company, slots, campaign }, record, previous, deltas, warnings }
}

// Why editOutcome would refuse this change, or null (for the UI while the player chooses)
export function outcomeEditBlock(company, gameNumber, change) {
  try {
    editOutcome(company, gameNumber, change)
    return null
  } catch (err) {
    return err.message
  }
}

// ── Recruiting ────────────────────────────────────────────────────────────────

// Empty slots, with who fell there and whether it is holding the Captain's place
export function vacancies(company) {
  const needsCaptain = !!company?.campaign?.needsCaptain
  return (company?.slots || [])
    .map((s, i) => (s.type ? null : { index: i, fallen: s.fallen || null, captainPlaceholder: needsCaptain && !!s.isCaptain }))
    .filter(Boolean)
}

// Puts a new warrior in an empty slot. startIP (default 0, the rule) is for house rules.
// makeCaptain: the recruit leads the company (only when it has no living Captain).
// Throws with a player-facing message if the hire isn't possible.
// In a campaign the hire is logged in campaign.roster ('recruited'), remembering the fallen
// record it replaced so undoRecruit can put it back.
export function hireIntoVacancy(company, slotIndex, type, { startIP = 0, makeCaptain = false, now = Date.now(), eventId = null } = {}) {
  const c = normalizeCampaign(company)
  let slots = [...(c.slots || [])]
  const target = slots[slotIndex]
  if (!target) throw new Error('There is no such slot.')
  if (target.type) throw new Error('That slot already has a warrior.')
  if (!WARRIORS[type]) throw new Error('Choose a warrior class.')
  if (slots.some(s => s.type === type)) throw new Error(`The company already has a ${type}.`)
  if (makeCaptain && slots.some(s => s.type && s.isCaptain)) throw new Error('The company already has a Captain.')

  let needsCaptain = !!c.campaign?.needsCaptain
  const { fallen: _fallen, ...rest } = target
  const hired = {
    ...rest,
    type, ...defaultLoadout(type),
    consumable: null, climbing: null, ip: [], statImproves: [],
    notes: target.notes || [], customName: target.customName ?? null,
    earnedIP: Math.max(0, Math.floor(Number(startIP) || 0)),
    uid: newId(),
  }

  if (makeCaptain) {
    slots = slots.map(s => (s.isCaptain ? { ...s, isCaptain: false } : s))
    hired.isCaptain = true
    needsCaptain = false
  } else if (needsCaptain && target.isCaptain) {
    // Hired into the Captain's placeholder but not as Captain: the place moves to another
    // vacancy, or, if this is the last recruit, they lead
    const other = slots.findIndex((s, i) => i !== slotIndex && !s.type)
    if (other >= 0) {
      slots[other] = { ...slots[other], isCaptain: true }
      hired.isCaptain = false
    } else {
      needsCaptain = false
    }
  }
  slots[slotIndex] = hired

  if (!c.campaign) return { ...c, slots }
  const entry = {
    afterGame: campaignProgress(c).completed,
    uid: hired.uid, name: nameWithClass(hired), type, action: 'recruited',
    startIP: hired.earnedIP,
    ...(target.fallen ? { replaced: target.fallen } : {}),
    ...(eventId ? { eventId } : {}),
    at: now,
  }
  return { ...c, slots, campaign: { ...c.campaign, needsCaptain, roster: [...(c.campaign.roster || []), entry] } }
}

// Why this warrior's recruitment can't be undone, or null. Upgrades must be undone first.
export function undoRecruitBlock(slot) {
  if (!slot?.type) return 'There is no warrior in this slot.'
  if (slot.ip?.length) return `${nameOf(slot)} has upgrades. Undo them first with Undo last upgrade.`
  return null
}

// Takes a recruit back out: the slot is empty again, with the fallen warrior it replaced
// (if any) so "Fell in game N" shows again. A Captain removed after a game leaves the
// company needing a Captain. Logged as 'recruit undone'. Throws with the block reason.
export function undoRecruit(company, slotIndex, { now = Date.now() } = {}) {
  const c = normalizeCampaign(company)
  const slot = c.slots?.[slotIndex]
  const blocked = undoRecruitBlock(slot)
  if (blocked) throw new Error(blocked)

  const roster = c.campaign?.roster || []
  const hire = [...roster].reverse().find(e => e.uid === slot.uid && e.action === 'recruited')
  const completed = campaignProgress(c).completed
  const vacancy = { ...vacantSlot(hire?.replaced), isCaptain: !!slot.isCaptain }
  if (!hire?.replaced) delete vacancy.fallen
  const slots = c.slots.map((s, i) => (i === slotIndex ? vacancy : s))
  if (!c.campaign) return { ...c, slots }

  const needsCaptain = c.campaign.needsCaptain || (!!slot.isCaptain && completed > 0)
  const entry = { afterGame: completed, uid: slot.uid, name: nameWithClass(slot), type: slot.type, action: 'recruit undone', at: now }
  return { ...c, slots, campaign: { ...c.campaign, needsCaptain, roster: [...roster, entry] } }
}

// ── Permanence ────────────────────────────────────────────────────────────────

// Why this change to a campaign warrior isn't allowed (a bought item can't be removed or
// swapped, and the main weapon can't change to one the bought off-hand can't go with), or null
export function permanenceBlock(slot, prop, value) {
  const ip = slot?.ip || []
  if (PERMANENT_GEAR.includes(prop) && ip.includes(prop) && (slot[prop] ?? null) !== (value ?? null)) {
    return `${GEAR_LABEL[prop]} is a permanent campaign upgrade. Use Undo last upgrade to fix a mistake.`
  }
  if (prop === 'weapon1' && value !== slot.weapon1 && ip.includes('weapon2') && slot.weapon2 &&
      !getSecondWeaponOptions(WARRIORS[slot.type], value).includes(slot.weapon2)) {
    return `The ${slot.weapon2} off-hand is permanent and can't be carried with that main weapon.`
  }
  return null
}

// Lowest earnedIP a warrior can be set to: the IP already spent can't be taken back
export function minEarnedIP(slot) {
  return slot?.ip?.length || 0
}

// Why this campaign slot can't be removed, or null (empty slots always can)
export function removeSlotBlock(slot) {
  if (!slot?.type) return null
  if (slot.ip?.length) return `${nameOf(slot)} has campaign upgrades and can't be removed.`
  if (slot.isCaptain) return "The Captain can't be removed. Make another warrior Captain first."
  return null
}

// Returns true when removing this IP entry would take back a bought campaign upgrade
export function isPermanentUpgrade(id) {
  return PERMANENT_GEAR.includes(id) || id === 'stat' || /^stat_\d+$/.test(id)
}

// The most recent upgrade: { id, kind: 'stat' | 'gear', stat?, item? } or null
export function lastUpgrade(slot) {
  const id = (slot?.ip || []).at(-1)
  if (!id) return null
  if (/^stat_\d+$/.test(id)) return { id, kind: 'stat', stat: (slot.statImproves || []).at(-1) ?? null }
  if (id === 'stat') return { id, kind: 'stat', stat: slot.statImprove ?? null }
  return { id, kind: 'gear', item: slot[id] ?? null }
}

// Takes back only the most recent upgrade and its IP. Returns the new slot, or null.
export function undoLastUpgrade(slot) {
  const ip = slot?.ip || []
  const last = ip.at(-1)
  if (!last) return null
  const rest = ip.slice(0, -1)
  if (/^stat_\d+$/.test(last)) return { ...slot, ip: rest, statImproves: (slot.statImproves || []).slice(0, -1) }
  if (last === 'stat') return { ...slot, ip: rest, statImprove: null }
  if (last === 'weapon2') {
    const wdata = WARRIORS[slot.type]
    if (slot.weapon1 === 'Polearm (one-handed)' && !wdata?.fixedShield) {
      // The Shield came with the polearm, so the polearm goes back too
      const weapon1 = getAllowedWeapons(wdata).find(w => w !== 'Polearm (one-handed)') ?? slot.weapon1
      return { ...slot, ip: rest, weapon1, weapon2: null }
    }
    return { ...slot, ip: rest, weapon2: null }
  }
  if (last === 'climbing' || last === 'consumable') return { ...slot, ip: rest, [last]: null }
  return { ...slot, ip: rest }
}

// ── Upgrade log ───────────────────────────────────────────────────────────────
// campaign.upgrades: one entry per upgrade bought, in order:
//   { afterGame, uid, name, id, kind: 'stat' | 'gear', stat?, item?, label, at }
// afterGame is the number of games played when it was bought (0 = the starting company),
// id is the slot.ip entry it paid for, label is what the UI shows ("Combat", "Grappling Hook").

// What the IP entry `id` on this slot bought: { kind, stat?, item?, label }
export function upgradeLabel(slot, id) {
  const stat = /^stat_(\d+)$/.exec(id)
  if (stat || id === 'stat') {
    const k = stat ? (slot.statImproves || [])[Number(stat[1])] : slot.statImprove
    return { kind: 'stat', stat: k ?? null, label: (STAT_IMPROVEMENT[k] || k || 'Stat').replace(/ \+1$/, '') }
  }
  const item = slot[id] ?? null
  return { kind: 'gear', item, label: item || id }
}

// The campaign with the purchase of slot.ip entry `id` by this slot logged.
// Non-campaign companies get their campaign back unchanged.
export function logUpgrade(company, slotIndex, id, { now = Date.now(), eventId = null } = {}) {
  const slot = company?.slots?.[slotIndex]
  if (company?.companyMode !== 'campaign' || !slot?.type || !company.campaign) return company?.campaign ?? null
  const entry = {
    afterGame: campaignProgress(company).completed,
    uid: slot.uid, name: nameOf(slot), id,
    ...upgradeLabel(slot, id),
    ...(eventId ? { eventId } : {}),
    at: now,
  }
  return { ...company.campaign, upgrades: [...(company.campaign.upgrades || []), entry] }
}

const latestEntryIndex = (upgrades, uid, id) => {
  for (let i = upgrades.length - 1; i >= 0; i--) {
    if (upgrades[i].uid === uid && (id == null || upgrades[i].id === id)) return i
  }
  return -1
}

// A bought item changed (e.g. which consumable): update its entry instead of adding one
export function syncUpgradeItem(company, slotIndex, id) {
  const slot = company?.slots?.[slotIndex]
  const upgrades = company?.campaign?.upgrades || []
  const at = slot ? latestEntryIndex(upgrades, slot.uid, id) : -1
  if (at < 0) return company?.campaign ?? null
  const next = [...upgrades]
  next[at] = { ...next[at], ...upgradeLabel(slot, id) }
  return { ...company.campaign, upgrades: next }
}

// Undo last upgrade: drop this warrior's latest entry (the one for slot.ip's last id if logged)
export function unlogLastUpgrade(company, slot) {
  const upgrades = company?.campaign?.upgrades || []
  if (!slot) return company?.campaign ?? null
  let at = latestEntryIndex(upgrades, slot.uid, (slot.ip || []).at(-1))
  if (at < 0) at = latestEntryIndex(upgrades, slot.uid)
  if (at < 0) return company.campaign ?? null
  return { ...company.campaign, upgrades: upgrades.filter((_, i) => i !== at) }
}

// ── Resurrection ──────────────────────────────────────────────────────────────
// A warrior from The Fallen can be brought back into the company. Their fallen entry stays
// in the game record (history), marked resurrected: { at, slotIndex, afterGame }.
// They come back as themselves (uid, class, name, notes) with the IP the player chooses and
// nothing bought: the class's default loadout, no upgrades. The player spends the IP again.

export function isResurrected(entry) {
  return !!entry?.resurrected
}

export const MAX_RESURRECT_IP = 99

function findFallen(c, gameNumber, uid) {
  const log = c.campaign?.log || []
  const at = log.findIndex(r => r.gameNumber === gameNumber)
  const entry = at >= 0 ? (log[at].fallen || []).find(f => f.uid === uid) : null
  return { log, at, entry }
}

// Where they would go: their own vacancy if still empty, else slotIndex, else the first
// empty slot. -1 when there is none; throws if slotIndex is taken.
function resurrectTarget(c, uid, slotIndex) {
  const own = c.slots.findIndex(s => !s.type && s.fallen?.uid === uid)
  if (own >= 0) return own
  if (slotIndex != null) {
    if (!c.slots[slotIndex] || c.slots[slotIndex].type) throw new Error('That slot already has a warrior.')
    return slotIndex
  }
  return c.slots.findIndex(s => !s.type)
}

// For the resurrect sheet: { ip: the IP they had when they fell, slotIndex: where they'd go
// (-1 = no empty slot) }, or null if no such fallen warrior
export function resurrectDefaults(company, { gameNumber, uid } = {}) {
  const c = normalizeCampaign(company)
  const { entry } = findFallen(c, gameNumber, uid)
  if (!entry) return null
  return { ip: entry.earnedIP || 0, slotIndex: resurrectTarget(c, uid, null) }
}

// Brings warrior `uid`, who fell in game `gameNumber`, back with `ip` IP to spend (a whole
// number 0 to MAX_RESURRECT_IP; default: what they had when they fell). Into their own
// vacancy if it is still empty, else opts.slotIndex or the first empty slot. Never restores
// Captaincy. Throws with the reason if it can't be done.
// → { company, slotIndex, warnings }
export function resurrectWarrior(company, { gameNumber, uid } = {}, { slotIndex = null, ip, now = Date.now() } = {}) {
  const c = normalizeCampaign(company)
  const { log, at, entry } = findFallen(c, gameNumber, uid)
  if (!entry) throw new Error('That warrior is not among the fallen of that game.')
  const name = nameWithClass(entry)
  if (entry.resurrected || c.slots.some(s => s.type && s.uid === uid)) throw new Error(`${name} is already back in the company.`)
  if (c.slots.some(s => s.type === entry.type)) throw new Error(`The company already has a ${entry.type}.`)
  const earnedIP = ip === undefined ? entry.earnedIP || 0 : ip
  if (!Number.isInteger(earnedIP) || earnedIP < 0 || earnedIP > MAX_RESURRECT_IP) throw new Error(`Choose between 0 and ${MAX_RESURRECT_IP} IP.`)

  const target = resurrectTarget(c, uid, slotIndex)
  if (target < 0) throw new Error('No empty slot. Remove or free a slot first.')

  const warnings = []
  const vacancy = c.slots[target]
  const { fallen: _fallen, ...rest } = vacancy
  const warrior = {
    ...rest,
    type: entry.type,
    customName: 'customName' in entry ? entry.customName ?? null : (entry.name && entry.name !== entry.type ? entry.name : null),
    // Only what the class itself carries: nothing bought comes back
    ...defaultLoadout(entry.type),
    consumable: null, climbing: null,
    ip: [], statImproves: [],
    earnedIP,
    notes: [...(entry.notes || vacancy.notes || [])],
    uid,
    isCaptain: false,
  }

  let slots = c.slots.map((s, i) => {
    if (i === target) return warrior
    // Their own vacancy elsewhere no longer needs the "fell in game N" note
    if (!s.type && s.fallen?.uid === uid) return withoutFallen(s)
    return s
  })
  // The Captain's place stays with an empty slot (or, with none left, the player picks a Captain)
  if (c.campaign.needsCaptain && vacancy.isCaptain) {
    const other = slots.findIndex((s, i) => i !== target && !s.type)
    if (other >= 0) slots = slots.map((s, i) => (i === other ? { ...s, isCaptain: true } : s))
  }

  const { completed } = campaignProgress(c)
  const record = { ...log[at], fallen: log[at].fallen.map(f => (f.uid === uid ? { ...f, resurrected: { at: now, slotIndex: target, afterGame: completed } } : f)) }
  const campaign = { ...c.campaign, log: log.map((r, i) => (i === at ? record : r)) }
  return { company: { ...c, slots, campaign }, slotIndex: target, warnings }
}

const withoutFallen = ({ fallen: _f, ...s }) => s

// Why resurrectWarrior would refuse, or null (ref: { gameNumber, uid })
export function resurrectBlock(company, ref, opts) {
  try {
    resurrectWarrior(company, ref, opts)
    return null
  } catch (err) {
    return err.message
  }
}
