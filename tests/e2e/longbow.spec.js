import { test, expect } from '@playwright/test'
import { signUp, createCompany, createCompanyViaApi, dismissMarkPopup } from './helpers.js'

test.describe('Longbow', () => {
  test.beforeEach(async ({ page }) => { await signUp(page) })

  test('builder: Bow only, its stats and abilities', async ({ page }) => {
    await createCompany(page, { warriors: ['Longbow'] })
    const card = page.locator('.warrior-slot').first()
    await expect(card.locator('.slot-number')).toContainText('Longbow')
    await expect(card.locator('.warrior-portrait')).toBeVisible()
    for (const [stat, val] of [['MOV', '3'], ['ATK', '1'], ['VIT', '5'], ['SKL', '5+'], ['COM', '3+'], ['DEF', '4+']])
      await expect(card.locator('.stat-box', { hasText: stat }).locator('.stat-val')).toHaveText(val)
    await expect(card).toContainText(/bow/i)
    for (const ab of ['GRAPPLING SHOT', 'BROADHEAD SQUALL', 'THUNDEROUS SALVO']) await expect(card).toContainText(ab)
  })

  test('Broadhead Squall replaces Overdraw as one once-per-round action; other bows keep Overdraw', async ({ page }) => {
    await createCompanyViaApi(page, { name: 'Bows Co', slots: [{ type: 'Longbow', weapon1: 'Bow' }, { type: 'Scout', weapon1: 'Bow' }] })
    const longbowCard = page.locator('.warrior-slot').first()
    await expect(longbowCard).not.toContainText('OVERDRAW')           // builder: no separate Overdraw
    await expect(page.locator('.warrior-slot').nth(1)).toContainText('OVERDRAW') // the Scout's bow keeps it

    await page.locator('.builder-play-pill').click()
    await dismissMarkPopup(page)
    const name = n => page.locator('.tk-ability').filter({ has: page.locator('.tk-ability-name', { hasText: new RegExp('^' + n) }) })
    await expect(name('OVERDRAW')).toHaveCount(0)
    const squall = name('BROADHEAD SQUALL')
    await expect(squall).toContainText('ONCE PER ROUND')
    await squall.click()
    await expect(squall).toContainText('USED')

    await page.locator('.tk-tab:not(.tk-tab-ref)').nth(1).click()   // the Scout's bow still has Overdraw
    await expect(name('OVERDRAW')).toHaveCount(1)
  })

  test('only Stunned blocks Grappling Shot (Hindered and Immobilized do not)', async ({ page }) => {
    await createCompany(page, { warriors: ['Longbow'] })
    await page.locator('.builder-play-pill').click()
    await dismissMarkPopup(page)
    const grapple = page.locator('.tk-ability', { hasText: 'GRAPPLING SHOT' })
    await expect(grapple).toContainText('ONCE PER GAME')
    const addStatus = async n => {
      await page.locator('.tk-hdr-btn-status').click()
      await page.locator('.status-item-btn', { hasText: n }).click()
    }
    await addStatus('HINDERED') // only costs the next action: still allowed
    await addStatus('IMMOBILIZED') // the rope moves him, not his feet
    await expect(grapple).toContainText('ONCE PER GAME')
    await addStatus('STUNNED')
    await expect(grapple).toContainText('UNAVAILABLE · STUNNED')
    await grapple.click({ force: true })
    await expect(grapple).not.toContainText('USED') // tapping does nothing while blocked
  })
})
