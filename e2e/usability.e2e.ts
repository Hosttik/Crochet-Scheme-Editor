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

test('keeps placement active and builds consecutive stitches through existing hit targets', async ({ page }) => {
  await openEditor(page)
  await createGuideFromToolRail(page, 'Линия')

  const guide = page.locator('.guide-line .guide-stroke')
  const guideBox = await guide.boundingBox()
  expect(guideBox).not.toBeNull()

  await page.getByRole('region', { name: 'Библиотека элементов' })
    .getByRole('button', { name: 'Воздушная петля · ch', exact: true })
    .click()

  const canvas = page.locator('svg.editor-canvas')
  await expect(canvas).toHaveClass(/placing/)

  const startX = guideBox!.x + guideBox!.width / 2 - 14
  const guideY = guideBox!.y + guideBox!.height / 2
  for (const [index, offset] of [0, 14, 28].entries()) {
    await page.mouse.click(startX + offset, guideY)
    await expect(page.locator('.stitch-element')).toHaveCount(index + 1)
    await expect(canvas).toHaveClass(/placing/)
  }

  const centers = await page.locator('.stitch-element .symbol-glyph ellipse').evaluateAll((nodes) =>
    nodes.map((node) => {
      const box = node.getBoundingClientRect()
      return box.y + box.height / 2
    }),
  )
  expect(centers).toHaveLength(3)
  centers.forEach((centerY) => expect(centerY).toBeCloseTo(guideY, 1))
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
  await page.keyboard.press('Escape')

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
  await expect(page.locator('.legend-used-count')).toHaveText('1')
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
  await createGuideFromToolRail(page, 'Радиальная сетка')
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
