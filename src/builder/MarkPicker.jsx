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
