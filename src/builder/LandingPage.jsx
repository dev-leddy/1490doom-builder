import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { MARK_ID_MAP } from '../data/quizData'
import SaveLoadPanel from './SaveLoadPanel'
import QuickRef from '../shared/QuickRef'
import QuizOverlay from './QuizOverlay'

export function RefContent({ onBack }) {
  return <QuickRef onBack={onBack} />
}

export default function LandingPage({ onLoad, onNew }) {
  const { saves, setMark, clearBuilder } = useBuilderStore()
  const [showQuiz, setShowQuiz] = useState(() =>
    window.location.pathname === '/quiz' ||
    new URLSearchParams(window.location.search).has('quiz')
  )

  const handleQuizComplete = (payload) => {
    const { companyId, companyName, warriors } = payload
    const mark = MARK_ID_MAP[companyId]
    if (mark) {
      clearBuilder()
      setMark(mark)
      if (useBuilderStore.getState().applyQuizCompany) {
        useBuilderStore.getState().applyQuizCompany({ mark, companyName, warriors })
      }
      onLoad() // Jump to builder
    }
    setShowQuiz(false)
  }

  return (
    <div className="landing-content">
      {showQuiz && (
        <QuizOverlay
          onComplete={handleQuizComplete}
          onClose={() => setShowQuiz(false)}
        />
      )}

      {saves.length > 0 ? (
        <>
          <div className="landing-saves">
            <SaveLoadPanel onSelect={onLoad} />
          </div>

          {/* Compact quiz card for returning users */}
          <div className="quiz-card quiz-card--compact" onClick={() => setShowQuiz(true)}>
            <div className="quiz-card-body">
              <span className="quiz-card-title">Take The Quiz, Find Your Company</span>
            </div>
            <span className="quiz-card-cta">Start →</span>
          </div>

          <button className="landing-new-company-btn" onClick={onNew}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
            Build Manually
          </button>
        </>
      ) : (
        <>
          {/* Hero quiz card for new users */}
          <div className="quiz-card quiz-card--hero" onClick={() => setShowQuiz(true)}>
            <h2 className="quiz-card-headline">Take The Quiz,<br/>Find Your Company</h2>
            <p className="quiz-card-sub">Answer five questions. We'll build your roster, assign your mark, and send you straight to battle.</p>
            <span className="quiz-card-btn">Start →</span>
          </div>

          <button className="landing-new-company-btn" onClick={onNew}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true">
              <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
            </svg>
            Build Manually
          </button>
        </>
      )}
    </div>
  )
}
