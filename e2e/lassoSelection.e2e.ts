import { expect, test, type Locator, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  const snapping = page.getByTestId('snapping-global-panel')
  await snapping.locator(':scope > summary').click()
  await page.getByLabel('Разрешить привязку').uncheck()
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

async function drawLassoAroundCenter(page: Page, locator: Locator, modifier?: 'Shift' | 'Alt') {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  const centerX = box!.x + box!.width / 2
  const centerY = box!.y + box!.height / 2
  const radius = 8
  if (modifier) await page.keyboard.down(modifier)
  await page.mouse.move(centerX - radius, centerY - radius)
  await page.mouse.down()
  await page.mouse.move(centerX + radius, centerY - radius, { steps: 3 })
  await page.mouse.move(centerX + radius, centerY + radius, { steps: 3 })
  await page.mouse.move(centerX - radius, centerY + radius, { steps: 3 })
  await page.mouse.move(centerX - radius, centerY - radius, { steps: 3 })
  await page.mouse.up()
  if (modifier) await page.keyboard.up(modifier)
}

async function activateLasso(page: Page) {
  await page.keyboard.press('l')
  await expect(page.locator('svg.editor-canvas')).toHaveClass(/lassoing/)
}

test('free-form lasso replaces, adds and subtracts semantic selections', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.30, 0.36)
  await placeAt(page, 'Столбик с накидом', 0.52, 0.42)
  await placeAt(page, 'Воздушная петля', 0.78, 0.66)
  await page.keyboard.press('Escape')

  const canvas = page.locator('svg.editor-canvas')
  const stitches = page.locator('.stitch-element')
  await stitches.nth(0).click()
  await stitches.nth(1).click({ modifiers: ['Shift'] })
  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)
  await page.locator('.productivity-panel').getByRole('button', { name: 'Группировать', exact: true }).click()

  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  const selectionTrigger = rail.getByRole('button', { name: 'Выделение', exact: true })
  await selectionTrigger.click()
  const selectionMenu = page.getByRole('menu', { name: 'Выделение', exact: true })
  await selectionMenu.getByRole('menuitemradio', { name: 'Лассо', exact: true }).click()
  await expect(selectionTrigger).toHaveClass(/active/)
  await expect(canvas).toHaveClass(/lassoing/)

  // Lasso is intentionally one-shot: after each completed gesture the editor
  // returns to Select/Move so the result can be dragged immediately.
  await drawLassoAroundCenter(page, stitches.nth(0))
  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)
  await expect(canvas).toHaveClass(/selecting/)

  await activateLasso(page)
  await drawLassoAroundCenter(page, stitches.nth(2), 'Shift')
  await expect(page.locator('.stitch-element.selected')).toHaveCount(3)
  await expect(canvas).toHaveClass(/selecting/)

  await activateLasso(page)
  await drawLassoAroundCenter(page, stitches.nth(0), 'Alt')
  await expect(page.locator('.stitch-element.selected')).toHaveCount(1)
  await expect(stitches.nth(2)).toHaveClass(/selected/)
  await expect(canvas).toHaveClass(/selecting/)

  // The L shortcut still toggles the tool explicitly, and Escape cancels it.
  await activateLasso(page)
  await page.keyboard.press('l')
  await expect(canvas).not.toHaveClass(/lassoing/)
  await activateLasso(page)
  await page.keyboard.press('Escape')
  await expect(canvas).not.toHaveClass(/lassoing/)
})
