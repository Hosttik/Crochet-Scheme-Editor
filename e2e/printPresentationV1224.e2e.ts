import { expect, test, type Page } from '@playwright/test'

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
  await page.locator(`.symbols-section .symbol-button[title^="${title} · "]`).click()
  const box = await canvasBox(page)
  await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry)
}

async function openGlobalPanel(page: Page, testId: string) {
  const details = page.getByTestId(testId)
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await details.locator(':scope > summary').click()
  }
  return details
}

test('shows the package version in app chrome', async ({ page }) => {
  await openEditor(page)
  const version = await page.locator('.brand').evaluate((element) => getComputedStyle(element, '::after').content.replaceAll('"', ''))
  expect(version).toBe('v1.26.0')
})

test('persists white canvas and grid visibility preferences', async ({ page }) => {
  await openEditor(page)
  const paper = page.locator('svg.editor-canvas rect[fill="#fbfaf7"]')
  const grid = page.locator('svg.editor-canvas rect[fill="url(#grid)"]')
  await openGlobalPanel(page, 'legend-global-panel')

  await page.getByTestId('canvas-white-toggle').check()
  await page.getByTestId('canvas-grid-toggle').uncheck()
  await expect(page.getByTestId('canvas-white-toggle')).toBeChecked()
  await expect(page.getByTestId('canvas-grid-toggle')).not.toBeChecked()
  expect(await paper.evaluate((element) => getComputedStyle(element).fill)).toBe('rgb(255, 255, 255)')
  expect(await grid.evaluate((element) => getComputedStyle(element).display)).toBe('none')

  await page.reload()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await openGlobalPanel(page, 'legend-global-panel')
  await expect(page.getByTestId('canvas-white-toggle')).toBeChecked()
  await expect(page.getByTestId('canvas-grid-toggle')).not.toBeChecked()
})

test('legend frame grows with labels and rows keep visible spacing', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Воздушная петля', 0.42, 0.46)
  await placeAt(page, 'Столбик без накида', 0.54, 0.52)

  const legend = page.locator('.legend-screen-overlay')
  await expect(legend).toBeVisible()
  expect(Number(await legend.locator('.legend-background').getAttribute('width'))).toBeGreaterThanOrEqual(260)

  const rows = legend.locator(':scope > g')
  await expect(rows).toHaveCount(2)
  const first = await rows.nth(0).getAttribute('transform')
  const second = await rows.nth(1).getAttribute('transform')
  const firstY = Number(first?.match(/translate\([^ ]+ ([^)]+)\)/)?.[1])
  const secondY = Number(second?.match(/translate\([^ ]+ ([^)]+)\)/)?.[1])
  expect(secondY - firstY).toBe(36)
})

test('tiled print adds matching registration crosses and keeps legend inside printable bounds', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.48, 0.48)
  await openGlobalPanel(page, 'print-global-panel')

  const panel = page.getByTestId('print-panel')
  await panel.getByTestId('print-scale').fill('400')
  await expect(panel.getByTestId('print-alignment-marks')).toBeChecked()
  expect(Number(await panel.getByTestId('print-page-count').textContent())).toBeGreaterThan(1)

  const popupPromise = page.waitForEvent('popup')
  await panel.getByRole('button', { name: 'Открыть печать', exact: true }).click()
  const popup = await popupPromise
  await popup.waitForLoadState('domcontentloaded')

  await expect(popup.locator('.registration-cross').first()).toBeAttached()
  await expect(popup.locator('.print-legend-overlay')).toHaveCount(1)
  const printable = await popup.locator('.print-legend-overlay').locator('xpath=..').boundingBox()
  const legend = await popup.locator('.print-legend-overlay').boundingBox()
  expect(printable).not.toBeNull()
  expect(legend).not.toBeNull()
  expect(legend!.x).toBeGreaterThanOrEqual(printable!.x)
  expect(legend!.y).toBeGreaterThanOrEqual(printable!.y)
  expect(legend!.x + legend!.width).toBeLessThanOrEqual(printable!.x + printable!.width + 1)
  expect(legend!.y + legend!.height).toBeLessThanOrEqual(printable!.y + printable!.height + 1)
})
