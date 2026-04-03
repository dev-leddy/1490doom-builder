import { useState } from 'react'
import BottomSheet from './BottomSheet'

// ← Replace with your actual Discord invite link
const DISCORD_URL = 'https://discord.gg/hqTdqGBJyg'

const SEEN_KEY = '1490_beta_ack_v1'

export default function BetaBanner() {
  const [dismissed, setDismissed] = useState(() => !!localStorage.getItem(SEEN_KEY))

  if (dismissed) return null

  function handleDismiss() {
    localStorage.setItem(SEEN_KEY, '1')
    setDismissed(true)
  }

  return (
    <BottomSheet
      title="PUBLIC BETA"
      onClose={handleDismiss}
      zIndex={1200}
      footer={
        <button className="co-sheet-done" style={{ flex: 1 }} onClick={handleDismiss}>
          GOT IT — LET'S PLAY
        </button>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'rgba(190,65,39,0.12)',
          border: '1px solid rgba(190,65,39,0.35)',
          padding: '0.3rem 0.75rem',
          fontSize: '0.65rem',
          letterSpacing: '0.22em',
          fontFamily: "'Oswald', sans-serif",
          textTransform: 'uppercase',
          color: 'var(--blood)',
          alignSelf: 'flex-start',
        }}>
          ⚔ EARLY ACCESS
        </div>

        {/* Main copy */}
        <p style={{ color: 'var(--parchment)', lineHeight: 1.65, margin: 0, fontSize: '0.95rem' }}>
          Welcome, and thanks for being among the first to try the official 1490 DOOM Company Builder! We're actively
          developing and polishing, you may run into rough edges, and that's perfectly expected.
        </p>

        <p style={{ color: 'var(--parchment)', lineHeight: 1.65, margin: 0, fontSize: '1rem' }}>
          If anything seems off or breaks entirely, please let us know!
        </p>

        {/* Discord CTA */}
        <a
          href={DISCORD_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            background: '#5865f2',
            color: '#fff',
            padding: '0.65rem 1rem',
            textDecoration: 'none',
            fontFamily: "'Oswald', sans-serif",
            fontSize: '0.85rem',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            borderRadius: '2px',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#4752c4'}
          onMouseLeave={e => e.currentTarget.style.background = '#5865f2'}
        >
          <svg width="20" height="15" viewBox="0 0 59 44" fill="currentColor" aria-hidden="true">
            <path d="M37.1937 0C36.6265 1.0071 36.1172 2.04893 35.6541 3.11392C31.2553 2.45409 26.7754 2.45409 22.365 3.11392C21.9136 2.04893 21.3926 1.0071 20.8254 0C16.6928 0.70613 12.6644 1.94475 8.84436 3.69271C1.27372 14.9098 -0.775214 25.8374 0.243466 36.6146C4.67704 39.8906 9.6431 42.391 14.9333 43.9884C16.1256 42.391 17.179 40.6893 18.0819 38.9182C16.3687 38.2815 14.7133 37.4828 13.1274 36.5567C13.5442 36.2557 13.9493 35.9432 14.3429 35.6422C23.6384 40.0179 34.4039 40.0179 43.711 35.6422C44.1046 35.9663 44.5097 36.2789 44.9264 36.5567C43.3405 37.4943 41.6852 38.2815 39.9604 38.9298C40.8633 40.7009 41.9167 42.4025 43.109 44C48.3992 42.4025 53.3653 39.9137 57.7988 36.6377C59.0027 24.1358 55.7383 13.3007 49.1748 3.70429C45.3663 1.95633 41.3379 0.717706 37.2053 0.0231518L37.1937 0ZM19.3784 29.9816C16.5192 29.9816 14.1461 27.3886 14.1461 24.1821C14.1461 20.9755 16.4266 18.371 19.3669 18.371C22.3071 18.371 24.6455 20.9871 24.5992 24.1821C24.5529 27.377 22.2956 29.9816 19.3784 29.9816ZM38.6639 29.9816C35.7931 29.9816 33.4431 27.3886 33.4431 24.1821C33.4431 20.9755 35.7236 18.371 38.6639 18.371C41.6042 18.371 43.9309 20.9871 43.8846 24.1821C43.8383 27.377 41.581 29.9816 38.6639 29.9816Z" />
          </svg>
          Report issues on Discord
        </a>

      </div>
    </BottomSheet>
  )
}
