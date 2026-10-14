// POST /api/campaign-groups/join { code, companyId } — join a shared campaign with one of
// your campaign companies. The new member sees the whole history at once.
//   404 unknown code · 410 expired code · 409 already in this group (another of your
//   companies) or the company is already in a group · 400 not a campaign company
import { json } from '../../_middleware.js'
import { normalizeCode, joinableCompany, isUniqueError, groupPayload, loadGroup } from '../../lib/groups.js'

export async function onRequestPost(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)
  const db = context.env.DB

  let body
  try { body = await context.request.json() } catch { return json({ error: 'Invalid JSON' }, 400) }

  const code = normalizeCode(body?.code)
  const group = code && await db.prepare(
    `SELECT id, code_expires_at FROM campaign_groups WHERE invite_code = ?`
  ).bind(code).first()
  if (!group) return json({ error: 'not_found', message: 'No shared campaign has this code.' }, 404)
  if (group.code_expires_at <= Date.now()) return json({ error: 'expired', message: 'This code has expired. Ask for a new one.' }, 410)

  const already = await db.prepare(
    `SELECT company_id FROM campaign_group_members WHERE group_id = ? AND user_id = ? AND left_at IS NULL`
  ).bind(group.id, user.id).first()
  if (already) return json({ error: 'own_group', groupId: group.id, companyId: already.company_id, message: "You're already in this shared campaign." }, 409)

  const { company, response } = await joinableCompany(db, body.companyId, user.id)
  if (response) return response

  const now = Date.now()
  try {
    // A member who left and comes back with the same company gets their row back
    await db.prepare(
      `INSERT INTO campaign_group_members (group_id, company_id, user_id, company_name, joined_at) VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(group_id, company_id) DO UPDATE SET
         user_id = excluded.user_id, company_name = excluded.company_name, joined_at = excluded.joined_at,
         left_at = NULL, left_reason = NULL`
    ).bind(group.id, company.id, user.id, company.name, now).run()
  } catch (err) {
    if (isUniqueError(err)) return json({ error: 'in_group', message: 'This company is already in a shared campaign.' }, 409)
    throw err
  }
  return json(await groupPayload(db, await loadGroup(db, group.id), user.id))
}
