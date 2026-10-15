import { useState, useMemo } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { useTrackerStore } from '../store/trackerStore'
import { deleteGame } from '../api/games'
import { WARRIOR_IMAGES } from '../data/images'
import { CAMPAIGN_RULES } from '../data/campaign'
import { validateEndOfGame, endOfGameWarnings, spendableCapacity, campaignProgress, undoLastGame, draftFromRecord } from '../store/campaign'
import BottomSheet from '../shared/BottomSheet'
import { fallenName } from './campaignUi'
import './styles/activity-log.css'

// ── End of a campaign game: a stepped sheet ───────────────────────────────────
// Result -> The fallen -> New Captain (if needed) -> Award IP (not on a retreat) -> Review.
// Nothing changes until "Record game N" on the review; the engine (store/campaign.js) has
// the rules, this sheet only builds the draft. A game past the planned length is fine: the
// store grows the campaign to fit.
// edit: enter the latest game again (prefilled from its record). The roster is the company
// as it was before that game (the record's snapshot); "Save changes" calls editLatestGame.

export const RESULTS = [
  { id: 'win', name: 'Victory', earn: '1 IP to a survivor, 1 IP to your Captain if they survived', ip: '+2' },
  { id: 'loss', name: 'Defeat', earn: '1 IP to a survivor', ip: '+1' },
  { id: 'draw', name: 'Draw', earn: '1 IP to a survivor. No Captain point', ip: '+1' },
  { id: 'retreat', name: 'We retreated', earn: 'No IP this game. The fallen are still lost', ip: '+0' },
]
const RESULT_WORD = { win: 'Victory', loss: 'Defeat', draw: 'Draw', retreat: 'Retreat' }
const STEP_LABEL = { result: 'Result', fallen: 'The fallen', captain: 'New Captain', award: 'Award IP', review: 'Review' }
const NEXT_LABEL = { fallen: 'Next: who fell', captain: 'Next: new Captain', award: 'Next: award IP', review: 'Next: review' }

const nameOf = s => (s.customName && s.customName.trim()) || s.type

// fell: name a fallen warrior with their class ("Brother Aldric (Warrior Priest)")
function Identity({ s, meta, star, fell }) {
  return (
    <span className="eog-identity">
      <img src={WARRIOR_IMAGES[s.type]} alt="" className="eog-portrait-lg" />
      <span className="eog-identity-text">
        <span className="eog-name">{fell ? fallenName(s) : nameOf(s)}{star && <span className="eog-star" aria-label="Captain"> ★</span>}</span>
        {meta && <span className="eog-meta">{meta}</span>}
      </span>
    </span>
  )
}

function Steps({ steps, current }) {
  const i = steps.indexOf(current)
  return (
    <div className="eog-steps" aria-label={`Step ${i + 1} of ${steps.length}: ${STEP_LABEL[current]}`}>
      {steps.map((st, k) => (
        <span key={st} className={`eog-step-pip${k < i ? ' is-done' : k === i ? ' is-current' : ''}`} aria-hidden="true" />
      ))}
      <span className="eog-step-count" aria-hidden="true">{i + 1} of {steps.length} · {STEP_LABEL[current]}</span>
    </div>
  )
}

