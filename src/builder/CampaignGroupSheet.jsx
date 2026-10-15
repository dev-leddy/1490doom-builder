import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import BottomSheet from '../shared/BottomSheet'
import ConfirmModal from '../shared/ConfirmModal'
import { useBuilderStore } from '../store/builderStore'
import { useCampaignGroupStore, useCampaignGroupPolling } from '../store/campaignGroupStore'
import { inviteLink } from '../api/campaignGroups'
import JoinCampaignSheet from './JoinCampaignSheet'
import MemberCampaignView from './MemberCampaignView'
import { expiresIn } from './campaignGroupUi'
import './styles/campaign-group.css'

// ── Play together: the shared campaign of the open company ────────────────────
// Not in one: start a shared campaign (makes an invite code) or join with a code.
// In one: the invite (the code big, Copy link / New code, the expiry, QR), the players
// (company, player, games, W/L) and Leave. Tapping another player opens their company read-only.

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
  return src ? <img className="cg-qr" src={src} width="168" height="168" alt="QR code for the invite link" /> : <div className="cg-qr cg-qr--blank" aria-hidden="true" />
}

// The code big (to read out or type), then Copy link / New code, the expiry, and the QR
function Invite({ group, onRotate, busy }) {
  const link = inviteLink(group.codeDisplay)
  const expired = group.codeExpiresAt <= Date.now()
  const [copied, setCopied] = useState(false)
  const toast = useBuilderStore(s => s._toast)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast?.("Couldn't copy. Select the link under the QR code and copy it instead.")
    }
  }

  return (
    <section className="cg-invite" aria-labelledby="cg-invite-title">
      <h3 className="cg-section-title" id="cg-invite-title">Invite players</h3>
      <p className={`cg-code${expired ? ' is-expired' : ''}`} aria-label={`Invite code ${group.codeDisplay.split('').join(' ')}`} data-testid="cg-code">
        {group.codeDisplay}
      </p>
      <div className="cg-invite-actions">
        {!expired && (
          <button type="button" className="cg-btn cg-btn--primary" onClick={copyLink} data-testid="cg-copy-link">
            {copied ? 'Link copied' : 'Copy link'}
          </button>
        )}
        <button type="button" className={`cg-btn${expired ? ' cg-btn--primary' : ''}`} onClick={onRotate} disabled={busy} data-testid="cg-new-code">
          New code
        </button>
      </div>
      <p className={`cg-expiry${expired ? ' is-expired' : ''}`}>
        {expiresIn(group.codeExpiresAt)}{expired ? '' : '. A new code stops the old one working.'}
      </p>
      {!expired && (
        <div className="cg-qr-block">
          <Qr text={link} />
          <p className="cg-link" data-testid="cg-link">{link}</p>
        </div>
      )}
    </section>
  )
}

// "2 games" and the results in their colours ("1W 1L")
function Record({ progress }) {
  if (!progress) return null
  const { completed = 0, tally = {} } = progress
  const parts = [['win', 'W'], ['loss', 'L'], ['draw', 'D'], ['retreat', 'R']].filter(([k]) => tally[k])
  return (
    <span className="cg-record">
      <span>{completed} {completed === 1 ? 'game' : 'games'}</span>
      {parts.map(([k, l]) => <span key={k} className={`cg-res cg-res--${k}`}>{tally[k]}{l}</span>)}
    </span>
  )
}

function MemberRow({ m }) {
  return (
    <span className="cg-member-text">
      <span className="cg-member-name">{m.companyName}</span>
      <span className="cg-member-sub">{m.playerName}{m.mark ? ` · ${m.mark}` : ''}</span>
    </span>
  )
}

function Members({ members, onOpen }) {
  const active = members.filter(m => !m.leftAt)
  const left = members.filter(m => m.leftAt)
  return (
    <section aria-labelledby="cg-members-title">
      <h3 className="cg-section-title" id="cg-members-title">Players · {active.length}</h3>
      <ul className="cg-members" data-testid="cg-members">
        {active.map(m => (
          <li key={m.companyId}>
            {m.mine ? (
              <div className="cg-member is-mine">
                <MemberRow m={m} />
                <Record progress={m.progress} />
                <span className="cg-member-you">You</span>
              </div>
            ) : (
              <button type="button" className="cg-member" onClick={() => onOpen(m)} aria-label={`Open ${m.companyName}, ${m.playerName}`}>
                <MemberRow m={m} />
                <Record progress={m.progress} />
                <span className="cg-member-go" aria-hidden="true">›</span>
              </button>
            )}
          </li>
        ))}
      </ul>
      {left.length > 0 && (
        <p className="cg-help cg-left">Left: {left.map(m => `${m.companyName} (${m.playerName})`).join(', ')}</p>
      )}
    </section>
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
          <label className="cg-section-title" htmlFor="cg-join-code">Have a code? Join a campaign</label>
          <div className="cg-join-row">
            <input id="cg-join-code" className="cg-code-input" value={code} placeholder="XXXX-XXXX"
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
        <Invite group={group} busy={busy} onRotate={() => run(rotateCode)} />
        <Members members={members} onOpen={setViewing} />
        <button type="button" className="cg-btn cg-btn--danger cg-leave" onClick={() => setConfirmLeave(true)} disabled={busy} data-testid="cg-leave">
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
