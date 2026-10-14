import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { campaignProgress, canUndoLastGame, minEarnedIP, nameWithClass } from '../store/campaign'
import BottomSheet from '../shared/BottomSheet'
import ConfirmModal from '../shared/ConfirmModal'
import { RESULT_NAME, resultTally, undoGameRules, campaignLogText } from './campaignUi'
import { IconUndo, IconPencil, IconList, IconDownload, IconCoin, IconEnd } from './icons'

// ── Campaign settings: the tools behind the gear in the campaign panel ────────
// Games (undo the latest, name them), Upgrades (undo the latest, fix IP by hand),
// Log (open, export) and Campaign (end early / reopen).

function Row({ icon, label, sub, danger, disabled, onClick, testId }) {
  return (
    <button type="button" className={`cmp-set-row${danger ? ' is-danger' : ''}`} data-testid={testId}
      onClick={disabled ? undefined : onClick} aria-disabled={disabled || undefined}>
      <span className="cmp-set-icon">{icon}</span>
      <span className="cmp-set-text">
        <span className="cmp-set-label">{label}</span>
        {sub && <span className="cmp-set-sub">{sub}</span>}
      </span>
      {!disabled && <span className="cmp-set-go" aria-hidden="true">›</span>}
    </button>
  )
}

function Group({ label, children }) {
  return (
    <section className="cmp-set-group">
      <h3 className="cmp-set-group-label">{label}</h3>
      <div className="cmp-set-list">{children}</div>
    </section>
  )
}

const slug = s => (s || 'company').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'company'

