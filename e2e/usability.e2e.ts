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
  await page.locator(`.symbols-section .symbol-button[title="${title}"]`).click()
  const box = await canvasBox(page)
  await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry)
}

test('grabs an existing stitch directly from placement mode without creating another stitch', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.42, 0.45)
  const canvas = page.locator('svg.editor-canvas')
  await expect(canvas).toHaveClass(/placing/)
  await expect(page.locator('.stitch-element')).toHaveCount(1)

  const stitch = page.locator('.stitch-element').first()
  const before = await stitch.getAttribute('transform')
  const box = await stitch.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.mouse.down()
  await page.mouse.move(box!.x + box!.width / 2 + 52, box!.y + box!.height / 2 + 26, { steps: 5 })
  await page.mouse.up()

  await expect(page.locator('.stitch-element')).toHaveCount(1)
  await expect(canvas).toHaveClass(/selecting/)
  await expect(stitch).not.toHaveAttribute('transform', before ?? '')
})

test('shows contextual quick actions and semantic group layers', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.40, 0.44)
  await placeAt(page, 'Воздушная петля', 0.52, 0.48)
  await page.keyboard.press('Escape')
  await page.keyboard.press('Control+A')

  const toolbar = page.locator('.selection-quick-toolbar')
  await expect(toolbar).toBeVisible()
  await toolbar.getByRole('button', { name: 'Группировать' }).click()
  await expect(toolbar.getByRole('button', { name: 'Разгруппировать' })).toBeVisible()
  await expect(page.locator('.layer-cluster summary').filter({ hasText: 'Группа / мотив' })).toBeVisible()

  await toolbar.getByRole('button', { name: 'Отразить по горизонтали' }).click()
  await toolbar.getByRole('button', { name: 'Дублировать' }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(4)
})

test('previews repeat live and creates a circular array without a guide', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.58, 0.46)
  await page.keyboard.press('Escape')

  const productivity = page.locator('.productivity-panel')
  await expect(productivity).toBeVisible()
  await productivity.getByLabel('Копий').fill('3')
  await expect(page.locator('.productivity-repeat-preview-stitch')).toHaveCount(3)

  await productivity.getByRole('button', { name: 'По кругу', exact: true }).click()
  await expect(productivity.getByLabel('Центр')).toHaveValue('')
  await productivity.getByLabel('Шаг °').fill('90')
  await expect(page.locator('.productivity-repeat-preview-stitch')).toHaveCount(3)
  await productivity.getByRole('button', { name: 'Создать копии', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(4)
})

test('keeps common row controls visible and hides expert settings until requested', async ({ page }) => {
  await openEditor(page)
  await page.getByRole('button', { name: /Радиальная/ }).click()
  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()
  await expect(page.locator('.pattern-row-number').filter({ hasText: /^Ряд 1$/ })).toBeVisible()

  const rowEditor = page.locator('.parametric-row-editor')
  await expect(rowEditor.getByLabel('Количество элементов')).toBeVisible()
  await expect(rowEditor.getByLabel('Ориентация')).toBeVisible()
  await expect(rowEditor.getByRole('button', { name: 'Дополнительно' })).toHaveAttribute('aria-expanded', 'false')
  await expect(rowEditor.getByRole('button', { name: 'Раппорт', exact: true })).toHaveCount(0)

  await rowEditor.getByRole('button', { name: 'Дополнительно' }).click()
  await expect(rowEditor.getByRole('button', { name: 'Дополнительно' })).toHaveAttribute('aria-expanded', 'true')
  await expect(rowEditor.getByRole('button', { name: 'Раппорт', exact: true })).toBeVisible()
  await expect(rowEditor.getByRole('button', { name: 'Замкнутый', exact: true })).toBeVisible()
})
