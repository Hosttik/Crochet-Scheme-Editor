import { expect, test, type Page } from '@playwright/test'
import { createGuideFromToolRail } from './helpers/uiV2Guides'

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

async function placePair(page: Page) {
  const canvas = await canvasBox(page)
  await page.locator('.symbols-section .symbol-button[title^="Столбик без накида ·"]').click()
  await page.mouse.click(canvas.x + canvas.width * 0.42, canvas.y + canvas.height * 0.44)
  await page.mouse.click(canvas.x + canvas.width * 0.58, canvas.y + canvas.height * 0.56)
  await expect(page.locator('.stitch-element')).toHaveCount(2)
  await page.keyboard.press('Escape')
  await expect(page.locator('svg.editor-canvas')).toHaveClass(/selecting/)
}

async function combinedStitchBox(page: Page) {
  const boxes = await page.locator('.stitch-element').evaluateAll((nodes) => nodes.map((node) => {
    const rect = node.getBoundingClientRect()
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
  }))
  expect(boxes.length).toBeGreaterThanOrEqual(2)
  const left = Math.min(...boxes.map((box) => box.x))
  const top = Math.min(...boxes.map((box) => box.y))
  const right = Math.max(...boxes.map((box) => box.x + box.width))
  const bottom = Math.max(...boxes.map((box) => box.y + box.height))
  return { left, top, right, bottom }
}

function translateFromTransform(transform: string | null) {
  const match = transform?.match(/translate\(([-+\d.eE]+)[ ,]+([-+\d.eE]+)\)/)
  expect(match).not.toBeNull()
  return { x: Number(match![1]), y: Number(match![2]) }
}

async function stitchPositions(page: Page) {
  const transforms = await page.locator('.stitch-element').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('transform')),
  )
  return transforms.map(translateFromTransform)
}

async function dragSelectedFrame(page: Page, dx: number, dy: number) {
  const frame = page.getByTestId('group-selection-box')
  await expect(frame).toBeVisible()
  await expect(frame).toHaveClass(/draggable/)
  const box = await frame.boundingBox()
  expect(box).not.toBeNull()

  // The stitches are deliberately far apart, so the center is empty canvas
  // inside the selection frame. Dragging here must move the selected set.
  const startX = box!.x + box!.width / 2
  const startY = box!.y + box!.height / 2
  await page.mouse.move(startX, startY)
  await page.mouse.down()
  await page.mouse.move(startX + dx, startY + dy, { steps: 6 })
  await page.mouse.up()
}

test('keeps all footer sections and the snap switch on the same vertical centerline', async ({ page }) => {
  await openEditor(page)

  const statusbar = page.getByTestId('canvas-statusbar')
  const parts = [
    statusbar.locator('.statusbar-state'),
    statusbar.locator('.canvas-toolbar-zoom'),
    statusbar.locator('.canvas-toolbar-snap'),
    statusbar.locator('.statusbar-selection'),
  ]
  const centers: number[] = []
  for (const part of parts) {
    await expect(part).toBeVisible()
    const box = await part.boundingBox()
    expect(box).not.toBeNull()
    centers.push(box!.y + box!.height / 2)
  }

  const reference = centers[0]!
  centers.forEach((center) => expect(Math.abs(center - reference)).toBeLessThanOrEqual(1))

  const zoomLabel = statusbar.locator('.canvas-toolbar-label')
  const snapLabel = statusbar.locator('.canvas-snap-label')
  const snapTrack = statusbar.locator('.canvas-snap-dot')
  const zoomLabelBox = await zoomLabel.boundingBox()
  const snapLabelBox = await snapLabel.boundingBox()
  const snapTrackBox = await snapTrack.boundingBox()
  expect(zoomLabelBox).not.toBeNull()
  expect(snapLabelBox).not.toBeNull()
  expect(snapTrackBox).not.toBeNull()
  expect(zoomLabelBox!.height).toBe(24)
  expect(snapLabelBox!.height).toBe(24)
  expect(snapTrackBox!.height).toBe(24)
  expect(Math.abs((snapTrackBox!.y + snapTrackBox!.height / 2) - reference)).toBeLessThanOrEqual(1)
})

