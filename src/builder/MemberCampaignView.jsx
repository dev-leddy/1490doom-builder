import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { fetchMember, fetchGroupActivity } from '../api/campaignGroups'
import { campaignProgress, nameWithClass } from '../store/campaign'
import { buildRows, eventTime } from './activityLog'
import { RESULT_LETTER, resultWords } from './campaignUi'
import GameLogCards from './GameLogCards'
import { memberSummary } from './campaignGroupUi'
import './styles/activity-log.css'
import './styles/campaign-group.css'

// ── Another player's company in a shared campaign, read-only, full screen ─────
// Roster (with the game track), Games (the By game cards, nothing editable) and Activity
// (their log entries; notes are never shared). Loaded from the server on open; the member's
// company is never put in builderStore.

const TABS = [['roster', 'Roster'], ['games', 'Games'], ['activity', 'Activity']]
const MAX_PAGES = 25

function useOverlay(ref, onClose) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const before = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    ref.current?.querySelector('[data-autofocus]')?.focus()
    const onKey = e => { if (e.key === 'Escape') { e.preventDefault(); close.current() } }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      before?.focus?.({ preventScroll: true })
    }
  }, [ref])
}

function Track({ log, completed, total }) {
  const end = total != null ? Math.max(total, completed) : completed
  return (
    <span className="cmp-track" role="img" aria-label={`${completed} ${total != null ? `of ${total} ` : ''}games played${log.length ? `: ${resultWords(log)}` : ''}`}>
      {Array.from({ length: end }, (_, i) => {
        const r = log.find(x => x.gameNumber === i + 1)
        const played = i < completed
        return <span key={i} className={`cmp-pip${r ? ` is-${r.result}` : played ? ' is-played' : ''}`}>{r ? RESULT_LETTER[r.result] : played ? '✓' : i + 1}</span>
      })}
    </span>
  )
}

