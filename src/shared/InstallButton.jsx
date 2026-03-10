import { useState } from 'react'
import useInstallPrompt from './useInstallPrompt'

export default function InstallButton() {
  const { canInstall, isIOS, install } = useInstallPrompt()
  const [showGuide, setShowGuide] = useState(false)

  if (!canInstall) return null

  const handleClick = async () => {
    if (!isIOS) { install(); return }
    // Try Web Share API first — opens the native share sheet directly
    if (navigator.share) {
      try {
        await navigator.share({ title: '1490 DOOM Builder', url: window.location.href })
      } catch (e) {
        // AbortError = user dismissed, no need to show fallback
        if (e.name !== 'AbortError') setShowGuide(true)
      }
    } else {
      // Older iOS without Web Share — show manual guide
      setShowGuide(true)
    }
  }

  return (
    <>
      <button className="install-btn" onClick={handleClick}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="13" height="13" aria-hidden="true">
          <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-5-4l-4-4h2.5V8h3v3H16z"/>
        </svg>
        Add to Home Screen
      </button>

      {showGuide && (
        <div className="install-overlay" onClick={() => setShowGuide(false)}>
          <div className="install-guide" onClick={e => e.stopPropagation()}>
            <div className="install-guide-header">Install 1490 DOOM</div>
            <ol className="install-guide-steps">
              <li>
                Tap the <strong>Share</strong> button{' '}
                <span className="install-share-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                    <path d="M16 5l-1.42 1.42-1.59-1.59V16h-1.98V4.83L9.42 6.42 8 5l4-4 4 4zm4 5v11c0 1.1-.9 2-2 2H6c-1.11 0-2-.9-2-2V10c0-1.11.89-2 2-2h3v2H6v11h12V10h-3V8h3c1.1 0 2 .89 2 2z"/>
                  </svg>
                </span>{' '}
                at the bottom of Safari
              </li>
              <li>Scroll down and tap <strong>"Add to Home Screen"</strong></li>
              <li>Tap <strong>Add</strong> to confirm</li>
            </ol>
            <button className="install-guide-close" onClick={() => setShowGuide(false)}>
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  )
}