test('shows a compact guide snap surface and lets placement click through guide chrome', async ({ page }) => {
  await openEditor(page)
  await createGuideFromToolRail(page, 'Линия')

  const guide = page.locator('.guide-line')
  const zone = guide.getByTestId('guide-snap-zone')
  await expect(zone).toHaveCount(1)
  // A perfectly horizontal SVG polyline has a zero-height geometric bounding box,
  // so Playwright's toBeVisible() reports hidden even though its thick stroke is
  // rendered. Verify the actual computed paint properties instead.
  expect(await zone.evaluate((element) => Number(getComputedStyle(element).opacity))).toBeGreaterThan(0)
  expect(await zone.evaluate((element) => parseFloat(getComputedStyle(element).strokeWidth))).toBe(28)

  // Continuous guides accept any point on the path, so division dots are not
  // presented as fake exclusive targets.
  const pathPoint = guide.getByTestId('guide-snap-point').first()
  await expect(pathPoint).toBeHidden()

  await page.locator('.symbols-section .symbol-button[title^="Воздушная петля ·"]').click()
  await expect(page.locator('svg.editor-canvas')).toHaveClass(/placing/)
  expect(await zone.evaluate((element) => parseFloat(getComputedStyle(element).strokeWidth))).toBe(32)
  expect(await guide.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe('none')

  const guideStroke = guide.locator('.guide-stroke')
  const guideBox = await guideStroke.boundingBox()
  expect(guideBox).not.toBeNull()
  await page.mouse.click(guideBox!.x + guideBox!.width / 2, guideBox!.y + guideBox!.height / 2)
  await expect(page.locator('.stitch-element')).toHaveCount(1)

  await page.keyboard.press('Escape')
  await createGuideFromToolRail(page, 'Прямоугольная сетка')
  const gridPoints = page.locator('.guide-grid [data-testid="guide-snap-point"]')
  expect(await gridPoints.count()).toBeGreaterThan(1)
  await expect(gridPoints.first()).toBeVisible()
})

test('lasso is one-shot and the resulting selection can be moved immediately', async ({ page }) => {
  await openEditor(page)
  await placePair(page)
  const bounds = await combinedStitchBox(page)

  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  await rail.getByRole('button', { name: 'Выделение', exact: true }).click()
  await page.getByRole('menu', { name: 'Выделение', exact: true })
    .getByRole('menuitemradio', { name: 'Лассо', exact: true })
    .click()
  const canvas = page.locator('svg.editor-canvas')
  await expect(canvas).toHaveClass(/lassoing/)

  const pad = 18
  const points = [
    [bounds.left - pad, bounds.top - pad],
    [bounds.right + pad, bounds.top - pad],
    [bounds.right + pad, bounds.bottom + pad],
    [bounds.left - pad, bounds.bottom + pad],
    [bounds.left - pad, bounds.top - pad],
  ] as const
  await page.mouse.move(points[0][0], points[0][1])
  await page.mouse.down()
  for (const [x, y] of points.slice(1)) await page.mouse.move(x, y, { steps: 4 })
  await page.mouse.up()

  await expect(page.getByTestId('canvas-statusbar')).toContainText('Выбрано: 2')
  await expect(canvas).toHaveClass(/selecting/)
  await expect(page.getByTestId('lasso-overlay')).toHaveCount(0)

  const before = await stitchPositions(page)
  await dragSelectedFrame(page, 36, 22)
  const after = await stitchPositions(page)
  expect(after[0]!.x - before[0]!.x).toBeCloseTo(36, 0)
  expect(after[0]!.y - before[0]!.y).toBeCloseTo(22, 0)
  expect(after[1]!.x - before[1]!.x).toBeCloseTo(36, 0)
  expect(after[1]!.y - before[1]!.y).toBeCloseTo(22, 0)
})

test('marquee selection can be moved from empty space inside its selection frame', async ({ page }) => {
  await openEditor(page)
  await placePair(page)
  const bounds = await combinedStitchBox(page)

  const pad = 18
  await page.mouse.move(bounds.left - pad, bounds.top - pad)
  await page.mouse.down()
  await page.mouse.move(bounds.right + pad, bounds.bottom + pad, { steps: 8 })
  await page.mouse.up()

  await expect(page.getByTestId('canvas-statusbar')).toContainText('Выбрано: 2')
  const before = await stitchPositions(page)
  await dragSelectedFrame(page, -32, 18)
  const after = await stitchPositions(page)
  expect(after[0]!.x - before[0]!.x).toBeCloseTo(-32, 0)
  expect(after[0]!.y - before[0]!.y).toBeCloseTo(18, 0)
  expect(after[1]!.x - before[1]!.x).toBeCloseTo(-32, 0)
  expect(after[1]!.y - before[1]!.y).toBeCloseTo(18, 0)
})
