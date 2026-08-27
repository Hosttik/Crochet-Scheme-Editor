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

test('edits straight guides by length and angle, shows direction, and reverses by double click', async ({ page }) => {
  await openEditor(page)
  await page.locator('.guide-add-grid button').filter({ hasText: 'Линия' }).click()

  const line = page.locator('.guide-line')
  await expect(line).toBeVisible()
  await expect(line.locator('.guide-direction-arrow')).toHaveCount(1)
  await expect(page.getByLabel('Длина')).toBeVisible()
  await expect(page.getByLabel('Угол °')).toBeVisible()
  await expect(page.getByRole('button', { name: 'По размеру проекта' })).toBeVisible()

  await page.getByLabel('Длина').fill('420')
  await page.getByLabel('Длина').press('Enter')
  await expect(page.getByLabel('Длина')).toHaveValue('420')

  await page.getByLabel('Угол °').fill('30')
  await page.getByLabel('Угол °').press('Enter')
  await expect(page.getByLabel('Угол °')).toHaveValue('30')

  const before = await line.locator('.guide-direction-arrow').getAttribute('transform')
  const strokeBox = await line.locator('.guide-stroke').boundingBox()
  expect(strokeBox).not.toBeNull()
  await page.mouse.click(
    strokeBox!.x + strokeBox!.width / 2,
    strokeBox!.y + strokeBox!.height / 2,
    { clickCount: 2 },
  )
  const after = await line.locator('.guide-direction-arrow').getAttribute('transform')
  expect(after).not.toBe(before)

  await placeAt(page, 'Столбик без накида', 0.12, 0.70)
  await placeAt(page, 'Столбик с накидом', 0.88, 0.70)
  await page.keyboard.press('Escape')
  await page.locator('.guide-list button').filter({ hasText: 'Линия' }).click()
  await page.getByRole('button', { name: 'По размеру проекта' }).click()
  const fittedLength = Number(await page.getByLabel('Длина').inputValue())
  expect(fittedLength).toBeGreaterThan(420)
})

test('creates a quadratic parabola with one editable control point', async ({ page }) => {
  await openEditor(page)
  await page.locator('.guide-add-grid button').filter({ hasText: 'Парабола' }).click()

  const parabola = page.locator('.guide-parabola')
  await expect(parabola).toBeVisible()
  await expect(parabola.locator('.guide-direction-arrow')).toHaveCount(1)
  await expect(parabola.locator('.guide-path-endpoint')).toHaveCount(2)
  await expect(parabola.locator('.guide-control-handle')).toHaveCount(1)
  await expect(page.getByLabel('Вершина X')).toBeVisible()
  await expect(page.getByLabel('Вершина Y')).toBeVisible()

  const before = await parabola.locator('.guide-stroke').getAttribute('points')
  await page.getByLabel('Вершина Y').fill('-180')
  await page.getByLabel('Вершина Y').press('Enter')
  const after = await parabola.locator('.guide-stroke').getAttribute('points')
  expect(after).not.toBe(before)
})

test('keeps a custom mirror axis across selection changes and reflects on a diagonal', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.42, 0.48)
  await page.keyboard.press('Escape')

  const productivity = page.locator('.productivity-panel')
  await productivity.getByRole('button', { name: '45°', exact: true }).click()
  const axis = page.locator('.mirror-axis-overlay')
  await expect(axis).toBeVisible()
  await expect(axis).toHaveAttribute('data-mirror-angle', '45')

  const first = page.locator('.stitch-element').first()
  await productivity.getByRole('button', { name: 'Отразить по своей оси' }).click()
  await expect(first.locator('.symbol-glyph')).toHaveAttribute('transform', 'scale(-1 1)')

  const box = await canvasBox(page)
  await page.mouse.click(box.x + box.width * 0.82, box.y + box.height * 0.78)
  await expect(axis).toBeVisible()

  await placeAt(page, 'Воздушная петля', 0.60, 0.55)
  await page.keyboard.press('Escape')
  await expect(axis).toBeVisible()
  await expect(page.locator('.stitch-element')).toHaveCount(2)

  await expect(productivity.locator('.mirror-direction-grid')).toHaveCount(0)
  await productivity.getByRole('button', { name: 'Создать копию по своей оси', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(3)
  await expect(page.locator('.stitch-element').last().locator('.symbol-glyph')).toHaveAttribute('transform', 'scale(-1 1)')
})
