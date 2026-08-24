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
  await page.getByTitle(title, { exact: true }).click()
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
  if (count !== 12) await page.getByLabel('Количество элементов').fill(String(count))
  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()
  await expect(page.getByText('Ряд 1', { exact: true })).toBeVisible()
}

test('audit corrected: marquee selection, group move and group rotation', async ({ page }) => {
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

test('audit corrected: guides, direct manipulation and real snapping', async ({ page }) => {
  await openEditor(page)
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
  await page.getByRole('spinbutton', { name: 'Центр X', exact: true }).fill('50')
  await page.getByRole('spinbutton', { name: 'Центр X', exact: true }).press('Enter')
  await expect(page.getByRole('spinbutton', { name: 'Центр X', exact: true })).toHaveValue('50')

  await page.getByRole('button', { name: 'Центр', exact: true }).click()
  await page.locator('fieldset').filter({ hasText: 'Ориентация' }).first().locator('select').selectOption('along')
  const snapPoint = page.locator('.guide-snap-point').first()
  const targetX = Number(await snapPoint.getAttribute('cx'))
  const targetY = Number(await snapPoint.getAttribute('cy'))
  const targetBox = await snapPoint.boundingBox()
  expect(targetBox).not.toBeNull()

  await page.getByTitle('Столбик без накида', { exact: true }).click()
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
  await page.getByTitle('Столбик без накида', { exact: true }).click()
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
  await page.getByRole('spinbutton', { name: 'Поворот °', exact: true }).fill('30')
  await page.getByRole('spinbutton', { name: 'Поворот °', exact: true }).press('Enter')
  await expect(page.getByRole('spinbutton', { name: 'Поворот °', exact: true })).toHaveValue('30')
  await expect(page.locator('.guide-grid g[transform*="rotate(30)"]')).toHaveCount(1)
  await page.getByLabel('Показывать').uncheck()
  await expect(page.locator('.guide-grid')).toHaveCount(0)
  await page.getByLabel('Показывать').check()
  await expect(page.locator('.guide-grid')).toHaveCount(1)

  await page.locator('.guide-list button').filter({ hasText: '3. Радиальная сетка' }).click()
  await page.getByRole('spinbutton', { name: 'Кольца', exact: true }).fill('5')
  await page.getByRole('spinbutton', { name: 'Кольца', exact: true }).press('Enter')
  await page.getByRole('spinbutton', { name: 'Секторы', exact: true }).fill('16')
  await page.getByRole('spinbutton', { name: 'Секторы', exact: true }).press('Enter')
  await expect(page.locator('.guide-radial-grid circle.guide-stroke')).toHaveCount(5)
  await expect(page.locator('.guide-radial-grid line.guide-stroke')).toHaveCount(16)
})

test('audit corrected: nested rich rapport drives composition and topology, mismatch is honest', async ({ page }) => {
  await openEditor(page)
  await createRadialRow(page, 12)
  await page.locator('.pattern-row-next-actions').getByRole('button', { name: 'Без изменений' }).click()
  await expect(page.getByText('Ряд 2', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Семантический', exact: true }).click()

  const firstLeaf = page.locator('.rich-rapport-leaf').first()
  await firstLeaf.locator('input[type=number]').fill('6')
  await page.getByRole('button', { name: '+ Группа', exact: true }).click()
  const group = page.locator('.rich-rapport-item.group')
  await expect(group).toHaveCount(1)
  await group.locator('.rich-group-heading input').fill('2')
  const groupLeaf = group.locator('.rich-rapport-leaf').first()
  await groupLeaf.locator('input[type=number]').fill('3')
  await groupLeaf.locator('select').first().selectOption('increase')

  await expect(page.locator('.rich-program-metrics')).toContainText('12 / 12')
  await expect(page.locator('.rich-program-metrics')).toContainText('18')
  await expect(page.locator('.rich-program-status')).toContainText('Топология согласована')
  await expect(page.locator('.stitch-element.parametric')).toHaveCount(30)
  await expect(page.locator('.stitch-topology-link')).toHaveCount(18)
  await expect(page.getByText(/прибав/).last()).toBeVisible()
  await expect(page.getByText(/× 2/).last()).toBeVisible()

  await firstLeaf.locator('input[type=number]').fill('5')
  await expect(page.locator('.rich-program-metrics')).toContainText('11 / 12')
  await expect(page.locator('.rich-program-status')).toContainText('Программа должна потреблять ровно все петли предыдущего ряда')
  await expect(page.locator('.stitch-topology-link')).toHaveCount(0)

  await firstLeaf.locator('input[type=number]').fill('6')
  await expect(page.locator('.stitch-topology-link')).toHaveCount(18)
})

test('audit corrected: project manager, JSON/SVG/TXT/Markdown export and schema migration', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openEditor(page)
  const initialProjectId = await page.locator('.project-select').inputValue()
  await placeAt(page, 'Столбик без накида', 0.45, 0.45)
  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')

  await page.getByRole('button', { name: 'Копия', exact: true }).click()
  await expect(page.locator('.project-select option')).toHaveCount(2)
  await expect(page.locator('.stitch-element')).toHaveCount(1)

  await page.getByRole('button', { name: 'Новая', exact: true }).click()
  await expect(page.locator('.project-select option')).toHaveCount(3)
  await expect(page.locator('.stitch-element')).toHaveCount(0)

  await page.locator('.project-select').selectOption(initialProjectId)
  await expect(page.locator('.stitch-element')).toHaveCount(1)
  await expect(page.getByLabel('Название схемы')).toHaveValue('Схема вязания')

  const jsonPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Сохранить JSON' }).click()
  const jsonPath = await (await jsonPromise).path()
  expect(jsonPath).not.toBeNull()
  const saved = JSON.parse(await readFile(jsonPath!, 'utf8'))
  expect(saved.schemaVersion).toBe(11)
  expect(saved.metadata.title).toBe('Схема вязания')
  expect(saved.elements).toHaveLength(1)

  await page.locator('.layer-row').first().getByRole('button', { name: 'Скрыть элемент' }).click()
  const svgPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Экспорт SVG' }).click()
  const svgPath = await (await svgPromise).path()
  expect(svgPath).not.toBeNull()
  const svg = await readFile(svgPath!, 'utf8')
  expect(svg).toContain('<svg')
  expect(svg).not.toContain('translate(')
  await page.locator('.layer-row').first().getByRole('button', { name: 'Показать элемент' }).click()

  const legacy = {
    schemaVersion: 1,
    metadata: { title: 'Legacy Audit', updatedAt: '2026-01-01T00:00:00.000Z' },
    elements: [{ id: 'legacy-1', symbolId: 'double', x: 25, y: 40, rotation: 0 }],
    settings: {
      snapping: { enabled: true, sourceAnchor: 'bottom', orientationMode: 'none', snapToVertices: true, tolerancePx: 12 },
    },
  }
  await page.locator('.topbar input[type=file]').setInputFiles({
    name: 'legacy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(legacy)),
  })
  await expect(page.locator('.statusbar span').first()).toContainText('Загружено: 1 элементов')
  await expect(page.getByLabel('Название схемы')).toHaveValue('Legacy Audit')
  await expect(page.locator('.stitch-element')).toHaveCount(1)

  const migratedPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Сохранить JSON' }).click()
  const migratedPath = await (await migratedPromise).path()
  expect(migratedPath).not.toBeNull()
  const migrated = JSON.parse(await readFile(migratedPath!, 'utf8'))
  expect(migrated.schemaVersion).toBe(11)
  expect(migrated.elements[0].visible).toBe(true)
  expect(migrated.elements[0].locked).toBe(false)

  await page.locator('.topbar input[type=file]').setInputFiles({
    name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schemaVersion: 99, elements: [] })),
  })
  await expect(page.locator('.statusbar span').first()).toContainText('Неподдерживаемый файл проекта')

  await page.getByRole('button', { name: 'Новая', exact: true }).click()
  await createRadialRow(page, 6)
  await expect(page.getByText(/Ряд 1: 6 СБН = 6/)).toBeVisible()
  await page.locator('.pattern-instructions-actions').getByRole('button', { name: 'Копировать' }).click()
  await expect(page.locator('.pattern-instructions-actions')).toContainText('Скопировано')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('Ряд 1: 6 СБН = 6')

  const txtPromise = page.waitForEvent('download')
  await page.locator('.pattern-instructions-actions').getByRole('button', { name: 'TXT' }).click()
  const txtPath = await (await txtPromise).path()
  expect(txtPath).not.toBeNull()
  expect(await readFile(txtPath!, 'utf8')).toContain('Ряд 1: 6 СБН = 6')

  const mdPromise = page.waitForEvent('download')
  await page.locator('.pattern-instructions-actions').getByRole('button', { name: 'Markdown' }).click()
  const mdPath = await (await mdPromise).path()
  expect(mdPath).not.toBeNull()
  const markdown = await readFile(mdPath!, 'utf8')
  expect(markdown).toContain('# Схема вязания')
  expect(markdown).toContain('**СБН**')

  const projectCountBeforeDelete = await page.locator('.project-select option').count()
  if (projectCountBeforeDelete > 1) {
    await page.getByRole('button', { name: 'Удалить', exact: true }).click()
    await expect(page.locator('.project-select option')).toHaveCount(projectCountBeforeDelete - 1)
  }
})

test('audit: project rename persists after reload', async ({ page }) => {
  await openEditor(page)
  const name = page.getByLabel('Название схемы')
  await name.fill('Audit Pattern')
  await name.press('Enter')
  await expect(name).toHaveValue('Audit Pattern')
  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()
  await expect(page.getByLabel('Название схемы')).toHaveValue('Audit Pattern')
  await expect(page.locator('.project-select option').first()).toHaveText('Audit Pattern')
})

test('known v1.7 defect: project dropdown should refresh immediately after rename', async ({ page }) => {
  test.fail(true, 'ProjectManagerPanel refreshes before the debounced autosave writes the new title and does not refresh afterward.')
  await openEditor(page)
  const name = page.getByLabel('Название схемы')
  await name.fill('Audit Pattern')
  await name.press('Enter')
  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await expect(page.locator('.project-select option').first()).toHaveText('Audit Pattern')
})
