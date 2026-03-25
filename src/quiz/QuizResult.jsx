import { useState } from 'react'

// onComplete: present in embedded mode (builder), null in standalone mode
export default function QuizResult({ winner, onComplete, onRestart, audioState, onAudioToggle, onLightboxToggle }) {
  const [selectedWarrior, setSelectedWarrior] = useState(null)

  if (!winner) return null

  // Parse warrior minis from winner data
  const warriorEntries = winner.warriors.split(' · ')
  const warriors = winner.minis.map((src, i) => {
    const raw = warriorEntries[i] || ''
    const match = raw.match(/^(.+?)\s*\((.+)\)$/)
    return {
      src,
      name: match ? match[1] : raw,
      desc: match ? match[2] : '',
    }
  })

  function handleImport() {
    const payload = {
      companyId:   winner.id,
      storeUrl:    winner.url,
      companyName: winner.name,
      warriors:    winner.warriors,
    }
    if (onComplete) {
      // Embedded mode — signal builder directly
      onComplete(payload)
    } else {
      // Standalone mode — navigate to builder with quiz data
      const encoded = encodeURIComponent(JSON.stringify(payload))
      window.location.href = `/?quiz=${encoded}`
    }
  }

  function handleWarriorClick(w) {
    setSelectedWarrior(w)
    if (onLightboxToggle) onLightboxToggle(true)
  }

  function closeLightbox() {
    setSelectedWarrior(null)
    if (onLightboxToggle) onLightboxToggle(false)
  }

  return (
    <>
      {/* Audio widget stays accessible on result page */}
      {audioState !== 'hidden' && (
        <div className="qz-audio-widget" style={{ zIndex: 30 }}>
          <button
            className="qz-audio-main-btn"
            aria-label={audioState === 'playing' ? 'Pause music' : 'Play music'}
            onClick={onAudioToggle}
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
      )}

      <section className="qz-section section-result active">
        <div className="qz-result-scroll-inner">
          <div className="qz-result-wrapper">

            {/* Rep + company name + tagline */}
            <div className="qz-result-hero-row">
              <p className="qz-result-eyebrow">Your Doom Company Is</p>
              <img
                className="qz-mark-logo-inline"
                src={winner.rep}
                alt={winner.name}
              />
              <h2 className="qz-result-name">{winner.name}</h2>
              <p className="qz-result-tagline">{winner.tagline}</p>
            </div>

            {/* Cards area */}
            <div className="qz-result-cards-area">

              {/* Special Ability hero block */}
              <div className="qz-result-ability-hero">
                <p className="qz-mark-name-hero">{winner.markName}</p>
                <p className="qz-mark-description-hero">{winner.markDescription}</p>
              </div>

              {/* Warriors */}
              <div className="qz-result-main-row">
                <div className="qz-result-warriors-section">
                  <div className="qz-warrior-list">
                    {warriors.map((w, i) => (
                      <div key={i} className="qz-warrior-card">
                        <div
                          className="qz-warrior-mini-card zoomable"
                          onClick={() => handleWarriorClick(w)}
                        >
                          <img src={w.src} alt={w.name} />
                        </div>
                        <div className="qz-warrior-card-text">
                          <span className="qz-warrior-row-title">{w.name}</span>
                          <span className="qz-warrior-row-desc">{w.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Strategy + Victory Path */}
              <div className="qz-result-bottom-row">
                <div className="qz-result-bottom-card">
                  <div className="qz-result-bottom-col">
                    <span className="qz-result-bottom-label">Strategy</span>
                    <span className="qz-playstyle-value">{winner.strategy}</span>
                  </div>
                  <div className="qz-result-bottom-sep" />
                  <div className="qz-result-bottom-col">
                    <span className="qz-result-bottom-label">Victory Path</span>
                    {/* victoryPath contains HTML markup — safe (our own data) */}
                    <span
                      className="qz-playstyle-value"
                      dangerouslySetInnerHTML={{ __html: winner.victoryPath }}
                    />
                  </div>
                </div>
              </div>

            </div>{/* /result-cards-area */}
          </div>{/* /result-wrapper */}

          <p className="qz-result-page-credits">
            An Official 1490 DOOM Production &nbsp;·&nbsp; Buer Games<br />By Michael Leddy
          </p>
        </div>{/* /result-scroll-inner */}
      </section>

      {/* Result footer */}
      <footer className="qz-app-footer result-active">
        <div className="qz-footer-main">
          <a
            className="qz-doom-logo-corner visible"
            href="https://buergames.com/pages/1490doom"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src="/quiz/Art/Logos/DOOMlogoOrange.webp" alt="1490 Doom" />
          </a>

          <div className="qz-footer-cta">
            {/* Store link — always visible */}
            <a
              className="qz-btn-store"
              href={winner.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {'Get This\nCompany'}
            </a>

            {/* Import to builder — always visible */}
            <button className="qz-btn-primary" onClick={handleImport}>
              {'Build Your\nCompany'}
            </button>

            <button className="qz-btn-restart-link" onClick={onRestart}>
              {'Seek\nAnother Path'}
            </button>
          </div>

          <a
            href="https://buergames.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="qz-footer-buer-logo-link"
          >
            <img
              className="qz-footer-buer-logo"
              src="/quiz/Art/Logos/BuerWhiteTextAndLogo.webp"
              alt="Buer Games"
            />
          </a>
        </div>
      </footer>

      {/* Warrior Lightbox Modal */}
      <div
        className={`qz-lightbox${selectedWarrior ? ' open' : ''}`}
        onClick={closeLightbox}
        aria-hidden={!selectedWarrior}
      >
        <div className="qz-lightbox-content">
          {selectedWarrior && (
            <>
              <img
                className="qz-lightbox-img"
                src={selectedWarrior.src}
                alt={selectedWarrior.name}
              />
              <div className="qz-lightbox-text">
                <h3 className="qz-lightbox-name">{selectedWarrior.name}</h3>
                <p className="qz-lightbox-desc">{selectedWarrior.desc}</p>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
