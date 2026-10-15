import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useActivityLog } from './useActivityLog'
import {
  KINDS, DEFAULT_LOG_FILTERS, DEFAULT_LOG_SORT, buildRows, gameOptions, warriorOptions, filterRows, activeFilterCount, rowsToCsv, eventTime,
} from './activityLog'
import { IconDownload } from './icons'
import { useBuilderStore } from '../store/builderStore'
import { campaignProgress } from '../store/campaign'
import { campaignLogText } from './campaignUi'
import GameLogCards, { ResurrectSheet } from './GameLogCards'
import LogEntryDetail, { confirmFor } from './LogEntryDetail'
import EditOutcomeFlow from './OutcomeEditor'
import BottomSheet from '../shared/BottomSheet'
import ConfirmModal from '../shared/ConfirmModal'
import './styles/activity-log.css'

// ── Campaign log, full screen ─────────────────────────────────────────────────
// Two views: All entries (every event as a table at >= 768px, two-line rows on phones,
// with filters by game, warrior, kind and text; undone entries struck through) and
// By game (one card per recorded game, then the fallen). A tapped entry opens its detail
// (side panel on wide screens, bottom sheet on phones): its note and what can still be changed.

const VIEWS = [['entries', 'All entries'], ['games', 'By game']]
let lastView = 'entries' // the view the log reopens on, for this visit
let lastSort = DEFAULT_LOG_SORT // and its sort

// Phone sort menu: one value per choice (the table headers can also sort game / warrior Z to A)
const PHONE_SORTS = [
  ['newest', 'Newest', { key: 'time', dir: 'desc' }],
  ['oldest', 'Oldest', { key: 'time', dir: 'asc' }],
  ['game', 'Game', { key: 'game', dir: 'asc' }],
  ['warrior', 'Warrior', { key: 'warrior', dir: 'asc' }],
]
const phoneSortOf = s => (s.key === 'time' ? (s.dir === 'desc' ? 'newest' : 'oldest') : s.key)
const SORT_WORD = { time: 'time', game: 'game', warrior: 'warrior' }

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

// Focus stays inside the view; Escape calls onEscape; the page behind doesn't scroll.
// Sheets opened on top (entry detail on phones, confirms) keep their own focus.
function useModal(ref, onEscape) {
  const close = useRef(onEscape)
  close.current = onEscape
  useEffect(() => {
    const el = ref.current
    const before = document.activeElement
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    el.querySelector('[data-autofocus]')?.focus()
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); close.current(); return }
      if (e.key !== 'Tab') return
      if (document.activeElement?.closest('.co-settings-sheet')) return
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

function download(text, type, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a); a.click(); a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function Tags({ r }) {
  return (
    <>
      {r.undone && <span className="alv-flag">Undone</span>}
      {r.edited && <span className="alv-flag alv-flag--edited">Edited</span>}
      {r.rejected && <span className="alv-flag alv-flag--warn">Not saved</span>}
    </>
  )
}

const NoteIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 4h16v12H8l-4 4z" />
  </svg>
)
function Note({ r }) {
  if (!r.note) return null
  return <span className="alv-note"><NoteIcon /><span className="alv-hidden">Note: </span>{r.note}</span>
}

const details = r => (r.rejected ? 'Replaced by changes from another device' : r.sub)
const names = r => r.warriors.map(w => w.name).join(', ')
const rowClass = r => `${r.undone ? ' is-undone' : ''}${r.rejected ? ' is-rejected' : ''}`

