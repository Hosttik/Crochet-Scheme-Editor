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
  await page.locator(`.symbols-section .symbol-button[title^="${title}"]`).click()
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
  await page.keyboard.press('Escape')
  const box = await canvasBox(page)
  await page.mouse.click(box.x + 8, box.y + 8)
  await expect(page.locator('.stitch-element.selected')).toHaveCount(0)
}

test('hides temporary multi preview but previews a colored group as one ghost motif', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.36, 0.42)
  await placeAt(page, 'Столбик с накидом', 0.52, 0.48)

  await page.keyboard.press('Control+A')
  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)
  const productivity = page.locator('.productivity-panel')
  await expect(page.locator('.productivity-repeat-preview-stitch')).toHaveCount(0)
  await expect(productivity.locator('.productivity-hint')).toContainText('временный мотив')

  await productivity.getByRole('button', { name: 'Группировать', exact: true }).click()
  await expect(page.locator('.productivity-repeat-preview-group')).toHaveCount(0)
  await expect(page.locator('.productivity-repeat-preview-stitch')).toHaveCount(10)
  await expect(productivity.locator('.productivity-hint')).toContainText('одним объектом')

  await page.getByRole('button', { name: 'Синий', exact: true }).click()
  await expect(page.locator('.stitch-element .symbol-glyph').first()).toHaveCSS('color', 'rgb(37, 99, 235)')
  await expect(page.locator('.stitch-element .symbol-glyph').nth(1)).toHaveCSS('color', 'rgb(37, 99, 235)')

  await clearCanvasSelection(page)
  await page.locator('.stitch-element').first().click()
  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)
  await expect(page.locator('.productivity-repeat-preview-stitch')).toHaveCount(10)

  await clearCanvasSelection(page)
  await page.locator('.stitch-element').first().click({ modifiers: ['Alt'] })
  await expect(page.locator('.stitch-element.selected')).toHaveCount(1)
  await page.getByRole('button', { name: 'Красный', exact: true }).click()
  await expect(page.locator('.stitch-element .symbol-glyph').first()).toHaveCSS('color', 'rgb(194, 65, 59)')
  await expect(page.locator('.stitch-element .symbol-glyph').nth(1)).toHaveCSS('color', 'rgb(37, 99, 235)')
  await page.locator('.stitch-element').first().click()
  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)

  const before = await page.locator('.stitch-element').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('transform')),
  )
  await productivity.getByRole('button', { name: '↔ Слева / справа', exact: true }).click()
  const after = await page.locator('.stitch-element').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('transform')),
  )
  const beforeParts = before.map(transformParts)
  const afterParts = after.map(transformParts)
  expect(afterParts[0].x).toBeGreaterThan(beforeParts[0].x)
  expect(afterParts[1].x).toBeLessThan(beforeParts[1].x)

  await productivity.getByLabel('Копий').fill('2')
  await expect(page.locator('.productivity-repeat-preview-stitch')).toHaveCount(4)
  await productivity.getByLabel('ΔX').fill('70')
  await productivity.getByLabel('ΔY').fill('0')
  await productivity.getByRole('button', { name: 'Создать копии', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(6)
  await expect(page.locator('.stitch-element.selected')).toHaveCount(4)

  const colors = await page.locator('.stitch-element .symbol-glyph').evaluateAll((nodes) =>
    nodes.map((node) => getComputedStyle(node).color),
  )
  expect(colors.filter((color) => color === 'rgb(194, 65, 59)')).toHaveLength(3)
  expect(colors.filter((color) => color === 'rgb(37, 99, 235)')).toHaveLength(3)

  await clearCanvasSelection(page)
  await page.locator('.stitch-element').nth(2).click()
  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)
})

