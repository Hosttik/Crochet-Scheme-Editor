import { expect, test, type Page } from '@playwright/test'
import { openGlobalPanel } from './helpers/rightWorkspace'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

async function uploadReference(page: Page) {
  await openGlobalPanel(page, 'background-global-panel')
  await page.getByTestId('background-file-input').setInputFiles({
    name: 'reference.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="#ddd"/><circle cx="300" cy="150" r="80" fill="#999"/></svg>'),
  })
  await expect(page.getByTestId('background-image')).toBeVisible()
}

test('selects, resizes and rotates an existing background directly on canvas', async ({ page }) => {
  await openEditor(page)
  await uploadReference(page)

  const image = page.getByTestId('background-image')
  await image.click()
  await expect(page.getByTestId('background-selection-box')).toBeVisible()
  await expect(page.locator('.background-resize-handle')).toHaveCount(4)
  await expect(page.getByTestId('background-rotate-handle')).toBeVisible()

  const widthInput = page.getByLabel('Ширина фона')
  const heightInput = page.getByLabel('Высота фона')
  const beforeWidth = Number(await widthInput.inputValue())
  const beforeHeight = Number(await heightInput.inputValue())
  const se = page.locator('.background-resize-handle[data-handle="se"]')
  const seBox = await se.boundingBox()
  expect(seBox).not.toBeNull()
  await page.mouse.move(seBox!.x + seBox!.width / 2, seBox!.y + seBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(seBox!.x + seBox!.width / 2 + 70, seBox!.y + seBox!.height / 2 + 35, { steps: 5 })
  await page.mouse.up()
  expect(Number(await widthInput.inputValue())).toBeGreaterThan(beforeWidth)
  expect(Number(await heightInput.inputValue())).toBeGreaterThan(beforeHeight)

  const rotate = page.getByTestId('background-rotate-handle')
  const rotateBox = await rotate.boundingBox()
  expect(rotateBox).not.toBeNull()
  await page.mouse.move(rotateBox!.x + rotateBox!.width / 2, rotateBox!.y + rotateBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(rotateBox!.x + rotateBox!.width / 2 + 100, rotateBox!.y + rotateBox!.height / 2 + 45, { steps: 6 })
  await page.mouse.up()
  const rotation = Number(await page.getByLabel('Поворот изображения °').inputValue())
  expect(Math.abs(rotation)).toBeGreaterThan(5)

  await page.getByTestId('background-lock').check()
  await expect(page.locator('.background-resize-handle')).toHaveCount(0)
  await expect(page.getByTestId('background-rotate-handle')).toHaveCount(0)
})

test('shows full page frames in tiled-print preview', async ({ page }) => {
  await openEditor(page)
  await openGlobalPanel(page, 'print-global-panel')
  const panel = page.getByTestId('print-panel')
  await panel.getByTestId('print-scale').fill('400')
  const count = Number(await panel.getByTestId('print-page-count').textContent())
  expect(count).toBeGreaterThan(1)
  await expect(panel.getByTestId('print-preview-frame')).toHaveCount(count)
  await expect(panel.getByTestId('print-page-frames')).toBeChecked()
  await panel.getByTestId('print-page-frames').uncheck()
  await expect(panel.getByTestId('print-page-frames')).not.toBeChecked()
  // Preview remains visible even when printed frames are disabled so the user can still see tiling.
  await expect(panel.getByTestId('print-preview-frame')).toHaveCount(count)
})

test('keeps the tracing underlay transparent to placement tools', async ({ page }) => {
  await openEditor(page)
  await uploadReference(page)

  const imageBox = await page.getByTestId('background-image').boundingBox()
  expect(imageBox).not.toBeNull()
  await page.locator('.symbols-section .symbol-button[title^="Столбик без накида · "]').click()
  await expect(page.locator('svg.editor-canvas')).toHaveClass(/placing/)
  await page.mouse.click(
    imageBox!.x + imageBox!.width / 2,
    imageBox!.y + imageBox!.height / 2,
  )
  await expect(page.locator('.stitch-element')).toHaveCount(1)
})
