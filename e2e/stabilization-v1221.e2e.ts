import { expect, test, type Page } from '@playwright/test'
import { createGuideFromToolRail } from './helpers/uiV2Guides'
import { openGlobalPanel } from './helpers/rightWorkspace'

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

function angleDistance(left: number, right: number) {
  const delta = ((right - left + 180) % 360 + 360) % 360 - 180
  return Math.abs(delta)
}

async function uploadReference(page: Page) {
  await openGlobalPanel(page, 'background-global-panel')
  await page.getByTestId('background-file-input').setInputFiles({
    name: 'reference.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="#ddd"/></svg>'),
  })
  await expect(page.getByTestId('background-image')).toBeVisible()
}

test('reversing a guide keeps attached stitch position stable and remains one undoable document edit', async ({ page }) => {
  await openEditor(page)
  await createGuideFromToolRail(page, 'Линия')
  await placeAt(page, 'Столбик без накида', 0.54, 0.42)

  const stitch = page.locator('.stitch-element').first()
  const attachment = page.locator('.guide-attachment-panel')
  await attachment.getByRole('button', { name: 'Закрепить на направляющей', exact: true }).click()
  await attachment.getByLabel('Отступ от пути').fill('18')
  await attachment.getByLabel('Отступ от пути').press('Enter')
  const before = transformParts(await stitch.getAttribute('transform'))

  await page.locator('.guide-list button').filter({ hasText: 'Линия' }).click()
  const strokeBox = await page.locator('.guide-line .guide-stroke').boundingBox()
  expect(strokeBox).not.toBeNull()
  await page.mouse.click(strokeBox!.x + strokeBox!.width / 2, strokeBox!.y + strokeBox!.height / 2, { clickCount: 2 })

  await expect.poll(async () => transformParts(await stitch.getAttribute('transform')).x).toBeCloseTo(before.x, 2)
  const reversed = transformParts(await stitch.getAttribute('transform'))
  expect(reversed.y).toBeCloseTo(before.y, 2)
  expect(angleDistance(before.rotation, reversed.rotation)).toBeCloseTo(180, 1)

  await page.keyboard.press('Control+z')
  await expect.poll(async () => transformParts(await stitch.getAttribute('transform')).rotation).toBeCloseTo(before.rotation, 2)
  const undone = transformParts(await stitch.getAttribute('transform'))
  expect(undone.x).toBeCloseTo(before.x, 2)
  expect(undone.y).toBeCloseTo(before.y, 2)

  await page.keyboard.press('Control+Shift+z')
  await expect.poll(async () => angleDistance(before.rotation, transformParts(await stitch.getAttribute('transform')).rotation)).toBeCloseTo(180, 1)
})

test('rotated tracing underlay participates in project-span fitting and its edit is undoable', async ({ page }) => {
  await openEditor(page)
  await uploadReference(page)

  const rotation = page.getByLabel('Поворот изображения °')
  await rotation.fill('45')
  await rotation.press('Enter')
  await expect(rotation).toHaveValue('45')
  await page.keyboard.press('Control+z')
  await expect(rotation).toHaveValue('0')
  await page.keyboard.press('Control+Shift+z')
  await expect(rotation).toHaveValue('45')

  const width = Number(await page.getByLabel('Ширина фона').inputValue())
  const height = Number(await page.getByLabel('Высота фона').inputValue())
  const rotatedWidth = (width + height) / Math.sqrt(2)

  await createGuideFromToolRail(page, 'Линия')
  await page.getByRole('button', { name: 'По размеру проекта' }).click()
  await expect.poll(async () => Number(await page.getByLabel('Длина').inputValue()))
    .toBeCloseTo(rotatedWidth + 64, 0)
})