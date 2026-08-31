import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

async function createRuler(page: Page, offsetY = 0) {
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.keyboard.press('r')
  await expect(canvas).toHaveClass(/measuring/)
  await page.mouse.click(box!.x + box!.width * 0.38, box!.y + box!.height * 0.44 + offsetY)
  await page.mouse.click(box!.x + box!.width * 0.64, box!.y + box!.height * 0.44 + offsetY)
  const ruler = page.locator('.measurement-ruler:not(.draft)').last()
  await expect(ruler).toBeVisible()
  return ruler
}

async function clickRulerStroke(page: Page, ruler: ReturnType<Page['locator']>) {
  const point = await ruler.getByTestId('ruler-hit-target').evaluate((node) => {
    const line = node as SVGLineElement
    const matrix = line.getScreenCTM()
    if (!matrix) throw new Error('Ruler line has no screen transform')
    const svg = line.ownerSVGElement!
    const p = svg.createSVGPoint()
    p.x = (line.x1.baseVal.value + line.x2.baseVal.value) / 2
    p.y = (line.y1.baseVal.value + line.y2.baseVal.value) / 2
    const screen = p.matrixTransform(matrix)
    return { x: screen.x, y: screen.y }
  })
  await page.mouse.click(point.x, point.y)
}

test('a placed ruler is selectable by its line and removable with Delete', async ({ page }) => {
  await openEditor(page)
  const ruler = await createRuler(page)

  // Deselect by clicking empty canvas, then prove the wide line itself can be
  // selected again. Previously ruler-hit-line had pointer-events:none.
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + 40, box!.y + 40)
  await expect(ruler).not.toHaveClass(/selected/)

  await clickRulerStroke(page, ruler)
  await expect(ruler).toHaveClass(/selected/)
  await expect(ruler.locator('.ruler-handle')).toHaveCount(2)

  await page.keyboard.press('Delete')
  await expect(page.locator('.measurement-ruler:not(.draft)')).toHaveCount(0)
})

test('rulers are first-class Layers objects with hide, lock and delete controls', async ({ page }) => {
  await openEditor(page)
  const ruler = await createRuler(page, 24)

  await page.getByRole('tab', { name: 'Слои', exact: true }).click()
  const layersPanel = page.locator('#ui-v2-right-layers-panel')
  await expect(layersPanel).toBeVisible()
  const row = layersPanel.locator('.ruler-layer-row').first()
  await expect(row).toBeVisible()
  await expect(row).toContainText('Линейка 1')

  const visibility = row.locator('.layer-icon-button').nth(0)
  const lock = row.locator('.layer-icon-button').nth(1)
  const remove = row.locator('.ruler-layer-delete')

  await lock.click()
  await expect(row).toHaveClass(/locked/)
  await expect(remove).toBeDisabled()
  await expect(ruler).toHaveAttribute('data-ruler-locked', 'true')
  await expect(ruler.locator('.ruler-handle')).toHaveCount(0)

  // Locking must protect the ruler from the application Delete shortcut.
  await page.keyboard.press('Delete')
  await expect(page.locator('.measurement-ruler:not(.draft)')).toHaveCount(1)

  await visibility.click()
  await expect(page.locator('.measurement-ruler:not(.draft)')).toHaveCount(0)
  await expect(row).toHaveClass(/hidden/)
  await visibility.click()
  await expect(page.locator('.measurement-ruler:not(.draft)')).toHaveCount(1)

  await lock.click()
  await expect(row).not.toHaveClass(/locked/)
  await expect(remove).toBeEnabled()
  await remove.click()
  await expect(page.locator('.measurement-ruler:not(.draft)')).toHaveCount(0)
  await expect(layersPanel.locator('.ruler-layer-row')).toHaveCount(0)
})
