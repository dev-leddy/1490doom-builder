// GET /api/campaign-groups/preview/:code — what a player sees before joining (signed in):
// { group: { name, codeExpiresAt }, members: [{ companyName, mark, playerName, gamesPlayed }],
//   mine: [{ companyId, inThisGroup }] } — mine lists the viewer's companies that are already
// in a shared campaign, so the join sheet can disable them.
//   404 unknown code · 410 expired
import { json } from '../../../_middleware.js'
import { normalizeCode, groupMembers } from '../../../lib/groups.js'

export async function onRequestGet(context) {
  const user = context.data.user
  if (!user) return json({ error: 'unauthenticated' }, 401)
  const db = context.env.DB

  const code = normalizeCode(context.params.code)
  const group = code && await db.prepare(
    `SELECT id, name, code_expires_at FROM campaign_groups WHERE invite_code = ?`
  ).bind(code).first()
  if (!group) return json({ error: 'not_found', message: 'No shared campaign has this code.' }, 404)
  if (group.code_expires_at <= Date.now()) return json({ error: 'expired', message: 'This code has expired. Ask for a new one.' }, 410)

  const members = (await groupMembers(db, group.id, user.id))
    .filter(m => !m.leftAt)
    .map(m => ({ companyName: m.companyName, mark: m.mark, playerName: m.playerName, gamesPlayed: m.progress?.completed ?? 0, mine: m.mine }))

  const mine = await db.prepare(
    `SELECT company_id, group_id FROM campaign_group_members WHERE user_id = ? AND left_at IS NULL`
  ).bind(user.id).all()

  return json({
    group: { name: group.name || null, codeExpiresAt: group.code_expires_at },
    members,
    mine: (mine.results || []).map(r => ({ companyId: r.company_id, inThisGroup: r.group_id === group.id })),
  })
}
