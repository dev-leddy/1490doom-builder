import { useEffect } from 'react';

export default function QuizOverlay({ onComplete, onClose }) {
  useEffect(() => {
    function handleMessage(event) {
      if (event.data && event.data.type === 'QUIZ_COMPLETE') {
        onComplete(event.data);
      }
    }
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onComplete]);

  return (
    <div className="quiz-overlay">
      <button className="quiz-close-btn" onClick={onClose}>✕</button>
      <iframe 
        src="/quiz/index.html" 
        className="quiz-iframe" 
        title="Doom Company Quiz"
      />
    </div>
  );
}
