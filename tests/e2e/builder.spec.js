import { test, expect } from '@playwright/test'
import { signUp, createCompany, createCompanyViaApi, waitForSaved, portraitAlignment } from './helpers.js'

test.describe('builder', () => {
  test.beforeEach(async ({ page }) => { await signUp(page) })

  test('portraits line up with the stat boxes at every width', async ({ page }) => {
    await createCompany(page, { warriors: ['Hedge Knight', 'Scout', 'Brute'] })
    for (const width of [360, 420, 600, 1280]) {
      await page.setViewportSize({ width, height: 900 })
      await page.waitForTimeout(300)
      expect(await portraitAlignment(page), `at ${width}px`).toEqual([true, true, true])
    }
  })

  test('empty slots hide once all IP is spent, and come back when IP is freed', async ({ page }) => {
    await createCompany(page, { warriors: ['Fighter', 'Scout', 'Brute'], ip: 0 })
    await expect(page.locator('.eq-add')).toHaveCount(0)
    await page.getByLabel('Company Settings').click()
    await page.locator('.co-settings-step-btn').filter({ hasText: '+' }).last().click()
    await page.locator('.co-sheet-done').click()
    await expect(page.locator('.eq-add').first()).toBeVisible()
  })

  test('custom names: class row under the name, cards stay aligned on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await createCompany(page, { warriors: ['Fighter', 'Reaver', 'Scout'] })
    await page.locator('.slot-gear-btn').nth(1).click()
    await page.locator('.co-settings-sheet input[type=text], .co-settings-sheet input:not([type])').first().fill('Grimwald')
    await page.locator('.co-sheet-done').first().click()
    await expect(page.locator('.slot-class-sub:not(.slot-class-sub--spacer)')).toHaveText(/reaver/i)
    await expect(page.locator('.slot-portrait-col .slot-class-label')).toHaveCount(0)
    const tops = await page.evaluate(() => [...document.querySelectorAll('.warrior-header-row')].map(r => Math.round(r.getBoundingClientRect().top)))
    expect(new Set(tops).size).toBe(1)
  })

  test('the "Saved" indicator is brief', async ({ page }) => {
    await createCompany(page, { warriors: ['Fighter'] })
    await expect(page.locator('.save-status')).toHaveText(/sav/i)
    await waitForSaved(page) // clears within a couple of seconds of saving
  })

  test('offline edits show "Offline · retrying" and save once back online', async ({ page }) => {
    await createCompany(page, { name: 'Online Co', warriors: ['Fighter'] })
    await waitForSaved(page)
    await page.route('**/api/companies', r => r.abort('internetdisconnected'))
    await page.getByLabel('Company Settings').click()
    await page.getByPlaceholder('Name your company…').fill('Edited Offline')
    await page.getByRole('button', { name: 'DONE' }).click()
    await expect(page.locator('.save-status')).toHaveText(/offline/i, { timeout: 10_000 })
    await page.unroute('**/api/companies')
    await waitForSaved(page)
    const names = await page.evaluate(async () => (await (await fetch('/api/companies', { credentials: 'include' })).json()).companies.map(c => c.name))
    expect(names).toContain('Edited Offline')
  })

  test('Stat Improve: tap a stat to see the change, then choose it', async ({ page }) => {
    await createCompanyViaApi(page, { name: 'Stat Co', slots: [{ type: 'Fighter', weapon1: 'Light Weapon' }] })
    await page.getByRole('button', { name: 'Add stat' }).click()
    const com = page.locator('button.pk-stat', { hasText: 'COM' })
    await com.click()
    await expect(page.locator('.pk-stat-detail[data-stat="COM"]')).toContainText('4+ to 3+')
    await page.locator('.pk-stat-apply').click()
    const tile = page.getByRole('button', { name: /^Stat Improve/ })
    await expect(tile).toContainText('Combat')
    await expect(tile).not.toContainText('+1')
  })

  test('campaign Stat Improve is taken on confirm and can only be undone from warrior settings', async ({ page }) => {
    await createCompanyViaApi(page, { name: 'Camp Stat Co', mode: 'campaign', ipLimit: 0, slots: [{ type: 'Fighter', weapon1: 'Light Weapon', earnedIP: 1 }] })
    await page.getByRole('button', { name: 'Add stat' }).click()
    await page.locator('button.pk-stat', { hasText: 'SKL' }).click()
    await expect(page.locator('.pk-stat-confirm')).toContainText('rest of the campaign')
    await page.locator('.pk-stat-apply').click()
    const tile = page.getByRole('button', { name: /^Stat Improve/ })
    await expect(tile).toContainText('Skill')
    // Taken stats can't be removed from the picker
    await tile.click()
    await expect(page.locator('.pk-stat.is-taken', { hasText: 'SKL' })).toBeVisible()
    await page.locator('.co-sheet-done').click()
    // Escape hatch: warrior settings, behind a confirm
    await page.locator('.slot-gear-btn').first().click()
    await page.locator('.ws-undo-btn').click()
    await page.getByRole('button', { name: 'CONFIRM' }).click()
    await page.locator('.co-sheet-done').click()
    await expect(page.getByRole('button', { name: /^Stat Improve/ })).toHaveCount(0)
  })
})
