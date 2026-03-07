export default function ConfirmModal({ title, subtitle, onConfirm, onCancel }) {
  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onCancel()}>
      <div className="modal-box" style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1rem', letterSpacing: '0.1em', marginBottom: '0.4rem' }}>
          {title}
        </div>
        <div style={{ fontSize: '0.95rem', color: 'var(--text-dim)', marginBottom: '1.1rem', lineHeight: 1.5 }}>
          {subtitle}
        </div>
        <div style={{ display: 'flex', gap: '0.6rem' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, background: 'none', border: '1px solid #333', color: '#666',
              padding: '0.5rem', fontFamily: 'var(--font-display)', fontSize: '0.8rem',
              letterSpacing: '0.1em',
            }}
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, background: 'var(--gold-bg)', border: '1px solid var(--gold-border)',
              color: 'var(--gold)', padding: '0.5rem', fontFamily: 'var(--font-display)',
              fontSize: '0.8rem', letterSpacing: '0.1em',
            }}
          >
            CONFIRM
          </button>
        </div>
      </div>
    </div>
  )
}
