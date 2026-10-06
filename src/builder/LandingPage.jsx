import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { useAuthStore } from '../store/authStore'
import SaveLoadPanel from './SaveLoadPanel'
import QuickRef from '../shared/QuickRef'
import QuizOverlay from './QuizOverlay'
import LandingAbout from './LandingAbout'

export function RefContent({ onBack }) {
  return <QuickRef onBack={onBack} />
}

export default function LandingPage({ onLoad, onNew, onQuizComplete }) {
  const { saves } = useBuilderStore()
  const user = useAuthStore(s => s.user)
  const [showQuiz, setShowQuiz] = useState(false)

  // Building from the quiz result needs an account; BuilderPage handles that
  const handleQuizComplete = (payload) => {
    setShowQuiz(false)
    onQuizComplete(payload)
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
        href="https://buergames.com/collections/1490-doom-physical"
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
          {/* Returning players: their companies first, one clear way to add another */}
          <div className="landing-saves-head">
            <h2 className="landing-saves-title">
              Your companies <span className="landing-saves-count">{saves.length}</span>
            </h2>
            <button type="button" className="landing-new-company-btn" onClick={onNew}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              New company
            </button>
          </div>

          <div className="landing-saves">
            <SaveLoadPanel onSelect={onLoad} />
          </div>

          {/* A quiet line below the list */}
          <div className="quiz-card quiz-card--compact" onClick={() => setShowQuiz(true)}>
            <span className="quiz-card-title">Not sure what to build next?</span>
            <button type="button" className="quiz-card-cta">Take the quiz →</button>
          </div>
        </>
      ) : (
        <>
          {/* Newcomers: say what this is before asking them to do anything */}
          <p className="landing-intro">
            {user
              ? <>Welcome, {user.username}. Start your first company.</>
              : <>Build, save and track your Doom Company for <strong>1490 DOOM</strong>, the tabletop skirmish game.</>}
          </p>

          {/* Two equal ways in: guided (quiz) or from scratch */}
          <div className="landing-start">
            <button type="button" className="landing-start-card" onClick={() => setShowQuiz(true)}>
              <span className="landing-start-title">Take the quiz</span>
              <span className="landing-start-desc">Five questions to find the Doom Company that fits how you play</span>
              <span className="landing-start-arrow" aria-hidden="true">→</span>
            </button>
            <button type="button" className="landing-start-card" onClick={onNew}>
              <span className="landing-start-title">Build your company</span>
              <span className="landing-start-desc">Choose your warriors, pick a mark and gear them up for battle</span>
              <span className="landing-start-arrow" aria-hidden="true">→</span>
            </button>
          </div>
        </>
      )}

      {/* First-time visitors: what the game is and what the app does */}
      {!user && <LandingAbout />}

    </div>
  )
}
