import { expect, test, type Page } from '@playwright/test'
import { openGlobalPanel } from './helpers/rightWorkspace'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

async function canvasBox(page: Page) {
  const box = await page.locator('svg.editor-canvas').boundingBox()
  expect(box).not.toBeNull()
  return box!
}

test('places 2/3/4 chain presets as real grouped chain stitches', async ({ page }) => {
  await openEditor(page)
  const box = await canvasBox(page)
  let total = 0

  for (const [count, rx] of [[2, 0.34], [3, 0.5], [4, 0.68]] as const) {
    const preset = page.locator(`.chain-bundle-button[aria-label^="${count} воздушные петли"]`)
    await preset.click()
    await expect(page.locator('svg.editor-canvas')).toHaveClass(/placing/)
    await page.mouse.click(box.x + box.width * rx, box.y + box.height * 0.5)
    total += count
    await expect(page.locator('.stitch-element')).toHaveCount(total)
    await expect(page.locator('.stitch-element.selected')).toHaveCount(count)
    await expect(page.locator('.group-selection-box')).toBeVisible()
  }

  await openGlobalPanel(page, 'legend-global-panel')
  const legendRow = page.getByTestId('legend-panel').locator('.legend-used-row').filter({ hasText: 'Воздушная петля' })
  await expect(legendRow).toBeVisible()
  await expect(legendRow.locator('.legend-used-count')).toHaveText('9')

  // Construction mode owns the canvas until the user explicitly returns to Select.
  await page.keyboard.press('Escape')
  await expect(page.locator('svg.editor-canvas')).toHaveClass(/selecting/)
  const selectedMember = page.locator('.stitch-element.selected').first()
  const memberBox = await selectedMember.boundingBox()
  expect(memberBox).not.toBeNull()
  await page.mouse.click(memberBox!.x + memberBox!.width / 2, memberBox!.y + memberBox!.height / 2)
  await expect(page.locator('.stitch-element')).toHaveCount(9)
  await expect(page.locator('.stitch-element.selected')).toHaveCount(4)

  await page.locator('.selection-quick-toolbar').getByRole('button', { name: 'Дублировать' }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(13)
  await expect(page.locator('.stitch-element.selected')).toHaveCount(4)
  await expect(legendRow.locator('.legend-used-count')).toHaveText('13')
})