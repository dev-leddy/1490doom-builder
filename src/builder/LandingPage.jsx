import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { getAvatarSrc } from '../data/avatars'
import { MARK_ID_MAP } from '../data/quizData'
import SaveLoadPanel from './SaveLoadPanel'
import QuickRef from '../shared/QuickRef'
import QuizOverlay from './QuizOverlay'

export function RefContent({ onBack }) {
  return <QuickRef onBack={onBack} />
}

export default function LandingPage({ onLoad }) {
  const { saves, companyName, companyAvatar, setMark, clearBuilder } = useBuilderStore()
  const [showQuiz, setShowQuiz] = useState(false)

  const hasDraft = !!localStorage.getItem('doom_draft')
  const avatarSrc = hasDraft ? getAvatarSrc(companyAvatar) : null

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

      {hasDraft && (
        <div className="landing-resume">
          <div className="landing-section-label">Resume Building</div>
          <div className="landing-resume-chip" onClick={onLoad}>
            {avatarSrc
              ? <img src={avatarSrc} className="landing-resume-avatar" alt="" />
              : <div className="landing-resume-avatar landing-resume-avatar-ph">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                </svg>
              </div>
            }
            <span className="landing-resume-name">{companyName || 'Unnamed Company'}</span>
            <span className="landing-resume-arrow">Continue →</span>
          </div>
        </div>
      )}

      {saves.length > 0 && (
        <div className="landing-saves">
          <div className="landing-section-label">Your Companies</div>
          <SaveLoadPanel onSelect={onLoad} />
        </div>
      )}

      {!hasDraft && saves.length === 0 && (
        <div className="landing-empty">
          Your companies will appear here once saved.
        </div>
      )}

      <div className="landing-quiz-banner" onClick={() => setShowQuiz(true)}>
        <span className="quiz-banner-text">Which Company Are You?</span>
        <span className="quiz-banner-cta">Take the Quiz →</span>
      </div>
    </div>
  )
}
