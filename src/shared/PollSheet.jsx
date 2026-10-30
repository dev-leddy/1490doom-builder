import { useEffect, useState } from 'react'
import BottomSheet from './BottomSheet'
import { useAuthStore } from '../store/authStore'
import { usePollStore, POLL } from '../store/pollStore'
import { TEXT_MAX } from '../../functions/lib/poll.js'
import './poll.css'

// Loads whether the signed-in player has answered, and shows the poll when they open it
export default function PollHost() {
  const user = useAuthStore(s => s.user)
  const { sheetOpen, loadPoll, clearPoll } = usePollStore()
  useEffect(() => { if (user) loadPoll(); else clearPoll() }, [user, loadPoll, clearPoll])
  return user && sheetOpen ? <PollSheet /> : null
}

function PollSheet() {
  const { closePoll, sendPoll } = usePollStore()
  const [picks, setPicks] = useState({}) // { questionId: [optionId] }
  const [texts, setTexts] = useState({}) // { optionId: text }
  const [state, setState] = useState('asking') // 'asking' | 'sending' | 'error' | 'done'

  const toggle = (q, id) => setPicks(p => {
    const cur = p[q.id] || []
    if (q.max === 1) return { ...p, [q.id]: cur[0] === id ? [] : [id] }
    if (cur.includes(id)) return { ...p, [q.id]: cur.filter(x => x !== id) }
    return cur.length < q.max ? { ...p, [q.id]: [...cur, id] } : p
  })
  const answered = Object.values(picks).some(a => a.length)
  const send = async () => {
    setState('sending')
    setState(await sendPoll({ ...picks, ...texts }) ? 'done' : 'error')
  }

  if (state === 'done') {
    return (
      <BottomSheet
        title="Thank you"
        onClose={closePoll}
        className="poll-sheet"
        footer={<button className="co-sheet-done" onClick={closePoll}>Done</button>}
      >
        <p className="poll-thanks">{POLL.thanks}</p>
      </BottomSheet>
    )
  }

  return (
    <BottomSheet
      title="Help pick what's next"
      onClose={closePoll}
      className="poll-sheet"
      bodyClass="poll-body"
      footer={
        <>
          <button className="co-sheet-randomize" onClick={closePoll}>Not now</button>
          <button className="co-sheet-done poll-send" onClick={send} disabled={!answered || state === 'sending'}>
            {state === 'sending' ? 'Sending…' : 'Send'}
          </button>
        </>
      }
    >
      {POLL.questions.map(q => {
        const cur = picks[q.id] || []
        const single = q.max === 1
        return (
          <fieldset key={q.id} className="poll-q">
            <legend className="poll-q-text">{q.text}{q.hint && <span className="poll-q-hint">{q.hint}</span>}</legend>
            <div className="poll-options" role={single ? 'radiogroup' : 'group'}>
              {q.options.map(o => {
                const on = cur.includes(o.id)
                return (
                  <div key={o.id} className="poll-option-wrap">
                    <button
                      type="button"
                      role={single ? 'radio' : 'checkbox'}
                      aria-checked={on}
                      disabled={!on && !single && cur.length >= q.max}
                      className={`poll-option${on ? ' selected' : ''}`}
                      onClick={() => toggle(q, o.id)}
                    >
                      <span className={`poll-mark poll-mark--${single ? 'radio' : 'check'}`} aria-hidden="true" />
                      {o.label}
                    </button>
                    {o.text && on && (
                      <input
                        className="poll-text"
                        type="text"
                        maxLength={TEXT_MAX}
                        placeholder="What would you like?"
                        aria-label={o.label}
                        value={texts[o.id] || ''}
                        onChange={e => setTexts(t => ({ ...t, [o.id]: e.target.value }))}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </fieldset>
        )
      })}
      {state === 'error' && <p className="poll-error" role="alert">That didn&apos;t send. Check your connection and try again.</p>}
    </BottomSheet>
  )
}
