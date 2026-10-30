// The in-app poll: one at a time. The app shows it (src/shared/PollSheet.jsx), /api/poll checks
// answers against it and scripts/metrics.mjs reports it. A new poll needs a new id; answers are
// kept per poll id.
export const POLL = {
  id: 'next-2026-10',
  questions: [
    {
      id: 'next',
      text: 'What should the app add next?',
      hint: 'Pick up to 2',
      max: 2,
      options: [
        { id: 'campaign-rules', label: 'Campaign rules built into the app' },
        { id: 'scenario-rules', label: 'Scenario rules built into the app' },
        { id: 'draft', label: 'Draft mode: draft your warriors with 2 or more players' },
        { id: 'live', label: 'Live games: follow your opponent’s warriors and health on your own phone' },
        { id: 'other', label: 'Something else', text: true }, // a short text box when picked
      ],
    },
    {
      id: 'rules',
      text: 'Do you own the 1490 DOOM rules?',
      max: 1,
      options: [
        { id: 'pdf', label: 'PDF' },
        { id: 'hardback', label: 'Hardback' },
        { id: 'both', label: 'Both' },
        { id: 'not-yet', label: 'Not yet' },
      ],
    },
  ],
  thanks: 'Thanks! I read every answer.',
}

export const TEXT_MAX = 200

// What's kept of an answer: known options only, at most `max` per question, the text of a
// picked text option (trimmed, TEXT_MAX), keyed by that option's id. null: nothing usable.
export function cleanAnswers(raw) {
  if (!raw || typeof raw !== 'object') return null
  const out = {}
  for (const q of POLL.questions) {
    const ids = q.options.map(o => o.id)
    const picks = Array.isArray(raw[q.id]) ? [...new Set(raw[q.id])].filter(id => ids.includes(id)) : []
    if (picks.length > q.max) return null
    if (!picks.length) continue
    out[q.id] = picks
    for (const o of q.options) {
      if (!o.text || !picks.includes(o.id)) continue
      const text = typeof raw[o.id] === 'string' ? raw[o.id].trim().slice(0, TEXT_MAX) : ''
      if (text) out[o.id] = text
    }
  }
  return Object.keys(out).length ? out : null
}
