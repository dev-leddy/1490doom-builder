import { describe, it, expect } from 'vitest'
import { POLL, cleanAnswers, TEXT_MAX } from '../../functions/lib/poll.js'

describe('poll answers', () => {
  it('keeps known options and the Something else text', () => {
    expect(cleanAnswers({ next: ['draft', 'other'], other: '  Painting guides  ', rules: ['pdf'] }))
      .toEqual({ next: ['draft', 'other'], other: 'Painting guides', rules: ['pdf'] })
  })

  it('drops unknown options, duplicates, and text when Something else is not picked', () => {
    expect(cleanAnswers({ next: ['live', 'live', 'nope'], other: 'ignored', extra: 1 })).toEqual({ next: ['live'] })
  })

  it('refuses too many picks or nothing usable', () => {
    expect(cleanAnswers({ next: ['campaign-rules', 'scenario-rules', 'draft'] })).toBe(null)
    expect(cleanAnswers({ rules: ['pdf', 'both'] })).toBe(null)
    expect(cleanAnswers({})).toBe(null)
    expect(cleanAnswers(null)).toBe(null)
    expect(cleanAnswers({ next: 'draft' })).toBe(null)
  })

  it('caps the text', () => {
    expect(cleanAnswers({ next: ['other'], other: 'x'.repeat(500) }).other).toHaveLength(TEXT_MAX)
  })

  it('every option id is unique within its question', () => {
    for (const q of POLL.questions) expect(new Set(q.options.map(o => o.id)).size).toBe(q.options.length)
  })
})
