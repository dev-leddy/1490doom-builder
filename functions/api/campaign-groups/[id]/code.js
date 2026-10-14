// POST /api/campaign-groups/:id/code — a new invite code (any active member). The old code
// stops working; the new one lasts 7 days. -> { group } as in GET /api/campaign-groups/:id
import { json } from '../../../_middleware.js'
import { requireMember, generateInviteCode, CODE_TTL_MS, isUniqueError, loadGroup, publicGroup } from '../../../lib/groups.js'

export async function onRequestPost(context) {
  const { id } = context.params
  const { response } = await requireMember(context, id)
  if (response) return response
  const db = context.env.DB

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await db.prepare(`UPDATE campaign_groups SET invite_code = ?, code_expires_at = ? WHERE id = ?`)
        .bind(generateInviteCode(), Date.now() + CODE_TTL_MS, id).run()
      return json({ group: publicGroup(await loadGroup(db, id)) })
    } catch (err) {
      if (!isUniqueError(err)) throw err
    }
  }
  return json({ error: 'Could not make an invite code. Try again.' }, 500)
}
