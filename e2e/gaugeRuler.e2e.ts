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

async function addGauge(page: Page) {
  const gauge = page.locator('.gauge-panel')
  await gauge.getByRole('button', { name: 'Добавить образец плотности' }).click()
  await gauge.getByLabel('Петель в образце').fill('20')
  await gauge.getByLabel('Петель в образце').press('Enter')
  await gauge.getByLabel('Ширина образца в сантиметрах').fill('10')
  await gauge.getByLabel('Ширина образца в сантиметрах').press('Enter')
  await gauge.getByLabel('Рядов в образце').fill('10')
  await gauge.getByLabel('Рядов в образце').press('Enter')
  await gauge.getByLabel('Высота образца в сантиметрах').fill('10')
  await gauge.getByLabel('Высота образца в сантиметрах').press('Enter')
  return gauge
}

test('counts actual stitch anchors inside the measurement region and converts them to centimeters', async ({ page }) => {
  await openEditor(page)
  const gauge = await addGauge(page)
  await expect(gauge).toContainText('20 п. / 10 см')
  await expect(gauge).toContainText('10 р. / 10 см')

  await page.getByRole('button', { name: /4 воздушные петли/ }).click()
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvasBox(page)
  await canvas.click({ position: { x: box.width * 0.52, y: box.height * 0.48 } })
  await expect(page.locator('.stitch-element')).toHaveCount(4)

  await gauge.getByRole('button', { name: 'Новая область измерения', exact: true }).click()
  const stitches = page.locator('.stitch-element')
  await stitches.first().click()
  await stitches.last().click()

  const ruler = page.locator('.measurement-ruler').first()
  await expect(ruler).toHaveCount(1)
  await expect(ruler.locator('.ruler-label')).toContainText('4 п./ст.')
  await expect(ruler.locator('.ruler-label')).toContainText('≈ 2 см')
  await expect(gauge.getByTestId('ruler-auto-summary')).toContainText('4 п./ст.')
  await expect(gauge.getByTestId('ruler-auto-summary')).toContainText('≈ 2 см')
  await expect(ruler.getByTestId('ruler-corridor')).toBeVisible()
  await expect(ruler.locator('.ruler-counted-anchor')).toHaveCount(4)
})

test('row mode counts anchors/semantic rows in a vertical region and Escape removes the measurement', async ({ page }) => {
  await openEditor(page)
  const gauge = await addGauge(page)

  await page.locator('.symbols-section .symbol-button[title^="Столбик без накида ·"]').click()
  const box = await canvasBox(page)
  await page.mouse.click(box.x + box.width * 0.38, box.y + box.height * 0.36)
  await page.mouse.click(box.x + box.width * 0.38, box.y + box.height * 0.48)
  await page.mouse.click(box.x + box.width * 0.38, box.y + box.height * 0.60)
  await expect(page.locator('.stitch-element')).toHaveCount(3)

  await gauge.getByRole('button', { name: 'Новая область измерения', exact: true }).click()
  const stitches = page.locator('.stitch-element')
  await stitches.first().click()
  await stitches.last().click()
  await expect(page.locator('.measurement-ruler')).toHaveCount(1)

  await gauge.getByLabel('Тип измерения').selectOption('rows')
  const ruler = page.locator('.measurement-ruler').first()
  await expect(ruler.locator('.ruler-label')).toContainText('3 р.')
  await expect(ruler.locator('.ruler-label')).toContainText('≈ 3 см')
  await expect(gauge.getByTestId('ruler-auto-summary')).toContainText('3 ряд.')
  await expect(ruler.locator('.ruler-counted-anchor')).toHaveCount(3)

  await page.keyboard.press('Escape')
  await expect(page.locator('.measurement-ruler')).toHaveCount(0)

  await gauge.getByRole('button', { name: 'Новая область измерения', exact: true }).click()
  await stitches.first().click()
  await expect(page.locator('.measurement-ruler')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('svg.editor-canvas')).not.toHaveClass(/measuring/)
  await expect(page.locator('.measurement-ruler')).toHaveCount(0)
})
