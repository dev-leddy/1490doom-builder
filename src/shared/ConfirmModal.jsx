import BottomSheet from './BottomSheet'

// className: optional theme for the sheet (play mode passes "tk-sheet tk-sheet--confirm")
// rules: optional [{ label, text, limit }] shown as labelled rows under the subtitle (what will change)
// note: optional small line under the rules; confirmLabel: the confirm button's text
// zIndex: to show above something already on top (the full-screen campaign log)
export default function ConfirmModal({ title, subtitle, rules, note, confirmLabel = 'CONFIRM', onConfirm, onCancel, className, zIndex }) {
  return (
    <BottomSheet
      title={title}
      onClose={onCancel}
      className={className}
      zIndex={zIndex}
      footer={
        <>
          <button className="co-sheet-randomize" onClick={onCancel}>CANCEL</button>
          <button className="co-sheet-done" onClick={onConfirm}>{confirmLabel}</button>
        </>
      }
    >
      {subtitle && <p className="confirm-modal-text" style={className ? undefined : { color: '#fff', lineHeight: 1.6, margin: 0, fontSize: '1rem' }}>{subtitle}</p>}
      {rules?.length > 0 && (
        <dl className="tk-rule-list tk-confirm-rules">
          {rules.map(r => (
            <div key={r.label} className={`tk-rule-row${r.limit ? ' tk-rule-row--limit' : ''}`}>
              <dt className="tk-rule-lbl">{r.label}</dt>
              <dd className="tk-rule-text">{r.text}</dd>
            </div>
          ))}
        </dl>
      )}
      {note && <span className="tk-confirm-when">{note}</span>}
    </BottomSheet>
  )
}
