import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { downloadFromFileMenu } from './helpers/uiV2FileMenu'

// Regression gate for v1.24 direct stitch geometry editing.
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

async function saveProjectJson(page: Page) {
  const download = await downloadFromFileMenu(page, 'Экспорт проекта…')
  const path = await download.path()
  expect(path).not.toBeNull()
  return JSON.parse(await readFile(path!, 'utf8'))
}

function numberAttr(value: string | null) {
  const parsed = Number(value)
  expect(Number.isFinite(parsed)).toBe(true)
  return parsed
}

test('resizes an ordinary stitch by frame handles and keeps one undoable geometry transaction', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик с накидом', 0.48, 0.48)

  const stitch = page.locator('.stitch-element').first()
  await expect(stitch).toHaveClass(/selected/)
  await expect(page.getByTestId('stitch-resize-uniform')).toBeVisible()
  await expect(page.getByTestId('stitch-resize-height')).toBeVisible()
  await expect(page.getByTestId('stitch-spread-handle')).toHaveCount(0)
  expect(numberAttr(await stitch.getAttribute('data-scale-x'))).toBeCloseTo(1, 6)
  expect(numberAttr(await stitch.getAttribute('data-scale-y'))).toBeCloseTo(1, 6)

  await dragHandle(page, 'stitch-resize-uniform', 34, 34)
  const uniformX = numberAttr(await stitch.getAttribute('data-scale-x'))
  const uniformY = numberAttr(await stitch.getAttribute('data-scale-y'))
  expect(uniformX).toBeGreaterThan(1.2)
  expect(uniformY).toBeGreaterThan(1.2)
  expect(uniformY).toBeCloseTo(uniformX, 6)

  await page.keyboard.press('Control+z')
  await expect.poll(async () => numberAttr(await stitch.getAttribute('data-scale-x'))).toBeCloseTo(1, 6)
  await expect.poll(async () => numberAttr(await stitch.getAttribute('data-scale-y'))).toBeCloseTo(1, 6)

  await page.keyboard.press('Control+Shift+z')
  await expect.poll(async () => numberAttr(await stitch.getAttribute('data-scale-x'))).toBeCloseTo(uniformX, 5)
  await expect.poll(async () => numberAttr(await stitch.getAttribute('data-scale-y'))).toBeCloseTo(uniformY, 5)

  await stitch.click()
  await expect(page.getByTestId('stitch-resize-height')).toBeVisible()
  await dragHandle(page, 'stitch-resize-height', 0, 30)
  const heightX = numberAttr(await stitch.getAttribute('data-scale-x'))
  const heightY = numberAttr(await stitch.getAttribute('data-scale-y'))
  expect(heightX).toBeCloseTo(uniformX, 5)
  expect(heightY).toBeGreaterThan(uniformY + 0.15)

  const project = await saveProjectJson(page)
  expect(project.schemaVersion).toBe(22)
  expect(project.elements).toHaveLength(1)
  expect(project.elements[0].geometry.scaleX).toBeCloseTo(heightX, 5)
  expect(project.elements[0].geometry.scaleY).toBeCloseTo(heightY, 5)
  expect(project.elements[0].geometry.spread).toBeUndefined()

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()
  const restored = page.locator('.stitch-element').first()
  await expect.poll(async () => numberAttr(await restored.getAttribute('data-scale-x'))).toBeCloseTo(heightX, 5)
  await expect.poll(async () => numberAttr(await restored.getAttribute('data-scale-y'))).toBeCloseTo(heightY, 5)
})

test('adjusts increase spread semantically without stretching the whole glyph', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, '3 столбика с накидом с общим основанием', 0.50, 0.48)

  const stitch = page.locator('.stitch-element').first()
  const glyph = stitch.locator('.symbol-glyph')
  await expect(page.getByTestId('stitch-spread-handle')).toBeVisible()
  const before = await glyph.boundingBox()
  expect(before).not.toBeNull()

  await dragHandle(page, 'stitch-spread-handle', 36, 0)
  const spread = numberAttr(await stitch.getAttribute('data-spread'))
  const scaleX = numberAttr(await stitch.getAttribute('data-scale-x'))
  const scaleY = numberAttr(await stitch.getAttribute('data-scale-y'))
  expect(spread).toBeGreaterThan(1.25)
  expect(scaleX).toBeCloseTo(1, 6)
  expect(scaleY).toBeCloseTo(1, 6)

  const after = await glyph.boundingBox()
  expect(after).not.toBeNull()
  expect(after!.width).toBeGreaterThan(before!.width * 1.2)
  expect(after!.height).toBeCloseTo(before!.height, 1)

  const project = await saveProjectJson(page)
  expect(project.schemaVersion).toBe(22)
  expect(project.elements[0].geometry.spread).toBeCloseTo(spread, 5)
  expect(project.elements[0].geometry.scaleX).toBeUndefined()
  expect(project.elements[0].geometry.scaleY).toBeUndefined()
})