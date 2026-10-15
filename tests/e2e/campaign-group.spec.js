import { test, expect } from '@playwright/test'
import { signUp, createCompanyViaApi, waitForSaved } from './helpers.js'

// Shared campaigns: two players join one campaign and see each other's company read-only.
// Every account here is made on the LOCAL server (signUp). Needs migration 007 applied locally:
//   npx wrangler d1 execute doom-builder --local --file=db/migrations/007_campaign_groups.sql

const SLOTS = [{ type: 'Fighter', weapon1: 'Light Weapon' }, { type: 'Scout', weapon1: 'Bow' }]

async function newPlayer(browser, testInfo, name) {
  const { baseURL, viewport } = testInfo.project.use
  const context = await browser.newContext({ baseURL, viewport })
  const page = await context.newPage()
  await signUp(page, name)
  return { context, page }
}

const companyId = (page, name) => page.evaluate(async n => {
  const { companies } = await (await fetch('/api/companies', { credentials: 'include' })).json()
  return companies.find(c => c.name === n).id
}, name)

const status = (page, url) => page.evaluate(async u => (await fetch(u, { credentials: 'include' })).status, url)

test('two players share a campaign; outsiders and leavers are kept out', async ({ browser }, testInfo) => {
  const ann = await newPlayer(browser, testInfo, 'Ann')
  const bo = await newPlayer(browser, testInfo, 'Bo')
  const cy = await newPlayer(browser, testInfo, 'Cy')
  try {
    // Ann: a campaign company, then Play together -> Start a shared campaign
    await createCompanyViaApi(ann.page, { name: 'Ann Wolves', mode: 'campaign', ipLimit: 0, slots: SLOTS })
    await ann.page.getByTestId('campaign-menu').click()
    await ann.page.getByTestId('cmp-set-play-together').click()
    await ann.page.getByTestId('cg-start').click()
    const codeEl = ann.page.getByTestId('cg-code')
    await expect(codeEl).toHaveText(/^[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/)
    await expect(ann.page.getByText('Expires in 7 days')).toBeVisible()
    await expect(ann.page.getByTestId('cg-link')).toContainText('/j/')
    const code = await codeEl.innerText()
    await ann.page.locator('.co-sheet-done').click()

    // Bo: a campaign company, then the invite link -> join sheet -> Join
    await createCompanyViaApi(bo.page, { name: 'Bo Ravens', mode: 'campaign', ipLimit: 0, slots: SLOTS })
    await bo.page.goto(`/j/${code}`)
    await expect(bo.page.getByText('Ann Wolves')).toBeVisible()
    await expect(bo.page.getByText("Members see this company's roster, results and log.")).toBeVisible()
    await expect(bo.page.getByRole('radio', { name: /Bo Ravens/ })).toBeChecked()
    await bo.page.getByTestId('cg-join-confirm').click()
    await expect(bo.page.getByTestId('cg-strip')).toContainText('Ann')

    const annCompany = await companyId(ann.page, 'Ann Wolves')
    const boCompany = await companyId(bo.page, 'Bo Ravens')
    const groupId = await bo.page.evaluate(async id =>
      (await (await fetch(`/api/campaign-groups?companyId=${id}`, { credentials: 'include' })).json()).group.id, boCompany)

    // Ann records game 1: a Victory, everyone standing, survivor point to the Fighter
    await ann.page.reload()
    await ann.page.getByText('Ann Wolves', { exact: true }).first().click()
    await ann.page.locator('.ch-camp-eog-btn').click()
    await ann.page.locator('[data-result="win"]').click()
    await ann.page.locator('.eog-next-btn').click()
    await ann.page.locator('.eog-next-btn').click()
    await ann.page.locator('.eog-pick[data-slot="0"]').first().click()
    await ann.page.locator('.eog-next-btn').click()
    await ann.page.locator('.eog-record-btn').click()
    await waitForSaved(ann.page)

    // Bo opens Ann's company from the members row and sees the game
    await bo.page.getByTestId('cg-strip').click()
    await bo.page.getByRole('button', { name: /Open Ann Wolves/ }).click()
    const view = bo.page.getByTestId('member-view')
    await expect(view).toContainText('View only')
    await expect(view).toContainText('Fighter')
    await view.getByRole('button', { name: 'Games' }).click()
    await expect(view.locator('.cmp-log-game[data-game="1"]')).toContainText('Victory')
    await expect(view.locator('.cmp-log-pencil')).toHaveCount(0)           // nothing editable
    await view.getByRole('button', { name: 'Activity' }).click()
    await expect(view.getByTestId('mcv-activity')).toBeVisible()

    // What Bo reads of Ann carries no notes and no undo snapshot
    const shared = await bo.page.evaluate(async ([g, c]) =>
      (await fetch(`/api/campaign-groups/${g}/members/${c}`, { credentials: 'include' })).json(), [groupId, annCompany])
    expect(shared.company.campaign.log[0].before).toBeUndefined()
    expect(shared.company.slots.every(s => s.notes === undefined)).toBe(true)
    await bo.page.keyboard.press('Escape')

    // Cy is not a member: every read is refused
    for (const url of [
      `/api/campaign-groups/${groupId}`,
      `/api/campaign-groups/${groupId}/activity?after=0`,
      `/api/campaign-groups/${groupId}/members/${annCompany}`,
    ]) expect(await status(cy.page, url)).toBe(403)

    // Bo leaves: Bo can't read the group any more, and Ann can't read Bo
    await bo.page.getByTestId('cg-leave').click()
    await bo.page.locator('.co-sheet-done', { hasText: 'Leave' }).click()
    await expect(bo.page.getByTestId('cg-start')).toBeVisible()
    for (const url of [
      `/api/campaign-groups/${groupId}`,
      `/api/campaign-groups/${groupId}/activity?after=0`,
      `/api/campaign-groups/${groupId}/members/${annCompany}`,
    ]) expect(await status(bo.page, url)).toBe(403)
    expect(await status(ann.page, `/api/campaign-groups/${groupId}/members/${boCompany}`)).toBe(403)
  } finally {
    await Promise.all([ann.context.close(), bo.context.close(), cy.context.close()])
  }
})

test('an expired or unknown code says so; your own group says you are in it', async ({ browser }, testInfo) => {
  const ann = await newPlayer(browser, testInfo, 'Ann')
  try {
    await createCompanyViaApi(ann.page, { name: 'Solo Co', mode: 'campaign', ipLimit: 0, slots: SLOTS })
    const id = await companyId(ann.page, 'Solo Co')
    const { group } = await ann.page.evaluate(async c => (await fetch('/api/campaign-groups', {
      method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ companyId: c }),
    })).json(), id)

    // Joining your own group again is refused with a reason
    const again = await ann.page.evaluate(async ([code, c]) => {
      const res = await fetch('/api/campaign-groups/join', {
        method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, companyId: c }),
      })
      return { status: res.status, ...(await res.json()) }
    }, [group.code, id])
    expect(again.status).toBe(409)
    expect(again.error).toBe('own_group')

    await ann.page.goto(`/j/${group.codeDisplay}`)
    await expect(ann.page.getByTestId('cg-join-own')).toContainText('Solo Co')
    await ann.page.getByRole('button', { name: 'Not now' }).click()

    await ann.page.goto('/j/ZZZZ-ZZZZ')
    await expect(ann.page.getByTestId('cg-join-missing')).toBeVisible()
  } finally {
    await ann.context.close()
  }
})
