import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { campaignProgress, canUndoLastGame, minEarnedIP, nameWithClass } from '../store/campaign'
import BottomSheet from '../shared/BottomSheet'
import ConfirmModal from '../shared/ConfirmModal'
import { RESULT_NAME, resultTally, undoGameRules } from './campaignUi'
import { IconUndo, IconCoin, IconEnd } from './icons'

// ── Campaign settings: the tools behind the gear in the campaign panel ────────
// Undo the latest game, fix IP by hand, end the campaign early (or reopen it).
// The log, its export and renaming games live in the full-screen campaign log; undoing an
// upgrade lives in the warrior's own settings.

// One row: icon and label; a short grey reason only when it can't be used
function Row({ icon, label, reason, danger, onClick, testId }) {
  return (
    <button type="button" className={`cmp-set-row${danger ? ' is-danger' : ''}`} data-testid={testId}
      onClick={reason ? undefined : onClick} aria-disabled={reason ? true : undefined}>
      <span className="cmp-set-icon">{icon}</span>
      <span className="cmp-set-text">
        <span className="cmp-set-label">{label}</span>
        {reason && <span className="cmp-set-reason">{reason}</span>}
      </span>
      {!reason && <span className="cmp-set-go" aria-hidden="true">›</span>}
    </button>
  )
}

export default function CampaignSettingsSheet({ onClose }) {
  const {
    slots, companyMode, campaignGame, campaign,
    undoLastCampaignGame, setEarnedIP, endCampaignEarly, reopenCampaign,
  } = useBuilderStore()
  const [view, setView] = useState('menu') // menu | ip
  const [confirm, setConfirm] = useState(null) // 'game' | 'end'

  const company = { companyMode, slots, campaignGame, campaign }
  const { completed, total, isComplete, endedEarly } = campaignProgress(company)
  const log = campaign?.log || []
  const last = log.at(-1)
  const canUndoGame = canUndoLastGame(company)
  const living = slots.map((s, index) => ({ ...s, index })).filter(s => s.type)

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

  if (view === 'ip') {
    return (
      <BottomSheet title="FIX IP" onClose={onClose} className="cmp-set-sheet" footer={back}>
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

  const noGames = 'No games recorded yet.'
  return (
    <BottomSheet title="CAMPAIGN" onClose={onClose} className="cmp-set-sheet"
      footer={<button type="button" className="co-sheet-done" onClick={onClose}>Done</button>}>
      <div className="cmp-set-list">
        <Row icon={<IconUndo />} label={last ? `Undo game ${last.gameNumber}` : 'Undo game'} danger testId="cmp-set-undo-game"
          reason={canUndoGame ? null : log.length ? 'Only the latest game can be undone.' : noGames}
          onClick={() => setConfirm('game')} />
        <Row icon={<IconCoin />} label="Fix IP" reason={living.length ? null : 'No warriors yet.'} onClick={() => setView('ip')} />
        {endedEarly ? (
          <Row icon={<IconEnd />} label="Reopen campaign" onClick={() => { if (reopenCampaign()) onClose() }} />
        ) : (
          <Row icon={<IconEnd />} label="End campaign early" danger
            reason={isComplete ? `All ${total} games are played.` : completed === 0 ? 'Play at least one game first.' : null}
            onClick={() => setConfirm('end')} />
        )}
      </div>
    </BottomSheet>
  )
}