function Roster({ company }) {
  const upgradesBy = new Map()
  for (const e of company.campaign?.upgrades || []) {
    if (!upgradesBy.has(e.uid)) upgradesBy.set(e.uid, [])
    upgradesBy.get(e.uid).push(e.label || e.item || e.stat)
  }
  const progress = campaignProgress(company)
  const log = company.campaign?.log || []
  return (
    <div className="mcv-roster">
      <div className="mcv-track">
        <Track log={log} completed={progress.completed} total={progress.total} />
        <span className="cg-help">{progress.isComplete ? 'Campaign complete' : `Next: game ${progress.nextGame}`}</span>
      </div>
      <ul className="mcv-warriors">
        {company.slots.map((s, i) => {
          if (!s.type) {
            return s.fallen ? (
              <li key={s.uid || i} className="mcv-warrior is-fallen">
                <span className="mcv-warrior-name">{nameWithClass(s.fallen)}</span>
                <span className="cg-member-sub">Fell in game {s.fallen.game}. Not yet replaced.</span>
              </li>
            ) : null
          }
          const gear = [s.weapon1, s.weapon2, s.climbing, s.consumable].filter(Boolean)
          const bought = upgradesBy.get(s.uid) || []
          return (
            <li key={s.uid || i} className="mcv-warrior">
              <span className="mcv-warrior-name">
                {nameWithClass(s)}{s.isCaptain && <span className="mcv-captain">Captain</span>}
              </span>
              <span className="cg-member-sub">{s.earnedIP || 0} IP earned · {s.ip?.length || 0} spent</span>
              {gear.length > 0 && <span className="mcv-line"><span className="mcv-label">Gear</span> {gear.join(', ')}</span>}
              {bought.length > 0 && <span className="mcv-line"><span className="mcv-label">Upgrades</span> {bought.join(', ')}</span>}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function Activity({ events }) {
  const rows = useMemo(() => buildRows(events).reverse(), [events])
  if (!rows.length) return <p className="alv-empty">Nothing logged yet.</p>
  return (
    <ol className="alv-list" data-testid="mcv-activity">
      {rows.map(r => (
        <li key={r.e.id} className={`alv-item${r.undone ? ' is-undone' : ''}`} data-type={r.e.type}>
          <div className="alv-item-btn mcv-item">
            <span className="alv-item-main">
              <span className="alv-tag" data-kind={r.kind}>{r.tag}</span>
              <span className="alv-text">{r.text}</span>
              {r.undone && <span className="alv-flag">Undone</span>}
              {r.sub && <span className="alv-item-details">{r.sub}</span>}
            </span>
            <span className="alv-item-meta">
              <time dateTime={Number.isFinite(r.at) ? new Date(r.at).toISOString() : undefined}>{eventTime(r.at)}</time>
              <span>{r.game.label}</span>
              {r.warriors.length > 0 && <span>{r.warriors.map(w => w.name).join(', ')}</span>}
            </span>
          </div>
        </li>
      ))}
    </ol>
  )
}

export default function MemberCampaignView({ groupId, member, onClose }) {
  const ref = useRef(null)
  const titleId = useId()
  useOverlay(ref, onClose)
  const [tab, setTab] = useState('roster')
  const [data, setData] = useState(null)     // { member, company }
  const [events, setEvents] = useState(null)
  const [failure, setFailure] = useState(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let live = true
    setFailure(null)
    ;(async () => {
      try {
        const res = await fetchMember(groupId, member.companyId)
        if (live) setData(res)
        const all = []
        let after = 0
        for (let page = 0; page < MAX_PAGES && after != null; page++) {
          const r = await fetchGroupActivity(groupId, { after, companyId: member.companyId })
          all.push(...r.events)
          after = r.nextAfter
        }
        if (live) setEvents(all)
      } catch (err) {
        if (!live) return
        setFailure(err.status === 403
          ? "You can't see this company any more. One of you has left the shared campaign."
          : "Couldn't load this company. Check your connection.")
      }
    })()
    return () => { live = false }
  }, [groupId, member.companyId, reload])

  const company = data?.company
  const info = data?.member || member
  const log = company?.campaign?.log || []
  const completed = company ? campaignProgress(company).completed : 0

  let body
  if (failure) {
    body = (
      <div className="alv-empty">
        <p>{failure}</p>
        <button type="button" className="alv-btn" onClick={() => setReload(n => n + 1)}>Try again</button>
      </div>
    )
  } else if (!company) {
    body = <p className="alv-empty" role="status">Loading…</p>
  } else if (tab === 'roster') {
    body = <Roster company={company} />
  } else if (tab === 'games') {
    body = (
      <div className="alv-cards">
        <GameLogCards log={log} legacyGames={Math.max(0, completed - log.length)} campaign={company.campaign} readOnly />
      </div>
    )
  } else {
    body = events ? <Activity events={events} /> : <p className="alv-empty" role="status">Loading the log…</p>
  }

  return createPortal(
    <div className="alv mcv" ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} data-testid="member-view">
      <header className="alv-bar">
        <h2 className="alv-title" id={titleId}>
          {info.companyName} <span className="alv-title-co">· {info.playerName}</span>
        </h2>
        <button type="button" className="alv-close" onClick={onClose} aria-label="Close" data-autofocus>✕</button>
      </header>
      <div className="mcv-sub">
        <span>{memberSummary(info.progress)}{company?.mark ? ` · ${company.mark}` : ''}</span>
        <span className="mcv-readonly">View only</span>
      </div>
      <div className="mcv-tabs alv-views" role="group" aria-label="View">
        {TABS.map(([id, label]) => (
          <button key={id} type="button" className="alv-view" aria-pressed={tab === id} onClick={() => setTab(id)}>{label}</button>
        ))}
      </div>
      <div className="alv-main">
        <div className="alv-body" tabIndex={-1}>{body}</div>
      </div>
    </div>,
    document.body
  )
}
