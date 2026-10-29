import { test, expect } from '@playwright/test'
import { signUp, createCompany, createCompanyViaApi, waitForSaved, shareLink, dismissMarkPopup } from './helpers.js'

test.describe('Beastmaster', () => {
  test.beforeEach(async ({ page }) => { await signUp(page) })

  // the warrior's own stats (the companion row has a stats row of its own)
  const statVal = (card, stat) => card.locator('.stats-row:not(.eq-companion-stats) .stat-box', { hasText: stat }).locator('.stat-val')
  const animalStat = (card, stat) => card.locator('.eq-companion-stats .stat-box', { hasText: stat }).locator('.stat-val')

  test('comes with the Raptor for free; switching animals moves the bonus', async ({ page }) => {
    await createCompany(page, { warriors: ['Beastmaster'] })
    const card = page.locator('.warrior-slot').first()
    await expect(card.locator('.slot-number')).toContainText('Beastmaster')
    await expect(card).toContainText(/polearm/i)

    // default animal: Raptor (+1 MOV), marked on the stat, no IP spent
    const row = card.locator('.eq-companion-row')
    await expect(row).toContainText('Raptor')
    await expect(row.locator('.bd-ability', { hasText: '+1 MOVEMENT' })).toContainText('While the Raptor lives, the Beastmaster has +1 MOVEMENT.')
    await expect(row.locator('.eq-companion-bonus')).toHaveCount(0)
    await expect(statVal(card, 'MOV')).toHaveText('5')
    await expect(card.locator('.stat-box--companion')).toHaveCount(1)
    // the animal's own stats: the Beastmaster's (bonus included), VIT always 4
    await expect(animalStat(card, 'MOV')).toHaveText('5')
    await expect(animalStat(card, 'VIT')).toHaveText('4')
    await expect(animalStat(card, 'SKL')).toHaveText('4+')
    await expect(card).toContainText('SUNDER WEAPON')
    // full rule text: the class ability as printed, and the animal's static ability with its once-per-game one
    await expect(card).toContainText('auto-passes CLIMB SKILL Checks')
    await expect(row.locator('.restriction-note')).toHaveCount(0)
    await expect(row.locator('.bd-ability', { hasText: 'FLIGHT' })).toContainText('Flies over all terrain, never falls.')
    await expect(row.locator('.bd-ability', { hasText: 'SUNDER WEAPON' })).toContainText('Once per game, spend an action to Sunder')
    await expect(card.locator('.bd-abilities:not(.eq-companion-abilities)')).not.toContainText('SUNDER WEAPON') // not repeated in the class list

    // the picker: free and required, so there is no Remove
    await row.locator('.eq-companion-pick').click()
    await expect(page.locator('.companion-pick')).toHaveCount(3)
    // like the Company Mark sheet: no explainer, the picked animal's stats and rules, Cancel / Done
    await expect(page.locator('.companion-sheet')).not.toContainText('Free and required')
    await expect(page.locator('.companion-sheet .companion-sheet-card.is-picked').locator('.eq-companion-stats .stat-box', { hasText: 'VIT' })).toContainText('4')
    await expect(page.locator('.companion-sheet').locator('svg.companion-icon')).toHaveCount(0)
    await expect(page.getByRole('button', { name: /remove/i })).toHaveCount(0)
    await expect(page.locator('.companion-pick', { hasText: 'Cat' })).not.toContainText('→') // no stat preview
    await page.locator('.companion-pick', { hasText: 'Cat' }).click()
    await expect(page.locator('.companion-sheet .companion-sheet-card.is-picked').locator('.eq-companion-stats .stat-box', { hasText: 'COM' })).toContainText('4+')
    await expect(row).toContainText('Raptor') // nothing changes until Done
    const sheetHeight = async () => (await page.locator('.companion-sheet').boundingBox()).height
    const catHeight = await sheetHeight()
    await page.locator('.companion-pick', { hasText: 'Monkey' }).click()
    expect(await sheetHeight()).toBe(catHeight)
    await page.locator('.companion-pick', { hasText: 'Cat' }).click()
    await page.getByRole('button', { name: 'Done', exact: true }).click()

    await expect(row).toContainText('Cat')
    await expect(statVal(card, 'MOV')).toHaveText('4')
    await expect(statVal(card, 'COM')).toHaveText('4+')
    await expect(card).toContainText('STUN')
    await expect(card).not.toContainText('SUNDER WEAPON')
  })

  test('the chosen animal survives a share link', async ({ page }) => {
    await createCompany(page, { name: 'Menagerie Co', warriors: ['Beastmaster', 'Fighter'] })
    const card = page.locator('.warrior-slot').first()
    await card.locator('.eq-companion-pick').click()
    await page.locator('.companion-pick', { hasText: 'Monkey' }).click()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(card.locator('.eq-companion-row')).toContainText('Monkey')
    await waitForSaved(page)

    const { payload, tts } = await shareLink(page)
    expect(tts.warriors[0].companion).toBe('Monkey')

    const guest = await (await page.context().browser().newContext({ viewport: { width: 420, height: 900 } })).newPage()
    await guest.goto('/#' + payload)
    const shared = guest.locator('.warrior-slot').first()
    await expect(shared.locator('.eq-companion-row')).toContainText('Monkey')
    await expect(statVal(shared, 'SKL')).toHaveText('3+')
  })

  test('each animal can be renamed; the name follows it into play and share links', async ({ page }) => {
    await createCompany(page, { name: 'Named Co', warriors: ['Beastmaster', 'Fighter'] })
    const card = page.locator('.warrior-slot').first()
    const row = card.locator('.eq-companion-row')
    // named in the companion sheet; Cancel throws the name away
    await row.locator('.eq-companion-pick').click()
    await page.locator('.companion-sheet').getByRole('button', { name: 'Rename Raptor' }).click()
    await page.locator('.companion-sheet').getByRole('textbox', { name: 'Name your Raptor' }).fill('Nope')
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(row.locator('.eq-companion-name-text')).toHaveText('Raptor')

    await row.locator('.eq-companion-pick').click()
    await page.locator('.companion-sheet').getByRole('button', { name: 'Rename Raptor' }).click()
    await page.locator('.companion-sheet').getByRole('textbox', { name: 'Name your Raptor' }).fill('Clawfoot')
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(row.locator('.eq-companion-name-text')).toHaveText('Clawfoot')
    await expect(row.locator('.eq-companion-kind')).toHaveText('Raptor')

    // swapping animals: the Cat has its own (no) name, the Raptor keeps its name
    await row.locator('.eq-companion-pick').click()
    // the selector always says what the animal is; its name shows in the panel below
    await expect(page.locator('.companion-pick')).toHaveText(['Raptor', 'Monkey', 'Cat'])
    await expect(page.locator('.companion-sheet-name')).toHaveText('Clawfoot')
    await page.locator('.companion-pick', { hasText: 'Cat' }).click()
    await expect(page.locator('.companion-sheet').locator('.companion-sheet-name')).toHaveText('Cat')
    await expect(page.locator('.companion-sheet').getByRole('button', { name: 'Rename Cat' })).toBeVisible()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(row.locator('.eq-companion-name-text')).toHaveText('Cat')
    await row.locator('.eq-companion-pick').click()
    await page.locator('.companion-pick', { hasText: 'Raptor' }).click()
    await page.getByRole('button', { name: 'Done', exact: true }).click()
    await expect(row.locator('.eq-companion-name-text')).toHaveText('Clawfoot')
    await waitForSaved(page)

    const { payload } = await shareLink(page)
    const guest = await (await page.context().browser().newContext({ viewport: { width: 420, height: 900 } })).newPage()
    await guest.goto('/#' + payload)
    const shared = guest.locator('.warrior-slot').first().locator('.eq-companion-row')
    await expect(shared.locator('.eq-companion-name-text')).toHaveText('Clawfoot')
    await expect(shared.locator('.eq-companion-chevron')).toBeHidden()

    await page.locator('.co-settings-sheet .co-sheet-close').click() // close the share sheet
    await expect(page.locator('.co-settings-sheet')).toHaveCount(0)

    await page.locator('.builder-play-pill').click()
    await dismissMarkPopup(page)
    await expect(page.locator('.tk-companion .tk-companion-name')).toHaveText('Clawfoot')
    await expect(page.locator('.tk-companion .tk-companion-kicker')).toHaveText(/Raptor · Companion/i)
  })

  test('play: the animal has its own track; stats, GOAD and its ability follow it', async ({ page }) => {
    await createCompany(page, { warriors: ['Beastmaster', 'Fighter'] })
    await page.locator('.builder-play-pill').click()
    await dismissMarkPopup(page)
    const card = page.locator('.tk-card')
    const panel = card.locator('.tk-companion')
    const mov = card.locator('.tk-stats-strip:not(.tk-companion-stats) .tk-stat', { hasText: 'MOV' }).locator('.tk-stat-val')
    const goad = card.locator('.tk-ability', { hasText: 'GOAD' })
    const sunder = panel.locator('.tk-companion-ability')

    await expect(panel.locator('.tk-companion-name')).toHaveText('Raptor')
    await expect(panel.locator('.tk-companion-passive')).toContainText('FLIGHT')
    // the animal's stat bar: the Beastmaster's stats with its bonus, VIT its own 4
    const animalStat = st => panel.locator('.tk-companion-stats .tk-stat', { hasText: st }).locator('.tk-stat-val')
    await expect(animalStat('MOV')).toHaveText('5')
    await expect(animalStat('VIT')).toHaveText('4')
    await expect(panel.locator('.tk-vit-count')).toHaveText('4/4')
    await expect(mov).toHaveText('5')
    await expect(goad).not.toContainText('NEEDS COMPANION')
    await expect(page.locator('.tk-tab-vit-sub')).toContainText('4')

    // the animal takes a status on its own; the Beastmaster doesn't
    await panel.getByRole('button', { name: 'Add status to Raptor' }).click()
    await page.locator('.status-item-btn', { hasText: 'STUNNED' }).click()
    await expect(panel.locator('.tk-status-card')).toContainText('STUNNED')
    await expect(sunder).toContainText('UNAVAILABLE · STUNNED')
    await expect(card.getByText('Active Statuses')).toHaveCount(0)

    // slay the animal: bonus gone, GOAD dims, its ability is unavailable
    await page.getByRole('button', { name: 'Raptor vitality 1' }).click()
    await expect(panel.locator('.tk-vit-count')).toHaveText('0/4')
    await expect(mov).toHaveText('4')
    await expect(goad).toContainText('NEEDS COMPANION')
    await expect(sunder).toContainText('UNAVAILABLE · SLAIN')
    await expect(page.locator('.tk-tab-vit-sub')).toContainText('✕')

    // heal it: everything comes back
    await page.getByRole('button', { name: 'Raptor vitality 4' }).click()
    await expect(mov).toHaveText('5')
    await expect(goad).not.toContainText('NEEDS COMPANION')

    // clearing a status is immediate (no confirm) and says so
    await panel.locator('.tk-status-card', { hasText: 'STUNNED' }).click()
    await page.getByRole('button', { name: 'Clear Status' }).click()
    await expect(page.locator('.toast')).toContainText('STUNNED cleared from Raptor')
    await expect(panel.locator('.tk-status-card')).toHaveCount(0)
  })

  test('play: the animal is removed with the Beastmaster (Undo puts both back); revival is per model', async ({ page }) => {
    await createCompany(page, { warriors: ['Beastmaster', 'Fighter'] })
    await page.locator('.builder-play-pill').click()
    await dismissMarkPopup(page)
    const card = page.locator('.tk-card')
    const panel = card.locator('.tk-companion')
    const ownerCount = card.locator('.tk-vit-row').first().locator('.tk-vit-count')
    await page.getByRole('button', { name: 'Raptor vitality 3' }).click() // the animal is at 2/4

    await page.getByRole('button', { name: 'Vitality 1', exact: true }).click() // Beastmaster → 0
    await expect(ownerCount).toHaveText('0/5')
    await expect(panel.locator('.tk-vit-count')).toHaveText('0/4')
    await expect(page.locator('.tk-undo-toast')).toContainText('Raptor removed with Beastmaster')
    await page.locator('.tk-undo-btn').click()
    await expect(ownerCount).toHaveText('5/5')
    await expect(panel.locator('.tk-vit-count')).toHaveText('2/4')

    // perish again, then revive only the Beastmaster: the animal stays down
    await page.getByRole('button', { name: 'Vitality 1', exact: true }).click()
    await page.locator('.tk-undo-close').click()
    await page.getByRole('button', { name: 'Vitality 5', exact: true }).click()
    await expect(ownerCount).toHaveText('5/5')
    await expect(panel).toContainText('SLAIN')

    // an animal healed while its Beastmaster is down is shown as removed
    await page.getByRole('button', { name: 'Vitality 1', exact: true }).click()
    await page.getByRole('button', { name: 'Raptor vitality 4' }).click()
    await expect(panel).toContainText('REMOVED')
    await expect(panel.locator('.tk-companion-ability')).toContainText('UNAVAILABLE · REMOVED')
  })

  test('play: the animal ability shows USED like a warrior ability (a Reliquary never offers it)', async ({ page }) => {
    await createCompany(page, { warriors: ['Beastmaster', 'Fighter'] })
    await page.locator('.builder-play-pill').click()
    await dismissMarkPopup(page)
    const sunder = page.locator('.tk-companion-ability')
    await sunder.click()
    await page.getByRole('button', { name: 'CONFIRM' }).click()
    await expect(sunder).toContainText('✓ USED')
  })

  test('campaign: an animal that died while the Beastmaster survived sits out the next game', async ({ page }) => {
    await createCompanyViaApi(page, { name: 'Hunt Campaign', mode: 'campaign', ipLimit: 0, slots: [{ type: 'Beastmaster', weapon1: 'Polearm (two-handed)', companion: 'Raptor' }, { type: 'Fighter', weapon1: 'Light Weapon' }] })
    await page.locator('.builder-play-pill').click()
    await dismissMarkPopup(page)
    await page.getByRole('button', { name: 'Raptor vitality 1' }).click() // the Raptor dies, the Beastmaster lives

    await page.getByRole('button', { name: 'Menu' }).click()
    await page.locator('.tk-menu-item--end-game').click()
    await page.locator('[data-result="loss"]').click()
    await page.locator('.eog-next-btn').click() // who fell
    const animal = page.locator('.eog-companion-row[data-companion="0"]')
    await expect(animal).toContainText('Raptor')
    await expect(animal.locator('.is-fell')).toHaveAttribute('aria-pressed', 'true') // filled in from play mode
    // choose what goes in its place
    const next = page.locator('.eog-companion-next')
    await expect(next).toContainText('Raptor sits out game 2')
    await expect(next.getByRole('radio')).toHaveText(['Monkey', 'Cat'])
    await expect(next.getByRole('radio', { name: 'Monkey' })).toHaveAttribute('aria-checked', 'true')
    await next.getByRole('radio', { name: 'Cat' }).click()
    await page.locator('.eog-next-btn').click() // award IP
    await page.locator('.eog-pick[data-slot="0"]').first().click()
    await page.locator('.eog-next-btn').click() // review
    await expect(page.locator('[data-companion-note="0"]')).toContainText('The Cat goes instead')
    await page.locator('.eog-record-btn').click()

    // back in the builder: a different animal, and the Raptor can't be picked this game
    const card = page.locator('.warrior-slot').first()
    await expect(card.locator('.eq-companion-row')).toContainText('Cat')
    await expect(card.locator('.eq-companion-resting')).toContainText('Raptor died last game')
    await card.locator('.eq-companion-pick').click()
    await expect(page.locator('.companion-pick', { hasText: 'Raptor' })).toBeDisabled()
    await expect(page.locator('.companion-pick', { hasText: 'Raptor' })).toContainText('Resting')
    await expect(page.locator('.companion-sheet')).toContainText('Raptor died last game')
    await page.getByRole('button', { name: 'Done', exact: true }).click()

    // the next game starts with the Cat, not the resting Raptor (the survivor point is still unspent)
    await page.locator('.builder-play-pill').click()
    await page.locator('.unspent-ip-sheet').getByRole('button', { name: 'Play anyway' }).click()
    await dismissMarkPopup(page)
    await expect(page.locator('.tk-companion .tk-companion-name')).toHaveText('Cat')
    await expect(page.locator('.tk-companion .tk-vit-count')).toHaveText('4/4')
    await page.getByRole('button', { name: 'Menu' }).click()
    await page.locator('.tk-menu-item', { hasText: 'Exit to Builder' }).click()

    // the lock survives a share link
    await waitForSaved(page)
    const { payload, tts } = await shareLink(page)
    expect(tts.warriors[0].restingCompanion).toBe('Raptor')
    const guest = await (await page.context().browser().newContext({ viewport: { width: 420, height: 900 } })).newPage()
    await guest.goto('/#' + payload)
    await expect(guest.locator('.warrior-slot').first().locator('.eq-companion-resting')).toContainText('Raptor')
  })

  test('play: the Monkey holds cache items; a warrior takes them; it drops them when slain', async ({ page }) => {
    await createCompanyViaApi(page, { name: 'Thief Co', slots: [{ type: 'Beastmaster', weapon1: 'Polearm (two-handed)', companion: 'Monkey' }, { type: 'Fighter', weapon1: 'Light Weapon' }] })
    await page.locator('.builder-play-pill').click()
    await dismissMarkPopup(page)
    const panel = page.locator('.tk-companion')
    const held = panel.locator('.tk-companion-held')

    // inspect a cache: the item goes to the Monkey, not the Beastmaster
    await page.getByRole('button', { name: 'Add cache item to Monkey' }).click()
    await page.locator('.cache-item-btn', { hasText: 'Food' }).click()
    await expect(held).toHaveText(/Food/)
    await page.getByRole('button', { name: 'Add cache item to Monkey' }).click()
    await page.locator('.cache-item-btn', { hasText: 'Cloak' }).click()
    await expect(held).toHaveCount(2)

    // a friendly warrior takes it (animals can't HANDOFF)
    await held.filter({ hasText: 'Food' }).click()
    await expect(page.getByText("The Monkey can’t EXPEND or HANDOFF it.", { exact: false })).toBeVisible()
    await page.getByRole('button', { name: 'Give to Beastmaster' }).click()
    await expect(held).toHaveCount(1)
    await expect(page.locator('.tk-card')).toContainText('Food')

    // slain: it drops what it holds (Undo puts it back)
    await page.getByRole('button', { name: 'Monkey vitality 1' }).click()
    await expect(held).toHaveCount(0)
    await expect(page.locator('.tk-undo-toast')).toContainText('Monkey dropped Cloak')
    await page.locator('.tk-undo-btn').click()
    await expect(held).toHaveCount(1)
    await expect(panel.locator('.tk-vit-count')).toHaveText('4/4')
  })
})
