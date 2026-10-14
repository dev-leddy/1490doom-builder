import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useActivityLog } from './useActivityLog'
import {
  KINDS, DEFAULT_LOG_FILTERS, buildRows, gameOptions, warriorOptions, filterRows, activeFilterCount, rowsToCsv, eventTime,
} from './activityLog'
import { IconDownload } from './icons'
import './styles/activity-log.css'

// ── Campaign log, full screen ─────────────────────────────────────────────────
// Every event of a campaign company as a table (>= 768px) or two-line rows (phones),
// with filters by game, warrior, kind and text. Undone entries are struck through.

const WIDE = '(min-width: 768px)'

function useWide() {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE).matches)
  useEffect(() => {
    const mq = window.matchMedia(WIDE)
    const on = () => setWide(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return wide
}

// Focus stays inside the view; Escape closes; the page behind doesn't scroll
function useModal(ref, onClose) {
  const close = useRef(onClose)
  close.current = onClose
  useEffect(() => {
    const el = ref.current
    const before = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    el.querySelector('[data-autofocus]')?.focus()
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); return }
      if (e.key !== 'Tab') return
      const items = [...el.querySelectorAll('button:not([disabled]), input, select, [tabindex="0"]')].filter(x => x.offsetParent !== null)
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === first || !el.contains(document.activeElement))) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && (document.activeElement === last || !el.contains(document.activeElement))) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      before?.focus?.({ preventScroll: true })
    }
  }, [ref])
}

