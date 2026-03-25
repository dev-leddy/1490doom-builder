import { useState } from 'react'
import QuizPage from '../quiz/QuizPage'

export default function QuizOverlay({ onComplete, onClose }) {
  const [lightboxOpen, setLightboxOpen] = useState(false)

  return (
    <div className="quiz-overlay">
      {!lightboxOpen && (
        <button className="quiz-close-btn" onClick={onClose} aria-label="Close quiz">✕</button>
      )}
      <QuizPage onComplete={onComplete} onLightboxToggle={setLightboxOpen} />
    </div>
  )
}
