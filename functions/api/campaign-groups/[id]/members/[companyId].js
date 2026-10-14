// GET    /api/campaign-groups/:id/members/:companyId — a member's company, read-only
//        (publicCampaignView: no notes, no undo snapshot, no uploaded avatar). The viewer and
//        the company must both be active members. -> { member, company }
// DELETE /api/campaign-groups/:id/members/:companyId — leave: your own company only. Soft:
//        the row stays (left_at) so the others see who left. Access ends both ways.
import { json } from '../../../../_middleware.js'
import { requireMember, activeCompanyInGroup, groupMembers, parseData } from '../../../../lib/groups.js'
import { publicCampaignView } from '../../../../lib/campaignView.js'

export async function onRequestGet(context) {
  const { id, companyId } = context.params
  const { user, response } = await requireMember(context, id)
  if (response) return response
  const db = context.env.DB

  const target = await activeCompanyInGroup(db, id, companyId)
  if (!target) return json({ error: 'forbidden' }, 403)
  const row = await db.prepare(`SELECT data FROM companies WHERE id = ? AND user_id = ?`).bind(companyId, target.user_id).first()
  const data = row && parseData(row.data)
  if (!data) return json({ error: 'Not found' }, 404)

  const member = (await groupMembers(db, id, user.id)).find(m => m.companyId === companyId && !m.leftAt) || null
  return json({ member, company: publicCampaignView(data) })
}

export async function onRequestDelete(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)
  const { id, companyId } = context.params

  const result = await context.env.DB.prepare(
    `UPDATE campaign_group_members SET left_at = ?, left_reason = 'left'
     WHERE group_id = ? AND company_id = ? AND user_id = ? AND left_at IS NULL`
  ).bind(Date.now(), id, companyId, user.id).run()
  if (!result.meta?.changes) return json({ error: 'Not found' }, 404)
  return json({ ok: true })
}
