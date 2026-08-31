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
  await page.keyboard.press('Escape')
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

test('chain selection exposes the same direct actions as a regular stitch', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Воздушная петля', 0.5, 0.5)

  const toolbar = page.locator('.selection-quick-toolbar')
  const rotationHandle = page.locator('.stitch-rotation-handle')
  const uniformResize = page.getByTestId('stitch-resize-uniform')
  const heightResize = page.getByTestId('stitch-resize-height')

  await expect(toolbar).toBeVisible()
  await expect(toolbar).not.toHaveClass(/below/)
  await expect(rotationHandle).toBeVisible()
  await expect(uniformResize).toBeVisible()
  await expect(heightResize).toBeVisible()
  await expect(toolbar.getByRole('button', { name: 'Дублировать' })).toBeVisible()
  await expect(toolbar.getByRole('button', { name: 'Повернуть −15°' })).toBeVisible()
  await expect(toolbar.getByRole('button', { name: 'Удалить' })).toBeVisible()

  const toolbarBox = await toolbar.boundingBox()
  const handleBox = await rotationHandle.boundingBox()
  expect(toolbarBox).not.toBeNull()
  expect(handleBox).not.toBeNull()
  expect(intersects(toolbarBox!, handleBox!)).toBe(false)
})

test('chain bundle selection behaves like one editable object', async ({ page }) => {
  await openEditor(page)
  const box = await canvasBox(page)
  await page.locator('.chain-bundle-button[aria-label^="3 воздушные петли"]').click()
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
  await page.keyboard.press('Escape')
  await expect(page.locator('svg.editor-canvas')).toHaveClass(/selecting/)

  await expect(page.locator('.stitch-element.selected')).toHaveCount(3)
  await expect(page.locator('.group-selection-box')).toHaveCount(1)
  await expect(page.locator('.stitch-element.selected .selection-box')).toHaveCount(0)
  await expect(page.getByTestId('chain-group-transform-handles')).toBeVisible()
  await expect(page.getByTestId('group-rotation-hit-target')).toBeVisible()
  await expect(page.getByTestId('group-resize-uniform')).toBeVisible()
  await expect(page.locator('.productivity-repeat-preview-stitch')).toHaveCount(0)

  const frame = page.locator('.group-selection-box')
  const beforeScale = await frame.boundingBox()
  expect(beforeScale).not.toBeNull()
  const scaleHandle = await page.getByTestId('group-resize-uniform').boundingBox()
  expect(scaleHandle).not.toBeNull()
  const pivot = {
    x: beforeScale!.x + beforeScale!.width / 2,
    y: beforeScale!.y + beforeScale!.height / 2,
  }
  const scaleStart = {
    x: scaleHandle!.x + scaleHandle!.width / 2,
    y: scaleHandle!.y + scaleHandle!.height / 2,
  }
  await page.mouse.move(scaleStart.x, scaleStart.y)
  await page.mouse.down()
  await page.mouse.move(
    pivot.x + (scaleStart.x - pivot.x) * 1.5,
    pivot.y + (scaleStart.y - pivot.y) * 1.5,
    { steps: 8 },
  )
  await page.mouse.up()

  const afterScale = await frame.boundingBox()
  expect(afterScale).not.toBeNull()
  expect(afterScale!.width).toBeGreaterThan(beforeScale!.width * 1.2)
  const scales = await page.locator('.stitch-element.selected').evaluateAll((nodes) =>
    nodes.map((node) => Number(node.getAttribute('data-scale-x'))),
  )
  scales.forEach((scale) => expect(scale).toBeGreaterThan(1.2))
  await expect(page.locator('.productivity-repeat-preview-stitch')).toHaveCount(0)

  const scaledFrame = await frame.boundingBox()
  expect(scaledFrame).not.toBeNull()
  const rotateHandle = await page.getByTestId('group-rotation-hit-target').boundingBox()
  expect(rotateHandle).not.toBeNull()
  const rotatePivot = {
    x: scaledFrame!.x + scaledFrame!.width / 2,
    y: scaledFrame!.y + scaledFrame!.height / 2,
  }
  const rotateStart = {
    x: rotateHandle!.x + rotateHandle!.width / 2,
    y: rotateHandle!.y + rotateHandle!.height / 2,
  }
  await page.mouse.move(rotateStart.x, rotateStart.y)
  await page.mouse.down()
  await page.mouse.move(rotatePivot.x + 90, rotatePivot.y, { steps: 10 })
  await page.mouse.up()

  const rotated = await frame.boundingBox()
  expect(rotated).not.toBeNull()
  expect(rotated!.height).toBeGreaterThan(rotated!.width)
  await expect(page.locator('.stitch-element.selected')).toHaveCount(3)
  await expect(page.locator('.productivity-repeat-preview-stitch')).toHaveCount(0)
})
