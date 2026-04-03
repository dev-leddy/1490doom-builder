import BottomSheet from './BottomSheet'

export default function ConfirmModal({ title, subtitle, onConfirm, onCancel }) {
  return (
    <BottomSheet
      title={title}
      onClose={onCancel}
      footer={
        <>
          <button className="co-sheet-randomize" onClick={onCancel}>CANCEL</button>
          <button className="co-sheet-done" onClick={onConfirm}>CONFIRM</button>
        </>
      }
    >
      <p style={{ color: '#fff', lineHeight: 1.6, margin: 0, fontSize: '1rem' }}>{subtitle}</p>
    </BottomSheet>
  )
}
