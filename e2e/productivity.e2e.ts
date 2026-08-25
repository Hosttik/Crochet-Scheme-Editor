import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

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

async function clearCanvasSelection(page: Page) {
  const box = await canvasBox(page)
  await page.mouse.click(box.x + 8, box.y + 8)
  await expect(page.locator('.stitch-element.selected')).toHaveCount(0)
}

test('groups a motif, selects it as one object, mirrors it and creates a linear array', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.36, 0.42)
  await placeAt(page, 'Столбик с накидом', 0.52, 0.48)

  await page.keyboard.press('Control+A')
  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)
  const productivity = page.locator('.productivity-panel')
  await productivity.getByRole('button', { name: 'Группировать', exact: true }).click()

  await clearCanvasSelection(page)
  await page.locator('.stitch-element').first().click()
  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)

  await clearCanvasSelection(page)
  await page.locator('.stitch-element').first().click({ modifiers: ['Alt'] })
  await expect(page.locator('.stitch-element.selected')).toHaveCount(1)
  await page.locator('.stitch-element').first().click()
  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)

  const before = await page.locator('.stitch-element').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('transform')),
  )
  await productivity.getByRole('button', { name: '↔ По горизонтали', exact: true }).click()
  const after = await page.locator('.stitch-element').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('transform')),
  )
  const beforeParts = before.map(transformParts)
  const afterParts = after.map(transformParts)
  expect(afterParts[0].x).toBeGreaterThan(beforeParts[0].x)
  expect(afterParts[1].x).toBeLessThan(beforeParts[1].x)

  await productivity.getByLabel('Копий').fill('2')
  await productivity.getByLabel('ΔX').fill('70')
  await productivity.getByLabel('ΔY').fill('0')
  await productivity.getByRole('button', { name: 'Создать копии', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(6)
  await expect(page.locator('.stitch-element.selected')).toHaveCount(4)

  await clearCanvasSelection(page)
  await page.locator('.stitch-element').nth(2).click()
  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)
})

test('creates circular and along-guide repeats without losing the motif selection', async ({ page }) => {
  await openEditor(page)
  await page.locator('.guide-add-grid button').filter({ hasText: 'Радиальная' }).click()
  await expect(page.locator('.guide-radial-grid')).toHaveCount(1)

  await placeAt(page, 'Столбик без накида', 0.72, 0.50)
  await expect(page.locator('.stitch-element.selected')).toHaveCount(1)

  const productivity = page.locator('.productivity-panel')
  await productivity.getByRole('button', { name: 'По кругу', exact: true }).click()
  await productivity.getByLabel('Центр').selectOption({ index: 1 })
  await productivity.getByLabel('Копий').fill('3')
  await productivity.getByLabel('Шаг °').fill('90')
  await productivity.getByRole('button', { name: 'Создать копии', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(4)
  await expect(page.locator('.stitch-element.selected')).toHaveCount(3)
  const circular = (await page.locator('.stitch-element').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('transform')),
  )).map(transformParts)
  expect(new Set(circular.map((item) => `${Math.round(item.x)}:${Math.round(item.y)}`)).size).toBe(4)

  await page.locator('.stitch-element').first().click({ modifiers: ['Alt'] })
  await expect(page.locator('.stitch-element.selected')).toHaveCount(1)
  await productivity.getByRole('button', { name: 'По направляющей', exact: true }).click()
  await productivity.getByLabel('Направляющая').selectOption({ index: 1 })
  await productivity.getByLabel('Копий').fill('3')
  await productivity.getByLabel('Шаг по пути').fill('55')
  await productivity.getByLabel('Ориентация').selectOption('tangent')
  await productivity.getByRole('button', { name: 'Создать копии', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(7)
  await expect(page.locator('.stitch-element.selected')).toHaveCount(3)
  const guideCopies = (await page.locator('.stitch-element.selected').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('transform')),
  )).map(transformParts)
  expect(new Set(guideCopies.map((item) => Math.round(item.rotation))).size).toBeGreaterThan(1)
})

test('repeated Ctrl+D repeats the previous duplicate movement and rotation', async ({ page }) => {
  await openEditor(page)
  await page.getByLabel('Разрешить привязку').uncheck()
  await placeAt(page, 'Столбик без накида', 0.38, 0.42)

  const original = transformParts(await page.locator('.stitch-element').first().getAttribute('transform'))
  await page.keyboard.press('Control+D')
  await expect(page.locator('.stitch-element')).toHaveCount(2)

  await page.keyboard.press('Escape')
  const selected = page.locator('.stitch-element.selected')
  const selectedBox = await selected.boundingBox()
  expect(selectedBox).not.toBeNull()
  await page.mouse.move(selectedBox!.x + selectedBox!.width / 2, selectedBox!.y + selectedBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(selectedBox!.x + selectedBox!.width / 2 + 58, selectedBox!.y + selectedBox!.height / 2 + 31, { steps: 6 })
  await page.mouse.up()
  await page.locator('.right-sidebar').getByRole('button', { name: '+15°', exact: true }).click()

  const current = transformParts(await selected.getAttribute('transform'))
  expect(Math.hypot(current.x - original.x, current.y - original.y)).toBeGreaterThan(40)
  expect(current.rotation - original.rotation).toBeCloseTo(15, 3)
  await expect(page.locator('.stitch-element.selected')).toHaveCount(1)
  await page.keyboard.press('Control+D')
  await expect(page.locator('.stitch-element')).toHaveCount(3)
  const next = transformParts(await page.locator('.stitch-element.selected').getAttribute('transform'))

  expect(next.x - current.x).toBeCloseTo(current.x - original.x, 3)
  expect(next.y - current.y).toBeCloseTo(current.y - original.y, 3)
  expect(next.rotation - current.rotation).toBeCloseTo(current.rotation - original.rotation, 3)
})

test('persists group ids in schema v12 and updates a renamed project immediately', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.40, 0.43)
  await placeAt(page, 'Воздушная петля', 0.48, 0.48)
  await page.keyboard.press('Control+A')
  await page.locator('.productivity-panel').getByRole('button', { name: 'Группировать', exact: true }).click()

  const name = page.getByLabel('Название схемы')
  await name.fill('Быстрый мотив')
  await name.press('Enter')
  const activeOption = page.locator('.project-select option:checked')
  await expect(activeOption).toHaveText('Быстрый мотив')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Сохранить JSON' }).click()
  const path = await (await downloadPromise).path()
  expect(path).not.toBeNull()
  const project = JSON.parse(await readFile(path!, 'utf8'))
  expect(project.schemaVersion).toBe(12)
  expect(project.elements).toHaveLength(2)
  expect(project.elements[0].groupId).toBeTruthy()
  expect(project.elements[0].groupId).toBe(project.elements[1].groupId)

  await page.waitForTimeout(900)
  await page.reload()
  await expect(page.getByLabel('Название схемы')).toHaveValue('Быстрый мотив')
  await clearCanvasSelection(page)
  await page.locator('.stitch-element').first().click()
  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)
})
