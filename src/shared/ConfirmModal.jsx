export default function ConfirmModal({ title, subtitle, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal-box" style={{ textAlign: 'center' }}>
        <div className="modal-title">{title}</div>
        <div style={{ fontSize: '1.05rem', color: 'var(--text-dim)', marginBottom: '2.5rem', lineHeight: 1.5 }}>
          {subtitle}
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            className="btn btn-ghost"
            onClick={onCancel}
            style={{ flex: 1, padding: '0.75rem' }}
          >
            CANCEL
          </button>
          <button
            className="modal-primary-btn"
            onClick={onConfirm}
            style={{ flex: 1 }}
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  )
}
