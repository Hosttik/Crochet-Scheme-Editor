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

async function dragHandle(page: Page, testId: string, dx: number, dy: number) {
  const handle = page.getByTestId(testId)
  const box = await handle.boundingBox()
  expect(box).not.toBeNull()
  const x = box!.x + box!.width / 2
  const y = box!.y + box!.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx, y + dy, { steps: 6 })
  await page.mouse.up()
}

function numberAttr(value: string | null) {
  const parsed = Number(value)
  expect(Number.isFinite(parsed)).toBe(true)
  return parsed
}

test('refreshes untouched Repeat defaults after resize and keeps ghost geometry equal to commit', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик с накидом', 0.50, 0.48)

  const deltaX = page.getByLabel('ΔX')
  const beforeDefault = Number(await deltaX.inputValue())
  await dragHandle(page, 'stitch-resize-uniform', 34, 34)
  await expect.poll(async () => Number(await deltaX.inputValue())).toBeGreaterThan(beforeDefault * 1.15)

  const sourceGlyph = page.locator('.stitch-element .symbol-glyph').first()
  const sourceBox = await sourceGlyph.boundingBox()
  expect(sourceBox).not.toBeNull()
  await page.getByLabel('Копий').fill('1')
  const ghost = page.locator('.productivity-repeat-preview-stitch').first()
  await expect(ghost).toBeVisible()
  expect(numberAttr(await ghost.getAttribute('data-scale-x'))).toBeGreaterThan(1.2)
  const ghostGlyphBox = await ghost.locator('.symbol-glyph').boundingBox()
  expect(ghostGlyphBox).not.toBeNull()
  expect(ghostGlyphBox!.width).toBeCloseTo(sourceBox!.width, 0)
  expect(ghostGlyphBox!.height).toBeCloseTo(sourceBox!.height, 0)

  await page.getByRole('button', { name: 'Создать копии', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(2)
  const committed = page.locator('.stitch-element .symbol-glyph').last()
  const committedBox = await committed.boundingBox()
  expect(committedBox).not.toBeNull()
  expect(committedBox!.width).toBeCloseTo(ghostGlyphBox!.width, 0)
  expect(committedBox!.height).toBeCloseTo(ghostGlyphBox!.height, 0)
})

test('preserves semantic spread in Repeat ghost and Layers thumbnail', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, '3 столбика с накидом с общим основанием', 0.50, 0.48)
  await dragHandle(page, 'stitch-spread-handle', 36, 0)

  const source = page.locator('.stitch-element').first()
  const spread = numberAttr(await source.getAttribute('data-spread'))
  expect(spread).toBeGreaterThan(1.2)
  await page.getByLabel('Копий').fill('1')
  const ghost = page.locator('.productivity-repeat-preview-stitch').first()
  await expect(ghost).toBeVisible()
  expect(numberAttr(await ghost.getAttribute('data-spread'))).toBeCloseTo(spread, 5)

  const layers = page.locator('.layers-section')
  await layers.locator('summary.layers-summary').click()
  const layerGlyph = layers.locator('[data-testid^="layer-glyph-"]').first()
  await expect(layerGlyph).toBeVisible()
  expect(await layerGlyph.getAttribute('transform')).toContain('scale(')
})

test('directional mirror preview uses resized visual edge instead of catalog bounds', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.50, 0.48)
  await dragHandle(page, 'stitch-resize-uniform', 40, 40)

  const sourceGlyph = page.locator('.stitch-element .symbol-glyph').first()
  const source = await sourceGlyph.boundingBox()
  expect(source).not.toBeNull()
  await page.getByRole('button', { name: 'Предпросмотр вправо', exact: true }).click()
  const ghostGlyph = page.locator('.productivity-mirror-preview-stitch .symbol-glyph').first()
  await expect(ghostGlyph).toBeVisible()
  const ghost = await ghostGlyph.boundingBox()
  expect(ghost).not.toBeNull()
  expect(ghost!.x).toBeGreaterThanOrEqual(source!.x + source!.width - 2)
})

test('quick toolbar follows tall resize and remains inside workspace edges', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик с накидом', 0.06, 0.48)
  await dragHandle(page, 'stitch-resize-height', 0, 80)

  const toolbar = page.locator('.selection-quick-toolbar')
  const rotation = page.locator('.stitch-rotation-handle')
  await expect(toolbar).toBeVisible()
  await expect(rotation).toBeVisible()
  const toolbarBox = await toolbar.boundingBox()
  const rotationBox = await rotation.boundingBox()
  const workspace = await page.locator('.workspace').boundingBox()
  expect(toolbarBox).not.toBeNull()
  expect(rotationBox).not.toBeNull()
  expect(workspace).not.toBeNull()
  expect(toolbarBox!.x).toBeGreaterThanOrEqual(workspace!.x - 1)
  expect(toolbarBox!.x + toolbarBox!.width).toBeLessThanOrEqual(workspace!.x + workspace!.width + 1)
  const overlapsRotation = !(
    toolbarBox!.x + toolbarBox!.width < rotationBox!.x ||
    toolbarBox!.x > rotationBox!.x + rotationBox!.width ||
    toolbarBox!.y + toolbarBox!.height < rotationBox!.y ||
    toolbarBox!.y > rotationBox!.y + rotationBox!.height
  )
  expect(overlapsRotation).toBe(false)
})
