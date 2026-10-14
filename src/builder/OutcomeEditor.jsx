import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { editOutcome, outcomeEditBlock, editLatestGameLosses } from '../store/campaign'
import { CAMPAIGN_RULES } from '../data/campaign'
import BottomSheet from '../shared/BottomSheet'
import EndOfGameModal, { RESULTS } from './EndOfGameModal'
import './styles/activity-log.css'

// ── Edit a recorded game's outcome ────────────────────────────────────────────
// From the campaign log (an entry's panel, or a By game card).
// latest (it has a snapshot): first say what re-entering it undoes, then either the full
// End of Game sheet prefilled (editLatestGame) or just result + survivor point.
// Older games: result + survivor point only (editGameOutcome), with a live IP preview.

const Z = 1200 // above the full-screen log and its entry sheet

const signed = n => (n > 0 ? `+${n}` : `${n}`)

// Result tiles and the survivor point, with what the IP will do
function SimpleOutcomeEditor({ gameNumber, onClose, onSaved }) {
  const store = useBuilderStore()
  const company = { companyMode: store.companyMode, slots: store.slots, campaignGame: store.campaignGame, campaign: store.campaign }
  const record = (store.campaign?.log || []).find(r => r.gameNumber === gameNumber)
  const survivors = (record?.roster || []).filter(r => r.survived)
  const [result, setResult] = useState(record?.result || null)
  const [pick, setPick] = useState(() => (record?.awards || []).find(a => a.reason === 'survivor')?.uid ?? null)
  if (!record) return null

  const earns = result !== 'retreat' || CAMPAIGN_RULES.retreatGivesIP
  const change = { result, survivorPick: earns ? pick : null }
  const block = outcomeEditBlock(company, gameNumber, change)
  let preview = null
  if (!block) { try { preview = editOutcome(company, gameNumber, change) } catch { preview = null } }
  const unchanged = result === record.result && (!earns || pick === ((record.awards || []).find(a => a.reason === 'survivor')?.uid ?? null))

  function save() {
    const res = store.editGameOutcome(gameNumber, change)
    if (res.ok) { onSaved?.(); onClose() }
  }

  return (
    <BottomSheet title={`EDIT GAME ${gameNumber}`} onClose={onClose} zIndex={Z} className="eog-sheet oe-sheet"
      footer={<>
        <button type="button" className="co-sheet-randomize" onClick={onClose}>Cancel</button>
        <button type="button" className="co-sheet-done oe-save" disabled={!!block || unchanged} onClick={save}>Save changes</button>
      </>}>
      <p className="eog-lede" id="oe-result-q">How did game {gameNumber} end?</p>
      <div className="eog-result-grid" role="radiogroup" aria-labelledby="oe-result-q">
        {RESULTS.map(r => (
          <button key={r.id} type="button" role="radio" aria-checked={result === r.id}
            className={`eog-result eog-result--${r.id}`} data-result={r.id} onClick={() => setResult(r.id)}>
            <span className="eog-result-name">{r.name}</span>
            <span className="eog-result-earn">{r.earn}</span>
            <span className="eog-result-ip" aria-hidden="true">{r.ip}</span>
          </button>
        ))}
      </div>

      {earns && survivors.length > 0 && (
        <>
          <p className="eog-lede oe-gap" id="oe-survivor-q">Survivor&apos;s point</p>
          <div className="oe-picks" role="radiogroup" aria-labelledby="oe-survivor-q">
            {survivors.map(w => (
              <button key={w.uid} type="button" role="radio" aria-checked={pick === w.uid} className="eog-pick oe-pick"
                onClick={() => setPick(w.uid)}>
                <span className="eog-pick-radio" aria-hidden="true" />
                <span className="eog-name">{w.name}{w.wasCaptain ? ' · Captain' : ''}</span>
                {pick === w.uid && <span className="eog-pick-gain">+{CAMPAIGN_RULES.survivorIP}</span>}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="oe-preview" aria-live="polite">
        <span className="oe-preview-label">IP after saving</span>
        {block ? <span className="oe-block">{block}</span>
          : unchanged ? <span className="oe-preview-text">Nothing changes yet.</span>
            : preview?.deltas?.length ? <span className="oe-preview-text">{preview.deltas.map(d => `${d.name} ${signed(d.ip)}`).join(', ')}</span>
              : <span className="oe-preview-text">No IP changes.</span>}
        {preview?.warnings?.map(w => <span key={w} className="oe-warn">{w}</span>)}
      </div>
      <p className="eog-perm">Who fell and the Captain can only be changed on the latest game.</p>
    </BottomSheet>
  )
}

// The whole flow; editing = { gameNumber, latest }
export default function EditOutcomeFlow({ editing, onClose, onSaved }) {
  const store = useBuilderStore()
  const company = { companyMode: store.companyMode, slots: store.slots, campaignGame: store.campaignGame, campaign: store.campaign }
  const [losses] = useState(() => (editing.latest ? editLatestGameLosses(company) : null))
  const [mode, setMode] = useState(() => (!editing.latest ? 'simple' : losses?.any ? 'warn' : 'full'))
  const n = editing.gameNumber

  if (mode === 'simple') return <SimpleOutcomeEditor gameNumber={n} onClose={onClose} onSaved={onSaved} />
  if (mode === 'full') return <EndOfGameModal edit onClose={onClose} onSaved={onSaved} onFallback={() => setMode('simple')} />

  const lines = [
    ...losses.upgrades.map(e => `${e.name}: ${e.label || e.item || e.stat}`),
    ...losses.roster.map(e => (e.action === 'recruited' ? `Recruited: ${e.name}` : `Recruit undone: ${e.name}`)),
  ]
  return (
    <BottomSheet title={`EDIT GAME ${n}?`} onClose={onClose} zIndex={Z} className="oe-sheet"
      footer={<>
        <button type="button" className="co-sheet-randomize" onClick={() => setMode('simple')}>Result only</button>
        <button type="button" className="co-sheet-done" onClick={() => setMode('full')}>Edit everything</button>
      </>}>
      <p className="eog-help">Upgrades bought and recruits made since this game will be undone if you edit everything:</p>
      <ul className="oe-losses">{lines.map(l => <li key={l}>{l}</li>)}</ul>
      <p className="eog-help">To keep them, change only the result and the survivor point.</p>
    </BottomSheet>
  )
}
