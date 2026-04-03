import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import BottomSheet from '../shared/BottomSheet'

export default function ImportModal() {
  const { importOpen, closeImport, doImport } = useBuilderStore()
  const [value, setValue] = useState('')

  if (!importOpen) return null

  function handleImport() {
    const ok = doImport(value)
    if (ok) setValue('')
  }

  return (
    <BottomSheet
      title="IMPORT COMPANY"
      onClose={closeImport}
      footer={
        <>
          <button className="co-sheet-randomize" onClick={closeImport}>Cancel</button>
          <button className="co-sheet-done" onClick={handleImport}>Import</button>
        </>
      }
    >
      <textarea
        className="share-code-box"
        placeholder="Paste company JSON or link here…"
        value={value}
        onChange={e => setValue(e.target.value)}
        autoFocus
      />
      <div className="share-modal-note">
        Paste a share link or code from another player.
      </div>
    </BottomSheet>
  )
}
