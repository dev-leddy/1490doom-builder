import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'

export default function ImportModal() {
  const { importOpen, closeImport, doImport } = useBuilderStore()
  const [value, setValue] = useState('')

  if (!importOpen) return null

  function handleImport() {
    const ok = doImport(value)
    if (ok) setValue('')
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeImport()}>
      <div className="modal-box share-modal">
        <div className="share-modal-title">Import Company</div>
        <textarea
          className="share-code-box"
          placeholder="Paste a share link or code…"
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <div className="share-modal-note">
          Paste a share link or code from another player.
        </div>
        <div className="share-modal-actions">
          <button className="btn btn-primary" onClick={handleImport}>Import</button>
          <button className="btn btn-ghost" onClick={closeImport}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
