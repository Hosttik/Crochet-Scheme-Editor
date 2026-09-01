import { expect, test, type Page } from '@playwright/test'
import { createGuideFromToolRail } from './helpers/uiV2Guides'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

async function canvasBox(page: Page) {
  const box = await page.locator('svg.editor-canvas').boundingBox()
  expect(box).not.toBeNull()
  return box!
}

async function placeAt(page: Page, title: string, rx: number, ry: number) {
  await page.locator(`.symbols-section .symbol-button[title^="${title} ·"]`).click()
  const box = await canvasBox(page)
  await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry)
  await page.keyboard.press('Escape')
}

async function openDetails(page: Page, testId: string) {
  const details = page.getByTestId(testId)
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await details.locator(':scope > summary').click()
  }
  return details
}

test('uses Copy terminology instead of Repeat in the productivity UI', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.5, 0.48)

  const productivity = page.locator('.productivity-panel')
  await expect(productivity.getByText('Копирование', { exact: true })).toBeVisible()
  await expect(productivity.getByText('Повтор', { exact: true })).toHaveCount(0)
  await expect(productivity).not.toContainText('Repeat')
})

test('shows the guide numeric value on hover without requiring guide selection', async ({ page }) => {
  await openEditor(page)
  await createGuideFromToolRail(page, 'Линия')
  await placeAt(page, 'Столбик без накида', 0.72, 0.72)

  const guide = page.locator('.guide-line').first()
  const label = guide.locator('.guide-value-label')
  await expect(label).toBeAttached()
  expect(await label.evaluate((element) => getComputedStyle(element).opacity)).toBe('0')

  await guide.locator('.guide-stroke').hover({ force: true })
  await expect.poll(async () => label.evaluate((element) => getComputedStyle(element).opacity)).toBe('1')
  await expect(label).toContainText('°')
})

test('keeps user-selected snapping and copy modes across a reload', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.5, 0.48)

  const snapping = await openDetails(page, 'snapping-global-panel')
  await snapping.locator('fieldset').filter({ has: page.getByText('Ориентация', { exact: true }) }).locator('select').selectOption('along')

  const productivity = page.locator('.productivity-panel')
  await productivity.getByRole('button', { name: 'По кругу', exact: true }).click()
  await productivity.getByLabel('Копий', { exact: true }).fill('7')
  await productivity.getByLabel('Копий', { exact: true }).press('Enter')
  await productivity.getByLabel('Шаг °', { exact: true }).fill('30')
  await productivity.getByLabel('Шаг °', { exact: true }).press('Enter')

  // The copy/snapping preferences use immediate localStorage persistence, while the
  // document itself uses the editor autosave delay. Let the placed stitch cross that
  // transaction boundary before reloading so this test verifies both contracts.
  await expect(page.locator('.stitch-element')).toHaveCount(1)
  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')

  await page.reload()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await expect(page.locator('.stitch-element')).toHaveCount(1)

  const snappingAfter = await openDetails(page, 'snapping-global-panel')
  await expect(snappingAfter.locator('fieldset').filter({ has: page.getByText('Ориентация', { exact: true }) }).locator('select')).toHaveValue('along')

  // Selection is intentionally transient UI state and is not restored with the document.
  // Re-enter the same authoring context before checking the persisted tool preferences.
  await page.locator('.stitch-element').first().click()
  await expect(page.locator('.stitch-element.selected')).toHaveCount(1)

  const productivityAfter = page.locator('.productivity-panel')
  await expect(productivityAfter.getByRole('button', { name: 'По кругу', exact: true })).toHaveClass(/active/)
  await expect(productivityAfter.getByLabel('Копий', { exact: true })).toHaveValue('7')
  await expect(productivityAfter.getByLabel('Шаг °', { exact: true })).toHaveValue('30')
})

test('lets fan stitches use precise stem spacing and height controls', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, '3 столбика с накидом с общим основанием', 0.5, 0.48)

  const control = page.getByTestId('fan-geometry-control')
  await expect(control).toBeVisible()
  await expect(control).toContainText('Геометрия веера')

  const stitch = page.locator('.stitch-element').first()
  const initialSpread = Number(await stitch.getAttribute('data-spread'))
  const spacing = control.getByLabel('Между столбиками', { exact: true })
  const initialSpacing = Number(await spacing.inputValue())
  await spacing.fill(String(initialSpacing * 1.6))
  await spacing.press('Enter')
  await expect.poll(async () => Number(await stitch.getAttribute('data-spread'))).toBeGreaterThan(initialSpread * 1.4)

  const height = control.getByLabel('Общая высота, %', { exact: true })
  await height.fill('150')
  await height.press('Enter')
  await expect.poll(async () => Number(await stitch.getAttribute('data-scale-y'))).toBeCloseTo(1.5, 2)
})