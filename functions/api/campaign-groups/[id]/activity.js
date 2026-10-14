// GET /api/campaign-groups/:id/activity?after=<seq>&limit=<n>&companyId=<id> — the activity
// logs of the group's active members, merged in server order and tagged with companyId.
// Active members only. Notes (entry.noted) and events refused with a lost save are left out.
// companyId narrows it to one member's company. Page with nextAfter like
// GET /api/companies/:id/events.
import { json } from '../../../_middleware.js'
import { requireMember } from '../../../lib/groups.js'

const MAX_LIMIT = 200

export async function onRequestGet(context) {
  const { id } = context.params
  const { response } = await requireMember(context, id)
  if (response) return response

  const url = new URL(context.request.url)
  const after = Math.max(0, parseInt(url.searchParams.get('after'), 10) || 0)
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get('limit'), 10) || MAX_LIMIT))
  const companyId = url.searchParams.get('companyId')

  // Joined on user_id too: only events written by the member who owns the company count
  const rows = await context.env.DB.prepare(
    `SELECT e.seq, e.id, e.company_id, e.type, e.after_game, e.ref, e.payload, e.client_at, e.server_at
     FROM campaign_events e
     JOIN campaign_group_members m ON m.company_id = e.company_id AND m.user_id = e.user_id
     WHERE m.group_id = ? AND m.left_at IS NULL
       AND e.status = 'ok' AND e.type != 'entry.noted' AND e.seq > ?
       ${companyId ? 'AND e.company_id = ?' : ''}
     ORDER BY e.seq LIMIT ?`
  ).bind(...[id, after, ...(companyId ? [companyId] : []), limit]).all()

  const events = (rows.results || []).map(r => {
    let payload = {}
    try { payload = JSON.parse(r.payload) } catch { /* keep the row, without details */ }
    return { seq: r.seq, id: r.id, companyId: r.company_id, type: r.type, afterGame: r.after_game, ref: r.ref, payload, at: r.client_at, serverAt: r.server_at, status: 'ok' }
  })
  const nextAfter = events.length === limit ? events.at(-1).seq : null
  return json({ events, nextAfter })
}
