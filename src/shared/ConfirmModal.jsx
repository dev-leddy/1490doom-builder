import BottomSheet from './BottomSheet'

// className: optional theme for the sheet (play mode passes "tk-sheet tk-sheet--confirm")
export default function ConfirmModal({ title, subtitle, onConfirm, onCancel, className }) {
  return (
    <BottomSheet
      title={title}
      onClose={onCancel}
      className={className}
      footer={
        <>
          <button className="co-sheet-randomize" onClick={onCancel}>CANCEL</button>
          <button className="co-sheet-done" onClick={onConfirm}>CONFIRM</button>
        </>
      }
    >
      <p className="confirm-modal-text" style={className ? undefined : { color: '#fff', lineHeight: 1.6, margin: 0, fontSize: '1rem' }}>{subtitle}</p>
    </BottomSheet>
  )
}
