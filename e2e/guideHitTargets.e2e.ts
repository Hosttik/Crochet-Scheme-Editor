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

async function disableSnapping(page: Page) {
  const snapping = page.getByTestId('snapping-global-panel')
  await snapping.locator(':scope > summary').click()
  await page.getByLabel('Разрешить привязку').uncheck()
}

async function placeAt(page: Page, title: string, rx: number, ry: number) {
  await page.locator(`.symbols-section .symbol-button[title^="${title} ·"]`).click()
  const box = await canvasBox(page)
  await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry)
}

function endpointDistance(points: string) {
  const parsed = points.trim().split(/\s+/).map((pair) => pair.split(',').map(Number))
  const first = parsed[0]
  const last = parsed.at(-1)
  if (!first || !last) return 0
  return Math.hypot(last[0] - first[0], last[1] - first[1])
}

test('grid guides remain selectable several pixels away from the visible stroke', async ({ page }) => {
  await openEditor(page)

  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  await rail.getByRole('button', { name: 'Направляющие', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Прямоугольная сетка', exact: true }).click()

  const grid = page.locator('.guide-layer.guide-grid')
  await expect(grid).toHaveClass(/selected/)

  const box = await canvasBox(page)

  // Deselect on an empty area first so the next click proves acquisition.
  await page.mouse.click(box.x + 24, box.y + 80)
  await expect(grid).not.toHaveClass(/selected/)

  // A new grid is centered in the viewport. Its central horizontal guide line
  // crosses the center; x + 20 avoids the central vertical line. Seven screen
  // pixels is deliberately outside the visible ~1px stroke but inside the
  // UI-v2 18px transparent interaction stroke.
  await page.mouse.click(
    box.x + box.width / 2 + 20,
    box.y + box.height / 2 + 7,
  )
  await expect(grid).toHaveClass(/selected/)
})

test('fit-to-project expands a selected line guide to the document bounds', async ({ page }) => {
  await openEditor(page)
  await disableSnapping(page)

  await placeAt(page, 'Столбик без накида', 0.18, 0.42)
  await placeAt(page, 'Столбик с накидом', 0.82, 0.58)
  await page.keyboard.press('Escape')

  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  await rail.getByRole('button', { name: 'Направляющие', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Линия', exact: true }).click()

  const line = page.locator('.guide-layer.guide-line')
  const visibleStroke = line.locator('polyline.guide-stroke')
  await expect(line).toHaveClass(/selected/)
  const before = endpointDistance((await visibleStroke.getAttribute('points')) ?? '')
  expect(before).toBeGreaterThan(0)

  await page.getByRole('button', { name: 'По размеру проекта', exact: true }).click()

  const after = endpointDistance((await visibleStroke.getAttribute('points')) ?? '')
  expect(after).toBeGreaterThan(before + 40)
  await expect(page.locator('.statusbar')).toContainText('Направляющая растянута по размеру проекта')
})
