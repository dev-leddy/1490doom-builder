import { test, expect } from '@playwright/test'

const UNRELEASED = /The (Ashbound|Doomed Choir|Tower Born|Wretched Survivors)/

async function playQuiz(page, pick) {
  await page.goto('/quiz.html')
  const begin = page.locator('.qz-btn-primary').first()
  if (await begin.count()) await begin.click()
  for (let i = 0; i < 8; i++) {
    const answers = page.locator('.qz-answer-btn')
    try { await answers.first().waitFor({ timeout: 4000 }) } catch { break }
    await answers.nth(Math.min(pick(i), (await answers.count()) - 1)).click()
    await page.waitForTimeout(700)
  }
  await expect(page.locator('.qz-btn-store')).toBeVisible()
}

test.describe('quiz', () => {
  // The answer pattern that used to land on The Tower Born
  test('unreleased companies hand their result to a partner', async ({ page }) => {
    await playQuiz(page, i => i % 2)
    await expect(page.locator('body')).not.toContainText(UNRELEASED)
    await expect(page.getByText('The Fog Walkers').first()).toBeVisible()
    await expect(page.locator('.qz-btn-store')).toHaveAttribute('href', '/go/product/the-fog-walkers-company')
  })

  test('no answer pattern produces an unreleased company', async ({ page }) => {
    for (const pick of [() => 0, () => 1, () => 2, () => 3, i => 2 + (i % 2), i => (i % 2) * 3]) {
      await playQuiz(page, pick)
      await expect(page.locator('body')).not.toContainText(UNRELEASED)
    }
  })

  test('building from the result asks a guest to sign in', async ({ page }) => {
    await page.goto('/')
    await page.locator('.landing-start-card', { hasText: 'Take the quiz' }).click()
    const begin = page.locator('.qz-btn-primary').first()
    if (await begin.count()) await begin.click()
    for (let i = 0; i < 8; i++) {
      const answers = page.locator('.qz-answer-btn')
      try { await answers.first().waitFor({ timeout: 4000 }) } catch { break }
      await answers.nth(i % 2).click()
      await page.waitForTimeout(700)
    }
    await page.locator('.qz-btn-primary', { hasText: /build your/i }).click()
    await expect(page.getByText('Sign in to build and save your company.')).toBeVisible()
  })
})
