import { test, expect } from '@playwright/test'
import { signUp, createCompanyViaApi, waitForSaved } from './helpers.js'

// Campaign activity log: things done in the builder reach the server as events, and undos
// point back at what they took back. Local accounts only (signUp uses the local server).

async function eventsFor(page, name) {
  return page.evaluate(async companyName => {
    const { companies } = await (await fetch('/api/companies', { credentials: 'include' })).json()
    const id = companies.find(c => c.name === companyName).id
    const res = await fetch(`/api/companies/${encodeURIComponent(id)}/events?after=0`, { credentials: 'include' })
    return { status: res.status, ...(await res.json()) }
  }, name)
}

test.describe('campaign activity log', () => {
  test.beforeEach(async ({ page }) => { await signUp(page) })

  test('records a game, an upgrade and their undos; the undos refer to what they took back', async ({ page }) => {
    const name = 'Activity Co'
    await createCompanyViaApi(page, {
      name, mode: 'campaign', ipLimit: 0,
      slots: [{ type: 'Fighter', weapon1: 'Light Weapon', earnedIP: 1 }, { type: 'Scout', weapon1: 'Bow' }],
    })

    // Buy a stat improvement
    await page.getByRole('button', { name: 'Add stat' }).first().click()
    await page.locator('button.pk-stat', { hasText: 'SKL' }).click()
    await page.locator('.pk-stat-apply').click()
    await expect(page.getByRole('button', { name: /^Stat Improve/ })).toContainText('Skill')

    // Undo it from warrior settings
    await page.locator('.slot-gear-btn').first().click()
    await page.locator('.ws-undo-btn', { hasText: /improve/i }).click()
    await page.locator('.co-sheet-done').click()          // confirm
    await page.locator('.co-sheet-done').click()          // close settings
    await expect(page.getByRole('button', { name: /^Stat Improve/ })).toHaveCount(0)

    // Record game 1: a defeat, everyone standing, survivor point to the Fighter
    await page.locator('.ch-camp-eog-btn').click()
    await page.locator('[data-result="loss"]').click()
    await page.locator('.eog-next-btn').click()           // who fell
    await page.locator('.eog-next-btn').click()           // award IP
    await page.locator('.eog-pick[data-slot="0"]').first().click()
    await page.locator('.eog-next-btn').click()           // review
    await page.locator('.eog-record-btn').click()

    // Undo game 1 from campaign settings
    await page.locator('.ch-camp-gear').click()
    await page.getByTestId('cmp-set-undo-game').click()
    await page.locator('.co-sheet-done').click()          // confirm

    await waitForSaved(page)
    await page.reload()

    const { status, events } = await eventsFor(page, name)
    expect(status).toBe(200)
    const types = events.map(e => e.type)
    expect(types[0]).toBe('campaign.baseline')               // the company predates the log
    for (const t of ['upgrade.bought', 'upgrade.undone', 'game.recorded', 'game.undone']) expect(types).toContain(t)

    const bought = events.find(e => e.type === 'upgrade.bought')
    expect(bought.payload).toMatchObject({ name: 'Fighter', kind: 'stat', label: 'Skill' })
    expect(events.find(e => e.type === 'upgrade.undone').ref).toBe(bought.id)

    const recorded = events.find(e => e.type === 'game.recorded')
    expect(recorded.payload).toMatchObject({ gameNumber: 1, result: 'loss' })
    expect(recorded.afterGame).toBe(0)
    expect(events.find(e => e.type === 'game.undone').ref).toBe(recorded.id)
    expect(events.every(e => e.status === 'ok')).toBe(true)
  })

  test("another account can't read the log", async ({ page, browser }) => {
    const name = 'Private Log Co'
    await createCompanyViaApi(page, { name, mode: 'campaign', ipLimit: 0, slots: [{ type: 'Fighter', weapon1: 'Light Weapon' }] })
    const id = await page.evaluate(async companyName => {
      const { companies } = await (await fetch('/api/companies', { credentials: 'include' })).json()
      return companies.find(c => c.name === companyName).id
    }, name)

    // A separate browser context: its own cookies, so its own account
    const ctx = await browser.newContext({ baseURL: test.info().project.use.baseURL })
    const other = await ctx.newPage()
    await signUp(other, 'Someone Else')
    const status = await other.evaluate(async cid => (await fetch(`/api/companies/${encodeURIComponent(cid)}/events`, { credentials: 'include' })).status, id)
    expect(status).toBe(404)
    await ctx.close()
  })
})
