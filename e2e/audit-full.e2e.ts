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
  await page.getByTitle(title).click()
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

async function createRadialRow(page: Page, count = 12) {
  await page.locator('.guide-add-grid button').filter({ hasText: 'Радиальная' }).click()
  await expect(page.getByText('Создать параметрический ряд', { exact: true })).toBeVisible()
  if (count !== 12) {
    await page.getByLabel('Количество элементов').fill(String(count))
  }
  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()
  await expect(page.getByText('Ряд 1', { exact: true })).toBeVisible()
}

test('audit: manual editing, layers, history, viewport and language', async ({ page }) => {
  await openEditor(page)
  await expect(page.locator('.symbol-button')).toHaveCount(8)

  await placeAt(page, 'Воздушная петля', 0.32, 0.42)
  await placeAt(page, 'Столбик без накида', 0.55, 0.47)
  await expect(page.locator('.stitch-element')).toHaveCount(2)
  await expect(page.locator('.layer-row')).toHaveCount(2)

  const selected = page.locator('.stitch-element.selected')
  await expect(selected).toHaveCount(1)
  await page.getByRole('button', { name: '+15°' }).click()
  await expect(selected).toHaveAttribute('transform', /rotate\(15\)/)

  await page.getByRole('button', { name: 'Отменить' }).click()
  await expect(page.locator('.stitch-element').nth(1)).toHaveAttribute('transform', /rotate\(0\)/)
  await page.getByRole('button', { name: 'Повторить' }).click()
  await expect(page.locator('.stitch-element').nth(1)).toHaveAttribute('transform', /rotate\(15\)/)

  // Move the bottom layer to front and verify visible order in the Layers panel.
  const layerRows = page.locator('.layer-row')
  await layerRows.last().locator('.layer-main-button').click()
  await page.getByRole('button', { name: 'На передний план' }).click()
  await expect(page.locator('.layer-row').first().locator('strong')).toHaveText('Воздушная петля')

  // Visibility and locking are reflected both in the layer UI and on the canvas.
  await page.locator('.layer-row').first().getByRole('button', { name: 'Скрыть элемент' }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(1)
  await page.locator('.layer-row').first().getByRole('button', { name: 'Показать элемент' }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(2)

  await page.locator('.layer-row').first().getByRole('button', { name: 'Заблокировать элемент' }).click()
  await expect(page.locator('.layer-row').first().locator('.layer-main-button')).toBeDisabled()
  await page.locator('.layer-row').first().getByRole('button', { name: 'Разблокировать элемент' }).click()
  await page.locator('.layer-row').first().locator('.layer-main-button').click()

  await page.getByRole('button', { name: 'Дублировать' }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(3)
  await page.getByRole('button', { name: 'Копировать' }).click()
  await page.keyboard.press('Control+V')
  await expect(page.locator('.stitch-element')).toHaveCount(4)

  await page.keyboard.press('Control+A')
  await expect(page.locator('.stitch-element.selected')).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Вместить выделение' })).toBeEnabled()

  const zoomReadout = page.locator('.zoom-readout')
  await zoomReadout.click()
  await expect(zoomReadout).toHaveText('100%')
  await page.locator('.canvas-toolbar button').filter({ hasText: '+' }).click()
  await expect(zoomReadout).toHaveText('120%')
  await zoomReadout.click()
  await expect(zoomReadout).toHaveText('100%')
  await page.getByRole('button', { name: 'Вместить всю схему' }).click()
  await page.getByRole('button', { name: 'Вместить выделение' }).click()

  await page.getByRole('button', { name: 'Свернуть левую панель' }).click()
  await expect(page.locator('.app-shell')).toHaveClass(/left-collapsed/)
  await page.getByRole('button', { name: 'Свернуть левую панель' }).click()
  await page.getByRole('button', { name: 'Свернуть правую панель' }).click()
  await expect(page.locator('.app-shell')).toHaveClass(/right-collapsed/)
  await page.getByRole('button', { name: 'Свернуть правую панель' }).click()

  await page.getByRole('button', { name: 'EN' }).click()
  await expect(page.getByText('Crochet Scheme Editor', { exact: true })).toBeVisible()
  await expect(page.locator('.symbol-button')).toHaveCount(8)
  await page.getByRole('button', { name: 'RU' }).click()
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()

  await page.keyboard.press('Delete')
  await expect(page.locator('.stitch-element')).toHaveCount(0)
  await page.getByRole('button', { name: 'Отменить' }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(4)
})

test('audit: marquee selection, group move and group rotation', async ({ page }) => {
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.35, 0.40)
  await placeAt(page, 'Столбик с накидом', 0.58, 0.48)
  await page.keyboard.press('Escape')

  const stitches = page.locator('.stitch-element')
  const firstBox = await stitches.nth(0).boundingBox()
  const secondBox = await stitches.nth(1).boundingBox()
  expect(firstBox).not.toBeNull()
  expect(secondBox).not.toBeNull()
  const box = await canvasBox(page)
  const left = Math.max(box.x + 2, Math.min(firstBox!.x, secondBox!.x) - 30)
  const top = Math.max(box.y + 2, Math.min(firstBox!.y, secondBox!.y) - 30)
  const right = Math.min(box.x + box.width - 2, Math.max(firstBox!.x + firstBox!.width, secondBox!.x + secondBox!.width) + 30)
  const bottom = Math.min(box.y + box.height - 2, Math.max(firstBox!.y + firstBox!.height, secondBox!.y + secondBox!.height) + 30)

  await page.mouse.move(left, top)
  await page.mouse.down()
  await page.mouse.move(right, bottom, { steps: 5 })
  await page.mouse.up()
  await expect(page.locator('.stitch-element.selected')).toHaveCount(2)
  await expect(page.locator('.multi-selection-card')).toContainText('Выбрано элементов: 2')

  const before = await page.locator('.stitch-element.selected').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('transform')),
  )
  const dragBox = await page.locator('.stitch-element.selected').first().boundingBox()
  expect(dragBox).not.toBeNull()
  await page.mouse.move(dragBox!.x + dragBox!.width / 2, dragBox!.y + dragBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(dragBox!.x + dragBox!.width / 2 + 55, dragBox!.y + dragBox!.height / 2 + 35, { steps: 6 })
  await page.mouse.up()

  const after = await page.locator('.stitch-element.selected').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('transform')),
  )
  const beforeParts = before.map(transformParts)
  const afterParts = after.map(transformParts)
  for (let index = 0; index < 2; index += 1) {
    expect(afterParts[index].x - beforeParts[index].x).toBeGreaterThan(40)
    expect(afterParts[index].y - beforeParts[index].y).toBeGreaterThan(20)
  }

  await page.getByRole('button', { name: '+15°' }).click()
  const rotations = await page.locator('.stitch-element.selected').evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute('transform')),
  )
  expect(rotations.map(transformParts).every((item) => item.rotation === 15)).toBe(true)

  await page.locator('.multi-selection-card .danger-button').click()
  await expect(page.locator('.stitch-element')).toHaveCount(0)
})

