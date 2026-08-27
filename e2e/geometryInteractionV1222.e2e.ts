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

function intersects(
  left: { x: number; y: number; width: number; height: number },
  right: { x: number; y: number; width: number; height: number },
) {
  return !(
    left.x + left.width <= right.x ||
    right.x + right.width <= left.x ||
    left.y + left.height <= right.y ||
    right.y + right.height <= left.y
  )
}

test('compact chain selection keeps the quick toolbar clear of the rotation handle', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Воздушная петля', 0.5, 0.5)

  const toolbar = page.locator('.selection-quick-toolbar')
  const rotationHandle = page.locator('.stitch-rotation-handle')
  await expect(toolbar).toHaveClass(/below/)
  await expect(rotationHandle).toBeVisible()

  const toolbarBox = await toolbar.boundingBox()
  const handleBox = await rotationHandle.boundingBox()
  expect(toolbarBox).not.toBeNull()
  expect(handleBox).not.toBeNull()
  expect(intersects(toolbarBox!, handleBox!)).toBe(false)
})

test('temporary multi-selection has one frame and a live repeat preview', async ({ page }) => {
  await openEditor(page)
  const box = await canvasBox(page)
  await page.locator('.chain-bundle-button[aria-label^="2 воздушные петли"]').click()
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)

  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)
  await expect(page.locator('.group-selection-box')).toHaveCount(1)
  await expect(page.locator('.stitch-element.selected .selection-box')).toHaveCount(0)

  await page.locator('.selection-quick-toolbar').getByRole('button', { name: 'Разгруппировать' }).click()
  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)
  await expect(page.locator('.productivity-repeat-preview-stitch')).not.toHaveCount(0)
  await expect(page.locator('.productivity-hint')).toContainText('ghost-preview показывает весь временный мотив')
})
