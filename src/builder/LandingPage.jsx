import { useState } from 'react'
import { useBuilderStore } from '../store/builderStore'
import { MARK_ID_MAP } from '../data/quizData'
import SaveLoadPanel from './SaveLoadPanel'
import QuickRef from '../shared/QuickRef'
import QuizOverlay from './QuizOverlay'

export function RefContent({ onBack }) {
  return <QuickRef onBack={onBack} />
}

export default function LandingPage({ onLoad }) {
  const { saves, setMark, clearBuilder } = useBuilderStore()
  const [showQuiz, setShowQuiz] = useState(false)

  const hasDraft = !!localStorage.getItem('doom_draft')

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

      {(hasDraft || saves.length > 0) && (
        <div className="landing-saves">
          <div className="landing-section-label">Your Companies</div>
          <SaveLoadPanel onSelect={onLoad} showDraft={hasDraft} />
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
