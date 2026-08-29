import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

test('core editor interactions survive browser engine differences', async ({ page }) => {
  await openEditor(page)

  const canvas = page.locator('svg.editor-canvas')
  const canvasBox = await canvas.boundingBox()
  expect(canvasBox).not.toBeNull()

  await page.locator('.symbols-section .symbol-button[title^="Столбик без накида ·"]').click()
  await page.mouse.click(
    canvasBox!.x + canvasBox!.width * 0.5,
    canvasBox!.y + canvasBox!.height * 0.5,
  )

  const stitch = page.locator('.stitch-element').first()
  await expect(stitch).toHaveCount(1)
  await stitch.click()
  await expect(stitch).toHaveClass(/selected/)

  const before = await stitch.getAttribute('transform')
  await page.keyboard.press('ArrowRight')
  await expect(stitch).not.toHaveAttribute('transform', before ?? '')

  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  await rail.getByRole('button', { name: 'Направляющие', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Линия', exact: true }).click()
  await expect(page.locator('.guide-layer.guide-line')).toHaveClass(/selected/)

  const snapping = page.getByTestId('snapping-global-panel')
  await snapping.locator(':scope > summary').click()
  await expect.poll(() => snapping.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(true)

  await page.keyboard.press('Control+k')
  const palette = page.getByRole('dialog', { name: 'Поиск по функциям', exact: true })
  await expect(palette).toBeVisible()
  await palette.getByRole('combobox', { name: 'Поиск по функциям', exact: true }).press('Escape')
  await expect(palette).toBeHidden()

  const layersTab = page.getByRole('tab', { name: 'Слои', exact: true })
  await layersTab.focus()
  await page.keyboard.press('ArrowLeft')
  await expect(page.getByRole('tab', { name: 'Параметры', exact: true })).toHaveAttribute('aria-selected', 'true')
})
