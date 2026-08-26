import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

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

async function clickCanvas(page: Page, rx: number, ry: number) {
  const box = await canvasBox(page)
  await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry)
}

async function placeStitch(page: Page, title: string, rx: number, ry: number) {
  await page.locator(`.symbols-section .symbol-button[title^="${title}"]`).click()
  await clickCanvas(page, rx, ry)
}

test('authors locked guides, gap-free row numbers and an exported automatic legend', async ({ page }) => {
  await openEditor(page)

  // #11: a locked guide stays selectable, loses geometry controls and cannot be deleted.
  await page.locator('.guide-add-grid button').filter({ hasText: 'Линия' }).click()
  const guide = page.locator('.guide-line')
  const guideEditor = page.locator('.guide-editor')
  await expect(guide).toHaveClass(/selected/)
  await expect(page.locator('.guide-manipulation-ui')).toHaveCount(1)

  const guideLock = guideEditor.getByLabel('Заблокировать направляющую')
  await guideLock.check()
  await expect(guide).toHaveClass(/locked/)
  await expect(page.locator('.guide-manipulation-ui')).toHaveCount(0)
  await expect(guideEditor.getByLabel('Начало X')).toBeDisabled()
  await expect(guideEditor.getByRole('button', { name: 'Удалить направляющую', exact: true })).toBeDisabled()
  await page.keyboard.press('Delete')
  await expect(guide).toHaveCount(1)

  await guideLock.uncheck()
  await expect(page.locator('.guide-manipulation-ui')).toHaveCount(1)
  await expect(guideEditor.getByLabel('Начало X')).toBeEnabled()

  // #12: place 1,2,3; delete 2; existing row 3 becomes 2 and next proposed row is 3.
  const rowPanel = page.locator('.row-markers-panel')
  await rowPanel.getByRole('button', { name: /Поставить ряд №1/ }).click()
  await clickCanvas(page, 0.22, 0.24)
  await expect(page.locator('.row-marker')).toHaveCount(1)
  await expect(rowPanel.getByRole('button', { name: /Поставить ряд №2/ })).toBeVisible()

  await clickCanvas(page, 0.22, 0.34)
  await clickCanvas(page, 0.22, 0.44)
  await expect(page.locator('.row-marker')).toHaveCount(3)
  await page.keyboard.press('Escape')

  await rowPanel.getByRole('button', { name: /Ряд 2/ }).click()
  await rowPanel.getByRole('button', { name: 'Удалить номер ряда', exact: true }).click()
  await expect(page.locator('.row-marker')).toHaveCount(2)
  await expect(rowPanel.getByRole('button', { name: /Ряд 2/ })).toBeVisible()
  await expect(rowPanel.getByRole('button', { name: /Поставить ряд №3/ })).toBeVisible()

  await rowPanel.getByRole('button', { name: /Поставить ряд №3/ }).click()
  await clickCanvas(page, 0.22, 0.39)
  await page.keyboard.press('Escape')
  await expect(page.locator('.row-marker')).toHaveCount(3)
  await expect(rowPanel.getByRole('button', { name: /Ряд 3/ })).toBeVisible()

  // Row-number annotations are independently draggable and lockable.
  const firstMarker = page.locator('.row-marker').first()
  const beforeDrag = await firstMarker.getAttribute('transform')
  const markerBox = await firstMarker.boundingBox()
  expect(markerBox).not.toBeNull()
  await page.mouse.move(markerBox!.x + markerBox!.width / 2, markerBox!.y + markerBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(markerBox!.x + markerBox!.width / 2 + 35, markerBox!.y + markerBox!.height / 2 + 20, { steps: 5 })
  await page.mouse.up()
  await expect(firstMarker).not.toHaveAttribute('transform', beforeDrag ?? '')

  await rowPanel.getByLabel('Заблокировать').check()
  await expect(firstMarker).toHaveClass(/locked/)
  await expect(rowPanel.getByRole('button', { name: 'Удалить номер ряда', exact: true })).toBeDisabled()

  // #21: the legend is derived from only the stitch symbols actually used.
  await placeStitch(page, 'Столбик без накида', 0.48, 0.46)
  await placeStitch(page, 'Столбик с накидом', 0.58, 0.46)
  await page.keyboard.press('Escape')
  const legend = page.locator('.legend-overlay')
  await expect(legend).toHaveCount(1)
  await expect(legend).toContainText('sc · Столбик без накида')
  await expect(legend).toContainText('dc · Столбик с накидом')
  await expect(legend).not.toContainText('tr ·')

  const legendSection = page.locator('.panel-section').filter({ has: page.getByRole('heading', { name: 'Легенда', exact: true }) })
  const legendToggle = legendSection.locator('input[type="checkbox"]')
  await legendToggle.uncheck()
  await expect(page.locator('.legend-overlay')).toHaveCount(0)
  await legendToggle.check()
  await expect(page.locator('.legend-overlay')).toHaveCount(1)

  // Persist a locked guide as well, then validate schema v17 and SVG authoring output.
  await page.locator('.guide-list button').filter({ hasText: 'Линия' }).click()
  await guideEditor.getByLabel('Заблокировать направляющую').check()

  const jsonDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Сохранить JSON' }).click()
  const jsonPath = await (await jsonDownloadPromise).path()
  expect(jsonPath).not.toBeNull()
  const project = JSON.parse(await readFile(jsonPath!, 'utf8'))
  expect(project.schemaVersion).toBe(17)
  expect(project.guides[0].locked).toBe(true)
  expect(project.rowMarkers).toHaveLength(3)
  expect(project.rowMarkers.map((marker: { number: number }) => marker.number).sort()).toEqual([1, 2, 3])
  expect(project.rowMarkers.some((marker: { locked?: boolean }) => marker.locked === true)).toBe(true)
  expect(project.settings.legend).toEqual({ visible: true })

  const svgDownloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт SVG' }).click()
  const svgPath = await (await svgDownloadPromise).path()
  expect(svgPath).not.toBeNull()
  const svg = await readFile(svgPath!, 'utf8')
  expect(svg).toContain('class="crochet-legend"')
  expect(svg).toContain('sc · Столбик без накида')
  expect(svg).toContain('dc · Столбик с накидом')
  expect(svg).toContain('fill="#c2413b"')

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()
  await expect(page.locator('.guide-line')).toHaveClass(/locked/)
  await expect(page.locator('.row-marker')).toHaveCount(3)
  await expect(page.locator('.row-marker.locked')).toHaveCount(1)
  await expect(page.locator('.legend-overlay')).toHaveCount(1)
})
