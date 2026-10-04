import { test, expect } from '@playwright/test'

test.describe('landing (guest)', () => {
  test('shows the two ways in and the game panel', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.landing-start-card')).toHaveCount(2)
    await expect(page.locator('.landing-start-card').first()).toContainText('Take the quiz')
    await expect(page.locator('.landing-start-card').last()).toContainText('Build your company')
    await expect(page.locator('.landing-world')).toContainText('What is 1490 DOOM?')
    await expect(page.locator('.landing-world-btn')).toHaveAttribute('href', 'https://1490doom.com')
    await expect(page.locator('.landing-shop-pill')).toHaveAttribute('href', 'https://buergames.com/collections/1490-doom-physical')
  })

  test('building asks a guest to sign in, opening on the email form', async ({ page }) => {
    await page.goto('/')
    await page.locator('.landing-start-card', { hasText: 'Build your company' }).click()
    await expect(page.getByText('Sign in or create account')).toBeVisible()
    await expect(page.getByText('Sign in to create and save companies.')).toBeVisible()
    await expect(page.locator('input[type=email]')).toBeVisible()
    await expect(page.locator('.auth-oauth-btn').first()).toHaveAttribute('href', '/api/auth/discord')
    await expect(page.locator('.auth-oauth-btn').last()).toHaveAttribute('href', '/api/auth/google')
  })

  test('guest menu: one sign-in prompt, no company actions', async ({ page }) => {
    await page.goto('/')
    await page.locator('.topbar-menu-btn').click()
    await expect(page.locator('.app-menu-signin')).toBeVisible()
    await expect(page.locator('.app-menu-row', { hasText: 'My companies' })).toHaveCount(0)
    await expect(page.getByText('This company')).toHaveCount(0)
    await expect(page.locator('.app-menu-row', { hasText: '1490 DOOM Shop' })).toHaveAttribute('href', 'https://buergames.com/collections/1490-doom-physical')
  })

  test('a non-company #hash does not open a "shared company"', async ({ page }) => {
    await page.goto('/#top')
    await expect(page.locator('.landing-start-card')).toHaveCount(2)
    await expect(page.locator('.share-view-banner')).toHaveCount(0)
  })
})
