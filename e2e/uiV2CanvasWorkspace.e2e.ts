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

test('keeps canvas navigation compact, semantic and directly usable', async ({ page }) => {
  await openEditor(page)

  const toolbar = page.getByRole('toolbar', { name: 'Навигация и режимы поля' })
  await expect(toolbar).toBeVisible()

  const hand = toolbar.getByRole('button', { name: 'Ладонь / перемещение поля', exact: true })
  const lasso = toolbar.getByRole('button', { name: 'Лассо', exact: true })
  const ruler = toolbar.getByRole('button', { name: 'Линейка', exact: true })
  await expect(hand).toBeVisible()
  await expect(lasso).toBeVisible()
  await expect(ruler).toBeVisible()

  const handBox = await hand.boundingBox()
  const lassoBox = await lasso.boundingBox()
  expect(handBox).not.toBeNull()
  expect(lassoBox).not.toBeNull()
  expect(handBox!.width).toBeLessThanOrEqual(40)
  expect(lassoBox!.width).toBeLessThanOrEqual(40)

  await hand.click()
  await expect(hand).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('svg.editor-canvas')).toHaveClass(/pan-tool/)

  const snap = toolbar.getByRole('button', { name: 'Привязка к направляющим', exact: true })
  await expect(snap).toHaveAttribute('aria-pressed', 'true')
  await snap.click()
  await expect(snap).toHaveAttribute('aria-pressed', 'false')
  await expect(toolbar.getByLabel('Ориентация при привязке')).toBeDisabled()
  await snap.click()
  await expect(toolbar.getByLabel('Ориентация при привязке')).toBeEnabled()
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

test('keeps selection actions close to the stitch without turning them into a large overlay', async ({ page }) => {
  await openEditor(page)
  await placeSingleCrochetStitch(page)

  const quick = page.getByRole('toolbar', { name: 'Быстрые действия с выделением' })
  await expect(quick).toBeVisible()
  const quickRect = await quick.boundingBox()
  expect(quickRect).not.toBeNull()
  expect(quickRect!.width).toBeLessThanOrEqual(340)

  await quick.getByRole('button', { name: 'Дублировать', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(2)
  await expect(page.getByTestId('canvas-statusbar')).toContainText('Выбрано: 1')
})

test('keeps the canvas controls contained on a compact desktop viewport', async ({ page }) => {
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
