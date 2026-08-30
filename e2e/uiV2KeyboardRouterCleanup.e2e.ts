import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

test('S remains the snapping toggle without being advertised as a settings-panel shortcut', async ({ page }) => {
  await openEditor(page)

  await page.getByRole('menuitem', { name: 'Параметры', exact: true }).click()
  const snappingSettings = page.getByRole('menu', { name: 'Параметры', exact: true })
    .getByRole('menuitem', { name: 'Привязка', exact: true })
  await expect(snappingSettings).not.toHaveAttribute('aria-keyshortcuts')
  await expect(snappingSettings.locator('kbd')).toHaveCount(0)
  await page.keyboard.press('Escape')

  const snapToggle = page.locator('.canvas-toolbar .snap-toggle')
  await expect(snapToggle).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('s')
  await expect(snapToggle).toHaveAttribute('aria-pressed', 'false')
  await page.keyboard.press('s')
  await expect(snapToggle).toHaveAttribute('aria-pressed', 'true')
})

test('canonical tool and application shortcut routers keep the editor behavior intact', async ({ page }) => {
  await openEditor(page)

  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  const hand = rail.getByRole('button', { name: /Ладонь/ })
  const lasso = rail.getByRole('button', { name: 'Лассо', exact: true })
  const ruler = rail.getByRole('button', { name: 'Линейка', exact: true })

  await page.keyboard.press('h')
  await expect(hand).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('l')
  await expect(lasso).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('r')
  await expect(ruler).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Escape')

  await page.locator('.symbols-section .symbol-button[title^="Столбик без накида ·"]').click()
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5)
  await expect(page.locator('.stitch-element')).toHaveCount(1)

  await page.keyboard.press('Control+d')
  await expect(page.locator('.stitch-element')).toHaveCount(2)
  await page.keyboard.press('Control+z')
  await expect(page.locator('.stitch-element')).toHaveCount(1)
  await page.keyboard.press('Delete')
  await expect(page.locator('.stitch-element')).toHaveCount(0)
})
