import { expect, test, type Locator, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.getByLabel('Разрешить привязку').uncheck()
}

async function canvasBox(page: Page) {
  const box = await page.locator('svg.editor-canvas').boundingBox()
  expect(box).not.toBeNull()
  return box!
}

async function placeAt(page: Page, title: string, rx: number, ry: number) {
  await page.locator(`.symbols-section .symbol-button[title^="${title}"]`).click()
  const box = await canvasBox(page)
  await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry)
}

async function drawLassoAround(page: Page, locator: Locator, modifier?: 'Shift' | 'Alt') {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  const margin = 10
  if (modifier) await page.keyboard.down(modifier)
  await page.mouse.move(box!.x - margin, box!.y - margin)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width + margin, box!.y - margin, { steps: 3 })
  await page.mouse.move(box!.x + box!.width + margin, box!.y + box!.height + margin, { steps: 3 })
  await page.mouse.move(box!.x - margin, box!.y + box!.height + margin, { steps: 3 })
  await page.mouse.move(box!.x - margin, box!.y - margin, { steps: 3 })
  await page.mouse.up()
  if (modifier) await page.keyboard.up(modifier)
}

test('free-form lasso replaces, adds and subtracts semantic selections', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.34, 0.40)
  await placeAt(page, 'Столбик с накидом', 0.50, 0.40)
  await placeAt(page, 'Воздушная петля', 0.70, 0.56)
  await page.keyboard.press('Escape')

  const stitches = page.locator('.stitch-element')
  await stitches.nth(0).click()
  await stitches.nth(1).click({ modifiers: ['Shift'] })
  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)
  await page.locator('.productivity-panel').getByRole('button', { name: 'Группировать', exact: true }).click()

  const lassoButton = page.locator('.left-sidebar .tool-button').filter({ hasText: 'Лассо' })
  await lassoButton.click()
  await expect(lassoButton).toHaveClass(/active/)
  await expect(page.locator('svg.editor-canvas')).toHaveClass(/lassoing/)

  await drawLassoAround(page, stitches.nth(0))
  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)

  await drawLassoAround(page, stitches.nth(2), 'Shift')
  await expect(page.locator('.stitch-element.selected')).toHaveCount(3)

  await drawLassoAround(page, stitches.nth(0), 'Alt')
  await expect(page.locator('.stitch-element.selected')).toHaveCount(1)
  await expect(stitches.nth(2)).toHaveClass(/selected/)

  await page.keyboard.press('l')
  await expect(page.locator('svg.editor-canvas')).not.toHaveClass(/lassoing/)
  await page.keyboard.press('l')
  await expect(page.locator('svg.editor-canvas')).toHaveClass(/lassoing/)

  await page.keyboard.press('Escape')
  await expect(page.locator('svg.editor-canvas')).not.toHaveClass(/lassoing/)
})