test('audit: guides, direct manipulation and real snapping', async ({ page }) => {
  await openEditor(page)
  await page.locator('.guide-add-grid button').filter({ hasText: 'Дуга' }).click()
  await expect(page.locator('.guide-arc')).toHaveCount(1)
  await expect(page.locator('.guide-snap-point')).toHaveCount(13)
  await expect(page.locator('.row-generator-preview-stitch')).toHaveCount(13)

  const radius = page.getByLabel('Радиус')
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
  await page.getByLabel('Центр X').fill('50')
  await page.getByLabel('Центр X').press('Enter')
  await expect(page.getByLabel('Центр X')).toHaveValue('50')

  // Actual snap: center anchor should land exactly on a guide snap point.
  await page.getByRole('button', { name: 'Центр', exact: true }).click()
  await page.locator('fieldset').filter({ hasText: 'Ориентация' }).first().locator('select').selectOption('along')
  const snapPoint = page.locator('.guide-snap-point').first()
  const targetX = Number(await snapPoint.getAttribute('cx'))
  const targetY = Number(await snapPoint.getAttribute('cy'))
  const targetBox = await snapPoint.boundingBox()
  expect(targetBox).not.toBeNull()

  await page.getByTitle('Столбик без накида').click()
  await page.mouse.move(targetBox!.x + targetBox!.width / 2 + 4, targetBox!.y + targetBox!.height / 2 + 3)
  await expect(page.locator('.snap-indicator')).toHaveCount(1)
  await page.mouse.down()
  await page.mouse.up()
  const snapped = transformParts(await page.locator('.stitch-element.selected').getAttribute('transform'))
  expect(Math.abs(snapped.x - targetX)).toBeLessThan(0.2)
  expect(Math.abs(snapped.y - targetY)).toBeLessThan(0.2)
  expect(Math.abs(snapped.rotation)).toBeGreaterThan(1)

  // Disable snapping and confirm the same near-target pointer is no longer snapped.
  await page.getByLabel('Разрешить привязку').uncheck()
  await page.locator('.guide-list button').first().click()
  const unsnappedTarget = await page.locator('.guide-snap-point').first().boundingBox()
  expect(unsnappedTarget).not.toBeNull()
  await page.getByTitle('Столбик без накида').click()
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
  await page.getByLabel('Поворот °').fill('30')
  await page.getByLabel('Поворот °').press('Enter')
  await expect(page.getByLabel('Поворот °')).toHaveValue('30')
  await expect(page.locator('.guide-grid g[transform*="rotate(30)"]')).toHaveCount(1)
  await page.getByLabel('Показывать').uncheck()
  await expect(page.locator('.guide-grid')).toHaveCount(0)
  await page.getByLabel('Показывать').check()
  await expect(page.locator('.guide-grid')).toHaveCount(1)

  await page.locator('.guide-list button').filter({ hasText: '3. Радиальная сетка' }).click()
  await page.getByLabel('Кольца').fill('5')
  await page.getByLabel('Кольца').press('Enter')
  await page.getByLabel('Секторы').fill('16')
  await page.getByLabel('Секторы').press('Enter')
  await expect(page.locator('.guide-radial-grid circle.guide-stroke')).toHaveCount(5)
  await expect(page.locator('.guide-radial-grid line.guide-stroke')).toHaveCount(16)
})

