import { test, expect } from '@playwright/test'
import { signUp, createCompanyViaApi, waitForSaved } from './helpers.js'

// The campaign log in a shared campaign: other players' entries and fallen show up in your
// log, read-only. Every account here is made on the LOCAL server (signUp). Needs migration
// 007 applied locally (see campaign-group.spec.js).

async function newPlayer(browser, testInfo, name) {
  const { baseURL } = testInfo.project.use
  const context = await browser.newContext({ baseURL, viewport: { width: 1280, height: 800 } })
  const page = await context.newPage()
  await signUp(page, name)
  return { context, page }
}

const companyId = (page, name) => page.evaluate(async n => {
  const { companies } = await (await fetch('/api/companies', { credentials: 'include' })).json()
  return companies.find(c => c.name === n).id
}, name)

const post = (page, url, body) => page.evaluate(async ([u, b]) => {
  const res = await fetch(u, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
  return { status: res.status, data: await res.json().catch(() => ({})) }
}, [url, body])

test("another player's entries and fallen are in your log, read-only", async ({ browser }, testInfo) => {
  const ann = await newPlayer(browser, testInfo, 'Ann')
  const bo = await newPlayer(browser, testInfo, 'Bo')
  try {
    const slots = [{ type: 'Fighter', weapon1: 'Light Weapon' }, { type: 'Scout', weapon1: 'Bow' }]
    await createCompanyViaApi(ann.page, { name: 'Ann Wolves', mode: 'campaign', ipLimit: 0, slots })
    await createCompanyViaApi(bo.page, { name: 'Bo Ravens', mode: 'campaign', ipLimit: 0, slots })

    // Ann starts a shared campaign, Bo joins it (through the API: this test is about the log)
    const started = await post(ann.page, '/api/campaign-groups', { companyId: await companyId(ann.page, 'Ann Wolves') })
    expect(started.status).toBe(201)
    const joined = await post(bo.page, '/api/campaign-groups/join', { code: started.data.group.code, companyId: await companyId(bo.page, 'Bo Ravens') })
    expect(joined.status).toBe(200)

    // Bo records game 1: a Defeat, the Scout falls, survivor point to the Fighter
    await bo.page.locator('.ch-camp-eog-btn').click()
    await bo.page.locator('[data-result="loss"]').click()
    await bo.page.locator('.eog-next-btn').click()
    await bo.page.locator('.eog-fate-row[data-slot="1"] .is-fell').click()
    await bo.page.locator('.eog-next-btn').click()
    await bo.page.locator('.eog-pick[data-slot="0"]').first().click()
    await bo.page.locator('.eog-next-btn').click()
    await bo.page.locator('.eog-record-btn').click()
    await waitForSaved(bo.page)

    // Ann's log: Bo's game, with Bo's company in the Player column
    await ann.page.reload()
    await ann.page.getByText('Ann Wolves', { exact: true }).first().click()
    await ann.page.getByTestId('campaign-menu').click()
    await ann.page.getByTestId('cmp-set-log').click()
    const view = ann.page.getByRole('dialog', { name: /campaign log/i })
    const boRow = view.locator('tbody tr', { hasText: 'Game 1 recorded: Defeat' })
    await expect(boRow).toHaveCount(1)
    await expect(boRow.locator('.alv-player')).toContainText('Bo Ravens')
    await expect(boRow.locator('.alv-player')).toContainText('Bo')

    // Read-only entry: who owns it, no note, no edits
    await boRow.locator('.alv-open').click()
    const detail = view.locator('.alv-detail')
    await expect(detail).toContainText("Bo's company. Only Bo can change it.")
    await expect(detail.getByRole('button', { name: /Edit game/ })).toHaveCount(0)
    await expect(detail.getByLabel('Note')).toHaveCount(0)
    await detail.getByRole('button', { name: 'Close the entry' }).click()

    // The Player filter (and search) know the company and player names
    await view.getByLabel('Player', { exact: true }).selectOption({ label: 'Bo Ravens · Bo' })
    await expect(view.locator('tbody tr .alv-player.is-you')).toHaveCount(0)
    await view.getByRole('button', { name: 'Clear filters' }).click()
    await view.getByLabel('Search the log').fill('bo ravens')
    await expect(boRow).toHaveCount(1)
    await view.getByLabel('Search the log').fill('')

    // By game: Bo's fallen in their own section, read-only
    await view.getByRole('button', { name: 'By game' }).click()
    const boFallen = view.locator('.cmp-fallen-roll.is-readonly', { hasText: 'Bo Ravens · Bo' })
    await expect(boFallen).toContainText('Scout')
    await expect(boFallen.locator('button')).toHaveCount(0)
    await expect(view.locator('.cmp-fallen-roll', { hasText: 'Your fallen' })).toHaveCount(0) // nobody of Ann's fell
    // Bo's cards, read-only
    await view.getByRole('button', { name: 'Bo Ravens · Bo' }).click()
    await expect(view.locator('.cmp-log-game[data-game="1"]')).toContainText('Defeat')
    await expect(view.getByRole('button', { name: /Edit game/ })).toHaveCount(0)
  } finally {
    await ann.context.close()
    await bo.context.close()
  }
})
