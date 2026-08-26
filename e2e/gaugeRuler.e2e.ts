import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

test('calibrates a swatch, estimates a row and measures it with a smart ruler', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')

  const gauge = page.locator('.gauge-panel')
  await gauge.getByRole('button', { name: 'Добавить образец плотности' }).click()
  await expect(gauge.getByLabel('Активный образец')).toHaveValue(/.+/)

  await gauge.getByLabel('Название образца').fill('СБН 10×10')
  await gauge.getByLabel('Петель в образце').fill('20')
  await gauge.getByLabel('Петель в образце').press('Enter')
  await gauge.getByLabel('Рядов в образце').fill('24')
  await gauge.getByLabel('Рядов в образце').press('Enter')
  await gauge.getByLabel('Ширина образца в сантиметрах').fill('10')
  await gauge.getByLabel('Ширина образца в сантиметрах').press('Enter')
  await gauge.getByLabel('Высота образца в сантиметрах').fill('10')
  await gauge.getByLabel('Высота образца в сантиметрах').press('Enter')
  await expect(gauge).toContainText('20 п. / 10 см')
  await expect(gauge).toContainText('24 р. / 10 см')

  await page.getByRole('button', { name: /Радиальная/ }).click()
  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(12)
  await expect(gauge).toContainText('Выбранный ряд: 12 петель')
  await expect(gauge).toContainText('≈ 6 см')
  await expect(gauge).toContainText('Расчётный диаметр')

  await gauge.getByRole('button', { name: 'Поставить линейку' }).click()
  await expect(page.locator('svg.editor-canvas')).toHaveClass(/measuring/)

  const stitches = page.locator('.stitch-element')
  await stitches.first().click()
  await stitches.last().click()

  const ruler = page.locator('.measurement-ruler').first()
  await expect(ruler).toHaveCount(1)
  await expect(ruler.locator('.ruler-label')).toContainText('12 п.')
  await expect(ruler.locator('.ruler-label')).toContainText('≈ 6 см')
  await expect(gauge).toContainText('Автоматически по ряду: 12 петель')

  await page.locator('.guide-list button').filter({ hasText: 'Радиальная' }).click()
  await page.locator('.guide-row-generator').getByLabel('Смещение от направляющей').fill('40')
  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(24)

  await gauge.getByRole('button', { name: 'Поставить линейку' }).click()
  await page.locator('.stitch-element').nth(0).click()
  await page.locator('.stitch-element').nth(12).click()
  await gauge.getByLabel('Тип измерения').selectOption('rows')

  await expect(page.locator('.measurement-ruler')).toHaveCount(2)
  const rowRuler = page.locator('.measurement-ruler').nth(1)
  await expect(rowRuler.locator('.ruler-label')).toContainText('2 р.')
  await expect(rowRuler.locator('.ruler-label')).toContainText('≈ 0,8 см')
  await expect(gauge).toContainText('Автоматически между рядами: 2 р.')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Сохранить JSON' }).click()
  const downloadPath = await (await downloadPromise).path()
  expect(downloadPath).not.toBeNull()
  const project = JSON.parse(await readFile(downloadPath!, 'utf8'))
  expect(project.schemaVersion).toBe(19)
  expect(project.gauge.profiles).toHaveLength(1)
  expect(project.gauge.profiles[0]).toMatchObject({
    name: 'СБН 10×10',
    symbolId: 'single',
    stitchCount: 20,
    rowCount: 24,
    widthCm: 10,
    heightCm: 10,
  })
  expect(project.rulers).toHaveLength(2)
  expect(project.rulers[1]).toMatchObject({ mode: 'rows' })
  expect(project.rulers[1].startElementId).toBeTruthy()
  expect(project.rulers[1].endElementId).toBeTruthy()

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()
  await expect(page.locator('.gauge-panel')).toContainText('СБН 10×10')
  await expect(page.locator('.measurement-ruler')).toHaveCount(2)
  await expect(page.locator('.measurement-ruler').nth(1).locator('.ruler-label')).toContainText('2 р.')
})
