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

test('single placement stays clean until Repeat parameters are changed, then commits explicitly', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Воздушная петля', 0.48, 0.48)

  const productivity = page.locator('.productivity-panel')
  await expect(productivity).toBeVisible()
  await expect(page.locator('.productivity-repeat-preview-stitch')).toHaveCount(0)
  await expect(productivity.locator('.productivity-hint')).toContainText('Предпросмотр выключен')

  const deltaX = productivity.getByLabel('ΔX')
  expect(Number(await deltaX.inputValue())).not.toBe(48)

  await productivity.getByLabel('Копий').fill('2')
  await expect(page.locator('.productivity-repeat-preview-stitch')).toHaveCount(2)
  await productivity.getByRole('button', { name: 'Отмена предпросмотра', exact: true }).click()
  await expect(page.locator('.productivity-repeat-preview-stitch')).toHaveCount(0)

  await deltaX.fill('30')
  await expect(page.locator('.productivity-repeat-preview-stitch')).toHaveCount(2)
  await expect(page.locator('.stitch-element')).toHaveCount(1)
  await productivity.getByRole('button', { name: 'Создать копии', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(3)
  await expect(page.locator('.productivity-repeat-preview-stitch')).toHaveCount(0)
})

test('mirror direction and custom axis preview without mutating the document', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.46, 0.48)

  const productivity = page.locator('.productivity-panel')
  await productivity.getByRole('button', { name: 'Предпросмотр вправо', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(1)
  const mirrorGhost = page.locator('.productivity-mirror-preview-stitch')
  await expect(mirrorGhost).toHaveCount(1)
  const reflectPreviewTransform = await mirrorGhost.getAttribute('transform')
  await expect(page.locator('.stitch-element .symbol-glyph')).not.toHaveAttribute('transform', 'scale(-1 1)')

  await productivity.getByRole('button', { name: 'Отразить', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(1)
  await expect(mirrorGhost).toHaveCount(0)
  await expect(page.locator('.stitch-element')).toHaveAttribute('transform', reflectPreviewTransform!)
  await expect(page.locator('.stitch-element .symbol-glyph')).toHaveAttribute('transform', 'scale(-1 1)')

  await productivity.getByRole('button', { name: 'Предпросмотр влево', exact: true }).click()
  await expect(mirrorGhost).toHaveCount(1)
  const copyPreviewTransform = await mirrorGhost.getAttribute('transform')
  await productivity.getByRole('button', { name: 'Создать зеркальную копию', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(2)
  await expect(page.locator('.stitch-element').last()).toHaveAttribute('transform', copyPreviewTransform!)
  await expect(mirrorGhost).toHaveCount(0)

  await productivity.getByRole('button', { name: 'Горизонтальная', exact: true }).click()
  await expect(page.locator('.mirror-axis-overlay')).toBeVisible()
  await expect(page.locator('.productivity-mirror-preview-stitch')).toHaveCount(1)
  await productivity.getByRole('button', { name: 'Скрыть ось / отменить', exact: true }).click()
  await expect(page.locator('.mirror-axis-overlay')).toHaveCount(0)
  await expect(page.locator('.productivity-mirror-preview-stitch')).toHaveCount(0)
})

test('selected guide exposes a live numeric value on canvas', async ({ page }) => {
  await openEditor(page)
  await page.locator('.guide-add-grid button').filter({ hasText: 'Линия' }).click()

  const value = page.locator('.guide-line .guide-value-label')
  await expect(value).toHaveText('260 px · 0°')

  const length = page.getByLabel('Длина')
  await length.fill('420')
  await length.press('Enter')
  await expect(value).toHaveText('420 px · 0°')
})
