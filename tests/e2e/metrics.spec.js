import { test, expect } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { signUp, createCompany, dismissMarkPopup } from './helpers.js'

const wrangler = fileURLToPath(new URL('../../node_modules/wrangler/bin/wrangler.js', import.meta.url))

// Read the LOCAL database the test backend writes to (never production)
function localRows(sql) {
  const r = spawnSync(process.execPath, [wrangler, 'd1', 'execute', 'doom-builder', '--local', '--json', '--command', sql], { encoding: 'utf8' })
  if (r.status !== 0) throw new Error(r.stderr || r.stdout)
  return JSON.parse(r.stdout)[0].results
}

test.describe('usage metrics', () => {
  test('store links go through the counter, tagged for the store', async ({ page }) => {
    const res = await page.request.get('/go/shop/physical?from=menu', { maxRedirects: 0 })
    expect(res.status()).toBe(302)
    const to = new URL(res.headers().location)
    expect(to.origin + to.pathname).toBe('https://buergames.com/collections/1490-doom-physical')
    expect(to.searchParams.get('utm_source')).toBe('doom-builder')
    expect(to.searchParams.get('utm_campaign')).toBe('menu')
    // only store pages: anything else goes to the collection
    const odd = await page.request.get('/go/shop/https%3A%2F%2Fevil.example?from=x', { maxRedirects: 0 })
    expect(new URL(odd.headers().location).hostname).toBe('buergames.com')
  })

  test('a new company, a game started and a game ended are counted (no names)', async ({ page }) => {
    await signUp(page)
    // only this account's events (a late save from an earlier test's page can't count)
    const me = await page.evaluate(() => fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json()))
    expect(me.id).toMatch(/^[\w-]+$/)
    const mine = `user_id = '${me.id}'`
    await createCompany(page, { name: 'Metrics Co', warriors: ['Fighter', 'Scout'] })
    await page.locator('.builder-play-pill').click()
    await expect(page.locator('.tk-card')).toBeVisible()
    await dismissMarkPopup(page)
    await page.waitForTimeout(1500) // the game's first cloud save (debounced)
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.locator('.tk-menu-item--exit').click()
    await expect(page.locator('.builder-play-pill')).toBeVisible()

    // (the company's debounced save can land after the game starts, so order doesn't matter)
    await expect.poll(() => localRows(`SELECT kind FROM metric_events WHERE ${mine} AND kind != 'store_click'`).map(r => r.kind).sort(), { timeout: 15_000 })
      .toEqual(['company_create', 'game_end', 'game_start'])
    const [start] = localRows(`SELECT props FROM metric_events WHERE ${mine} AND kind = 'game_start'`)
    const props = JSON.parse(start.props)
    expect(props).toMatchObject({ mode: 'standard', scenario: 'skirmish:standard', warriors: ['Fighter', 'Scout'] })
    expect(start.props).not.toContain('Metrics Co')
  })
})
