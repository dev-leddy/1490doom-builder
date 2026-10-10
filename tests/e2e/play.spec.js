import { test, expect } from '@playwright/test'
import { signUp, createCompany, waitForSaved, dismissMarkPopup } from './helpers.js'

async function startPlay(page) {
  await page.locator('.builder-play-pill').click()
  const newGame = page.getByRole('button', { name: 'NEW GAME' })
  if (await newGame.isVisible().catch(() => false)) await newGame.click()
  await expect(page.locator('.tk-card')).toBeVisible()
  await dismissMarkPopup(page)
}

test.describe('play mode', () => {
  test.beforeEach(async ({ page }) => { await signUp(page) })

  test('built-in gear is not listed as an IP upgrade', async ({ page }) => {
    await createCompany(page, { warriors: ['Knight', 'Hedge Knight', 'Reaver'], ip: 0 })
    await startPlay(page)
    const tabs = page.locator('.tk-tab:not(.tk-tab-ref)')
    for (let i = 0; i < 3; i++) {
      await tabs.nth(i).click()
      await expect(page.locator('.tk-hdr-btn-ip')).toHaveCount(0)
    }
  })

  test('cards do not shift between warriors; activated button keeps its size', async ({ page }) => {
    await createCompany(page, { warriors: ['Scout', 'Hedge Knight', 'Executioner'] })
    await startPlay(page)
    const tabs = page.locator('.tk-tab:not(.tk-tab-ref)')
    const seen = new Set()
    for (let i = 0; i < 3; i++) {
      await tabs.nth(i).click()
      await page.waitForTimeout(200)
      for (const _ of [0, 1]) {
        const m = await page.evaluate(() => {
          const c = document.querySelector('.tk-card')
          const b = c.querySelector('.tk-activated-btn').getBoundingClientRect()
          const p = c.querySelector('.tk-portrait-ring').getBoundingClientRect()
          return `${Math.round(p.top)}|${Math.round(b.width)}|${Math.round(b.bottom - p.bottom)}`
        })
        seen.add(m)
        await page.locator('.tk-activated-btn').first().click()
      }
    }
    expect([...seen]).toHaveLength(1) // same portrait top, button width, and button ends at portrait bottom
    expect([...seen][0].endsWith('|0')).toBe(true)
  })

  test('the selected tab keeps a white vitality number', async ({ page }) => {
    await createCompany(page, { warriors: ['Fighter', 'Scout'] })
    await startPlay(page)
    const color = await page.locator('.tk-tab.tk-tab-active .tk-tab-vit').evaluate(e => getComputedStyle(e).color)
    expect(color).toBe('rgb(255, 255, 255)')
  })

  test('a game in progress is saved and can be resumed after reload', async ({ page }) => {
    await createCompany(page, { name: 'Resume Co', warriors: ['Fighter'] })
    await waitForSaved(page)
    await startPlay(page)
    const count = page.locator('.tk-vit-count')
    const before = await count.innerText()
    const max = Number(before.split('/')[1])
    await page.locator('.tk-vit-box').nth(max - 1).click()
    await expect(count).not.toHaveText(before)
    const after = await count.innerText()
    await page.waitForTimeout(1500) // game state save debounce
    await page.reload()
    await page.getByText('Resume Co', { exact: true }).first().click()
    await page.locator('.builder-play-pill').click()
    await expect(page.getByText('RESUME GAME?')).toBeVisible()
    await page.getByRole('button', { name: 'RESTORE GAME' }).click()
    await dismissMarkPopup(page)
    await expect(page.locator('.tk-vit-count')).toHaveText(after)
  })

  test('an expended item can be undone: tap it, confirm, it is back', async ({ page }) => {
    await createCompany(page, { warriors: ['Fighter'] })
    await startPlay(page)
    const confirm = () => page.locator('.co-sheet-done', { hasText: 'CONFIRM' }).click()
    const herbs = page.locator('.tk-equip-card', { hasText: 'Herbs & Tonic' })
    const count = page.locator('.tk-vit-count')
    const max = Number((await count.innerText()).split('/')[1])

    // Take 2 hits, then heal with Herbs & Tonic
    const vit = n => `${n}/${max}`
    await page.locator('.tk-vit-box').nth(max - 2).click()
    await expect(count).toHaveText(vit(max - 2))
    await page.locator('.tk-hdr-btn-cache').click()
    await page.locator('.cache-item-btn', { hasText: 'Herbs & Tonic' }).click()
    await herbs.click()
    await page.locator('.tk-detail-btn--expend').click()
    await confirm()
    await expect(count).toHaveText(vit(max))
    await expect(herbs).toContainText('EXPENDED')

    // Undo: the item is usable again and the healing is taken back
    await herbs.click()
    await expect(page.getByText('Undo Herbs & Tonic?')).toBeVisible()
    await confirm()
    await expect(herbs).toContainText('HEAL 3 VIT')
    await expect(count).toHaveText(vit(max - 2))
  })

  test('shield abilities can be used from the shield tile and stay in sync with the Abilities list', async ({ page }) => {
    await createCompany(page, { warriors: ['Knight'] })
    await startPlay(page)
    const shield = page.locator('.tk-equip-card', { hasText: 'Shield' })
    const guardedAbility = page.locator('.tk-ability', { hasText: 'GUARDED' })
    // Use GUARDED from the shield's sheet
    await shield.click()
    await page.locator('.tk-opr-row', { hasText: 'GUARDED' }).click()
    await expect(page.locator('.tk-opr-row', { hasText: 'GUARDED' })).toContainText('Used this round')
    await page.locator('.tk-detail-btn--ghost').click()
    await expect(shield.locator('.tk-opr-cell--used')).toHaveText('Guard')
    await expect(guardedAbility).toContainText('USED')
    // Un-use it from the Abilities list: the tile follows
    await guardedAbility.click()
    await expect(guardedAbility).toContainText('ONCE PER ROUND')
    await expect(shield.locator('.tk-opr-cell--used')).toHaveCount(0)
  })
})
