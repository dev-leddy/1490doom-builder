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

    navigator.serviceWorker.ready.then(reg => {
      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' })
      }
      reg.update()
      reg.addEventListener('updatefound', () => {
        const next = reg.installing
        if (!next) return
        next.addEventListener('statechange', () => {
          if (next.state === 'installed' && navigator.serviceWorker.controller) {
            next.postMessage({ type: 'SKIP_WAITING' })
          }
        })
      })
    })
  }

  createRoot(document.getElementById('quiz-root')).render(<QuizPage />)
}
