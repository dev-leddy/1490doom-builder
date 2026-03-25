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

  // Background art crossfade (two-slot system)
  const [bgSlots, setBgSlots] = useState({ a: null, b: null, active: null })
  const pendingBg = useRef(null)

  function setBgArt(url) {
    // If already cached, swap immediately; otherwise wait for load
    const img = new Image()
    pendingBg.current = url
    img.onload = () => {
      if (pendingBg.current !== url) return // superseded
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

  // Preload ALL quiz assets on mount so they're cached by the time user reaches them
  useEffect(() => {
    const urls = [
      '/quiz/Art/Bonus%20Art/Battlefield.png',
      ...QUESTIONS.map(q => q.art).filter(Boolean),
      ...COMPANIES.flatMap(c => [...c.minis, c.rep].filter(Boolean)),
    ]
    urls.forEach(src => { const img = new Image(); img.src = src })
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

  return (
    <div className="quiz-root" style={accentStyle}>

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

      {/* App content */}
      <div className="qz-app">
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
      {showFooterOnNonResult && (
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
              <img src="/quiz/Art/Logos/DOOMlogoOrange.png" alt="1490 Doom" />
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
                src="/quiz/Art/Logos/BuerWhiteTextAndLogo.png"
                alt="Buer Games"
              />
            </a>
          </div>
        </footer>
      )}

    </div>
  )
}
