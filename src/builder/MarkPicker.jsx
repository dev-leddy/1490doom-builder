import { MARKS } from '../data/warriors'
import { MARK_IMAGES } from '../data/images'

export default function MarkPicker({ value, onChange, onApply }) {
  const selectedMark = MARKS.find(m => m.name === value)

  return (
    <div className="mark-picker">
      <div className="mark-picker-grid">
        <button
          key="none"
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

      <div className="mark-picker-footer">
        <div className="mark-picker-description">
          {selectedMark ? (
            <>
              <div className="mark-desc-title">{selectedMark.label}</div>
              <div className="mark-desc-text">
                {selectedMark.desc.split(/(?<=[.!?])\s+/).filter(s => s.trim()).map((sentence, idx) => (
                  <div key={idx} style={{ marginBottom: '0.4rem' }}>{sentence}</div>
                ))}
              </div>
            </>
          ) : (
            <div className="mark-desc-placeholder">Select a Company Mark to view its unique battlefield ability.</div>
          )}
        </div>
        {onApply && (
          <button className="mark-picker-apply-btn" onClick={onApply}>
            Apply Mark
          </button>
        )}
      </div>
    </div>
  )
}
