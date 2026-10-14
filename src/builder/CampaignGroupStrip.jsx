import { useState } from 'react'
import { useCampaignGroupStore, useCampaignGroupPolling } from '../store/campaignGroupStore'
import CampaignGroupSheet, { IconTogether } from './CampaignGroupSheet'
import './styles/campaign-group.css'

// ── Members row in the campaign panel ─────────────────────────────────────────
// Shown only while the company is in a shared campaign: "Playing with Ann, Bo" and
// everyone's games played; tapping it opens Play together. Keeps the group fresh
// (every 30 s while the page is visible).

const initial = name => (name || '?').trim().charAt(0).toUpperCase() || '?'

export default function CampaignGroupStrip({ companyId }) {
  useCampaignGroupPolling(companyId)
  const { group, members, companyId: loadedFor } = useCampaignGroupStore()
  const [open, setOpen] = useState(false)

  const others = members.filter(m => !m.leftAt && !m.mine)
  const show = group && loadedFor === companyId
  return (
    <>
      {show && (
        <button type="button" className="cg-strip" onClick={() => setOpen(true)} data-testid="cg-strip">
          <span className="cg-strip-icon"><IconTogether /></span>
          <span className="cg-strip-faces" aria-hidden="true">
            {others.slice(0, 4).map(m => <span key={m.companyId} className="cg-face">{initial(m.playerName)}</span>)}
          </span>
          <span className="cg-strip-text">
            {others.length
              ? `Playing with ${others.map(m => m.playerName).join(', ')}`
              : 'Shared campaign. Invite players.'}
          </span>
          <span className="cg-member-go" aria-hidden="true">›</span>
        </button>
      )}
      {open && <CampaignGroupSheet onClose={() => setOpen(false)} />}
    </>
  )
}
