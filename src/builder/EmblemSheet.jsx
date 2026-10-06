import BottomSheet from '../shared/BottomSheet'
import AvatarPicker from './AvatarPicker'

// The company emblem picker: a sheet of its own (so it is never trapped inside the
// sheet that opened it). Tapping an emblem applies it straight away.
export default function EmblemSheet({ value, onChange, onClose, zIndex = 1002 }) {
  return (
    <BottomSheet
      title="Company Emblem"
      onClose={onClose}
      zIndex={zIndex}
      className="emblem-sheet"
      footer={<button className="co-sheet-randomize emblem-sheet-cancel" onClick={onClose}>Cancel</button>}
    >
      <p className="cs-intro">Tap an emblem to use it, or upload your own image.</p>
      <AvatarPicker value={value} onChange={onChange} />
    </BottomSheet>
  )
}
