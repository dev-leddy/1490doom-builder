// GET /api/campaign-groups/:id — the group and its members (active members only):
// { group: { id, name, code, codeDisplay, codeExpiresAt, createdAt },
//   members: [{ companyId, companyName, mark, playerName, joinedAt, leftAt, leftReason, mine,
//               progress: { completed, total, tally, completedAt } | null }] }
import { json } from '../../_middleware.js'
import { requireMember, loadGroup, groupPayload } from '../../lib/groups.js'

export async function onRequestGet(context) {
  const { id } = context.params
  const { user, response } = await requireMember(context, id)
  if (response) return response
  const group = await loadGroup(context.env.DB, id)
  if (!group) return json({ error: 'Not found' }, 404)
  return json(await groupPayload(context.env.DB, group, user.id))
}
