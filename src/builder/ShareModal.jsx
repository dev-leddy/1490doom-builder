import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'

export default function ShareModal() {
  const { shareCode, closeShare } = useBuilderStore()
  const [copied, setCopied] = useState(false)

  if (!shareCode) return null

  function handleCopy() {
    navigator.clipboard.writeText(shareCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeShare()}>
      <div className="modal-box share-modal">
        <div className="share-modal-title">Share Company</div>
        <textarea className="share-code-box" readOnly value={shareCode} />
        <div className="share-modal-note">
          Share this link — anyone who opens it will load your company automatically.
        </div>
        <div className="share-modal-actions">
          <button className="btn btn-primary" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
          <button className="btn btn-ghost" onClick={closeShare}>Close</button>
        </div>
      </div>
    </div>
  )
}
