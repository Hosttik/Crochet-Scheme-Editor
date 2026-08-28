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

async function openGlobalPanel(page: Page, testId: string) {
  const details = page.getByTestId(testId)
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await details.locator(':scope > summary').click()
  }
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

  const tabs = page.getByRole('tablist', { name: 'Правая панель' })
  await tabs.getByRole('tab', { name: 'Слои', exact: true }).click()
  const layers = page.locator('.ui-v2-right-layers-host .layers-section')
  await expect(layers).toBeVisible()
  await expect(page.locator('.layer-cluster summary').filter({ hasText: 'Группа / мотив' })).toBeVisible()

  await toolbar.getByRole('button', { name: /Отразить слева/ }).click()
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

test('keeps the quick toolbar clear of the rotation handle and shows a live used-symbol legend', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.48, 0.48)

  const toolbarBox = await page.locator('.selection-quick-toolbar').boundingBox()
  const rotationBox = await page.locator('.stitch-rotation-handle').boundingBox()
  expect(toolbarBox).not.toBeNull()
  expect(rotationBox).not.toBeNull()
  const overlaps = !(
    toolbarBox!.x + toolbarBox!.width <= rotationBox!.x ||
    rotationBox!.x + rotationBox!.width <= toolbarBox!.x ||
    toolbarBox!.y + toolbarBox!.height <= rotationBox!.y ||
    rotationBox!.y + rotationBox!.height <= toolbarBox!.y
  )
  expect(overlaps).toBe(false)

  await openGlobalPanel(page, 'legend-global-panel')
  const legendPanel = page.getByTestId('legend-panel')
  await expect(legendPanel.getByText('Использованные символы')).toBeVisible()
  await expect(legendPanel.locator('.legend-used-row')).toHaveCount(1)
  await expect(legendPanel.locator('.legend-used-count')).toHaveText('1')
  await expect(page.locator('.legend-overlay')).toBeVisible()

  const canvas = await canvasBox(page)
  const legendBox = await page.locator('.legend-overlay').boundingBox()
  expect(legendBox).not.toBeNull()
  expect(legendBox!.x).toBeGreaterThanOrEqual(canvas.x)
  expect(legendBox!.y).toBeGreaterThanOrEqual(canvas.y)
})

test('keeps common row controls visible and hides expert settings until requested', async ({ page }) => {
  await openEditor(page)
  await openGlobalPanel(page, 'pattern-rows-global-panel')
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
