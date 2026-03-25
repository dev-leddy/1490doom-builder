import { useState } from 'react'
import { AudioWidget } from './QuizHero'


export default function QuizQuestion({
  question,
  currentQuestion,
  totalQuestions,
  onAnswer,
  onBack,
  audioState,
  onAudioToggle,
}) {
  const [answered, setAnswered] = useState(false)

  // Reset answered state when question changes
  // (key prop on parent handles this — see QuizPage)

  function handleAnswer(ans) {
    if (answered) return
    setAnswered(true)
    // Small delay before advancing, matching original 200ms fade
    setTimeout(() => onAnswer(ans), 160)
  }

  return (
    <>
      <AudioWidget audioState={audioState} onToggle={onAudioToggle} />

      <button
        className={`qz-btn-back visible`}
        onClick={onBack}
        aria-label="Go back"
      >
        ← Back
      </button>

      <section className="qz-section active">
        <div className="qz-quiz-wrapper">
          {/* Question + answers */}

          <div className="qz-question-container">
            <h2 className="qz-question-text">{question.text}</h2>
            <div className="qz-answers-grid">
              {question.answers.map((ans, i) => (
                <button
                  key={i}
                  className="qz-answer-btn"
                  onClick={() => handleAnswer(ans)}
                  disabled={answered}
                >
                  {ans.text}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
