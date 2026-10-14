import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import BottomSheet from '../shared/BottomSheet'
import ConfirmModal from '../shared/ConfirmModal'
import { useBuilderStore } from '../store/builderStore'
import { useCampaignGroupStore, useCampaignGroupPolling } from '../store/campaignGroupStore'
import { inviteLink } from '../api/campaignGroups'
import JoinCampaignSheet from './JoinCampaignSheet'
import MemberCampaignView from './MemberCampaignView'
import { memberSummary, expiresIn } from './campaignGroupUi'
import './styles/campaign-group.css'

// ── Play together: the shared campaign of the open company ────────────────────
// Not in one: start a shared campaign (makes an invite code) or join with a code.
// In one: the members (company, player, games played, W/L), the invite (code, link, QR,
// copy / share, a new code) and Leave. Tapping another member opens their company read-only.

export const IconTogether = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
    strokeLinecap="round" strokeLinejoin="round" width="20" height="20" aria-hidden="true">
    <circle cx="9" cy="8" r="3.2" /><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
    <circle cx="17" cy="9" r="2.6" /><path d="M16.5 14.1A5 5 0 0 1 21 19" />
  </svg>
)

function Qr({ text }) {
  const [src, setSrc] = useState(null)
  useEffect(() => {
    let live = true
    QRCode.toDataURL(text, { margin: 1, width: 240, color: { dark: '#000000', light: '#ffffff' } })
      .then(url => { if (live) setSrc(url) })
      .catch(() => { if (live) setSrc(null) })
    return () => { live = false }
  }, [text])
  return src ? <img className="cg-qr" src={src} width="180" height="180" alt="QR code for the invite link" /> : <div className="cg-qr cg-qr--blank" aria-hidden="true" />
}

function Invite({ group, onRotate, busy }) {
  const link = inviteLink(group.codeDisplay)
  const expired = group.codeExpiresAt <= Date.now()
  const [copied, setCopied] = useState(null)
  const toast = useBuilderStore(s => s._toast)

  async function copy(text, what) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied(c => (c === what ? null : c)), 2000)
    } catch {
      toast?.("Couldn't copy. Select the text and copy it instead.")
    }
  }

  async function share() {
    try {
      await navigator.share({ title: '1490 DOOM campaign', text: `Join my 1490 DOOM campaign with code ${group.codeDisplay}`, url: link })
    } catch { /* closed or not allowed */ }
  }

  return (
    <section className="cg-invite" aria-labelledby="cg-invite-title">
      <h3 className="cg-section-title" id="cg-invite-title">Invite players</h3>
      <p className={`cg-code${expired ? ' is-expired' : ''}`} aria-label={`Invite code ${group.codeDisplay.split('').join(' ')}`} data-testid="cg-code">
        {group.codeDisplay}
      </p>
      <p className={`cg-expiry${expired ? ' is-expired' : ''}`}>{expiresIn(group.codeExpiresAt)}</p>
      {!expired && (
        <>
          <Qr text={link} />
          <p className="cg-link" data-testid="cg-link">{link}</p>
          <div className="cg-btn-row">
            <button type="button" className="cg-btn" onClick={() => copy(link, 'link')}>{copied === 'link' ? 'Link copied' : 'Copy link'}</button>
            <button type="button" className="cg-btn" onClick={() => copy(group.codeDisplay, 'code')}>{copied === 'code' ? 'Code copied' : 'Copy code'}</button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button type="button" className="cg-btn" onClick={share}>Share</button>
            )}
          </div>
        </>
      )}
      <button type="button" className="cg-btn cg-btn--quiet" onClick={onRotate} disabled={busy}>
        {expired ? 'Make a new code' : 'New code'}
      </button>
      {!expired && <p className="cg-help">A new code stops the old one working.</p>}
    </section>
  )
}

function Members({ members, onOpen }) {
  const active = members.filter(m => !m.leftAt)
  const left = members.filter(m => m.leftAt)
  return (
    <section aria-labelledby="cg-members-title">
      <h3 className="cg-section-title" id="cg-members-title">Players ({active.length})</h3>
      <ul className="cg-members" data-testid="cg-members">
        {active.map(m => (
          <li key={m.companyId}>
            {m.mine ? (
              <div className="cg-member is-mine">
                <MemberText m={m} />
                <span className="cg-member-you">You</span>
              </div>
            ) : (
              <button type="button" className="cg-member" onClick={() => onOpen(m)} aria-label={`Open ${m.companyName}, ${m.playerName}`}>
                <MemberText m={m} />
                <span className="cg-member-go" aria-hidden="true">›</span>
              </button>
            )}
          </li>
        ))}
      </ul>
      {left.length > 0 && (
        <p className="cg-help">Left: {left.map(m => `${m.companyName} (${m.playerName})`).join(', ')}</p>
      )}
    </section>
  )
}

