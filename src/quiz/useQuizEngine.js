import { useState, useCallback } from 'react'
import { COMPANIES, QUESTIONS } from '../data/quizData'

function initScores() {
  return Object.fromEntries(COMPANIES.map(c => [c.id, 0]))
}

function computeWinner(scores) {
  let max = -1
  let winner = null
  for (const company of COMPANIES) {
    if (scores[company.id] > max) {
      max = scores[company.id]
      winner = company
    }
  }
  return winner
}

// Pure state hook — no DOM side-effects.
// phase: 'hero' | 'quiz' | 'result'
export function useQuizEngine() {
  const [phase, setPhase] = useState('hero')
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [scores, setScores] = useState(initScores)
  const [history, setHistory] = useState([]) // [{ questionIndex, answer }]

  const start = useCallback(() => {
    setCurrentQuestion(0)
    setScores(initScores())
    setHistory([])
    setPhase('quiz')
  }, [])

  const answer = useCallback((answerObj) => {
    setScores(prev => {
      const next = { ...prev }
      for (const [id, pts] of Object.entries(answerObj.scores)) {
        next[id] = (next[id] || 0) + pts
      }
      return next
    })
    setHistory(h => [...h, { questionIndex: currentQuestion, answer: answerObj }])
    const nextQ = currentQuestion + 1
    if (nextQ < QUESTIONS.length) {
      setCurrentQuestion(nextQ)
    } else {
      setPhase('result')
    }
  }, [currentQuestion])

  const back = useCallback(() => {
    if (history.length === 0) {
      // On first question — go back to hero
      setPhase('hero')
      setCurrentQuestion(0)
      setScores(initScores())
      return
    }
    const last = history[history.length - 1]
    setScores(prev => {
      const next = { ...prev }
      for (const [id, pts] of Object.entries(last.answer.scores)) {
        next[id] -= pts
      }
      return next
    })
    setHistory(h => h.slice(0, -1))
    setCurrentQuestion(last.questionIndex)
  }, [history])

  const restart = useCallback(() => {
    setPhase('hero')
    setCurrentQuestion(0)
    setScores(initScores())
    setHistory([])
  }, [])

  const winner = phase === 'result' ? computeWinner(scores) : null

  return {
    phase,
    currentQuestion,
    question: QUESTIONS[currentQuestion],
    totalQuestions: QUESTIONS.length,
    winner,
    start,
    answer,
    back,
    restart,
  }
}
