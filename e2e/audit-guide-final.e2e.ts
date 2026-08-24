import { expect, test } from '@playwright/test'

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

test('audit final: guides, direct manipulation and real snapping', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()

  await page.locator('.guide-add-grid button').filter({ hasText: 'Дуга' }).click()
  await expect(page.locator('.guide-arc')).toHaveCount(1)
  await expect(page.locator('.guide-snap-point')).toHaveCount(13)
  await expect(page.locator('.row-generator-preview-stitch')).toHaveCount(13)

  const radius = page.getByRole('spinbutton', { name: 'Радиус', exact: true })
  await expect(radius).toHaveValue('120')
  const resize = await page.locator('.guide-resize-handle').boundingBox()
  expect(resize).not.toBeNull()
  await page.mouse.move(resize!.x + resize!.width / 2, resize!.y + resize!.height / 2)
  await page.mouse.down()
  await page.mouse.move(resize!.x + resize!.width / 2 + 35, resize!.y + resize!.height / 2, { steps: 5 })
  await page.mouse.up()
  await expect(radius).not.toHaveValue('120')

  await radius.fill('140')
  await radius.press('Enter')
  await expect(radius).toHaveValue('140')
  const centerX = page.getByRole('spinbutton', { name: 'Центр X', exact: true })
  await centerX.fill('50')
  await centerX.press('Enter')
  await expect(centerX).toHaveValue('50')

  await page.getByRole('button', { name: 'Центр', exact: true }).click()
  await page.locator('fieldset').filter({ hasText: 'Ориентация' }).first().locator('select').selectOption('along')
  const snapPoint = page.locator('.guide-snap-point').first()
  const targetX = Number(await snapPoint.getAttribute('cx'))
  const targetY = Number(await snapPoint.getAttribute('cy'))
  const targetBox = await snapPoint.boundingBox()
  expect(targetBox).not.toBeNull()

  const paletteSingle = page.locator('.symbol-button[title="Столбик без накида"]')
  await paletteSingle.click()
  await page.mouse.move(targetBox!.x + targetBox!.width / 2 + 4, targetBox!.y + targetBox!.height / 2 + 3)
  await expect(page.locator('.snap-indicator')).toHaveCount(1)
  await page.mouse.down()
  await page.mouse.up()
  const snapped = transformParts(await page.locator('.stitch-element.selected').getAttribute('transform'))
  expect(Math.abs(snapped.x - targetX)).toBeLessThan(0.2)
  expect(Math.abs(snapped.y - targetY)).toBeLessThan(0.2)
  expect(Math.abs(snapped.rotation)).toBeGreaterThan(1)

  await page.getByLabel('Разрешить привязку').uncheck()
  await page.locator('.guide-list button').first().click()
  const unsnappedTarget = await page.locator('.guide-snap-point').first().boundingBox()
  expect(unsnappedTarget).not.toBeNull()
  await paletteSingle.click()
  await page.mouse.move(unsnappedTarget!.x + unsnappedTarget!.width / 2 + 8, unsnappedTarget!.y + unsnappedTarget!.height / 2 + 8)
  await expect(page.locator('.snap-indicator')).toHaveCount(0)
  await page.mouse.down()
  await page.mouse.up()
  const freePlaced = transformParts(await page.locator('.stitch-element.selected').getAttribute('transform'))
  expect(Math.hypot(freePlaced.x - targetX, freePlaced.y - targetY)).toBeGreaterThan(3)

  await page.getByLabel('Разрешить привязку').check()
  await page.keyboard.press('Escape')
  await page.locator('.guide-add-grid button').filter({ hasText: 'Сетка' }).click()
  await page.locator('.guide-add-grid button').filter({ hasText: 'Радиальная' }).click()
  await expect(page.locator('.guide-list button')).toHaveCount(3)

  await page.locator('.guide-list button').filter({ hasText: '2. Прямоугольная сетка' }).click()
  const rotation = page.getByRole('spinbutton', { name: 'Поворот °', exact: true })
  await rotation.fill('30')
  await rotation.press('Enter')
  await expect(rotation).toHaveValue('30')
  await expect(page.locator('.guide-grid g[transform*="rotate(30)"]')).toHaveCount(1)
  await page.getByLabel('Показывать').uncheck()
  await expect(page.locator('.guide-grid')).toHaveCount(0)
  await page.getByLabel('Показывать').check()
  await expect(page.locator('.guide-grid')).toHaveCount(1)

  await page.locator('.guide-list button').filter({ hasText: '3. Радиальная сетка' }).click()
  const rings = page.getByRole('spinbutton', { name: 'Кольца', exact: true })
  const sectors = page.getByRole('spinbutton', { name: 'Секторы', exact: true })
  await rings.fill('5')
  await rings.press('Enter')
  await sectors.fill('16')
  await sectors.press('Enter')
  await expect(page.locator('.guide-radial-grid circle.guide-stroke')).toHaveCount(5)
  await expect(page.locator('.guide-radial-grid line.guide-stroke')).toHaveCount(16)
})