test('audit: parametric row preview, guide linkage, rebuild and deletion', async ({ page }) => {
  await openEditor(page)
  await page.locator('.guide-add-grid button').filter({ hasText: 'Радиальная' }).click()
  await expect(page.locator('.row-generator-preview-stitch')).toHaveCount(12)

  await page.getByRole('button', { name: 'Примерный шаг', exact: true }).click()
  await expect(page.getByLabel('Желаемый шаг')).toBeVisible()
  await page.getByLabel('Желаемый шаг').fill('45')
  await expect(page.locator('.row-generator-preview-stitch')).not.toHaveCount(0)
  await page.getByRole('button', { name: 'Количество', exact: true }).click()
  await page.getByLabel('Количество элементов').fill('8')
  await expect(page.locator('.row-generator-preview-stitch')).toHaveCount(8)
  await page.getByLabel('Ориентация').selectOption('tangent')
  await page.getByLabel('Смещение от направляющей').fill('10')
  await page.getByLabel('Смещение угла °').fill('5')
  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()

  await expect(page.locator('.stitch-element.parametric')).toHaveCount(8)
  await expect(page.getByText('Ряд 1', { exact: true })).toBeVisible()
  const beforeGuideEdit = await page.locator('.stitch-element.parametric').first().getAttribute('transform')

  await page.locator('.guide-list button').first().click()
  await page.getByLabel('Шаг колец').fill('60')
  await page.getByLabel('Шаг колец').press('Enter')
  const afterGuideEdit = await page.locator('.stitch-element.parametric').first().getAttribute('transform')
  expect(afterGuideEdit).not.toBe(beforeGuideEdit)

  await page.getByText('Ряд 1', { exact: true }).click()
  await page.getByLabel('Количество элементов').fill('10')
  await expect(page.locator('.stitch-element.parametric')).toHaveCount(10)
  await page.locator('.parametric-row-editor > .row-generator-field').first().locator('select').selectOption('double')
  await expect(page.getByText(/Ряд 1: 10 ССН = 10/)).toBeVisible()
  await page.getByLabel('Ориентация').selectOption('fixed')
  await page.getByLabel('Смещение от направляющей').fill('20')
  await expect(page.locator('.parametric-row-editor .row-generator-result')).toContainText('10')

  await page.getByRole('button', { name: 'Удалить весь ряд' }).click()
  await expect(page.locator('.stitch-element.parametric')).toHaveCount(0)
  await page.getByRole('button', { name: 'Отменить' }).click()
  await expect(page.locator('.stitch-element.parametric')).toHaveCount(10)
})

