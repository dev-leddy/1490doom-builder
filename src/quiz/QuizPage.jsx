import { useState, useEffect, useRef } from 'react'
import { useQuizEngine } from './useQuizEngine'
import { useAudio } from './useAudio'
import QuizHero from './QuizHero'
import QuizQuestion from './QuizQuestion'
import QuizResult from './QuizResult'
import { COMPANIES, QUESTIONS } from '../data/quizData'
import './quiz.css'

// onComplete: provided in embedded (builder) mode
//             omitted in standalone mode
export default function QuizPage({ onComplete, onLightboxToggle }) {
  const engine = useQuizEngine()
  const { audioState, toggle: toggleAudio } = useAudio('/quiz/music/track.mp3')

  // Asset preloading gate
  const [loaded, setLoaded] = useState(0)
  const [total, setTotal]   = useState(0)
  const [ready, setReady]   = useState(false)

  // Background art crossfade (two-slot system)
  const [bgSlots, setBgSlots] = useState({ a: null, b: null, active: null })
  const pendingBg = useRef(null)

  function setBgArt(url) {
    const img = new Image()
    pendingBg.current = url
    img.onload = () => {
      if (pendingBg.current !== url) return
      setBgSlots(prev => {
        const next = prev.active === 'a' ? 'b' : 'a'
        return { ...prev, [next]: url, active: next }
      })
    }
    img.src = url
  }

  function clearBgArt() {
    pendingBg.current = null
    setBgSlots({ a: null, b: null, active: null })
  }

  // Preload ALL assets before showing anything
  useEffect(() => {
    const urls = [
      '/quiz/Art/Bonus%20Art/Battlefield.webp',
      ...QUESTIONS.map(q => q.art).filter(Boolean),
      ...COMPANIES.flatMap(c => [...c.minis, c.rep].filter(Boolean)),
    ]
    setTotal(urls.length)
    let done = 0
    urls.forEach(src => {
      const img = new Image()
      const onDone = () => {
        done++
        setLoaded(done)
        if (done >= urls.length) setReady(true)
      }
      img.onload  = onDone
      img.onerror = onDone // don't block on failed assets
      img.src = src
    })
  }, [])

  // Update bg art when phase/question changes
  useEffect(() => {
    if (engine.phase === 'quiz') {
      if (engine.question?.art) {
        setBgArt(engine.question.art)
      } else {
        setBgSlots(prev => ({ ...prev, active: prev.active || 'a' }))
      }
    } else if (engine.phase === 'result') {
      clearBgArt()
    } else if (engine.phase === 'hero') {
      clearBgArt()
    }
  }, [engine.phase, engine.currentQuestion]) // eslint-disable-line

  // Dynamic company accent color (set on .quiz-root via inline style)
  const accentStyle = engine.winner
    ? {
        '--qz-company-accent':     engine.winner.accent,
        '--qz-company-accent-rgb': engine.winner.accentRgb,
      }
    : {}

  const fogClass =
    engine.phase === 'hero'   ? 'fog-hero'   :
    engine.phase === 'quiz'   ? 'fog-quiz'   :
    engine.phase === 'result' ? 'fog-result' : ''

  const showFooterOnNonResult = engine.phase !== 'result'

  const pct = total > 0 ? Math.round((loaded / total) * 100) : 0

  return (
    <div className="quiz-root" style={accentStyle}>

      {/* Loading screen */}
      {!ready && (
        <div className="qz-loader">
          <img src="/quiz/Art/Logos/DOOMlogoOrange.webp" className="qz-loader-logo" alt="1490 Doom" />
          <div className="qz-loader-bar-track">
            <div className="qz-loader-bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {/* Background */}
      <div className="qz-bg-layer">
        <div
          className={`qz-bg-art${bgSlots.active === 'a' ? ' active' : ''}`}
          style={bgSlots.a ? { backgroundImage: `url("${bgSlots.a}")` } : {}}
        />
        <div
          className={`qz-bg-art${bgSlots.active === 'b' ? ' active' : ''}`}
          style={bgSlots.b ? { backgroundImage: `url("${bgSlots.b}")` } : {}}
        />
        <div className={`qz-bg-cover qz-phase-${engine.phase}`} />
      </div>

      {/* Bottom fog */}
      <div className={`qz-fog-bottom ${fogClass}`}>
        <div className="fog-layer fog-layer-1">
          <div className="fog-img" /><div className="fog-img" />
        </div>
        <div className="fog-layer fog-layer-2">
          <div className="fog-img" /><div className="fog-img" />
        </div>
      </div>

      {/* App content — hidden until assets ready */}
      <div className={`qz-app${ready ? ' qz-app--ready' : ''}`}>
        {engine.phase === 'hero' && (
          <QuizHero
            onStart={engine.start}
            audioState={audioState}
            onAudioToggle={toggleAudio}
          />
        )}

        {engine.phase === 'quiz' && (
          // key resets QuizQuestion's local answered state on question change
          <QuizQuestion
            key={engine.currentQuestion}
            question={engine.question}
            currentQuestion={engine.currentQuestion}
            totalQuestions={engine.totalQuestions}
            onAnswer={engine.answer}
            onBack={engine.back}
            audioState={audioState}
            onAudioToggle={toggleAudio}
          />
        )}

        {engine.phase === 'result' && (
          <QuizResult
            winner={engine.winner}
            onComplete={onComplete}
            onRestart={engine.restart}
            audioState={audioState}
            onAudioToggle={toggleAudio}
            onLightboxToggle={onLightboxToggle}
          />
        )}
      </div>

      {/* Non-result footer */}
      {ready && showFooterOnNonResult && (
        <footer className="qz-app-footer">
          <p className="qz-footer-credits">
            An Official 1490 DOOM Production &nbsp;·&nbsp; Buer Games<br />By Michael Leddy
          </p>
          <div className="qz-footer-main">
            <a
              className={`qz-doom-logo-corner${engine.phase !== 'hero' ? ' visible' : ''}`}
              href="https://buergames.com/pages/1490doom"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/quiz/Art/Logos/DOOMlogoOrange.webp" alt="1490 Doom" />
            </a>
            <div className="qz-footer-cta" />
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
      )}

    </div>
  )
}
