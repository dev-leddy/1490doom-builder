import { useEffect, useMemo, useState } from 'react'
import BottomSheet from '../shared/BottomSheet'
import { useBuilderStore } from '../store/builderStore'
import { useCampaignGroupStore } from '../store/campaignGroupStore'
import { previewGroup } from '../api/campaignGroups'
import './styles/campaign-group.css'

// ── Join a shared campaign (from an invite link /j/<code> or a typed code) ────
// Shows who is playing, then which of your campaign companies joins. Companies already in a
// shared campaign can't be picked; standard companies aren't listed. onJoined(companyId).

const NOTICE = "Members see this company's roster, results and log."

export default function JoinCampaignSheet({ code, preferCompanyId = null, onClose, onJoined }) {
  const saves = useBuilderStore(s => s.saves)
  const savesLoaded = useBuilderStore(s => s.savesLoaded)
  const [preview, setPreview] = useState(null)
  const [failure, setFailure] = useState(null) // { kind: 'expired' | 'missing' | 'offline', message }
  const [picked, setPicked] = useState(null)
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let live = true
    setFailure(null)
    previewGroup(code)
      .then(p => { if (live) setPreview(p) })
      .catch(err => {
        if (!live) return
        if (err.status === 410) setFailure({ kind: 'expired', message: 'This invite code has expired. Ask one of the players for a new one.' })
        else if (err.status === 404) setFailure({ kind: 'missing', message: `No shared campaign has the code ${code}. Check it and try again.` })
        else setFailure({ kind: 'offline', message: "Couldn't reach the server. Check your connection." })
      })
    return () => { live = false }
  }, [code, reload])

  const companies = useMemo(() => {
    const busyIds = new Map((preview?.mine || []).map(m => [m.companyId, m.inThisGroup]))
    return saves
      .filter(s => s.companyMode === 'campaign')
      .map(s => {
        const inGroup = busyIds.get(s.companyId)
        return {
          id: s.companyId,
          name: s.companyName?.trim() || 'Unnamed company',
          mark: s.mark || '',
          games: Math.max(s.campaignGame || 0, s.campaign?.log?.length || 0),
          reason: inGroup === true ? 'Already in this campaign' : inGroup === false ? 'Already in another shared campaign' : null,
        }
      })
  }, [saves, preview])

  const ownMember = preview?.mine?.find(m => m.inThisGroup)
  const ownCompany = ownMember && companies.find(c => c.id === ownMember.companyId)
  const choosable = companies.filter(c => !c.reason)

  // Preselect: the company that opened this, else the only choice
  useEffect(() => {
    if (picked && choosable.some(c => c.id === picked)) return
    const prefer = choosable.find(c => c.id === preferCompanyId) || (choosable.length === 1 ? choosable[0] : null)
    setPicked(prefer?.id ?? null)
  }, [choosable.map(c => c.id).join(','), preferCompanyId]) // eslint-disable-line react-hooks/exhaustive-deps

  async function join() {
    if (!picked) return
    setBusy(true); setProblem(null)
    const err = await useCampaignGroupStore.getState().joinGroup(code, picked)
    setBusy(false)
    if (err) setProblem(err)
    else onJoined?.(picked)
  }

  const canJoin = !!preview && !ownMember && !!picked && !busy
  const footer = (
    <>
      <button type="button" className="co-sheet-randomize" onClick={onClose}>Not now</button>
      {preview && !ownMember && choosable.length > 0 && (
        <button type="button" className="co-sheet-done" onClick={join} disabled={!canJoin} data-testid="cg-join-confirm">
          {busy ? 'Joining…' : 'Join'}
        </button>
      )}
    </>
  )

  let body
  if (failure) {
    body = (
      <div className="cg-stack" data-testid={`cg-join-${failure.kind}`}>
        <p className="cg-lead">{failure.message}</p>
        {failure.kind === 'offline' && <button type="button" className="cg-btn" onClick={() => setReload(n => n + 1)}>Try again</button>}
      </div>
    )
  } else if (!preview || !savesLoaded) {
    body = <p className="cg-help" role="status">Loading…</p>
  } else {
    body = (
      <div className="cg-stack">
        <p className="cg-lead">{preview.group.name ? `${preview.group.name}: ` : ''}You're invited to a shared campaign. Everyone keeps their own company.</p>
        <section aria-labelledby="cg-preview-title">
          <h3 className="cg-section-title" id="cg-preview-title">Playing now</h3>
          <ul className="cg-members">
            {preview.members.map((m, i) => (
              <li key={i} className="cg-member is-static">
                <span className="cg-member-text">
                  <span className="cg-member-name">{m.companyName}</span>
                  <span className="cg-member-sub">{m.playerName}{m.mark ? ` · ${m.mark}` : ''}</span>
                </span>
                <span className="cg-record"><span>{m.gamesPlayed} {m.gamesPlayed === 1 ? 'game' : 'games'}</span></span>
              </li>
            ))}
          </ul>
        </section>

        {ownMember ? (
          <p className="cg-lead" data-testid="cg-join-own">
            You're already in this campaign{ownCompany ? ` with ${ownCompany.name}` : ''}.
          </p>
        ) : companies.length === 0 ? (
          <p className="cg-lead" data-testid="cg-join-none">
            You don't have a campaign company yet. Build a company, choose Campaign, then open the invite link again.
          </p>
        ) : (
          <fieldset className="cg-pick">
            <legend className="cg-section-title">Which company joins?</legend>
            {companies.map(c => (
              <label key={c.id} className={`cg-pick-row${c.reason ? ' is-disabled' : ''}${picked === c.id ? ' is-picked' : ''}`}>
                <input type="radio" name="cg-company" value={c.id} checked={picked === c.id} disabled={!!c.reason}
                  onChange={() => setPicked(c.id)} />
                <span className="cg-member-text">
                  <span className="cg-member-name">{c.name}</span>
                  <span className="cg-member-sub">
                    {c.reason || `${c.mark ? `${c.mark} · ` : ''}${c.games} ${c.games === 1 ? 'game' : 'games'} played`}
                  </span>
                </span>
              </label>
            ))}
            {choosable.length > 0 && <p className="cg-notice">{NOTICE}</p>}
          </fieldset>
        )}
      </div>
    )
  }

  return (
    <BottomSheet title="JOIN A CAMPAIGN" onClose={onClose} className="cg-sheet" footer={footer} zIndex={1100}>
      {body}
      {problem && <p className="cg-error" role="alert">{problem}</p>}
    </BottomSheet>
  )
}