test('audit: decreases, topology and classic +6 sequence', async ({ page }) => {
  await openEditor(page)
  await createRadialRow(page, 12)
  await page.getByRole('button', { name: '+6 прибавок' }).click()
  await expect(page.getByText('Ряд 2', { exact: true })).toBeVisible()
  await expect(page.locator('.stitch-element.parametric')).toHaveCount(30)

  await page.getByRole('button', { name: '−6 убавок' }).click()
  await expect(page.getByText('Ряд 3', { exact: true })).toBeVisible()
  await expect(page.locator('.pattern-row-card')).toHaveCount(3)
  await expect(page.locator('.pattern-row-card').last()).toContainText('12 элементов')
  await expect(page.locator('.pattern-row-card').last()).toContainText('6 убавок')
  await expect(page.locator('.row-shaping-marker.decrease')).toHaveCount(6)
  await expect(page.locator('.stitch-topology-link')).toHaveCount(18)
  await expect(page.getByText(/убавка/).last()).toBeVisible()

  // A fresh project exercises the 4-row quick series without interactions from the prior chain.
  await page.getByRole('button', { name: 'Новая', exact: true }).click()
  await createRadialRow(page, 12)
  await page.getByRole('button', { name: 'Серия +6 ×4' }).click()
  await expect(page.locator('.pattern-row-card')).toHaveCount(5)
  await expect(page.locator('.pattern-row-card').nth(0)).toContainText('12 элементов')
  await expect(page.locator('.pattern-row-card').nth(1)).toContainText('18 элементов')
  await expect(page.locator('.pattern-row-card').nth(2)).toContainText('24 элементов')
  await expect(page.locator('.pattern-row-card').nth(3)).toContainText('30 элементов')
  await expect(page.locator('.pattern-row-card').nth(4)).toContainText('36 элементов')
  await expect(page.locator('.stitch-element.selected')).toHaveCount(36)
})

