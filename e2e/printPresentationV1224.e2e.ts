import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
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
  await page.locator('.topbar-autosave-menu > summary').click()
  await expect(page.locator('.topbar-version')).toHaveText('v1.26.5')
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
  await expect(page.getByRole('button', { name: 'Сетка', exact: true })).toHaveAttribute('aria-pressed', 'false')
  await expect(paper).toHaveCSS('fill', 'rgb(255, 255, 255)')
  await expect(grid).toHaveCSS('display', 'none')

  await page.reload()
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
  await expect(page.getByTestId('canvas-white-toggle')).toBeChecked()
  await expect(page.getByTestId('canvas-grid-toggle')).not.toBeChecked()
})

test('shows page overlays and keeps document controls usable', async ({ page }) => {
  await openEditor(page)
  await openGlobalPanel(page, 'print-global-panel')
  const panel = page.getByTestId('print-panel')
  await expect(panel.getByText('Макет страниц')).toBeVisible()
  await expect(page.locator('.print-page-boundary').first()).toBeVisible()

  await panel.getByLabel('Показывать границы страниц').uncheck()
  await expect(page.locator('.print-page-boundary')).toHaveCount(0)
  await panel.getByLabel('Показывать границы страниц').check()
  await expect(page.locator('.print-page-boundary').first()).toBeVisible()
})

test('keeps export SVG free of editor-only guides and selection UI', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.48, 0.48)
  await page.keyboard.press('Escape')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('menuitem', { name: 'Файл', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Экспорт SVG…', exact: true }).click()
  const download = await downloadPromise
  const stream = await download.createReadStream()
  let svg = ''
  for await (const chunk of stream) svg += chunk.toString()

  expect(svg).toContain('<svg')
  expect(svg).toContain('translate(')
  expect(svg).not.toContain('guide-layer')
  expect(svg).not.toContain('selection-box')
})

test('keeps print preview pagination stable after zooming the editor', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.48, 0.48)
  await page.keyboard.press('Escape')
  await openGlobalPanel(page, 'print-global-panel')

  const before = await page.locator('.print-page-boundary').count()
  await page.keyboard.press('+')
  await page.keyboard.press('+')
  const after = await page.locator('.print-page-boundary').count()
  expect(after).toBe(before)
})
