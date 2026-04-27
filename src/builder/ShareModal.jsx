import { useRef, useState, useEffect } from 'react'
import html2canvas from 'html2canvas'
import { useBuilderStore } from '../store/builderStore'
import BottomSheet from '../shared/BottomSheet'
import { generateDiscordExport } from '../utils/discordExport'
import DiscordImageRoster from './DiscordImageRoster'
import { createShortLink } from '../api/companies'

export default function ShareModal() {
  const { shareCode, closeShare } = useBuilderStore()
  const [shortUrl, setShortUrl]   = useState(null)
  const [shortLoading, setShortLoading] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
const [imageStatus, setImageStatus] = useState(null) // null | 'rendering' | 'done' | 'error'
  const [imageDataUrl, setImageDataUrl] = useState(null)
  const shortRef = useRef(null)
  const imageRosterRef = useRef(null)

  // Extract just the encoded hash from the full shareCode URL
  const encoded = (() => {
    try { return new URL(shareCode ?? '').hash.slice(1) } catch { return shareCode ?? '' }
  })()

  // Generate short link whenever shareCode opens
  useEffect(() => {
    if (!encoded) return
    setShortUrl(null)
    setShortLoading(true)
    createShortLink(encoded)
      .then(({ url }) => setShortUrl(url))
      .catch(() => setShortUrl(null))
      .finally(() => setShortLoading(false))
  }, [encoded])

  if (!shareCode) return null

  const state = useBuilderStore.getState()

  const displayUrl = shortUrl ?? (shortLoading ? '…generating…' : shareCode)

  function copyText(text, ref, setFlag) {
    function markCopied() { setFlag(true); setTimeout(() => setFlag(false), 2000) }
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(markCopied).catch(fallback)
    } else {
      fallback()
    }
    function fallback() {
      const el = ref?.current
      if (!el) return
      el.select()
      document.execCommand('copy')
      markCopied()
    }
  }

  async function handleCopyImage() {
    if (!imageRosterRef.current) return
    setImageStatus('rendering')

    await document.fonts.ready

    const canvas = await html2canvas(imageRosterRef.current, {
      backgroundColor: '#080808',
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      removeContainer: true,
      onclone: (_doc, el) => {
        const wrapper = el.parentElement
        if (wrapper) {
          wrapper.style.opacity = '1'
          wrapper.style.position = 'static'
          wrapper.style.top = 'auto'
          wrapper.style.left = 'auto'
        }
      },
    })

    setImageDataUrl(canvas.toDataURL('image/png'))

    const linkText = `<${shortUrl ?? shareCode}>`
    const linkBlob = new Blob([linkText], { type: 'text/plain' })
    const blobPromise = new Promise((resolve, reject) => {
      canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('toBlob failed')), 'image/png')
    })

    try {
      await navigator.clipboard.write([
        new ClipboardItem({ 'image/png': blobPromise, 'text/plain': linkBlob }),
      ])
      setImageStatus('done')
      setTimeout(() => setImageStatus(null), 2500)
    } catch (err) {
      console.warn('[discord image] clipboard.write failed, downloading instead:', err)
      try {
        const blob = await blobPromise
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${state.companyName || 'doom-company'}.png`
        a.click()
        URL.revokeObjectURL(url)
        setImageStatus('done')
      } catch (err2) {
        console.error('[discord image]', err2)
        setImageStatus('error')
      }
      setTimeout(() => setImageStatus(null), 2500)
    }
  }

  function handleCopyLink() { copyText(displayUrl, shortRef, setCopiedLink) }
  function handleFocus(e) { e.target.select() }

const imageLabel =
    imageStatus === 'rendering' ? '⏳ Generating…' :
    imageStatus === 'done'      ? '✓ Copied!' :
    imageStatus === 'error'     ? '✗ Failed' :
    'Copy as Image'

  return (
    <>
      {/* Off-screen image roster for html2canvas capture */}
      <div style={{ position: 'absolute', top: '-99999px', left: 0, pointerEvents: 'none', opacity: 0 }}>
        <DiscordImageRoster ref={imageRosterRef} state={state} />
      </div>

      <BottomSheet title="SHARE COMPANY" onClose={closeShare}>
        {/* ── Share Link ─────────────────────────────────── */}
        <div className="share-section">
          <div className="share-section-label">Share Link</div>
          <textarea
            ref={shortRef}
            className="share-code-box"
            readOnly
            value={displayUrl}
            onFocus={handleFocus}
            onClick={handleFocus}
            rows={2}
          />
          <p className="share-modal-note">
            Anyone who opens this link will load your company automatically.
          </p>
          <button className="share-copy-btn" onClick={handleCopyLink} disabled={shortLoading}>
            {copiedLink ? '✓ Copied!' : 'Copy Link'}
          </button>
        </div>

        {/* ── Discord Export ──────────────────────────────── */}
        <div className="share-section share-section--discord">
          <div className="share-section-label">
            <DiscordIcon />
            Post to Discord
          </div>

          <button
            className="share-copy-btn share-copy-btn--discord"
            onClick={handleCopyImage}
            disabled={imageStatus === 'rendering'}
          >
            {imageLabel}
          </button>
          <p className="share-modal-note">
            Copies a formatted image card to your clipboard.
          </p>

          {imageDataUrl && (
            <div className="share-image-inline">
              <img src={imageDataUrl} alt="Company roster" />
            </div>
          )}
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
