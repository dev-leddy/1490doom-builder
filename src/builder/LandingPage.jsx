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
  const [showQuiz, setShowQuiz] = useState(false)

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

      <a
        className="landing-shop-pill"
        href="https://1490doom.com"
        target="_blank"
        rel="noopener noreferrer"
      >
        <div className="landing-shop-pill-left">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
            <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zm10 0c-1.1 0-1.99.9-1.99 2S15.9 22 17 22s2-.9 2-2-.9-2-2-2zM5.21 4H2V2H0v2h2l3.6 7.59L4.25 14C4.09 14.32 4 14.65 4 15c0 1.1.9 2 2 2h14v-2H6.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63H19c.75 0 1.41-.41 1.75-1.03l3.58-6.49A1 1 0 0 0 23.42 4H5.21z"/>
          </svg>
          <span>Shop 1490 Doom</span>
        </div>
      </a>

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
        </>
      ) : (
        /* Hero quiz card for new users */
        <div className="quiz-card quiz-card--hero" onClick={() => setShowQuiz(true)}>
          <h2 className="quiz-card-headline">Take The Quiz,<br/>Find Your Company</h2>
          <p className="quiz-card-sub">Answer five questions. We'll build your roster, assign your mark, and send you straight to battle.</p>
          <span className="quiz-card-btn">Start</span>
        </div>
      )}

      <button className="landing-new-company-btn" onClick={onNew}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="14" height="14" aria-hidden="true">
          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/>
        </svg>
        New Company
      </button>

    </div>
  )
}
