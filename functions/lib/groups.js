// ── Campaign groups: shared helpers for /api/campaign-groups ──────────────────
// A group is a set of campaign companies (one per player) whose owners can see each
// other's company read-only. Membership is soft: leaving sets left_at, which ends access
// both ways. See db/migrations/007_campaign_groups.sql.
import { json } from '../_middleware.js'

// Unambiguous base32: no 0/O and no 1/I. 32 symbols, so a random byte % 32 has no bias.
export const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
export const CODE_LENGTH = 8
export const CODE_TTL_MS = 7 * 24 * 60 * 60 * 1000
export const MAX_GROUP_NAME = 60
const DEFAULT_GAMES = 6 // CAMPAIGN_RULES.games (src/data/campaign.js); Functions don't import from src/

// random(n) -> n random bytes (injectable for tests)
export function generateInviteCode(random = n => crypto.getRandomValues(new Uint8Array(n))) {
  return Array.from(random(CODE_LENGTH), b => CODE_ALPHABET[b % 32]).join('')
}

// "ABCD2345" -> "ABCD-2345"
export function formatCode(code) {
  return code && code.length === CODE_LENGTH ? `${code.slice(0, 4)}-${code.slice(4)}` : code || ''
}

// What a player typed or a link carried -> the stored form, or null if it can't be a code.
// Case, spaces and dashes don't matter.
export function normalizeCode(input) {
  if (typeof input !== 'string') return null
  const code = input.toUpperCase().replace(/[\s-]/g, '')
  if (code.length !== CODE_LENGTH) return null
  for (const ch of code) if (!CODE_ALPHABET.includes(ch)) return null
  return code
}

// The user's active membership in a group (through any of their companies), or null
export async function activeMembership(db, groupId, userId) {
  if (!groupId || !userId) return null
  return db.prepare(
    `SELECT group_id, company_id, user_id, joined_at FROM campaign_group_members
     WHERE group_id = ? AND user_id = ? AND left_at IS NULL`
  ).bind(groupId, userId).first()
}

// A company's active membership in a given group, or null
export async function activeCompanyInGroup(db, groupId, companyId) {
  if (!groupId || !companyId) return null
  return db.prepare(
    `SELECT group_id, company_id, user_id, joined_at FROM campaign_group_members
     WHERE group_id = ? AND company_id = ? AND left_at IS NULL`
  ).bind(groupId, companyId).first()
}

// A company's active membership in any group, or null
export async function companyMembership(db, companyId) {
  return db.prepare(
    `SELECT group_id, company_id, user_id, joined_at FROM campaign_group_members
     WHERE company_id = ? AND left_at IS NULL`
  ).bind(companyId).first()
}

// The company if this user owns it: { id, name, mode, data (JSON string) } or null
export async function ownedCompany(db, companyId, userId) {
  if (typeof companyId !== 'string' || !companyId || !userId) return null
  return db.prepare(`SELECT id, name, mode, data FROM companies WHERE id = ? AND user_id = ?`).bind(companyId, userId).first()
}

// Signed in and an active member of the group -> { user, membership }; otherwise the
// Response to send (401 signed out, 403 not a member, so the group's existence isn't told apart)
export async function requireMember(context, groupId) {
  const user = context.data.user
  if (!user) return { response: json({ error: 'unauthenticated' }, 401) }
  const membership = await activeMembership(context.env.DB, groupId, user.id)
  if (!membership) return { response: json({ error: 'forbidden' }, 403) }
  return { user, membership }
}

// Games played, planned, results and when it finished, from a stored company
export function progressOf(data) {
  const c = data?.campaign && typeof data.campaign === 'object' ? data.campaign : {}
  const log = Array.isArray(c.log) ? c.log : []
  const tally = { win: 0, loss: 0, draw: 0, retreat: 0 }
  for (const r of log) if (tally[r?.result] != null) tally[r.result]++
  return {
    completed: Math.max(Number(data?.campaignGame) || 0, log.length),
    total: 'length' in c ? c.length : DEFAULT_GAMES,
    tally,
    completedAt: c.completedAt ?? null,
  }
}

export function parseData(s) {
  try { return JSON.parse(s) } catch { return null }
}

const UNNAMED = 'Unnamed company'

// Every member of a group, active ones first, then those who left; oldest join first.
// `mine` marks the viewer's own rows (no user ids leave the server). Those who left keep
// their name only: no progress, no mark.
export async function groupMembers(db, groupId, viewerId) {
  const rows = await db.prepare(
    `SELECT m.company_id, m.user_id, m.company_name, m.joined_at, m.left_at, m.left_reason,
            c.name AS current_name, c.data, COALESCE(u.display_name, u.username) AS player_name
     FROM campaign_group_members m
     LEFT JOIN companies c ON c.id = m.company_id AND c.user_id = m.user_id
     LEFT JOIN users u ON u.id = m.user_id
     WHERE m.group_id = ?
     ORDER BY (m.left_at IS NOT NULL), m.joined_at`
  ).bind(groupId).all()
  return (rows.results || []).map(r => {
    const active = r.left_at == null
    const data = active && r.data ? parseData(r.data) : null
    return {
      companyId: r.company_id,
      companyName: (active && r.current_name) || r.company_name || UNNAMED,
      mark: data?.mark || '',
      playerName: r.player_name || 'A player',
      joinedAt: r.joined_at,
      leftAt: r.left_at ?? null,
      leftReason: r.left_reason ?? null,
      mine: r.user_id === viewerId,
      progress: data ? progressOf(data) : null,
    }
  })
}

export function publicGroup(g) {
  return {
    id: g.id,
    name: g.name || null,
    createdAt: g.created_at,
    code: g.invite_code,
    codeDisplay: formatCode(g.invite_code),
    codeExpiresAt: g.code_expires_at,
  }
}

export async function loadGroup(db, groupId) {
  return db.prepare(
    `SELECT id, name, invite_code, code_expires_at, created_by, created_at FROM campaign_groups WHERE id = ?`
  ).bind(groupId).first()
}

// { group, members } as members see it
export async function groupPayload(db, group, viewerId) {
  return { group: publicGroup(group), members: await groupMembers(db, group.id, viewerId) }
}

// The group name a player typed, tidied; null for none
export function cleanGroupName(name) {
  if (typeof name !== 'string') return null
  const n = name.replace(/\s+/g, ' ').trim().slice(0, MAX_GROUP_NAME)
  return n || null
}

export const isUniqueError = err => /UNIQUE|constraint/i.test(String(err?.message || err))

// Can this company take part? Owned, campaign mode, not in a group yet.
// -> { company } or { response } (404 not yours, 400 not a campaign, 409 already in a group)
export async function joinableCompany(db, companyId, userId) {
  const company = await ownedCompany(db, companyId, userId)
  if (!company) return { response: json({ error: 'Company not found' }, 404) }
  if (company.mode !== 'campaign') return { response: json({ error: 'not_campaign', message: 'Only campaign companies can play together.' }, 400) }
  const existing = await companyMembership(db, companyId)
  if (existing) return { response: json({ error: 'in_group', groupId: existing.group_id, message: 'This company is already in a shared campaign.' }, 409) }
  return { company }
}
