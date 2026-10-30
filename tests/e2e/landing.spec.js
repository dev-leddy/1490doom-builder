import { test, expect } from '@playwright/test'
import { signUp, createCompanyViaApi, openCompanyList } from './helpers.js'

test.describe('landing (guest)', () => {
  test('shows the two ways in and the game panel', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.landing-start-card')).toHaveCount(2)
    await expect(page.locator('.landing-start-card').first()).toContainText('Take the quiz')
    await expect(page.locator('.landing-start-card').last()).toContainText('Build your company')
    await expect(page.locator('.landing-world')).toContainText('What is 1490 DOOM?')
    await expect(page.locator('.landing-world-btn')).toHaveAttribute('href', 'https://1490doom.com')
    await expect(page.locator('.landing-shop-pill')).toHaveAttribute('href', '/go/shop/physical?from=landing') // counted, then on to the store
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
    await expect(page.locator('.app-menu-row', { hasText: '1490 DOOM Shop' })).toHaveAttribute('href', '/go/shop/physical?from=menu')
  })

  test('a non-company #hash does not open a "shared company"', async ({ page }) => {
    await page.goto('/#top')
    await expect(page.locator('.landing-start-card')).toHaveCount(2)
    await expect(page.locator('.share-view-banner')).toHaveCount(0)
  })
})

test.describe('landing (signed in)', () => {
  test('signed-in players see what the app and game are, too', async ({ page }) => {
    await signUp(page)
    await expect(page.locator('.landing-start-card')).toHaveCount(2)
    await expect(page.locator('.landing-about-heading')).toHaveText('What you can do here')
    await expect(page.locator('.landing-world')).toContainText('What is 1490 DOOM?')
  })

  test('returning players: Your companies opens the list, Skirmish then Campaign', async ({ page }) => {
    await signUp(page)
    await createCompanyViaApi(page, { name: 'Skirm Co', slots: [{ type: 'Fighter', weapon1: 'Light Weapon' }] })
    await page.goto('/')
    await expect(page.locator('.landing-intro')).toHaveCount(0) // no welcome line for returning players
    await expect(page.locator('.landing-start-card').first().locator('.landing-start-title')).toHaveText('Your companies') // no count
    await expect(page.locator('.saved-chip')).toHaveCount(0) // the list isn't on the landing page

    await openCompanyList(page)
    await expect(page.locator('.companies-section-head')).toHaveText([/^Skirmish\s*1$/, /^Campaign$/])
    await expect(page.locator('.companies-section').first()).toContainText('Skirm Co')
    // no campaigns: just the way to start one, which opens the wizard on Campaign
    const empty = page.locator('.companies-section').last().locator('.companies-empty')
    await expect(empty).toHaveText(/^Start a campaign/)
    await empty.getByRole('button', { name: 'Start a campaign' }).click()
    await expect(page.locator('.ncp-mode-pill', { hasText: 'Campaign' })).toHaveAttribute('aria-pressed', 'true')
    await expect(page.locator('.ncp-mode-pill').first()).toHaveText('Skirmish')
    // Back returns to the list it came from; Home goes to the landing page
    await page.locator('.ncp-back-btn').first().click()
    await expect(page.locator('.companies-title')).toHaveText('Your companies')
    await page.locator('.companies-back').click()
    await expect(page.locator('.landing-start-title').first()).toHaveText('Your companies')
  })
})