export default function ActivityLogView({ companyId, companyName, onClose }) {
  const ref = useRef(null)
  const titleId = useId()
  const panelId = useId()
  const wide = useWide()
  const [selectedId, setSelectedId] = useState(null)
  const [ask, setAsk] = useState(null) // a confirm asked for by the entry detail
  const [editing, setEditing] = useState(null) // { gameNumber, latest }: the outcome editor
  const [resurrecting, setResurrecting] = useState(null) // a fallen warrior (By game tile)
  const opener = useRef(null)          // the row button that opened the detail, for focus on close
  const detailHeading = useRef(null)
  const closeDetail = () => { setSelectedId(null); setAsk(null); opener.current?.focus?.({ preventScroll: true }) }
  useModal(ref, () => (resurrecting ? setResurrecting(null) : editing ? setEditing(null) : ask ? setAsk(null) : selectedId ? closeDetail() : onClose()))

  const { events, error, retry, refresh } = useActivityLog(companyId)
  const { slots, campaign, companyMode, campaignGame } = useBuilderStore()
  const { completed, total } = campaignProgress({ slots, campaign, companyMode, campaignGame })
  const log = campaign?.log || []
  const [view, setViewState] = useState(lastView)
  const setView = v => { lastView = v; setViewState(v) }
  const [f, setF] = useState(DEFAULT_LOG_FILTERS)
  const [sort, setSortState] = useState(lastSort)
  const setSort = v => { lastSort = v; setSortState(v) }
  // Header click: a new column starts at its natural order (time newest, game / warrior ascending)
  const sortBy = key => setSort(sort.key === key ? { key, dir: sort.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: key === 'time' ? 'desc' : 'asc' })
  const [filtersOpen, setFiltersOpen] = useState(false)

  const rows = useMemo(() => (events ? buildRows(events) : []), [events])
  const games = useMemo(() => (events ? gameOptions(events) : []), [events])
  const warriors = useMemo(() => warriorOptions(rows), [rows])
  const shown = useMemo(() => filterRows(rows, f, { sort }), [rows, f, sort])
  const active = activeFilterCount(f)
  const panelActive = active - (f.q.trim() ? 1 : 0) // the search box is always on show
  const set = patch => setF(x => ({ ...x, ...patch }))
  const toggleKind = id => setF(x => ({ ...x, kinds: x.kinds.includes(id) ? x.kinds.filter(k => k !== id) : [...x.kinds, id] }))
  const sortLabel = `Sorted by ${SORT_WORD[sort.key]}, ${sort.key === 'time' ? (sort.dir === 'desc' ? 'newest first' : 'oldest first') : (sort.dir === 'asc' ? 'A to Z' : 'Z to A')}`
  // A sortable column header (a plain function, so the button keeps focus across re-renders)
  const sortTh = (k, label, className) => {
    const on = sort.key === k
    const ariaSort = on ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'
    return (
      <th scope="col" className={className} aria-sort={ariaSort} key={k}>
        <button type="button" className={`alv-sort${on ? ' is-active' : ''}`} onClick={() => sortBy(k)}>
          {label}{on && <span aria-hidden="true">{sort.dir === 'asc' ? '▲' : '▼'}</span>}
        </button>
      </th>
    )
  }
  const selected = selectedId ? rows.find(r => r.e.id === selectedId) : null
  const openRow = (r, button) => { opener.current = button; setSelectedId(r.e.id); setAsk(null) }
  useEffect(() => { if (selectedId) detailHeading.current?.focus({ preventScroll: true }) }, [selectedId])

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
  if (view === 'games') {
    body = (
      <div className="alv-cards">
        <GameLogCards log={log} legacyGames={Math.max(0, completed - log.length)} campaign={campaign} onEditGame={setEditing} onResurrect={setResurrecting} />
      </div>
    )
  } else if (error) {
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
        <caption className="alv-hidden">Campaign log. {sortLabel}. Sort by a column with its header button.</caption>
        <thead>
          <tr>
            {sortTh('time', 'Time', 'alv-col-time')}
            {sortTh('game', 'Game', 'alv-col-game')}
            {sortTh('warrior', 'Warrior', 'alv-col-warrior')}
            <th scope="col" className="alv-col-event">Event</th>
            <th scope="col" className="alv-col-details">Details</th>
          </tr>
        </thead>
        <tbody>
          {shown.map(r => (
            <tr key={r.e.id} className={`alv-row${rowClass(r)}${r.e.id === selectedId ? ' is-selected' : ''}`} data-type={r.e.type}
              onClick={ev => openRow(r, ev.currentTarget.querySelector('.alv-open'))}>
              <td className="alv-time"><time dateTime={Number.isFinite(r.at) ? new Date(r.at).toISOString() : undefined}>{eventTime(r.at)}</time></td>
              <td className="alv-game">{r.game.label}</td>
              <td className="alv-warrior">{names(r)}</td>
              <td className="alv-event">
                <span className="alv-tag" data-kind={r.kind} data-result={r.result || undefined}>{r.tag}</span>
                <button type="button" className="alv-open alv-text" aria-expanded={r.e.id === selectedId}
                  onClick={ev => { ev.stopPropagation(); openRow(r, ev.currentTarget) }}>{r.text}</button>
                <Tags r={r} />
                <Note r={r} />
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
          <li key={r.e.id} className={`alv-item${rowClass(r)}${r.e.id === selectedId ? ' is-selected' : ''}`} data-type={r.e.type}>
            <button type="button" className="alv-open alv-item-btn" onClick={ev => openRow(r, ev.currentTarget)}>
              <span className="alv-item-main">
                <span className="alv-tag" data-kind={r.kind} data-result={r.result || undefined}>{r.tag}</span>
                <span className="alv-text">{r.text}</span>
                <Tags r={r} />
                {details(r) && <span className="alv-item-details">{details(r)}</span>}
              </span>
              <Note r={r} />
              <span className="alv-item-meta">
                <time dateTime={Number.isFinite(r.at) ? new Date(r.at).toISOString() : undefined}>{eventTime(r.at)}</time>
                <span>{r.game.label}</span>
                {r.warriors.length > 0 && <span>{names(r)}</span>}
              </span>
            </button>
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
        <div className="alv-views" role="group" aria-label="View">
          {VIEWS.map(([id, label]) => (
            <button key={id} type="button" className="alv-view" aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>
          ))}
        </div>
        {view === 'games' ? (
          <button type="button" className="alv-btn alv-export" title="Download the roster and every game as a text file"
            aria-label="Export the games as text"
            onClick={() => download(campaignLogText({ companyName, slots, campaign, completed, total }), 'text/plain', `${slug(companyName)}-campaign.txt`)}>
            <IconDownload /><span>Export</span>
          </button>
        ) : (
          <button type="button" className="alv-btn alv-export" onClick={() => download(rowsToCsv(shown), 'text/csv', `${slug(companyName)}-campaign-log.csv`)}
            disabled={!shown.length} title="Download the entries shown as a CSV file" aria-label="Export the entries shown as CSV">
            <IconDownload /><span>Export</span>
          </button>
        )}
        <button type="button" className="alv-close" onClick={onClose} aria-label="Close the campaign log" data-autofocus>✕</button>
      </header>

      {view === 'entries' && <div className="alv-controls">
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
            <label className="alv-sort-phone">
              <span className="alv-sort-phone-label">Sort</span>
              <select className="alv-select alv-sort-select" value={phoneSortOf(sort)}
                onChange={e => setSort(PHONE_SORTS.find(x => x[0] === e.target.value)[2])}>
                {PHONE_SORTS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
              </select>
            </label>
          )}
        </div>
      </div>}

      <div className={`alv-main${view === 'entries' && selected && wide ? ' has-detail' : ''}`}>
        <div className="alv-body" tabIndex={-1}>{body}</div>
        {view === 'entries' && selected && wide && (
          <aside className="alv-detail" aria-labelledby={`${titleId}-entry`}>
            <div className="alv-detail-bar">
              <h3 className="alv-detail-title" id={`${titleId}-entry`}>Log entry</h3>
              <button type="button" className="alv-close" onClick={closeDetail} aria-label="Close the entry">✕</button>
            </div>
            <LogEntryDetail row={selected} onAsk={setAsk} onChanged={refresh} onEditGame={setEditing} headingRef={detailHeading} />
          </aside>
        )}
      </div>
      {view === 'entries' && selected && !wide && (
        <BottomSheet title="LOG ENTRY" onClose={closeDetail} zIndex={1100} className="alv-entry-sheet"
          footer={<button type="button" className="co-sheet-done" onClick={closeDetail}>Done</button>}>
          <LogEntryDetail row={selected} onAsk={setAsk} onChanged={refresh} onEditGame={setEditing} headingRef={detailHeading} />
        </BottomSheet>
      )}
      {resurrecting && <ResurrectSheet fallen={resurrecting} onClose={() => setResurrecting(null)} onDone={refresh} />}
      {editing && <EditOutcomeFlow editing={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
      {ask && selected && (
        <ConfirmModal zIndex={1200} {...confirmFor(ask, {
          company: { slots, campaign, companyMode, campaignGame }, row: selected,
          onDone: () => { setAsk(null); refresh() },
        })} onCancel={() => setAsk(null)} />
      )}
    </div>,
    document.body
  )
}