test('audit: nested rich rapport drives composition and topology, mismatch is honest', async ({ page }) => {
  await openEditor(page)
  await createRadialRow(page, 12)
  await page.locator('.pattern-row-next-actions').getByRole('button', { name: 'Без изменений' }).click()
  await expect(page.getByText('Ряд 2', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Семантический', exact: true }).click()

  const firstLeaf = page.locator('.rich-rapport-leaf').first()
  await firstLeaf.locator('input[type=number]').fill('6')
  await page.getByRole('button', { name: '+ Группа', exact: true }).click()
  await expect(page.locator('.rich-rapport-item.group')).toHaveCount(1)
  const group = page.locator('.rich-rapport-item.group')
  await group.locator('.rich-group-heading input').fill('2')
  const groupLeaf = group.locator('.rich-rapport-leaf').first()
  await groupLeaf.locator('input[type=number]').fill('3')
  await groupLeaf.locator('select').first().selectOption('increase')

  await expect(page.locator('.rich-program-metrics')).toContainText('12 / 12')
  await expect(page.locator('.rich-program-metrics')).toContainText('18')
  await expect(page.locator('.rich-program-status')).toContainText('Топология согласована')
  await expect(page.locator('.stitch-element.parametric')).toHaveCount(30) // 12 parent + 18 child
  await expect(page.locator('.stitch-topology-link')).toHaveCount(18)
  await expect(page.getByText(/прибавка/).last()).toBeVisible()
  await expect(page.getByText(/× 2/).last()).toBeVisible()

  // Break parent consumption by one. The program may still render composition, but must not invent topology.
  await firstLeaf.locator('input[type=number]').fill('5')
  await expect(page.locator('.rich-program-metrics')).toContainText('11 / 12')
  await expect(page.locator('.rich-program-status')).toContainText('Программа должна потреблять ровно все петли предыдущего ряда')
  await expect(page.locator('.stitch-topology-link')).toHaveCount(0)

  await firstLeaf.locator('input[type=number]').fill('6')
  await expect(page.locator('.stitch-topology-link')).toHaveCount(18)
})

test('audit: project manager, JSON/SVG/TXT/Markdown export and schema migration', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openEditor(page)
  await placeAt(page, 'Столбик без накида', 0.45, 0.45)

  const name = page.getByLabel('Название схемы')
  await name.fill('Audit Pattern')
  await name.press('Enter')
  await expect(page.locator('.project-select option').first()).toHaveText('Audit Pattern')

  await page.getByRole('button', { name: 'Копия', exact: true }).click()
  await expect(page.locator('.project-select option')).toHaveCount(2)
  await expect(page.getByLabel('Название схемы')).toHaveValue('Audit Pattern — копия')
  await expect(page.locator('.stitch-element')).toHaveCount(1)

  await page.getByRole('button', { name: 'Новая', exact: true }).click()
  await expect(page.locator('.project-select option')).toHaveCount(3)
  await expect(page.locator('.stitch-element')).toHaveCount(0)

  const originalValue = await page.locator('.project-select option').filter({ hasText: 'Audit Pattern' }).first().getAttribute('value')
  expect(originalValue).not.toBeNull()
  await page.locator('.project-select').selectOption(originalValue!)
  await expect(page.locator('.stitch-element')).toHaveCount(1)

  const jsonPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Сохранить JSON' }).click()
  const jsonDownload = await jsonPromise
  const jsonPath = await jsonDownload.path()
  expect(jsonPath).not.toBeNull()
  const saved = JSON.parse(await readFile(jsonPath!, 'utf8'))
  expect(saved.schemaVersion).toBe(11)
  expect(saved.metadata.title).toBe('Audit Pattern')
  expect(saved.elements).toHaveLength(1)

  // Hidden elements are excluded from SVG export.
  await page.locator('.layer-row').first().getByRole('button', { name: 'Скрыть элемент' }).click()
  const svgPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт SVG' }).click()
  const svgPath = await (await svgPromise).path()
  const svg = await readFile(svgPath!, 'utf8')
  expect(svg).toContain('<svg')
  expect(svg).not.toContain('translate(')
  await page.locator('.layer-row').first().getByRole('button', { name: 'Показать элемент' }).click()

  // Import a legacy v1 document and verify it loads, then re-export as v11.
  const legacy = {
    schemaVersion: 1,
    metadata: { title: 'Legacy Audit', updatedAt: '2026-01-01T00:00:00.000Z' },
    elements: [{ id: 'legacy-1', symbolId: 'double', x: 25, y: 40, rotation: 0 }],
    settings: {
      snapping: { enabled: true, sourceAnchor: 'bottom', orientationMode: 'none', snapToVertices: true, tolerancePx: 12 },
    },
  }
  await page.locator('.topbar input[type=file]').setInputFiles({
    name: 'legacy.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(legacy)),
  })
  await expect(page.locator('.statusbar span').first()).toContainText('Загружено: 1 элементов')
  await expect(page.getByLabel('Название схемы')).toHaveValue('Legacy Audit')
  await expect(page.locator('.stitch-element')).toHaveCount(1)

  const migratedPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Сохранить JSON' }).click()
  const migratedPath = await (await migratedPromise).path()
  const migrated = JSON.parse(await readFile(migratedPath!, 'utf8'))
  expect(migrated.schemaVersion).toBe(11)
  expect(migrated.elements[0].visible).toBe(true)
  expect(migrated.elements[0].locked).toBe(false)

  // Unsupported schema is rejected instead of partially loading.
  await page.locator('.topbar input[type=file]').setInputFiles({
    name: 'bad.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify({ schemaVersion: 99, elements: [] })),
  })
  await expect(page.locator('.statusbar span').first()).toContainText('Неподдерживаемый файл проекта')

  // Create a row to exercise generated written-pattern copy and file exports.
  await page.getByRole('button', { name: 'Новая', exact: true }).click()
  await createRadialRow(page, 6)
  await expect(page.getByText(/Ряд 1: 6 СБН = 6/)).toBeVisible()
  await page.locator('.pattern-instructions-actions').getByRole('button', { name: 'Копировать' }).click()
  await expect(page.locator('.pattern-instructions-actions')).toContainText('Скопировано')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Ряд 1: 6 СБН = 6')

  const txtPromise = page.waitForEvent('download')
  await page.locator('.pattern-instructions-actions').getByRole('button', { name: 'TXT' }).click()
  const txtPath = await (await txtPromise).path()
  expect(await readFile(txtPath!, 'utf8')).toContain('Ряд 1: 6 СБН = 6')

  const mdPromise = page.waitForEvent('download')
  await page.locator('.pattern-instructions-actions').getByRole('button', { name: 'Markdown' }).click()
  const mdPath = await (await mdPromise).path()
  const markdown = await readFile(mdPath!, 'utf8')
  expect(markdown).toContain('# Схема вязания')
  expect(markdown).toContain('**СБН**')

  // Delete an extra project and ensure manager remains consistent.
  const projectCountBeforeDelete = await page.locator('.project-select option').count()
  if (projectCountBeforeDelete > 1) {
    await page.getByRole('button', { name: 'Удалить', exact: true }).click()
    await expect(page.locator('.project-select option')).toHaveCount(projectCountBeforeDelete - 1)
  }
})
