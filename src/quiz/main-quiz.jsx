import { createRoot } from 'react-dom/client'
import QuizPage from './QuizPage'

// If quiz.html was served at the root URL (stale service worker bug), redirect to builder
if (window.location.pathname === '/') {
  window.location.replace('/index.html')
} else {
  // When a new service worker takes over, reload so users get the latest version.
  if ('serviceWorker' in navigator) {
    let reloading = false
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading) return
      reloading = true
      window.location.reload()
    })
  }

  createRoot(document.getElementById('quiz-root')).render(<QuizPage />)
}