function MemberText({ m }) {
  return (
    <span className="cg-member-text">
      <span className="cg-member-name">{m.companyName}</span>
      <span className="cg-member-sub">{m.playerName}{m.mark ? ` · ${m.mark}` : ''}</span>
      <span className="cg-member-sub">{memberSummary(m.progress)}</span>
    </span>
  )
}

export default function CampaignGroupSheet({ onClose, onBack }) {
  const { companyId, companyName, companyMode } = useBuilderStore()
  const { group, members, status, error } = useCampaignGroupStore()
  const { refresh, createGroup, rotateCode, leaveGroup } = useCampaignGroupStore.getState()
  useCampaignGroupPolling(companyId)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)
  const [code, setCode] = useState('')
  const [joining, setJoining] = useState(null) // the code being joined
  const [confirmLeave, setConfirmLeave] = useState(false)
  const [viewing, setViewing] = useState(null) // member whose company is open

  async function run(action) {
    setBusy(true); setProblem(null)
    const err = await action()
    setBusy(false)
    if (err) setProblem(err)
    return err
  }

  async function start() {
    await run(async () => {
      await useBuilderStore.getState().flushSaves?.() // a new company must reach the server first
      return createGroup(companyId)
    })
  }

  if (viewing && group) {
    return <MemberCampaignView groupId={group.id} member={viewing} onClose={() => { setViewing(null); refresh() }} />
  }
  if (joining) {
    return (
      <JoinCampaignSheet code={joining} preferCompanyId={companyId}
        onClose={() => setJoining(null)}
        onJoined={() => { setJoining(null); refresh(companyId) }} />
    )
  }
  if (confirmLeave) {
    return (
      <ConfirmModal
        title="LEAVE THE SHARED CAMPAIGN?"
        subtitle={`${companyName || 'Your company'} stops being shared. You won't see the other players' companies, and they won't see yours. Your company and its log stay as they are.`}
        confirmLabel="Leave"
        onConfirm={async () => { setConfirmLeave(false); await run(leaveGroup) }}
        onCancel={() => setConfirmLeave(false)}
      />
    )
  }

  const footer = (
    <>
      {onBack && <button type="button" className="co-sheet-randomize" onClick={onBack}>Back</button>}
      <button type="button" className="co-sheet-done" onClick={onClose}>Done</button>
    </>
  )

  let body
  if (companyMode !== 'campaign') {
    body = <p className="cg-help">Only campaign companies can play together.</p>
  } else if (status === 'idle' || status === 'loading') {
    body = <p className="cg-help" role="status">Loading…</p>
  } else if (status === 'error') {
    body = (
      <div className="cg-stack">
        <p className="cg-help">{error}</p>
        <button type="button" className="cg-btn" onClick={() => refresh(companyId)}>Try again</button>
      </div>
    )
  } else if (status === 'none' || !group) {
    const typed = code.trim()
    body = (
      <div className="cg-stack">
        <p className="cg-lead">Play a campaign with friends. Everyone keeps their own company, and you can all see each other's roster, results and log.</p>
        <button type="button" className="cg-btn cg-btn--primary" onClick={start} disabled={busy} data-testid="cg-start">
          Start a shared campaign
        </button>
        <form className="cg-join" onSubmit={e => { e.preventDefault(); if (typed) setJoining(typed) }}>
          <label className="cg-section-title" htmlFor="cg-join-code">Join with a code</label>
          <div className="cg-join-row">
            <input id="cg-join-code" className="co-settings-input cg-code-input" value={code} placeholder="XXXX-XXXX"
              autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={12}
              onChange={e => setCode(e.target.value.toUpperCase())} />
            <button type="submit" className="cg-btn" disabled={!typed}>Join</button>
          </div>
        </form>
      </div>
    )
  } else {
    body = (
      <div className="cg-stack">
        {group.name && <p className="cg-lead">{group.name}</p>}
        <Members members={members} onOpen={setViewing} />
        <Invite group={group} busy={busy} onRotate={() => run(rotateCode)} />
        <button type="button" className="cg-btn cg-btn--danger" onClick={() => setConfirmLeave(true)} disabled={busy} data-testid="cg-leave">
          Leave the shared campaign
        </button>
      </div>
    )
  }

  return (
    <BottomSheet title="PLAY TOGETHER" onClose={onClose} className="cg-sheet" footer={footer}>
      {body}
      {problem && <p className="cg-error" role="alert">{problem}</p>}
    </BottomSheet>
  )
}
