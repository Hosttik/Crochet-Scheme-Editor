import { expect, test, type Page } from '@playwright/test'
import { openGlobalPanel } from './helpers/rightWorkspace'

async function canvasBox(page: Page) {
  const box = await page.locator('svg.editor-canvas').boundingBox()
  if (!box) throw new Error('Canvas is not visible')
  return box
}

async function placeSingleCrochet(page: Page) {
  const box = await canvasBox(page)
  await page.locator('.symbols-section .symbol-button[title^="Столбик без накида ·"]').click()
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
}

async function openTopbarSettings(page: Page) {
  const menu = page.locator('.topbar-autosave-menu')
  if (!(await menu.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await menu.locator('summary').click()
  }
  return menu
}

async function autosaveControl(page: Page) {
  const menu = await openTopbarSettings(page)
  return menu.getByRole('combobox', { name: 'Автосохранение', exact: true })
}

test('flushes long-delay edits when the page is being hidden', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await (await autosaveControl(page)).selectOption('60000')
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')

  await placeSingleCrochet(page)
  await expect(page.locator('.stitch-element')).toHaveCount(1)

  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')

  await page.reload()
  await expect(await autosaveControl(page)).toHaveValue('60000')
  await expect(page.locator('.stitch-element')).toHaveCount(1)
})

test('surfaces storage failure instead of reporting a successful autosave', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: undefined,
    })
  })

  await page.goto('/Crochet-Scheme-Editor/')

  await expect(page.locator('.autosave-indicator')).toContainText(/ошиб|error/i)
  await expect(page.locator('.project-error')).toContainText('IndexedDB is unavailable')
  await expect(page.locator('.autosave-indicator')).not.toContainText('Автосохранено')
})

test('reports row-number deletion correctly in English', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  const panel = await openGlobalPanel(page, 'row-markers-global-panel')

  await panel.getByRole('button', { name: 'Поставить ряд №1' }).click()
  const box = await canvasBox(page)
  await page.mouse.click(box.x + box.width * 0.55, box.y + box.height * 0.5)
  await expect(page.locator('.row-marker')).toHaveCount(1)

  const settings = await openTopbarSettings(page)
  await settings.getByRole('button', { name: 'EN', exact: true }).click()
  await page.keyboard.press('Delete')

  await expect(page.locator('.row-marker')).toHaveCount(0)
  await expect(page.locator('.statusbar')).toContainText('Row number deleted')
})