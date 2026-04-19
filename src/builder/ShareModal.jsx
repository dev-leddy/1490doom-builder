import { useRef, useState } from 'react'
import html2canvas from 'html2canvas'
import { useBuilderStore } from '../store/builderStore'
import BottomSheet from '../shared/BottomSheet'
import { generateDiscordExport } from '../utils/discordExport'
import DiscordImageRoster from './DiscordImageRoster'

export default function ShareModal() {
  const { shareCode, closeShare } = useBuilderStore()
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedDiscord, setCopiedDiscord] = useState(false)
  const [imageStatus, setImageStatus] = useState(null) // null | 'rendering' | 'done' | 'error'
  const linkRef = useRef(null)
  const discordRef = useRef(null)
  const imageRosterRef = useRef(null)

  if (!shareCode) return null

  const state = useBuilderStore.getState()
  const discordText = generateDiscordExport(state)

  function copyText(text, ref, setFlag) {
    function markCopied() { setFlag(true); setTimeout(() => setFlag(false), 2000) }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(markCopied).catch(() => fallback())
    } else {
      fallback()
    }
    function fallback() {
      const el = ref.current
      if (!el) return
      el.select()
      document.execCommand('copy')
      markCopied()
    }
  }

  async function handleCopyImage() {
    if (!imageRosterRef.current) return
    setImageStatus('rendering')
    try {
      const canvas = await html2canvas(imageRosterRef.current, {
        backgroundColor: '#1a1614',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
      })
      canvas.toBlob(async (blob) => {
        if (!blob) { setImageStatus('error'); return }
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
          setImageStatus('done')
          setTimeout(() => setImageStatus(null), 2500)
        } catch {
          // Clipboard write failed — fall back to download
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `${state.companyName || 'doom-company'}.png`
          a.click()
          URL.revokeObjectURL(url)
          setImageStatus('done')
          setTimeout(() => setImageStatus(null), 2500)
        }
      }, 'image/png')
    } catch (err) {
      console.error('[discord image]', err)
      setImageStatus('error')
      setTimeout(() => setImageStatus(null), 3000)
    }
  }

  function handleCopyLink() { copyText(shareCode, linkRef, setCopiedLink) }
  function handleCopyDiscord() { copyText(discordText, discordRef, setCopiedDiscord) }
  function handleFocus(e) { e.target.select() }

  const imageLabel =
    imageStatus === 'rendering' ? '⏳ Generating…' :
    imageStatus === 'done'      ? '✓ Copied!' :
    imageStatus === 'error'     ? '✗ Failed' :
    'Copy as Image'

  return (
    <>
      {/* Off-screen image roster — always rendered so ref is available */}
      <div style={{ position: 'fixed', left: '-9999px', top: 0, pointerEvents: 'none', zIndex: -1 }}>
        <DiscordImageRoster ref={imageRosterRef} state={state} />
      </div>

      <BottomSheet title="SHARE COMPANY" onClose={closeShare}>
        {/* ── Share Link ─────────────────────────────────── */}
        <div className="share-section">
          <div className="share-section-label">Share Link</div>
          <textarea
            ref={linkRef}
            className="share-code-box"
            readOnly
            value={shareCode}
            onFocus={handleFocus}
            onClick={handleFocus}
            rows={3}
          />
          <p className="share-modal-note">
            Anyone who opens this link will load your company automatically.
          </p>
          <button className="share-copy-btn" onClick={handleCopyLink}>
            {copiedLink ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* ── Discord Export ──────────────────────────────── */}
        <div className="share-section share-section--discord">
          <div className="share-section-label">
            <DiscordIcon />
            Post to Discord
          </div>

          {/* Image export */}
          <button
            className="share-copy-btn share-copy-btn--discord"
            onClick={handleCopyImage}
            disabled={imageStatus === 'rendering'}
          >
            {imageLabel}
          </button>
          <p className="share-modal-note">
            Copies a formatted image card to your clipboard — paste directly into Discord.
          </p>

          {/* Text export fallback */}
          <details className="share-discord-text-details">
            <summary className="share-discord-text-summary">Text version (fallback)</summary>
            <textarea
              ref={discordRef}
              className="share-code-box share-discord-box"
              readOnly
              value={discordText}
              onFocus={handleFocus}
              onClick={handleFocus}
              rows={6}
            />
            <button className="share-copy-btn share-copy-btn--discord" onClick={handleCopyDiscord}>
              {copiedDiscord ? '✓ Copied!' : 'Copy Text'}
            </button>
          </details>
        </div>
      </BottomSheet>
    </>
  )
}

function DiscordIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 127.14 96.36" fill="currentColor" aria-hidden="true" style={{ flexShrink: 0 }}>
      <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83 97.68 97.68 0 0 0-29.11 0A72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.71 56.6.54 80.21a105.73 105.73 0 0 0 32.17 16.15 77.7 77.7 0 0 0 6.89-11.11 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 64.32 0c.87.71 1.76 1.39 2.66 2a68.68 68.68 0 0 1-10.87 5.19 77 77 0 0 0 6.89 11.1 105.25 105.25 0 0 0 32.19-16.14c2.64-27.38-4.51-51.11-18.9-72.15zM42.45 65.69C36.18 65.69 31 60 31 53s5-12.74 11.43-12.74S54 46 53.89 53s-5.05 12.69-11.44 12.69zm42.24 0C78.41 65.69 73.25 60 73.25 53s5-12.74 11.44-12.74S96.23 46 96.12 53s-5.04 12.69-11.43 12.69z"/>
    </svg>
  )
}
