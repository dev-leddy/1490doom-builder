// ── What other members of a campaign group see of a company ───────────────────
// A whitelist, so fields added to companies later stay private until listed here.
// Left out on purpose: warrior notes, the `before` undo snapshot on the latest game,
// uploaded (data: URL) avatars, and anything about the account.

const pick = (obj, keys) => {
  const out = {}
  if (!obj || typeof obj !== 'object') return out
  for (const k of keys) if (obj[k] !== undefined) out[k] = obj[k]
  return out
}
const list = (a, fn) => (Array.isArray(a) ? a.filter(x => x && typeof x === 'object').map(fn) : [])
// Plain values only (no nested objects), without anything private
const flat = (obj, skip = []) => {
  const out = {}
  for (const [k, v] of Object.entries(obj || {})) {
    if (skip.includes(k) || k === 'note' || k === 'notes' || k === 'before') continue
    if (v === null || ['string', 'number', 'boolean'].includes(typeof v)) out[k] = v
  }
  return out
}

const FALLEN_KEYS = ['uid', 'type', 'name', 'game', 'earnedIP', 'statImproves', 'ip']
const SLOT_KEYS = ['uid', 'type', 'customName', 'isCaptain', 'weapon1', 'weapon2', 'consumable', 'climbing', 'ip', 'statImprove', 'statImproves', 'earnedIP']
const RECORD_KEYS = ['id', 'eventId', 'gameNumber', 'scenario', 'result', 'finishedAt', 'captainChange']
const CAMPAIGN_KEYS = ['v', 'length', 'completedAt', 'endedEarly', 'needsCaptain']

// Preset avatar keys and http(s) images pass; uploads (data: URLs) and anything else don't
export function publicAvatar(avatar) {
  if (typeof avatar !== 'string' || !avatar) return null
  if (/^https?:\/\//i.test(avatar)) return avatar
  return /^[a-z0-9-]{1,40}$/i.test(avatar) ? avatar : null
}

function publicSlot(s) {
  const slot = pick(s, SLOT_KEYS)
  if (s.fallen && typeof s.fallen === 'object') slot.fallen = pick(s.fallen, FALLEN_KEYS)
  return slot
}

function publicRecord(r) {
  return {
    ...pick(r, RECORD_KEYS),
    roster: list(r.roster, x => pick(x, ['uid', 'type', 'name', 'wasCaptain', 'survived'])),
    awards: list(r.awards, x => pick(x, ['uid', 'ip', 'reason'])),
    fallen: list(r.fallen, x => pick(x, FALLEN_KEYS)),
  }
}

// data: the stored company JSON (companies.data). Returns the read-only view other members get.
export function publicCampaignView(data) {
  const d = data && typeof data === 'object' ? data : {}
  const c = d.campaign && typeof d.campaign === 'object' ? d.campaign : null
  return {
    companyName: typeof d.companyName === 'string' ? d.companyName : '',
    mark: typeof d.mark === 'string' ? d.mark : '',
    companyAvatar: publicAvatar(d.companyAvatar),
    companyMode: d.companyMode === 'campaign' ? 'campaign' : 'standard',
    ipLimit: Number.isFinite(d.ipLimit) ? d.ipLimit : 0,
    campaignGame: Number.isFinite(d.campaignGame) ? d.campaignGame : 0,
    slots: list(d.slots, publicSlot),
    campaign: c && {
      ...pick(c, CAMPAIGN_KEYS),
      log: list(c.log, publicRecord),
      upgrades: list(c.upgrades, x => flat(x)),
      roster: list(c.roster, x => ({ ...flat(x), ...(x.replaced && typeof x.replaced === 'object' ? { replaced: pick(x.replaced, FALLEN_KEYS) } : {}) })),
    },
  }
}
