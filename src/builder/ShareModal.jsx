import { useRef, useState } from 'react'
import { useBuilderStore } from '../store/builderStore'

export default function ShareModal() {
  const { shareCode, closeShare } = useBuilderStore()
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef(null)

  if (!shareCode) return null

  function handleCopy() {
    const el = textareaRef.current
    if (!el) return
    // Try modern clipboard API first, fall back to select-and-copy
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareCode).then(() => {
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }).catch(() => {
        el.select()
        document.execCommand('copy')
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      })
    } else {
      el.select()
      document.execCommand('copy')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  function handleTextareaFocus(e) {
    e.target.select()
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && closeShare()}>
      <div className="modal-box share-modal">
        <div className="share-modal-title">Share Company</div>
        <textarea
          ref={textareaRef}
          className="share-code-box"
          readOnly
          value={shareCode}
          onFocus={handleTextareaFocus}
          onClick={handleTextareaFocus}
        />
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
