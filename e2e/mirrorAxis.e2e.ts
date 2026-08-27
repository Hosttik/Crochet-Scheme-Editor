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
  await page.locator(`.symbols-section .symbol-button[title^="${title} ·"]`).click()
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

test('moves and applies an explicit vertical or horizontal mirror axis', async ({ page }) => {
  await openEditor(page)
  await page.getByLabel('Разрешить привязку').uncheck()
  await placeAt(page, 'Столбик без накида', 0.42, 0.46)

  const stitch = page.locator('.stitch-element').first()
  const original = transformParts(await stitch.getAttribute('transform'))
  const productivity = page.locator('.productivity-panel')

  await productivity.getByRole('button', { name: 'Вертикальная', exact: true }).click()
  const verticalAxis = page.locator('.mirror-axis-overlay[data-mirror-angle="90"]')
  await expect(verticalAxis).toHaveCount(1)

  const axisX = productivity.getByLabel('Ось X')
  expect(Number(await axisX.inputValue())).toBeCloseTo(original.x, 3)
  const explicitX = original.x + 80
  await axisX.fill(String(explicitX))
  await productivity.getByRole('button', { name: 'Отразить по своей оси', exact: true }).click()

  const reflected = transformParts(await stitch.getAttribute('transform'))
  expect(reflected.x).toBeCloseTo(explicitX * 2 - original.x, 3)
  expect(reflected.y).toBeCloseTo(original.y, 3)

  await productivity.getByRole('button', { name: 'Горизонтальная', exact: true }).click()
  const horizontalAxis = page.locator('.mirror-axis-overlay[data-mirror-angle="0"]')
  await expect(horizontalAxis).toHaveCount(1)

  const axisY = productivity.getByLabel('Ось Y')
  const beforeDrag = Number(await axisY.inputValue())
  // The editor overlay must be above StitchLayer so the center handle wins hit testing.
  const handle = page.locator('.mirror-axis-handle')
  const handleBox = await handle.boundingBox()
  expect(handleBox).not.toBeNull()
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2 + 45, { steps: 5 })
  await page.mouse.up()

  const afterDrag = Number(await axisY.inputValue())
  expect(afterDrag - beforeDrag).toBeGreaterThan(35)

  await productivity.getByRole('button', { name: 'Создать копию по своей оси', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(2)
  await expect(page.locator('.stitch-element.selected')).toHaveCount(1)

  await productivity.getByRole('button', { name: 'Скрыть ось', exact: true }).click()
  await expect(page.locator('.mirror-axis-overlay')).toHaveCount(0)
  await expect(page.locator('.selection-quick-toolbar').getByRole('button', { name: 'Повернуть на 180°' })).toBeVisible()
})
