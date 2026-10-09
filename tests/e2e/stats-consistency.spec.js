import { test, expect } from '@playwright/test'
import { signUp, createCompany, createCompanyViaApi, waitForSaved, dismissMarkPopup, shareLink } from './helpers.js'

const cardStat = (page, card, stat) => page.locator('.warrior-slot').nth(card).locator('.stat-box', { hasText: stat }).locator('.stat-val')
const printStat = (page, card, stat) => page.locator('#print-roster .pr-card').nth(card).locator('.pr-stat', { hasText: stat }).locator('.pr-stat-val')

test.describe('stats agree everywhere', () => {
  test.beforeEach(async ({ page }) => { await signUp(page) })

  test('dual wield: print shows the same ATK as the card (was counted twice)', async ({ page }) => {
    await createCompanyViaApi(page, { name: 'Dual Co', slots: [{ type: 'Fighter', weapon1: 'Light Weapon', weapon2: 'Light Weapon', ip: ['weapon2'] }] })
    const card = await cardStat(page, 0, 'ATK').innerText()
    await expect(printStat(page, 0, 'ATK')).toHaveText(card)
  })

  test('campaign: every stat improvement shows in builder, print and play; VIT +1 adds a box', async ({ page }) => {
    await createCompanyViaApi(page, {
      name: 'Campaign Co', mode: 'campaign', ipLimit: 0,
      slots: [{ type: 'Fighter', weapon1: 'Light Weapon', earnedIP: 2, statImproves: ['MOV', 'VIT'], ip: ['stat_0', 'stat_1'] }],
    })
    const mov = await cardStat(page, 0, 'MOV').innerText()
    const vit = await cardStat(page, 0, 'VIT').innerText()
    await expect(cardStat(page, 0, 'MOV')).toHaveClass(/modified/)
    await expect(cardStat(page, 0, 'VIT')).toHaveClass(/modified/)
    await expect(printStat(page, 0, 'MOV')).toHaveText(mov)   // print used to ignore campaign improvements
    await expect(printStat(page, 0, 'VIT')).toHaveText(vit)

    await page.locator('.builder-play-pill').click()
    await dismissMarkPopup(page)
    await expect(page.locator('.tk-vit-count')).toHaveText(`${vit}/${vit}`)   // used to miss the extra box
    await expect(page.locator('.tk-stat', { hasText: 'MOV' })).toHaveClass(/tk-stat-improved/) // only the first used to show
    await expect(page.locator('.tk-stat', { hasText: 'VIT' })).toHaveClass(/tk-stat-improved/)
    await page.locator('.tk-hdr-btn-ip').click()
    await expect(page.locator('.tk-ip-item')).toHaveCount(2)
  })

  test('a 4-warrior company survives its share link (only 3 used to)', async ({ page, browser }) => {
    await createCompany(page, { name: 'Four Co', warriors: ['Fighter', 'Scout', 'Brute', 'Knight'] })
    await waitForSaved(page)
    const { payload, tts } = await shareLink(page)
    expect(tts.warriors.map(w => w.type)).toEqual(['Fighter', 'Scout', 'Brute', 'Knight'])
    const guest = await (await browser.newContext({ viewport: { width: 420, height: 900 } })).newPage()
    await guest.goto('/#' + payload)
    for (const w of ['Fighter', 'Scout', 'Brute', 'Knight']) await expect(guest.locator('.slot-number', { hasText: w })).toBeVisible()
  })
})
