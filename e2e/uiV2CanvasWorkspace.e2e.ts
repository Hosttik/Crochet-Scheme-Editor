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

async function placeSingleCrochetStitch(page: Page) {
  await page.locator('.symbols-section .symbol-button[title^="Столбик без накида ·"]').click()
  const box = await canvasBox(page)
  await page.mouse.click(box.x + box.width * 0.52, box.y + box.height * 0.5)
  await expect(page.locator('.stitch-element')).toHaveCount(1)
}

test('docks essential canvas controls as one aligned footer row and hides duplicate tools', async ({ page }) => {
  await openEditor(page)

  const statusbar = page.getByTestId('canvas-statusbar')
  const controls = statusbar.locator('.statusbar-canvas-controls')
  const toolbar = page.getByRole('toolbar', { name: 'Навигация и режимы поля' })
  await expect(toolbar).toBeVisible()
  await expect(controls.getByTestId('canvas-toolbar')).toBeVisible()
  expect(await toolbar.evaluate((element) => element.parentElement?.classList.contains('statusbar-canvas-controls'))).toBe(true)

  await expect(toolbar.getByRole('button', { name: 'Уменьшить масштаб', exact: true })).toBeVisible()
  await expect(toolbar.getByRole('button', { name: 'Увеличить масштаб', exact: true })).toBeVisible()
  await expect(toolbar.getByRole('button', { name: 'Ладонь / перемещение поля', exact: true })).toBeHidden()
  await expect(toolbar.getByRole('button', { name: 'Лассо', exact: true })).toBeHidden()
  await expect(toolbar.getByRole('button', { name: 'Линейка', exact: true })).toBeHidden()
  await expect(toolbar.getByRole('button', { name: 'Вместить всю схему', exact: true })).toBeHidden()
  await expect(toolbar.getByLabel('Ориентация при привязке')).toBeHidden()

  const snap = toolbar.getByRole('button', { name: 'Привязка к направляющим', exact: true })
  await expect(snap).toBeVisible()
  await expect(snap).toContainText('Привязка:')
  await expect(snap).toContainText('Вкл.')
  await expect(snap).toHaveAttribute('aria-pressed', 'true')
  await snap.click()
  await expect(snap).toHaveAttribute('aria-pressed', 'false')
  await expect(snap).toContainText('Свободно')
  await snap.click()
  await expect(snap).toHaveAttribute('aria-pressed', 'true')

  const toolbarRect = await toolbar.boundingBox()
  const statusRect = await statusbar.boundingBox()
  expect(toolbarRect).not.toBeNull()
  expect(statusRect).not.toBeNull()
  expect(Math.abs((toolbarRect!.y + toolbarRect!.height / 2) - (statusRect!.y + statusRect!.height / 2))).toBeLessThanOrEqual(1)
})

test('uses a dedicated footer surface without changing canvas interaction geometry', async ({ page }) => {
  await openEditor(page)

  const workspaceRect = await page.locator('.workspace').boundingBox()
  const canvasRect = await page.locator('svg.editor-canvas').boundingBox()
  const statusbar = page.getByTestId('canvas-statusbar')
  const statusRect = await statusbar.boundingBox()
  expect(workspaceRect).not.toBeNull()
  expect(canvasRect).not.toBeNull()
  expect(statusRect).not.toBeNull()

  expect(Math.abs((canvasRect!.y + canvasRect!.height) - (workspaceRect!.y + workspaceRect!.height))).toBeLessThanOrEqual(1)
  expect(Math.abs((statusRect!.y + statusRect!.height) - (workspaceRect!.y + workspaceRect!.height))).toBeLessThanOrEqual(1)
  expect(Math.abs(statusRect!.width - workspaceRect!.width)).toBeLessThanOrEqual(1)
  expect(statusRect!.height).toBeGreaterThanOrEqual(28)
  expect(statusRect!.height).toBeLessThanOrEqual(32)
  await expect(statusbar).toContainText('Выбрано: 0')

  await placeSingleCrochetStitch(page)
  await expect(statusbar).toContainText('Выбрано: 1')
})

test('keeps editing actions out of the way while constructing and restores them in Select', async ({ page }) => {
  await openEditor(page)
  await placeSingleCrochetStitch(page)

  const quick = page.getByRole('toolbar', { name: 'Быстрые действия с выделением' })
  await expect(page.locator('svg.editor-canvas')).toHaveClass(/placing/)
  await expect(quick).toBeHidden()

  await page.keyboard.press('Escape')
  await expect(page.locator('svg.editor-canvas')).toHaveClass(/selecting/)
  await expect(quick).toBeVisible()
  const quickRect = await quick.boundingBox()
  expect(quickRect).not.toBeNull()
  expect(quickRect!.width).toBeLessThanOrEqual(340)

  await quick.getByRole('button', { name: 'Дублировать', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(2)
  await expect(page.getByTestId('canvas-statusbar')).toContainText('Выбрано: 1')
})

test('keeps the docked canvas controls contained on a compact desktop viewport', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 720 })
  await openEditor(page)

  const workspace = await page.locator('.workspace').boundingBox()
  const toolbar = await page.getByTestId('canvas-toolbar').boundingBox()
  const statusbar = page.getByTestId('canvas-statusbar')
  expect(workspace).not.toBeNull()
  expect(toolbar).not.toBeNull()
  expect(toolbar!.x).toBeGreaterThanOrEqual(workspace!.x - 1)
  expect(toolbar!.x + toolbar!.width).toBeLessThanOrEqual(workspace!.x + workspace!.width + 1)
  await expect(statusbar.locator('.statusbar-document-meta')).toBeHidden()
  await expect(statusbar.locator('.statusbar-selection')).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(900)
})
