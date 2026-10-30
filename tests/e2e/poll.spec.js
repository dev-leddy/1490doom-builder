import { test, expect } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { signUp } from './helpers.js'

const shot = (page, name) => (process.env.SHOTS ? page.screenshot({ path: `${process.env.SHOTS}/${name}.png` }) : null)
const wrangler = fileURLToPath(new URL('../../node_modules/wrangler/bin/wrangler.js', import.meta.url))

// Read the LOCAL database the test backend writes to (never production). It can be busy while
// the backend writes for other tests, so try a few times.
function localRows(sql) {
  let r
  for (let i = 0; i < 4; i++) {
    r = spawnSync(process.execPath, [wrangler, 'd1', 'execute', 'doom-builder', '--local', '--json', '--command', sql], { encoding: 'utf8' })
    if (r.status === 0) return JSON.parse(r.stdout)[0].results
  }
  throw new Error(r.stderr || r.stdout)
}

test.describe('the poll', () => {
  test('guests never see it', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.landing-start-card').first()).toBeVisible()
    await expect(page.locator('.poll-card')).toHaveCount(0)
  })

  test('a card at the top of the landing page: answer it, it says thanks and goes away', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await signUp(page)
    const line = page.locator('.poll-card')
    await expect(line).toContainText("Help pick what's next")
    await shot(page, 'poll-1-landing')
    await line.locator('.poll-card-btn').click()

    const sheet = page.locator('.poll-sheet')
    const pick = name => sheet.getByRole('checkbox', { name })
    await pick('Draft mode').click()
    await pick('Something else').click()
    await expect(pick('Campaign rules built into the app')).toBeDisabled() // up to 2
    await sheet.getByRole('textbox').fill('Painting guides')
    await sheet.getByRole('radio', { name: 'Hardback' }).click()
    await shot(page, 'poll-2-sheet')
    await sheet.locator('.poll-send').click()
    await expect(sheet).toContainText('Thanks! I read every answer.')
    await page.waitForTimeout(400)
    await shot(page, 'poll-3-thanks')
    await sheet.getByRole('button', { name: 'Done' }).click()
    await expect(line).toHaveCount(0)

    const me = await page.evaluate(() => fetch('/api/auth/me', { credentials: 'include' }).then(r => r.json()))
    expect(me.id).toMatch(/^[\w-]+$/)
    const [row] = localRows(`SELECT answers FROM poll_answers WHERE user_id = '${me.id}'`)
    expect(JSON.parse(row.answers)).toEqual({ next: ['draft', 'other'], other: 'Painting guides', rules: ['hardback'] })
    // one answer per account: a second is refused and the first is kept
    const again = await page.evaluate(() => fetch('/api/poll', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'next-2026-10', answers: { rules: ['pdf'] } }),
    }).then(r => r.status))
    expect(again).toBe(409)
    expect(localRows(`SELECT answers FROM poll_answers WHERE user_id = '${me.id}'`)).toEqual([row])

    // answered: gone after a reload too, and not in the menu
    await page.reload()
    await expect(page.locator('.landing-start-card').first()).toBeVisible()
    await page.locator('.topbar-menu-btn').click()
    await expect(page.locator('.app-menu-row', { hasText: '1490 DOOM Shop' })).toBeVisible()
    await expect(page.locator('.app-menu-row', { hasText: "Help pick what's next" })).toHaveCount(0)
    await expect(page.locator('.poll-card')).toHaveCount(0)
  })

  test('"Not now" keeps the card, and the poll is in the menu too', async ({ page }) => {
    await signUp(page)
    await expect(page.locator('.poll-card')).toBeVisible()
    await expect(page.locator('.poll-card button')).toHaveCount(1) // no way to hide it but answering
    await page.locator('.topbar-menu-btn').click()
    await page.locator('.app-menu-row', { hasText: "Help pick what's next" }).click()
    await expect(page.locator('.poll-sheet')).toContainText('What should the app add next?')
    await page.getByRole('button', { name: 'Not now' }).click()
    await expect(page.locator('.poll-sheet')).toHaveCount(0)
    await expect(page.locator('.poll-card')).toBeVisible()
  })
})
