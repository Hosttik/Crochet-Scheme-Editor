import { expect, test, type Page } from '@playwright/test'
import { createGuideFromToolRail } from './helpers/uiV2Guides'

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

async function placeAt(page: Page, label: string, rx: number, ry: number) {
  await page.getByRole('region', { name: 'Библиотека элементов' })
    .getByRole('button', { name: label, exact: true })
    .click()
  const box = await canvasBox(page)
  await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry)
}

function transformParts(value: string | null) {
  const transform = value ?? ''
  const translate = transform.match(/translate\(([-\d.]+) ([-\d.]+)\)/)
  const rotate = transform.match(/rotate\(([-\d.]+)\)/)
  return {
    x: translate ? Number(translate[1]) : Number.NaN,
    y: translate ? Number(translate[2]) : Number.NaN,
    rotation: rotate ? Number(rotate[1]) : Number.NaN,
  }
}

test('uses thinner crochet strokes in the element library without changing canvas geometry', async ({ page }) => {
  await openEditor(page)

  const libraryChain = page.getByRole('region', { name: 'Библиотека элементов' })
    .getByRole('button', { name: 'Воздушная петля · ch', exact: true })
  const libraryStroke = await libraryChain.locator('.symbol-glyph ellipse').evaluate((node) =>
    Number.parseFloat(getComputedStyle(node).strokeWidth),
  )
  expect(libraryStroke).toBeCloseTo(1.35, 2)

  await placeAt(page, 'Воздушная петля · ch', 0.5, 0.5)
  const canvasStroke = await page.locator('.stitch-element .symbol-glyph ellipse').evaluate((node) =>
    Number.parseFloat(getComputedStyle(node).strokeWidth),
  )
  expect(canvasStroke).toBeGreaterThan(libraryStroke)
})

test('keeps the normalized quick toolbar away from the rotation handle for a compact chain stitch', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Воздушная петля · ch', 0.5, 0.5)
  await page.keyboard.press('Escape')

  const toolbar = page.locator('.selection-quick-toolbar')
  const rotationHandle = page.locator('.stitch-rotation-handle')
  await expect(toolbar).toBeVisible()
  await expect(toolbar).not.toHaveClass(/below/)
  await expect(rotationHandle).toBeVisible()

  const toolbarBox = await toolbar.boundingBox()
  const handleBox = await rotationHandle.boundingBox()
  expect(toolbarBox).not.toBeNull()
  expect(handleBox).not.toBeNull()

  const overlaps = !(
    toolbarBox!.x >= handleBox!.x + handleBox!.width ||
    toolbarBox!.x + toolbarBox!.width <= handleBox!.x ||
    toolbarBox!.y >= handleBox!.y + handleBox!.height ||
    toolbarBox!.y + toolbarBox!.height <= handleBox!.y
  )
  expect(overlaps).toBe(false)
})

test('snaps an oval chain to the guide directly under the placement crosshair and centers it on the path', async ({ page }) => {
  await openEditor(page)
  await createGuideFromToolRail(page, 'Линия')

  const guideStroke = page.locator('.guide-line .guide-stroke')
  const before = await guideStroke.boundingBox()
  expect(before).not.toBeNull()

  await page.getByRole('region', { name: 'Библиотека элементов' })
    .getByRole('button', { name: 'Воздушная петля · ch', exact: true })
    .click()
  await page.mouse.click(before!.x + before!.width / 2, before!.y + before!.height / 2)

  const chain = page.locator('.stitch-element').first()
  await expect(chain).toBeVisible()
  const chainEllipse = await chain.locator('.symbol-glyph ellipse').boundingBox()
  const guideAfter = await guideStroke.boundingBox()
  expect(chainEllipse).not.toBeNull()
  expect(guideAfter).not.toBeNull()

  const chainCenterY = chainEllipse!.y + chainEllipse!.height / 2
  const guideCenterY = guideAfter!.y + guideAfter!.height / 2
  expect(chainCenterY).toBeCloseTo(guideCenterY, 1)
})

test('uses the moved custom mirror axis coordinate when reflecting a stitch', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида · sc', 0.42, 0.48)
  await page.keyboard.press('Escape')

  const stitch = page.locator('.stitch-element').first()
  const before = transformParts(await stitch.getAttribute('transform'))
  expect(Number.isFinite(before.x)).toBe(true)

  const productivity = page.locator('.productivity-panel')
  await productivity.getByRole('button', { name: 'Вертикальная', exact: true }).click()
  const axisX = before.x + 73
  const axisXInput = productivity.getByLabel('Ось X', { exact: true })
  await axisXInput.fill(String(axisX))
  await axisXInput.press('Enter')
  await expect(axisXInput).toHaveValue(String(axisX))

  await productivity.getByRole('button', { name: 'Отразить по своей оси', exact: true }).click()
  const after = transformParts(await stitch.getAttribute('transform'))
  expect(after.x).toBeCloseTo(2 * axisX - before.x, 2)
  expect(after.x).not.toBeCloseTo(before.x, 2)
})

test('defaults Repeat spacing to frame-to-frame for a single chain stitch', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Воздушная петля · ch', 0.46, 0.48)
  await page.keyboard.press('Escape')

  const productivity = page.locator('.productivity-panel')
  await expect(productivity.getByLabel('ΔX', { exact: true })).toHaveValue('24')
  await expect(productivity.getByLabel('ΔY', { exact: true })).toHaveValue('0')

  await productivity.getByLabel('Копий', { exact: true }).fill('1')
  await productivity.getByLabel('ΔX', { exact: true }).fill('24')
  await expect(page.locator('.productivity-repeat-preview-stitch')).toHaveCount(1)
})