const slug = s => (s || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'company'

function downloadCsv(rows, companyName) {
  const url = URL.createObjectURL(new Blob([rowsToCsv(rows)], { type: 'text/csv;charset=utf-8' }))
  const a = Object.assign(document.createElement('a'), { href: url, download: `${slug(companyName)}-campaign-log.csv` })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Tags({ r }) {
  return (
    <>
      {r.undone && <span className="alv-flag">Undone</span>}
      {r.rejected && <span className="alv-flag alv-flag--warn">Not saved</span>}
    </>
  )
}

const details = r => (r.rejected ? 'Replaced by changes from another device' : r.sub)
const names = r => r.warriors.map(w => w.name).join(', ')
const rowClass = r => `${r.undone ? ' is-undone' : ''}${r.rejected ? ' is-rejected' : ''}`

export default function ActivityLogView({ companyId, companyName, onClose }) {
  const ref = useRef(null)
  const titleId = useId()
  const panelId = useId()
  const wide = useWide()
  useModal(ref, onClose)

  const { events, error, retry } = useActivityLog(companyId)
  const [f, setF] = useState(DEFAULT_LOG_FILTERS)
  const [newestFirst, setNewestFirst] = useState(true)
  const [filtersOpen, setFiltersOpen] = useState(false)

  const rows = useMemo(() => (events ? buildRows(events) : []), [events])
  const games = useMemo(() => (events ? gameOptions(events) : []), [events])
  const warriors = useMemo(() => warriorOptions(rows), [rows])
  const shown = useMemo(() => filterRows(rows, f, { newestFirst }), [rows, f, newestFirst])
  const active = activeFilterCount(f)
  const panelActive = active - (f.q.trim() ? 1 : 0) // the search box is always on show
  const set = patch => setF(x => ({ ...x, ...patch }))
  const toggleKind = id => setF(x => ({ ...x, kinds: x.kinds.includes(id) ? x.kinds.filter(k => k !== id) : [...x.kinds, id] }))
  const sortLabel = newestFirst ? 'Newest first' : 'Oldest first'

  const search = (
    <input type="search" className="alv-search" value={f.q} onChange={e => set({ q: e.target.value })}
      placeholder="Search the log" aria-label="Search the log" autoComplete="off" />
  )
  const filters = (
    <div className="alv-filters" id={panelId}>
      <div className="alv-field">
        <label className="alv-field-label" htmlFor={`${panelId}-game`}>Game</label>
        <select id={`${panelId}-game`} className="alv-select" value={f.game} onChange={e => set({ game: e.target.value })}>
          <option value="all">All games</option>
          {games.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
      </div>
      <div className="alv-field">
        <label className="alv-field-label" htmlFor={`${panelId}-warrior`}>Warrior</label>
        <select id={`${panelId}-warrior`} className="alv-select" value={f.warrior} onChange={e => set({ warrior: e.target.value })}>
          <option value="all">All warriors</option>
          {warriors.map(w => <option key={w.uid} value={w.uid}>{w.name}{w.fell ? `, fell in game ${w.fell}` : ''}</option>)}
        </select>
      </div>
      <div className="alv-field alv-field--kinds">
        <span className="alv-field-label" id={`${panelId}-kinds`}>Event types</span>
        <div className="alv-chips" role="group" aria-labelledby={`${panelId}-kinds`}>
          {KINDS.map(k => (
            <button key={k.id} type="button" className="alv-chip" data-kind={k.id} aria-pressed={f.kinds.includes(k.id)}
              onClick={() => toggleKind(k.id)}>{k.label}</button>
          ))}
        </div>
      </div>
      <button type="button" role="switch" aria-checked={f.showUndone} className="alv-switch" onClick={() => set({ showUndone: !f.showUndone })}>
        <span className="alv-switch-track" aria-hidden="true"><span className="alv-switch-knob" /></span>
        Show undone
      </button>
    </div>
  )

  let body
  if (error) {
    body = (
      <div className="alv-empty">
        <p>Couldn't load the log. Check your connection.</p>
        <button type="button" className="alv-btn" onClick={retry}>Try again</button>
      </div>
    )
  } else if (!events) {
    body = <p className="alv-empty" role="status">Loading the log…</p>
  } else if (!rows.length) {
    body = <p className="alv-empty">Nothing logged yet. Changes to this campaign show up here.</p>
  } else if (!shown.length) {
    body = (
      <div className="alv-empty">
        <p>No entries match these filters.</p>
        <button type="button" className="alv-btn" onClick={() => setF(DEFAULT_LOG_FILTERS)}>Clear filters</button>
      </div>
    )
  } else if (wide) {
    body = (
      <table className="alv-table">
        <caption className="alv-hidden">Campaign log, {sortLabel.toLowerCase()}</caption>
        <thead>
          <tr>
            <th scope="col" className="alv-col-time" aria-sort={newestFirst ? 'descending' : 'ascending'}>
              <button type="button" className="alv-sort" onClick={() => setNewestFirst(v => !v)}
                title={newestFirst ? 'Show oldest first' : 'Show newest first'}>
                Time <span aria-hidden="true">{newestFirst ? '▼' : '▲'}</span>
              </button>
            </th>
            <th scope="col" className="alv-col-game">Game</th>
            <th scope="col" className="alv-col-warrior">Warrior</th>
            <th scope="col" className="alv-col-event">Event</th>
            <th scope="col" className="alv-col-details">Details</th>
          </tr>
        </thead>
        <tbody>
          {shown.map(r => (
            <tr key={r.e.id} className={`alv-row${rowClass(r)}`} data-type={r.e.type}>
              <td className="alv-time"><time dateTime={Number.isFinite(r.at) ? new Date(r.at).toISOString() : undefined}>{eventTime(r.at)}</time></td>
              <td className="alv-game">{r.game.label}</td>
              <td className="alv-warrior">{names(r)}</td>
              <td className="alv-event">
                <span className="alv-tag" data-kind={r.kind}>{r.tag}</span>
                <span className="alv-text">{r.text}</span>
                <Tags r={r} />
              </td>
              <td className="alv-details">{details(r)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  } else {
    body = (
      <ol className="alv-list">
        {shown.map(r => (
          <li key={r.e.id} className={`alv-item${rowClass(r)}`} data-type={r.e.type}>
            <div className="alv-item-main">
              <span className="alv-tag" data-kind={r.kind}>{r.tag}</span>
              <span className="alv-text">{r.text}</span>
              <Tags r={r} />
              {details(r) && <span className="alv-item-details">{details(r)}</span>}
            </div>
            <div className="alv-item-meta">
              <time dateTime={Number.isFinite(r.at) ? new Date(r.at).toISOString() : undefined}>{eventTime(r.at)}</time>
              <span>{r.game.label}</span>
              {r.warriors.length > 0 && <span>{names(r)}</span>}
            </div>
          </li>
        ))}
      </ol>
    )
  }

  return createPortal(
    <div className="alv" ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <header className="alv-bar">
        <h2 className="alv-title" id={titleId}>
          Campaign log <span className="alv-title-co">· {companyName || 'Unnamed company'}</span>
        </h2>
        <button type="button" className="alv-btn alv-export" onClick={() => downloadCsv(shown, companyName)}
          disabled={!shown.length} title="Download the entries shown as a CSV file" aria-label="Export the entries shown as CSV">
          <IconDownload /><span>Export</span>
        </button>
        <button type="button" className="alv-close" onClick={onClose} aria-label="Close the campaign log" data-autofocus>✕</button>
      </header>

      <div className="alv-controls">
        {wide ? (
          <div className="alv-controls-row">{search}{filters}</div>
        ) : (
          <>
            <div className="alv-controls-row">
              {search}
              <button type="button" className={`alv-btn alv-filter-toggle${panelActive ? ' has-active' : ''}`}
                aria-expanded={filtersOpen} aria-controls={panelId} onClick={() => setFiltersOpen(o => !o)}>
                Filters{panelActive ? ` · ${panelActive} active` : ''}
                <span aria-hidden="true" className="alv-caret">{filtersOpen ? '▲' : '▼'}</span>
              </button>
            </div>
            {filtersOpen && filters}
          </>
        )}
        <div className="alv-summary">
          <span className="alv-count" aria-live="polite">
            {events ? `${shown.length} of ${rows.length} ${rows.length === 1 ? 'entry' : 'entries'}` : ''}
          </span>
          {active > 0 && <button type="button" className="alv-link" onClick={() => setF(DEFAULT_LOG_FILTERS)}>Clear filters</button>}
          {!wide && events && rows.length > 0 && (
            <button type="button" className="alv-link alv-sort-phone" onClick={() => setNewestFirst(v => !v)}
              aria-label={`${sortLabel}. Tap to show ${newestFirst ? 'oldest' : 'newest'} first`}>
              {sortLabel} <span aria-hidden="true">{newestFirst ? '▼' : '▲'}</span>
            </button>
          )}
        </div>
      </div>

      <div className="alv-body" tabIndex={-1}>{body}</div>
    </div>,
    document.body
  )
}
