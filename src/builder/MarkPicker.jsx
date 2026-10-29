import { MARKS } from '../data/warriors'
import { MARK_IMAGES } from '../data/images'

export default function MarkPicker({ value, onChange }) {
  return (
    <div className="mark-picker-grid">
      <button
        className={`mark-option-btn mark-option-btn--text${!value ? ' selected' : ''}`}
        onClick={() => onChange('')}
      >
        <div className="mark-option-icon mark-option-icon--none">×</div>
        <div className="mark-option-label">No Mark</div>
      </button>
      {MARKS.map(m => (
        <button
          key={m.name}
          className={`mark-option-btn${value === m.name ? ' selected' : ''}`}
          onClick={() => onChange(m.name)}
        >
          <div className="mark-option-icon">
            {MARK_IMAGES[m.name]
              ? <img src={MARK_IMAGES[m.name]} alt="" />
              : <span style={{ opacity: 0.3, fontSize: '0.8rem' }}>?</span>
            }
          </div>
          <div className="mark-option-label">{m.label}</div>
        </button>
      ))}
    </div>
  )
}

// The chosen mark's ability, pinned above Cancel / Done. Every mark's text shares one cell
// (only the chosen one visible), so the sheet keeps the longest one's height and never
// resizes while choosing.
export function MarkDescription({ value }) {
  const chosen = MARKS.some(m => m.name === value) ? value : ''
  return (
    <div className="mark-sheet-desc">
      <div className="mark-sheet-stack">
        <div className={`mark-sheet-stack-item${chosen ? '' : ' is-shown'}`} aria-hidden={!!chosen}>
          <div className="mark-sheet-desc-placeholder">Select a mark to see its battlefield ability.</div>
        </div>
        {MARKS.map(m => (
          <div key={m.name} className={`mark-sheet-stack-item${chosen === m.name ? ' is-shown' : ''}`} aria-hidden={chosen !== m.name}>
            <div className="mark-sheet-desc-name">{m.label}</div>
            <div className="mark-sheet-desc-text">{m.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
