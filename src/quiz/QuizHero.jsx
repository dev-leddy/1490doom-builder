export default function QuizHero({ onStart, audioState, onAudioToggle }) {
  return (
    <>
      {/* Audio widget */}
      <AudioWidget audioState={audioState} onToggle={onAudioToggle} />

      <section className="qz-section active">
        <div className="qz-hero-content">
          <img
            src="/quiz/Art/Logos/DOOMlogoOrange.png"
            alt="1490 Doom"
            className="qz-hero-logo"
          />
          <p className="qz-hero-tagline">
            The world is dying. The Creeping Death consumes all life.
          </p>
          <div className="qz-divider"><span>✦</span></div>
          <p className="qz-hero-description">
            The only escape is to climb. To fight. To scavenge what remains.
            Which Doom Company will you lead into the fog?
          </p>
          <div className="qz-hero-cta">
            <button className="qz-btn-primary" onClick={onStart}>
              Discover Your Doom Company
            </button>
          </div>
        </div>
      </section>
    </>
  )
}

export function AudioWidget({ audioState, onToggle }) {
  if (audioState === 'hidden') return null
  // Button is invisible while audio is still loading (matches original setMainState('loading') → display:none)
  return (
    <div className="qz-audio-widget">
      <button
        className="qz-audio-main-btn"
        aria-label={audioState === 'playing' ? 'Pause music' : 'Play music'}
        onClick={onToggle}
        style={audioState === 'loading' ? { display: 'none' } : undefined}
      >
        {audioState === 'paused' && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M8 5v14l11-7z"/>
          </svg>
        )}
        {audioState === 'playing' && (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
            <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
          </svg>
        )}
      </button>
    </div>
  )
}
