import { test, expect } from '@playwright/test'
import { signUp, createCompany, waitForSaved, shareLink } from './helpers.js'

test('shared link: read-only for guests, saved to the account after signing in', async ({ browser }) => {
  const owner = await (await browser.newContext({ viewport: { width: 420, height: 900 } })).newPage()
  await signUp(owner, 'Owner')
  await createCompany(owner, { name: 'Shared Co', warriors: ['Fighter', 'Scout'] })
  await waitForSaved(owner)
  const { payload } = await shareLink(owner)

  const guest = await (await browser.newContext({ viewport: { width: 420, height: 900 } })).newPage()
  await guest.goto('/#' + payload)
  await expect(guest.locator('.share-view-banner')).toContainText('view only')
  await expect(guest.locator('.builder-play-pill')).toHaveCount(0)
  await guest.getByLabel('Company Settings').click({ force: true })
  await expect(guest.getByText('COMPANY SETTINGS')).toHaveCount(0) // read-only
  await guest.locator('.share-view-banner-btn').click()
  await expect(guest.getByText('Sign in to save this company to your account.')).toBeVisible()

  // Same round trip as Google/Discord: sign up, then a full page load
  await guest.evaluate(async () => {
    await fetch('/api/auth/email/register', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `e2e-g-${Date.now()}@example.com`, username: 'Guest', password: 'password123' }) })
  })
  await guest.goto('/')
  await expect(guest.locator('.share-view-banner')).toHaveCount(0)
  await expect.poll(async () => guest.evaluate(async () => (await (await fetch('/api/companies', { credentials: 'include' })).json()).companies.map(c => c.name))).toContain('Shared Co')
})

test.describe('signed-in menu and company list', () => {
  test.beforeEach(async ({ page }) => { await signUp(page) })

  test('menu rows go to the right places', async ({ page }) => {
    await createCompany(page, { name: 'Menu Co', warriors: ['Fighter'] })
    await waitForSaved(page)
    const open = () => page.locator('.topbar-menu-btn').click()
    await open()
    await expect(page.getByText('This company')).toBeVisible()
    await expect(page.locator('.app-menu-row', { hasText: 'End campaign game' })).toHaveCount(0) // standard company
    await page.locator('.app-menu-row', { hasText: 'Quick reference' }).click()
    await expect(page.getByText('Statuses').first()).toBeVisible()
    await open()
    await page.locator('.app-menu-row', { hasText: 'My companies' }).click()
    await expect(page.locator('.landing-saves')).toContainText('Menu Co')
    await open()
    await expect(page.getByText('This company')).toHaveCount(0) // landing: no open company
  })

  test('deleting a company removes it from the account', async ({ page }) => {
    await createCompany(page, { name: 'Doomed Co', warriors: ['Fighter'] })
    await waitForSaved(page)
    await page.locator('.topbar-menu-btn').click()
    await page.locator('.app-menu-row', { hasText: 'My companies' }).click()
    await page.locator('.saved-chip', { hasText: 'Doomed Co' }).locator('.chip-delete').click()
    await page.getByRole('button', { name: 'CONFIRM' }).click()
    await expect(page.locator('.landing-saves')).toHaveCount(0)
    await page.reload()
    await expect(page.getByText('Doomed Co', { exact: true })).toHaveCount(0)
  })

  test('the display name can be changed and survives a reload', async ({ page }) => {
    await page.locator('.auth-avatar-btn').click()
    await page.locator('.auth-account-name-btn').click()
    await page.getByLabel('Display name').fill('  Lord   of Ash ')
    await page.locator('.auth-account-name-save').click()
    await expect(page.locator('.auth-account-name-btn')).toHaveText('Lord of Ash')
    await page.reload()
    await page.locator('.auth-avatar-btn').click()
    await expect(page.locator('.auth-account-name-btn')).toHaveText('Lord of Ash')
    // An empty name is refused by the server
    const status = await page.evaluate(async () => (await fetch('/api/auth/profile', { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ displayName: '   ' }) })).status)
    expect(status).toBe(400)
  })
})