// initialResult: 'retreat' when opened from play mode's Retreat (the sheet starts at The fallen)
// edit: re-enter the latest game; onSaved after saving, onFallback if only the simple
// outcome editor can change it (no snapshot)
export default function EndOfGameModal({ onClose, onConfirm, initialResult = null, edit = false, onSaved, onFallback }) {
  const store = useBuilderStore()
  const { companyId, recordCampaignGame, editLatestGame } = store
  const current = { companyMode: store.companyMode, slots: store.slots, campaignGame: store.campaignGame, campaign: store.campaign }
  // Editing: the company as it was before the latest game, and that game's draft (fixed
  // when the sheet opens, so saving doesn't swap the roster under it)
  const [editBase] = useState(() => (edit ? undoLastGame(current) : null))
  const [editDraft] = useState(() => (edit ? draftFromRecord(current) : null))
  const company = editBase || current
  const { slots } = company
  const progress = campaignProgress(company)
  const gameNumber = progress.nextGame
  const active = slots.map((s, i) => ({ ...s, index: i })).filter(s => s.type)

  // Prefill the fallen from play mode, but only from this company's game
  const prefill = useMemo(() => {
    if (edit) return null
    const tracker = useTrackerStore.getState()
    if (tracker.companyId !== companyId || !tracker.warriors.length) return null
    return active
      .filter(s => { const w = tracker.warriors.find(t => t.index === s.index); return w && (w.dead || w.currentVit <= 0) })
      .map(s => s.index)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [result, setResult] = useState(editDraft?.result ?? initialResult)
  const [fallen, setFallen] = useState(() => new Set(editDraft?.fallenIndices || prefill || []))
  const [newCaptainIndex, setNewCaptainIndex] = useState(editDraft?.newCaptainIndex ?? null)
  const [survivorPick, setSurvivorPick] = useState(editDraft?.survivorPick ?? null)
  const [bonus, setBonus] = useState(() => Object.fromEntries((editDraft?.bonus || []).map(b => [b.index, b.ip]))) // { slotIndex: ip }
  const [bonusOpen, setBonusOpen] = useState(!!editDraft?.bonus?.length)
  const [scenario, setScenario] = useState(editDraft?.scenario || '')
  const [step, setStep] = useState(initialResult ? 'fallen' : 'result')

  const survivors = active.filter(s => !fallen.has(s.index))
  const captain = active.find(s => s.isCaptain) || null
  const captainFell = !!captain && fallen.has(captain.index)
  const earns = result !== 'retreat' || CAMPAIGN_RULES.retreatGivesIP
  const captainPoint = earns && result === 'win' && captain && !captainFell
  const leader = captainFell ? survivors.find(s => s.index === newCaptainIndex) : captain

  const steps = ['result', 'fallen',
    ...(captainFell && survivors.length ? ['captain'] : []),
    ...(earns && survivors.length ? ['award'] : []),
    'review']

  const draft = {
    result,
    // Editing: an empty name clears it; recording: no name
    scenario: edit ? scenario.trim() : (scenario.trim() || undefined),
    fallenIndices: [...fallen],
    newCaptainIndex: captainFell && survivors.length ? newCaptainIndex : null,
    survivorPick: earns && survivors.length ? survivorPick : null,
    bonus: earns ? Object.entries(bonus).filter(([i, ip]) => ip > 0 && !fallen.has(+i)).map(([i, ip]) => ({ index: +i, ip })) : [],
  }
  const errors = validateEndOfGame(company, draft)
  const { captainCantSpend } = endOfGameWarnings(company, draft)

  // Room a survivor has for the survivor point (the Captain's point and bonus take room first)
  const bonusOf = i => (fallen.has(i) ? 0 : bonus[i] || 0)
  const room = s => spendableCapacity(s) - (captainPoint && s.index === captain.index ? CAMPAIGN_RULES.winnerCaptainIP : 0) - bonusOf(s.index)
  const anyRoom = survivors.some(s => room(s) > 0)
  const bonusTotal = survivors.reduce((n, s) => n + bonusOf(s.index), 0)

  const gainOf = i => {
    if (!earns || fallen.has(i)) return 0
    return (survivorPick === i ? CAMPAIGN_RULES.survivorIP : 0) +
      (captainPoint && captain.index === i ? CAMPAIGN_RULES.winnerCaptainIP : 0) + bonusOf(i)
  }
  const totalGain = active.reduce((n, s) => n + gainOf(s.index), 0)

  function toggleFate(i, fell) {
    setFallen(prev => {
      const next = new Set(prev)
      if (fell) next.add(i); else next.delete(i)
      return next
    })
    if (fell) {
      if (survivorPick === i) setSurvivorPick(null)
      if (newCaptainIndex === i) setNewCaptainIndex(null)
    }
  }

  function stepBonus(i, delta) {
    setBonus(prev => {
      const cur = prev[i] || 0
      const next = Math.max(0, cur + delta)
      if (delta > 0 && bonusTotal >= CAMPAIGN_RULES.maxBonusIP) return prev
      return { ...prev, [i]: next }
    })
  }

  const canAdvance = {
    result: !!result,
    fallen: true,
    captain: newCaptainIndex != null && survivors.some(s => s.index === newCaptainIndex),
    award: survivorPick != null && !errors.some(e => /survivor IP|bonus/i.test(e)),
    review: errors.length === 0,
  }[step]

  const idx = steps.indexOf(step)
  const nextStep = steps[idx + 1]
  const prevStep = steps[idx - 1]

  // The game is over: drop this company's saved game so Play doesn't offer to resume it
  function finishGame() {
    const tracker = useTrackerStore.getState()
    if (tracker.companyId === companyId) tracker.closeTracker()
    else if (companyId) deleteGame(companyId).catch(() => {})
    onConfirm?.()
    onClose()
  }

  function record() {
    if (edit) {
      const res = editLatestGame(draft)
      if (res.ok) { onSaved?.(); onClose() } else if (res.fallback) onFallback?.()
      return
    }
    const res = recordCampaignGame(draft)
    if (res.ok) finishGame()
  }

  // Past the planned length (or after ending early) the game still records; say what happens
  const beyond = !edit && progress.isComplete
  const beyondNote = !beyond ? null
    : progress.endedEarly ? 'This campaign was ended early. Recording this game reopens it.'
      : `Your campaign was set to ${progress.total} games. Recording this game adds one more.`
  const isLast = !progress.unlimited && gameNumber === progress.total
  const footer = (
    <>
      {prevStep
        ? <button className="co-sheet-randomize" onClick={() => setStep(prevStep)}>Back</button>
        : <button className="co-sheet-randomize" onClick={onClose}>Cancel</button>}
      {step === 'review'
        ? <button className="co-sheet-done eog-record-btn" disabled={!canAdvance} onClick={record}>{edit ? 'Save changes' : `Record game ${gameNumber}`}</button>
        : <button className="co-sheet-done eog-next-btn" disabled={!canAdvance} onClick={() => setStep(nextStep)}>{NEXT_LABEL[nextStep]}</button>}
    </>
  )

  if (edit && !editBase) {
    // No snapshot to re-enter from: only the simple outcome editor can change this game
    return (
      <BottomSheet title="EDIT GAME" onClose={onClose} zIndex={1200}
        footer={<button className="co-sheet-done" onClick={() => (onFallback ? onFallback() : onClose())}>Continue</button>}>
        <p className="eog-help">Only the result and the survivor point of this game can be changed.</p>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet title={edit ? `EDIT GAME ${gameNumber}` : `END OF GAME ${gameNumber}`} onClose={onClose} footer={footer}
      className="eog-sheet" zIndex={edit ? 1200 : undefined}>
      <Steps steps={steps} current={step} />

      {/* ── 1. RESULT ─────────────────────────────────────── */}
      {step === 'result' && (
        <>
          {beyondNote && <p className="eog-beyond" role="note">{beyondNote}</p>}
          {edit && <p className="eog-beyond" role="note">Change anything about game {gameNumber}, then save. IP moves to match.</p>}
          <p className="eog-lede" id="eog-result-q">How did it end?</p>
          <div className="eog-result-grid" role="radiogroup" aria-labelledby="eog-result-q">
            {RESULTS.map(r => (
              <button
                key={r.id}
                type="button"
                role="radio"
                aria-checked={result === r.id}
                className={`eog-result eog-result--${r.id}`}
                data-result={r.id}
                onClick={() => setResult(r.id)}
              >
                <span className="eog-result-name">{r.name}</span>
                <span className="eog-result-earn">{r.earn}</span>
                <span className="eog-result-ip" aria-hidden="true">{r.ip}</span>
              </button>
            ))}
          </div>
          <p className="eog-result-foot">Opponent retreated? That counts as a Victory.</p>
        </>
      )}

      {/* ── 2. THE FALLEN ─────────────────────────────────── */}
      {step === 'fallen' && (
        <>
          <p className="eog-lede">Who fell?</p>
          {prefill && <span className="eog-from-play"><span aria-hidden="true">●</span> Filled in from play mode</span>}
          {active.map(s => {
            const fell = fallen.has(s.index)
            return (
              <div key={s.index} className={`eog-fate-row${fell ? ' is-fell' : ''}`} data-slot={s.index}>
                <Identity s={s} star={s.isCaptain} meta={`${s.isCaptain ? 'Captain · ' : ''}${s.earnedIP || 0} IP`} />
                <span className="eog-fate" role="group" aria-label={nameOf(s)}>
                  <button type="button" className="is-standing" aria-pressed={!fell} onClick={() => toggleFate(s.index, false)}>Standing</button>
                  <button type="button" className="is-fell" aria-pressed={fell} onClick={() => toggleFate(s.index, true)}>Fell</button>
                </span>
              </div>
            )
          })}
          <p className="eog-perm">
            {survivors.length === 0
              ? 'The whole company fell. You will recruit new warriors and choose a Captain before the next game.'
              : `The fallen are lost for good and earn no IP. You will replace them with new warriors before game ${gameNumber + 1}.`}
          </p>
        </>
      )}

      {/* ── 3. NEW CAPTAIN ────────────────────────────────── */}
      {step === 'captain' && (
        <>
          <p className="eog-lede">Your Captain fell</p>
          <p className="eog-help">Choose a surviving warrior to lead the company. They keep their IP and gear.</p>
          <div role="radiogroup" aria-label="New Captain">
            {survivors.map(s => (
              <button key={s.index} type="button" role="radio" aria-checked={newCaptainIndex === s.index}
                className="eog-pick" data-slot={s.index} onClick={() => setNewCaptainIndex(s.index)}>
                <span className="eog-pick-radio" aria-hidden="true" />
                <Identity s={s} meta={`${s.earnedIP || 0} IP`} />
                {newCaptainIndex === s.index && <span className="eog-pick-gain" aria-hidden="true">★</span>}
              </button>
            ))}
          </div>
          {result === 'win' && <p className="eog-perm">A fallen Captain earns no IP, so there is no Captain's point this game.</p>}
        </>
      )}

      {/* ── 4. AWARD IP ───────────────────────────────────── */}
      {step === 'award' && (
        <>
          <div className="eog-award">
            <div className="eog-award-head"><span id="eog-survivor-q">Survivor's point</span><b>+{CAMPAIGN_RULES.survivorIP} IP</b></div>
            <p className="eog-help eog-help--tight">Give {CAMPAIGN_RULES.survivorIP} IP to one warrior who survived. The Captain can take it too.</p>
            <div role="radiogroup" aria-labelledby="eog-survivor-q">
              {survivors.map(s => {
                const full = room(s) <= 0 && anyRoom
                const isLeader = leader && s.index === leader.index
                const meta = full ? 'Nothing left to buy'
                  : `${isLeader ? (captainFell ? 'New Captain · ' : 'Captain · ') : ''}${s.earnedIP || 0} IP`
                return (
                  <button key={s.index} type="button" role="radio" aria-checked={survivorPick === s.index}
                    className="eog-pick" data-slot={s.index} disabled={full}
                    onClick={() => setSurvivorPick(s.index)}>
                    <span className="eog-pick-radio" aria-hidden="true" />
                    <Identity s={s} star={isLeader} meta={meta} />
                    {survivorPick === s.index && <span className="eog-pick-gain">+{CAMPAIGN_RULES.survivorIP}</span>}
                  </button>
                )
              })}
            </div>
          </div>

          {result === 'win' && (
            <div className="eog-award">
              <div className="eog-award-head"><span>Victory: Captain's point</span><b>{captainPoint ? `+${CAMPAIGN_RULES.winnerCaptainIP} IP` : 'None'}</b></div>
              {captainPoint ? (
                <>
                  <div className="eog-locked" data-slot={captain.index}>
                    <Identity s={captain} star meta="Your Captain" />
                    <span className="eog-pick-gain">+{CAMPAIGN_RULES.winnerCaptainIP}</span>
                  </div>
                  {captainCantSpend && <p className="eog-perm">{nameOf(captain)} has nothing left to buy. The point is still theirs by the rules.</p>}
                </>
              ) : (
                <p className="eog-help eog-help--tight">Your Captain fell, and the fallen earn no IP.</p>
              )}
            </div>
          )}

          <div className="eog-bonus">
            <button type="button" className="eog-bonus-toggle" aria-expanded={bonusOpen} onClick={() => setBonusOpen(v => !v)}>
              <span>Scenario bonus IP</span>
              <span className="eog-bonus-meta">{bonusTotal ? `+${bonusTotal}` : 'Optional'} <span aria-hidden="true">{bonusOpen ? '▴' : '▾'}</span></span>
            </button>
            {bonusOpen && (
              <div className="eog-bonus-body">
                <p className="eog-help eog-help--tight">Only if the scenario awards extra IP. Up to {CAMPAIGN_RULES.maxBonusIP} per game, to survivors.</p>
                {survivors.map(s => (
                  <div key={s.index} className="eog-bonus-row" data-slot={s.index}>
                    <span className="eog-name">{nameOf(s)}</span>
                    <span className="eog-stepper">
                      <button type="button" className="eog-stepper-btn" aria-label={`Less bonus IP for ${nameOf(s)}`} disabled={!bonusOf(s.index)} onClick={() => stepBonus(s.index, -1)}>−</button>
                      <span className="eog-stepper-val">{bonusOf(s.index)}</span>
                      <button type="button" className="eog-stepper-btn" aria-label={`More bonus IP for ${nameOf(s)}`} disabled={bonusTotal >= CAMPAIGN_RULES.maxBonusIP} onClick={() => stepBonus(s.index, 1)}>+</button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          {errors.filter(e => /survivor IP|bonus/i.test(e) && survivorPick != null).map(e => <p key={e} className="eog-error" role="alert">{e}</p>)}
        </>
      )}

      {/* ── 5. REVIEW ─────────────────────────────────────── */}
      {step === 'review' && (
        <>
          <p className="eog-lede">{RESULT_WORD[result]}. Game {gameNumber}{!progress.unlimited && gameNumber <= progress.total ? ` of ${progress.total}` : ''}</p>
          <div className="eog-ledger">
            {active.map(s => {
              const fell = fallen.has(s.index)
              const gain = gainOf(s.index)
              const rises = captainFell && s.index === newCaptainIndex
              const meta = fell
                ? `${s.isCaptain ? 'Captain · ' : ''}${s.earnedIP || 0} IP lost`
                : `${rises ? '★ New Captain · ' : s.isCaptain ? 'Captain · ' : ''}${s.earnedIP || 0} → ${(s.earnedIP || 0) + gain} IP`
              return (
                <div key={s.index} className={`eog-ledger-row${fell ? ' is-fell' : ''}`} data-slot={s.index}>
                  <Identity s={s} meta={meta} fell={fell} />
                  {fell
                    ? <span className="eog-ledger-note">Fell</span>
                    : <span className={`eog-ledger-delta${gain ? '' : ' is-zero'}`}>+{gain}</span>}
                </div>
              )
            })}
          </div>
          {!earns && <p className="eog-perm">You retreated: no IP this game. Your opponent takes all victory points.</p>}

          <label className="eog-field">
            <span className="eog-field-label">Scenario <span>(optional)</span></span>
            <input
              className="co-settings-input eog-scenario-input"
              type="text"
              maxLength={80}
              value={scenario}
              placeholder="Name of the scenario you played"
              autoComplete="off"
              onChange={e => setScenario(e.target.value)}
            />
          </label>

          <div className="eog-callout">
            {edit ? (
              <><strong>Saving replaces game {gameNumber}</strong><br />The company is set as if the game had been recorded like this.</>
            ) : isLast ? (
              <><strong>The last game</strong><br />Recording game {gameNumber} completes the campaign.</>
            ) : beyond ? (
              <><strong>An extra game</strong><br />Recording game {gameNumber} adds it to the campaign.</>
            ) : (
              <>
                <strong>Before your next game</strong><br />
                {fallen.size > 0 && <>Replace {fallen.size} fallen {fallen.size === 1 ? 'warrior' : 'warriors'} (new warriors start with 0 IP).<br /></>}
                {survivors.length === 0 && <>Choose a Captain when you recruit.<br /></>}
                {totalGain > 0 && <>Spend {totalGain} new IP. Upgrades are permanent.</>}
                {fallen.size === 0 && totalGain === 0 && <>Nothing to do. Your company is ready.</>}
              </>
            )}
          </div>
          {errors.map(e => <p key={e} className="eog-error" role="alert">{e}</p>)}
        </>
      )}
    </BottomSheet>
  )
}