export default function CampaignSettingsSheet({ onClose, onOpenLog }) {
  const {
    slots, companyMode, campaignGame, campaign, companyName,
    undoLastCampaignGame, undoLastUpgrade, setEarnedIP, setGameScenario, endCampaignEarly, reopenCampaign, _toast: toast,
  } = useBuilderStore()
  const [view, setView] = useState('menu') // menu | names | ip | export
  const [confirm, setConfirm] = useState(null) // 'game' | 'upgrade' | 'end'
  const [names, setNames] = useState({})

  const company = { companyMode, slots, campaignGame, campaign }
  const { completed, total, isComplete, endedEarly } = campaignProgress(company)
  const log = campaign?.log || []
  const last = log.at(-1)
  const canUndoGame = canUndoLastGame(company)

  // The newest upgrade, if its warrior still has it as their latest purchase
  const lastEntry = (campaign?.upgrades || []).at(-1)
  const upSlotIndex = lastEntry ? slots.findIndex(s => s?.type && s.uid === lastEntry.uid) : -1
  const upSlot = upSlotIndex >= 0 ? slots[upSlotIndex] : null
  const canUndoUpgrade = !!upSlot && upSlot.ip?.at(-1) === lastEntry.id
  const upLabel = lastEntry?.label || lastEntry?.item || 'upgrade'

  const living = slots.map((s, index) => ({ ...s, index })).filter(s => s.type)
  const exportText = () => campaignLogText({ companyName, slots, campaign, completed, total })

  async function copyLog() {
    try {
      await navigator.clipboard.writeText(exportText())
      toast('Campaign log copied.')
    } catch {
      toast("Couldn't copy. Use Download instead.")
    }
  }
  function downloadLog() {
    const url = URL.createObjectURL(new Blob([exportText()], { type: 'text/plain;charset=utf-8' }))
    const a = Object.assign(document.createElement('a'), { href: url, download: `${slug(companyName)}-campaign-log.txt` })
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  function saveNames() {
    for (const r of log) {
      const v = names[r.gameNumber]
      if (v != null && v.trim() !== (r.scenario || '')) setGameScenario(r.gameNumber, v.trim())
    }
    setView('menu')
  }

  // Confirmations take the sheet's place; Cancel goes back to the menu
  if (confirm === 'game' && last) {
    return (
      <ConfirmModal
        title={`UNDO GAME ${last.gameNumber}?`}
        subtitle={`The company goes back to how it was before game ${last.gameNumber} was recorded.`}
        rules={undoGameRules(last)}
        confirmLabel={`Undo game ${last.gameNumber}`}
        onConfirm={() => { undoLastCampaignGame(); onClose() }}
        onCancel={() => setConfirm(null)}
      />
    )
  }
  if (confirm === 'upgrade' && canUndoUpgrade) {
    return (
      <ConfirmModal
        title={`UNDO ${upLabel.toUpperCase()}?`}
        subtitle={`Takes the ${upLabel} off ${nameWithClass(upSlot)} and gives back its 1 IP. Campaign upgrades are permanent, so only undo a mistake.`}
        confirmLabel="Undo upgrade"
        onConfirm={() => { undoLastUpgrade(upSlotIndex); setConfirm(null) }}
        onCancel={() => setConfirm(null)}
      />
    )
  }
  if (confirm === 'end') {
    const tally = resultTally(log)
    return (
      <ConfirmModal
        title="END THE CAMPAIGN?"
        subtitle={`It ends after game ${completed}${tally ? ` (${tally})` : ''}. No more games can be recorded. You can reopen it from Campaign settings.`}
        confirmLabel="End campaign"
        onConfirm={() => { if (endCampaignEarly()) onClose(); else setConfirm(null) }}
        onCancel={() => setConfirm(null)}
      />
    )
  }

  const back = <button type="button" className="co-sheet-randomize" onClick={() => setView('menu')}>Back</button>

  if (view === 'names') {
    return (
      <BottomSheet title="GAME NAMES" onClose={onClose} className="cmp-set-sheet"
        footer={<>{back}<button type="button" className="co-sheet-done" onClick={saveNames}>Save names</button></>}>
        <p className="eog-help">Name the scenario each game was played as. Leave blank for none.</p>
        <div className="cmp-set-names">
          {log.map(r => (
            <label key={r.id || r.gameNumber} className="eog-field">
              <span className="eog-field-label">Game {r.gameNumber} <span>· {RESULT_NAME[r.result]}</span></span>
              <input className="co-settings-input eog-scenario-input" type="text" maxLength={80} autoComplete="off"
                placeholder="Name of the scenario"
                value={names[r.gameNumber] ?? r.scenario ?? ''}
                onChange={e => setNames(n => ({ ...n, [r.gameNumber]: e.target.value }))} />
            </label>
          ))}
        </div>
      </BottomSheet>
    )
  }

  if (view === 'ip') {
    return (
      <BottomSheet title="ADJUST IP" onClose={onClose} className="cmp-set-sheet" footer={back}>
        <div className="cs-form">
          <p className="eog-help eog-help--tight">For fixing a game that was scored wrong. A warrior can't go below the IP they've already spent.</p>
          <div className="cs-warrior-list">
            {living.map(s => {
              const earned = s.earnedIP || 0
              const spent = s.ip?.length || 0
              const label = nameWithClass(s)
              return (
                <div key={s.uid || s.index} className="co-settings-warrior-row">
                  <div className="co-settings-warrior-info">
                    <span className="co-settings-warrior-name">{label}{s.isCaptain ? ' · Captain' : ''}</span>
                    <span className="co-settings-warrior-class">{spent} spent</span>
                  </div>
                  <div className="co-settings-stepper">
                    <button type="button" className="co-settings-step-btn" onClick={() => setEarnedIP(s.index, earned - 1)}
                      disabled={earned <= minEarnedIP(s)} aria-label={`Less IP for ${label}`}>−</button>
                    <span className="co-settings-step-val" aria-live="polite">{earned}</span>
                    <button type="button" className="co-settings-step-btn" onClick={() => setEarnedIP(s.index, earned + 1)}
                      aria-label={`More IP for ${label}`}>+</button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </BottomSheet>
    )
  }

  if (view === 'export') {
    return (
      <BottomSheet title="EXPORT LOG" onClose={onClose} className="cmp-set-sheet"
        footer={<>{back}<button type="button" className="co-sheet-randomize" onClick={copyLog}>Copy text</button>
          <button type="button" className="co-sheet-done" onClick={downloadLog}>Download .txt</button></>}>
        <p className="eog-help eog-help--tight">The roster, every game and every upgrade, as plain text.</p>
        <pre className="cmp-set-export" tabIndex={0} aria-label="Campaign log text">{exportText()}</pre>
      </BottomSheet>
    )
  }

  const gameSub = canUndoGame
    ? `${last.scenario ? `${last.scenario}, ` : ''}${RESULT_NAME[last.result]}. Takes back its IP and anything bought since.`
    : log.length ? 'Only the latest game can be undone.' : 'No games recorded yet.'
  const namesSub = log.length
    ? log.map(r => `Game ${r.gameNumber} ${r.scenario || '(no name)'}`).join(', ')
    : 'No games recorded yet.'
  const upSub = canUndoUpgrade
    ? `${nameWithClass(upSlot)}: ${upLabel}. 1 IP goes back to them.`
    : 'No upgrade to undo.'

  return (
    <BottomSheet title="CAMPAIGN" onClose={onClose} className="cmp-set-sheet"
      footer={<button type="button" className="co-sheet-done" onClick={onClose}>Done</button>}>
      <Group label="Games">
        <Row icon={<IconUndo />} label={last ? `Undo game ${last.gameNumber}` : 'Undo game'} sub={gameSub}
          danger disabled={!canUndoGame} onClick={() => setConfirm('game')} testId="cmp-set-undo-game" />
        <Row icon={<IconPencil />} label="Edit game names" sub={namesSub}
          disabled={!log.length} onClick={() => { setNames({}); setView('names') }} />
      </Group>
      <Group label="Upgrades">
        <Row icon={<IconUndo />} label="Undo last upgrade" sub={upSub}
          disabled={!canUndoUpgrade} onClick={() => setConfirm('upgrade')} />
        <Row icon={<IconCoin />} label="Adjust IP by hand" sub="Fix a warrior's IP if a game was scored wrong."
          disabled={!living.length} onClick={() => setView('ip')} />
      </Group>
      <Group label="Log">
        <Row icon={<IconList />} label="Campaign log" sub="Every change, with times" onClick={onOpenLog} />
        <Row icon={<IconDownload />} label="Export log" sub="Copy as text or download a file" onClick={() => setView('export')} />
      </Group>
      <Group label="Campaign">
        {endedEarly ? (
          <Row icon={<IconEnd />} label="Reopen campaign" sub={`Ended early after game ${completed}. Carry on with game ${completed + 1}.`}
            onClick={() => { if (reopenCampaign()) onClose() }} />
        ) : (
          <Row icon={<IconEnd />} label="End campaign early"
            sub={isComplete ? `All ${total} games are played.`
              : completed === 0 ? 'Play at least one game first.'
                : `Marks it complete after game ${completed}. You can reopen it.`}
            danger disabled={isComplete || completed === 0} onClick={() => setConfirm('end')} />
        )}
      </Group>
    </BottomSheet>
  )
}