test('interaction pass makes selection, pan, zoom, snap and numeric editing direct', async ({ page }) => {
  await openEditor(page)
  await expect(page.locator('.layers-section')).not.toHaveAttribute('open', '')

  await placeAt(page, 'Столбик без накида', 0.44, 0.46)
  const stitch = page.locator('.stitch-element').first()
  const initial = transformParts(await stitch.getAttribute('transform'))

  await clearCanvasSelection(page)
  const stitchBox = await stitch.boundingBox()
  expect(stitchBox).not.toBeNull()
  await page.mouse.click(stitchBox!.x + 3, stitchBox!.y + 3)
  await expect(stitch).toHaveClass(/selected/)

  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowDown')
  await page.keyboard.press('Shift+ArrowRight')
  const nudged = transformParts(await stitch.getAttribute('transform'))
  expect(nudged.x - initial.x).toBeCloseTo(11, 3)
  expect(nudged.y - initial.y).toBeCloseTo(1, 3)

  const zoomReadout = page.locator('.zoom-readout')
  await expect(zoomReadout).toHaveText('100%')
  await page.keyboard.press('=')
  await expect(zoomReadout).not.toHaveText('100%')
  await page.keyboard.press('0')
  await expect(zoomReadout).toHaveText('100%')

  const snapToggle = page.locator('.canvas-toolbar .snap-toggle')
  await expect(snapToggle).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('s')
  await expect(snapToggle).toHaveAttribute('aria-pressed', 'false')
  await expect(snapToggle).toContainText('Свободно')
  await page.keyboard.press('s')
  await expect(snapToggle).toHaveAttribute('aria-pressed', 'true')

  const canvas = page.locator('svg.editor-canvas')
  const world = canvas.locator(':scope > g')
  const worldBefore = await world.getAttribute('transform')
  const box = await canvasBox(page)
  await page.keyboard.down('Space')
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.55)
  await page.mouse.down()
  await page.mouse.move(box.x + box.width * 0.55 + 45, box.y + box.height * 0.55 + 30, { steps: 4 })
  await page.mouse.up()
  await page.keyboard.up('Space')
  expect(await world.getAttribute('transform')).not.toBe(worldBefore)

  const productivity = page.locator('.productivity-panel')
  const copies = productivity.getByLabel('Копий')
  await copies.fill('')
  await expect(copies).toHaveValue('')
  await copies.fill('2')
  await expect(copies).toHaveValue('2')

  const doubleButton = page.locator('.symbols-section .symbol-button[title^="Столбик с накидом"]')
  await doubleButton.click()
  await expect(doubleButton).toHaveClass(/active/)
  await doubleButton.click()
  await expect(doubleButton).not.toHaveClass(/active/)

  await stitch.click()
  await productivity.getByRole('button', { name: '⧉↔ Копия справа', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(2)
  await expect(page.locator('.stitch-element.selected')).toHaveCount(1)
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

test('persists a stitch color through autosave, JSON and SVG export', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.43, 0.44)
  await page.getByRole('button', { name: 'Красный', exact: true }).click()
  await expect(page.locator('.stitch-element .symbol-glyph')).toHaveCSS('color', 'rgb(194, 65, 59)')

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()
  await expect(page.locator('.stitch-element .symbol-glyph')).toHaveCSS('color', 'rgb(194, 65, 59)')

  const jsonDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Сохранить JSON' }).click()
  const jsonPath = await (await jsonDownload).path()
  expect(jsonPath).not.toBeNull()
  const project = JSON.parse(await readFile(jsonPath!, 'utf8'))
  expect(project.schemaVersion).toBe(17)
  expect(project.elements[0].color).toBe('#c2413b')

  const svgDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт SVG' }).click()
  const svgPath = await (await svgDownload).path()
  expect(svgPath).not.toBeNull()
  const svg = await readFile(svgPath!, 'utf8')
  expect(svg).toContain('color:#c2413b')
})

test('persists group ids in schema v17 and updates a renamed project immediately', async ({ page }) => {
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
  expect(project.schemaVersion).toBe(17)
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
