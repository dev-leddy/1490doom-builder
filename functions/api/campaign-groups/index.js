// GET  /api/campaign-groups?companyId=<id> — the shared campaign this company is in:
//      { group, members } (owner only), or 404 when it isn't in one
// POST /api/campaign-groups { companyId, name? } — start a shared campaign with this company:
//      creates the group, its first member and an invite code (7 days). 409 if the company
//      is already in one, 400 if it isn't a campaign company.
// See functions/lib/groups.js for the member shape.
import { json } from '../../_middleware.js'
import {
  generateInviteCode, CODE_TTL_MS, cleanGroupName, isUniqueError,
  ownedCompany, companyMembership, joinableCompany, loadGroup, groupPayload,
} from '../../lib/groups.js'

export async function onRequestGet(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)
  const db = context.env.DB

  const companyId = new URL(context.request.url).searchParams.get('companyId')
  if (!await ownedCompany(db, companyId, user.id)) return json({ error: 'Company not found' }, 404)
  const membership = await companyMembership(db, companyId)
  const group = membership && await loadGroup(db, membership.group_id)
  if (!group) return json({ error: 'not_in_group' }, 404)
  return json(await groupPayload(db, group, user.id))
}

export async function onRequestPost(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)
  const db = context.env.DB

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const { company, response } = await joinableCompany(db, body?.companyId, user.id)
  if (response) return response

  const now = Date.now()
  const id = crypto.randomUUID()
  const name = cleanGroupName(body.name)
  for (let attempt = 0; attempt < 3; attempt++) {
    const code = generateInviteCode()
    try {
      await db.batch([
        db.prepare(
          `INSERT INTO campaign_groups (id, name, invite_code, code_expires_at, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(id, name, code, now + CODE_TTL_MS, user.id, now),
        db.prepare(
          `INSERT INTO campaign_group_members (group_id, company_id, user_id, company_name, joined_at) VALUES (?, ?, ?, ?, ?)`
        ).bind(id, company.id, user.id, company.name, now),
      ])
      return json(await groupPayload(db, await loadGroup(db, id), user.id), 201)
    } catch (err) {
      if (!isUniqueError(err)) throw err
      // The company joined a group meanwhile (another tab), or the code was taken: try again or say so
      if (await companyMembership(db, company.id)) return json({ error: 'in_group', message: 'This company is already in a shared campaign.' }, 409)
    }
  }
  return json({ error: 'Could not make an invite code. Try again.' }, 500)
}
