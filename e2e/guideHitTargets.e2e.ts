import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

test('grid guides remain selectable several pixels away from the visible stroke', async ({ page }) => {
  await openEditor(page)

  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  await rail.getByRole('button', { name: 'Направляющие', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Прямоугольная сетка', exact: true }).click()

  const grid = page.locator('.guide-layer.guide-grid')
  await expect(grid).toHaveClass(/selected/)

  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()

  // Deselect on an empty area first so the next click proves acquisition.
  await page.mouse.click(box!.x + 24, box!.y + 80)
  await expect(grid).not.toHaveClass(/selected/)

  // A new grid is centered in the viewport. Its central horizontal guide line
  // crosses the center; x + 20 avoids the central vertical line. Seven screen
  // pixels is deliberately outside the visible ~1px stroke but inside the
  // UI-v2 18px transparent interaction stroke.
  await page.mouse.click(
    box!.x + box!.width / 2 + 20,
    box!.y + box!.height / 2 + 7,
  )
  await expect(grid).toHaveClass(/selected/)
})
