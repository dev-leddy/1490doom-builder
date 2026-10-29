import { describe, it, expect, vi } from 'vitest'
import { tagged, placement, gameProps, gameEndProps, gameStartedAt, companyProps, logEvent, STORE_PAGES } from '../../functions/lib/metrics.js'

describe('store links', () => {
  it('tags the store URL so Shopify reports show the app as the source', () => {
    const u = new URL(tagged('https://buergames.com/collections/1490-doom-physical', 'menu'))
    expect(u.origin + u.pathname).toBe('https://buergames.com/collections/1490-doom-physical')
    expect(Object.fromEntries(u.searchParams)).toEqual({ utm_source: 'doom-builder', utm_medium: 'app', utm_campaign: 'menu' })
  })

  it('keeps placements to short slugs', () => {
    expect(placement('quiz-result')).toBe('quiz-result')
    expect(placement('<script>')).toBe('unknown')
    expect(placement(null)).toBe('unknown')
  })

  it('only knows store pages', () => {
    expect(Object.keys(STORE_PAGES)).toEqual(['physical', 'game', 'home'])
  })
})

describe('games', () => {
  const start = Date.UTC(2026, 9, 29, 18, 0)
  const data = {
    sessionId: start.toString(36), round: 4, mark: 'Ashbound', campaign: { gameNumber: 3 },
    warriors: [{ type: 'Fighter', currentVit: 0 }, { type: 'Scout', dead: true }, { type: 'Brute', currentVit: 3 }],
  }

  it('describes a game without names', () => {
    expect(gameProps(data)).toEqual({ mode: 'campaign', scenario: 'skirmish:standard', warriors: ['Fighter', 'Scout', 'Brute'], mark: 'Ashbound' })
    expect(gameProps({ scenario: { kind: 'foray', id: 'salt-run' } })).toMatchObject({ mode: 'standard', scenario: 'foray:salt-run' })
  })

  it('reads when it began from the session id', () => {
    expect(gameStartedAt(start.toString(36))).toBe(start)
    expect(gameStartedAt('nonsense!')).toBe(null)
    expect(gameStartedAt(undefined)).toBe(null)
  })

  it('records how it ended: rounds, minutes, fallen', () => {
    expect(gameEndProps(data, start + 95 * 60000, 'closed')).toMatchObject({ reason: 'closed', rounds: 4, minutes: 95, fallen: 2 })
    expect(gameEndProps({}, start, 'replaced')).toMatchObject({ rounds: 1, minutes: null, fallen: 0 })
  })
})

describe('companies', () => {
  it('records type, mark and classes', () => {
    expect(companyProps({ mark: '', slots: [{ type: 'Knight' }, { type: null }] }, 'campaign')).toEqual({ mode: 'campaign', mark: null, warriors: ['Knight'] })
  })
})

describe('logEvent', () => {
  const fakeDb = () => {
    const calls = []
    return { calls, prepare: sql => ({ bind: (...args) => ({ run: async () => { calls.push({ sql, args }) } }) }) }
  }

  it('writes one row with the signed-in user, after the response', async () => {
    const DB = fakeDb()
    const waitUntil = vi.fn()
    await logEvent({ env: { DB }, data: { user: { id: 'u1' } }, waitUntil }, 'store_click', { from: 'menu' })
    expect(waitUntil).toHaveBeenCalledOnce()
    expect(DB.calls[0].args.slice(0, 3)).toEqual(['store_click', 'u1', '{"from":"menu"}'])
  })

  it('guests are logged without a user; oversize props stay valid JSON', async () => {
    const DB = fakeDb()
    await logEvent({ env: { DB }, data: {} }, 'store_click', { big: 'x'.repeat(3000) })
    expect(DB.calls[0].args[1]).toBe(null)
    expect(JSON.parse(DB.calls[0].args[2])).toEqual({ oversize: true })
  })

  it('never throws when the database fails', async () => {
    const DB = { prepare: () => ({ bind: () => ({ run: () => Promise.reject(new Error('down')) }) }) }
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    await expect(logEvent({ env: { DB }, data: {} }, 'game_start')).resolves.toBeUndefined()
    warn.mockRestore()
  })
})
