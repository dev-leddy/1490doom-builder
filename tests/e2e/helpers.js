import { expect } from '@playwright/test'

// Sign up a fresh account on the local server (sets the session cookie), then reload.
export async function signUp(page, name = 'Tester') {
  await page.goto('/')
  const status = await page.evaluate(async (username) => {
    const res = await fetch('/api/auth/email/register', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: `e2e-${Date.now()}-${Math.random().toString(36).slice(2)}@example.com`, username, password: 'password123' }),
    })
    return res.status
  }, name)
  expect(status).toBe(200)
  await page.reload()
  await expect(page.locator('.auth-avatar-btn')).toBeVisible()
}

export async function openWizard(page) {
  await page.locator('.landing-start-card', { hasText: 'Build your company' }).click()
  await expect(page.locator('.ncp-party')).toBeVisible()
}

// One-tap pick of a warrior class for wizard slot `index`
export async function pickWarrior(page, index, type) {
  await page.locator('.ncp-tile-main').nth(index).click()
  await page.locator('.wcp-item').filter({ has: page.locator('.wcp-name', { hasText: new RegExp(`^${type}$`, 'i') }) }).click()
  await expect(page.locator('.ncp-tile-name').nth(index)).toHaveText(new RegExp(type, 'i'))
}

export async function setWizardIp(page, target) {
  const val = page.locator('.ncp-mode-explain .ncp-stepper-val')
  const [minus, plus] = [page.locator('.ncp-mode-explain .ncp-stepper-btn').first(), page.locator('.ncp-mode-explain .ncp-stepper-btn').last()]
  for (let i = 0; i < 25 && Number(await val.innerText()) !== target; i++) {
    await (Number(await val.innerText()) > target ? minus : plus).click()
  }
  await expect(val).toHaveText(String(target))
}

// Wizard → builder with the given warriors; returns once the builder shows them
export async function createCompany(page, { name = 'E2E Company', warriors = ['Fighter', 'Scout'], ip } = {}) {
  await openWizard(page)
  await page.getByPlaceholder('Name your company…').fill(name)
  for (const [i, w] of warriors.entries()) {
    while (await page.locator('.ncp-tile').count() <= i) await page.locator('.ncp-add-warrior-btn').click()
    await pickWarrior(page, i, w)
  }
  if (ip !== undefined) await setWizardIp(page, ip)
  await page.locator('.ncp-btn--primary').click()
  await expect(page.getByLabel('Company Settings')).toBeVisible()
}

// Play mode can open with the company mark's reminder popup
export async function dismissMarkPopup(page) {
  const backdrop = page.locator('.mark-ability-backdrop')
  if (await backdrop.count()) await backdrop.locator('button').last().click()
}

// Wait until the auto-save queue has written to the cloud
export async function waitForSaved(page) {
  await expect(page.locator('.save-status')).toHaveCount(0, { timeout: 15_000 })
}

// Portrait top/bottom vs the visible stat boxes, for every warrior card
export function portraitAlignment(page) {
  return page.evaluate(() => [...document.querySelectorAll('.warrior-header-row')].map(row => {
    const img = row.querySelector('.warrior-portrait, .warrior-portrait-placeholder').getBoundingClientRect()
    const boxes = [...row.querySelectorAll('.stat-box')].map(b => b.getBoundingClientRect())
    return Math.abs(img.top - Math.min(...boxes.map(b => b.top))) < 1 && Math.abs(img.bottom - Math.max(...boxes.map(b => b.bottom))) < 1
  }))
}
