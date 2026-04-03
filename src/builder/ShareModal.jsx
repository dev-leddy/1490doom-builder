import { useRef, useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import BottomSheet from '../shared/BottomSheet'

export default function ShareModal() {
  const { shareCode, closeShare } = useBuilderStore()
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef(null)

  if (!shareCode) return null

  function handleCopy() {
    const el = textareaRef.current
    if (!el) return
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

  function handleTextareaFocus(e) { e.target.select() }

  return (
    <BottomSheet
      title="SHARE COMPANY"
      onClose={closeShare}
      footer={
        <>
          <button className="co-sheet-randomize" onClick={closeShare}>Close</button>
          <button className="co-sheet-done" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </>
      }
    >
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
    </BottomSheet>
  )
}
