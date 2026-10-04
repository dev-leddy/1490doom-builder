import { test, expect } from '@playwright/test'
import { signUp, openWizard, pickWarrior, setWizardIp, createCompany, waitForSaved } from './helpers.js'

test.describe('New Company wizard', () => {
  test.beforeEach(async ({ page }) => { await signUp(page) })

  test('cannot begin without a warrior', async ({ page }) => {
    await openWizard(page)
    await expect(page.locator('.ncp-btn--primary')).toBeDisabled()
    await expect(page.locator('.ncp-footer-hint')).toHaveText(/choose at least one warrior/i)
    await pickWarrior(page, 0, 'Fighter')
    await expect(page.locator('.ncp-btn--primary')).toBeEnabled()
  })

  test('a class can only be picked once', async ({ page }) => {
    await openWizard(page)
    await pickWarrior(page, 0, 'Fighter')
    await page.locator('.ncp-tile-main').nth(1).click()
    await expect(page.locator('.wcp-name', { hasText: /^fighter$/i })).toHaveCount(0)
    await expect(page.locator('.wcp-item')).toHaveCount(13)
  })

  test('IP is capped at 20 and the counter tracks company size', async ({ page }) => {
    await openWizard(page)
    await setWizardIp(page, 20)
    await expect(page.locator('.ncp-mode-explain .ncp-stepper-btn').last()).toBeDisabled()
    const meta = page.locator('.ncp-section-meta').first()
    await expect(meta).toHaveText('3 / 8')
    await page.locator('.ncp-add-warrior-btn').click()
    await expect(meta).toHaveText('4 / 8')
    await page.locator('.ncp-tile-remove').nth(3).click()
    await expect(meta).toHaveText('3 / 8')
    for (let i = 0; i < 5; i++) await page.locator('.ncp-add-warrior-btn').click()
    await expect(meta).toHaveText('8 / 8')
    await expect(page.locator('.ncp-add-warrior-btn')).toHaveText(/company full/i)
  })

  test('"No Mark" stays no mark in the builder', async ({ page }) => {
    await createCompany(page, { warriors: ['Brute'] })
    await expect(page.locator('.ch-sigil-label')).toHaveText(/no mark/i)
  })

  test('a created company is saved to the account and reloads intact', async ({ page }) => {
    await createCompany(page, { name: 'Persisted Co', warriors: ['Knight', 'Scout', 'Brute'], ip: 3 })
    await waitForSaved(page)
    await page.reload()
    await page.getByText('Persisted Co', { exact: true }).first().click()
    for (const w of ['Knight', 'Scout', 'Brute']) await expect(page.locator('.slot-number', { hasText: w })).toBeVisible()
  })

  test('randomize → accept → saved', async ({ page }) => {
    await openWizard(page)
    await page.locator('.ncp-btn--ghost').click()
    const name = await page.getByPlaceholder('Name your company…').inputValue()
    expect(name.length).toBeGreaterThan(0)
    await page.locator('.ncp-btn--primary').click()
    await waitForSaved(page)
    await page.reload()
    await expect(page.getByText(name, { exact: true }).first()).toBeVisible()
  })

  test('campaign: per-warrior starting IP and the End campaign game action', async ({ page }) => {
    await openWizard(page)
    await page.getByRole('button', { name: 'Campaign' }).click()
    await expect(page.locator('.ncp-mode-desc')).toContainText('Campaign play')
    await pickWarrior(page, 0, 'Fighter')
    await page.locator('.ncp-tile-ip button[aria-label="More IP"]').first().click()
    await expect(page.locator('.ncp-tile-ip span').first()).toHaveText('1 IP')
    await page.locator('.ncp-btn--primary').click()
    await expect(page.getByLabel('Company Settings')).toBeVisible()
    await page.locator('.topbar-menu-btn').click()
    await page.locator('.app-menu-row', { hasText: 'End campaign game' }).click()
    await expect(page.locator('body')).toContainText(/end of game|survivors|survived/i)
  })
})
