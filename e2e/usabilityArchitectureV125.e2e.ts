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
  await page.locator(`.symbols-section .symbol-button[title^="${title} ·"]`).click()
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

function translateX(transform: string | null) {
  const match = transform?.match(/translate\(([-+\d.eE]+)[ ,]/)
  expect(match).not.toBeNull()
  return Number(match![1])
}

test('keeps contextual properties first and global panels collapsed below', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик с накидом', 0.5, 0.48)

  const context = page.getByTestId('selection-context-panel')
  const background = page.getByTestId('background-global-panel')
  const print = page.getByTestId('print-global-panel')
  await expect(context).toBeVisible()
  await expect(background).not.toHaveAttribute('open', '')
  await expect(print).not.toHaveAttribute('open', '')

  const contextBox = await context.boundingBox()
  const backgroundBox = await background.boundingBox()
  expect(contextBox).not.toBeNull()
  expect(backgroundBox).not.toBeNull()
  expect(contextBox!.y).toBeLessThan(backgroundBox!.y)

  const productivity = page.locator('.productivity-panel')
  await expect(productivity).toBeVisible()
  const productivityBox = await productivity.boundingBox()
  expect(productivityBox).not.toBeNull()
  expect(productivityBox!.y).toBeGreaterThanOrEqual(contextBox!.y + contextBox!.height - 1)
  expect(productivityBox!.y).toBeLessThan(backgroundBox!.y)
})

test('filters the compact symbol palette while retaining full-name tooltips', async ({ page }) => {
  await openEditor(page)

  const search = page.getByTestId('symbol-search')
  await expect(search).toBeVisible()
  await search.fill('Столбик с накидом')
  const match = page.locator('.symbols-section .symbol-button[title^="Столбик с накидом ·"]').first()
  await expect(match).toBeVisible()
  await expect(page.locator('.symbols-section .symbol-button[title^="Воздушная петля ·"]')).toHaveCount(0)
  expect((await match.locator('span').textContent())?.trim().length).toBeGreaterThan(0)
  expect(await match.getAttribute('title')).toContain('Столбик с накидом')

  await search.fill('')
  await expect(page.locator('.symbols-section .symbol-button').first()).toBeVisible()
})

test('allows locked stitch selection but blocks mutation until unlock', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик с накидом', 0.5, 0.48)

  const stitch = page.locator('.stitch-element').first()
  await page.getByRole('button', { name: 'Заблокировать элемент', exact: true }).click()
  await expect(stitch).toHaveAttribute('data-locked', 'true')

  await stitch.click()
  await expect(stitch).toHaveClass(/selected/)
  await expect(page.getByText(/Заблокировано в выделении: 1/)).toBeVisible()
  const before = translateX(await stitch.getAttribute('transform'))

  await page.keyboard.press('ArrowRight')
  expect(translateX(await stitch.getAttribute('transform'))).toBeCloseTo(before, 6)
  await page.keyboard.press('Delete')
  await expect(page.locator('.stitch-element')).toHaveCount(1)

  await page.getByRole('button', { name: 'Разблокировать элемент', exact: true }).click()
  await expect(stitch).not.toHaveAttribute('data-locked', 'true')
  await page.keyboard.press('ArrowRight')
  await expect.poll(async () => translateX(await stitch.getAttribute('transform'))).toBeCloseTo(before + 1, 6)
})

test('shows print assembly order overlap registration marks and legend placement', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.48, 0.48)
  await openGlobalPanel(page, 'print-global-panel')

  const panel = page.getByTestId('print-panel')
  await panel.getByTestId('print-scale').fill('400')
  await expect.poll(async () => Number(await panel.getByTestId('print-page-count').textContent())).toBeGreaterThan(1)
  await expect(panel.getByTestId('print-preview-overlap').first()).toBeAttached()
  await expect(panel.getByTestId('print-preview-registration-mark').first()).toBeAttached()
  await expect(panel.getByTestId('print-preview-assembly-arrow').first()).toBeAttached()
  await expect(panel.getByTestId('print-preview-legend')).toHaveCount(1)

  await panel.getByTestId('print-alignment-marks').uncheck()
  await expect(panel.getByTestId('print-preview-registration-mark')).toHaveCount(0)
})

test('uses large invisible geometry hit targets without enlarging visible handles', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик с накидом', 0.5, 0.48)

  const target = page.getByTestId('stitch-resize-uniform')
  const visible = page.locator('.stitch-geometry-handle.uniform')
  await expect(target).toBeVisible()
  await expect(visible).toBeVisible()
  const targetBox = await target.boundingBox()
  const visibleBox = await visible.boundingBox()
  expect(targetBox).not.toBeNull()
  expect(visibleBox).not.toBeNull()
  expect(targetBox!.width).toBeGreaterThanOrEqual(24)
  expect(targetBox!.height).toBeGreaterThanOrEqual(24)
  expect(targetBox!.width).toBeGreaterThan(visibleBox!.width + 8)
})

test('keeps responsive chrome contained and exposes clear project actions', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 720 })
  await openEditor(page)

  await expect(page.getByText('P0', { exact: true })).toHaveCount(0)
  await expect(page.locator('.topbar .primary-button')).toBeHidden()
  await page.getByRole('menuitem', { name: 'Файл', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Экспорт проекта…', exact: true })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Импорт проекта…', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')

  const topbar = await page.locator('.topbar').boundingBox()
  const workspace = await page.locator('.workspace').boundingBox()
  const toolbar = await page.locator('.canvas-toolbar').boundingBox()
  expect(topbar).not.toBeNull()
  expect(workspace).not.toBeNull()
  expect(toolbar).not.toBeNull()
  expect(topbar!.x + topbar!.width).toBeLessThanOrEqual(901)
  expect(toolbar!.x).toBeGreaterThanOrEqual(workspace!.x - 1)
  expect(toolbar!.x + toolbar!.width).toBeLessThanOrEqual(workspace!.x + workspace!.width + 1)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(900)

  const version = await page.locator('.brand').evaluate((element) => getComputedStyle(element, '::after').content.replaceAll('"', ''))
  expect(version).toBe('v1.25.0')
})
