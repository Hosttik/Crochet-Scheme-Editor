import { expect, test } from '@playwright/test'

test('returns from Document to Properties when the canvas selection changes', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')

  const library = page.getByRole('region', { name: 'Библиотека элементов' })
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()

  await library.getByRole('button', { name: 'Воздушная петля · ch', exact: true }).click()
  await page.mouse.click(box!.x + box!.width / 2 - 45, box!.y + box!.height / 2)
  await page.keyboard.press('Escape')

  await library.getByRole('button', { name: 'Столбик без накида · sc', exact: true }).click()
  await page.mouse.click(box!.x + box!.width / 2 + 45, box!.y + box!.height / 2)
  await page.keyboard.press('Escape')

  const tabs = page.getByRole('tablist', { name: 'Правая панель' })
  const properties = tabs.getByRole('tab', { name: 'Свойства', exact: true })
  const document = tabs.getByRole('tab', { name: 'Документ', exact: true })
  await document.click()
  await expect(document).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.right-sidebar')).toHaveAttribute('data-right-panel-mode', 'document')

  await page.locator('.stitch-element').first().click()
  await expect(properties).toHaveAttribute('aria-selected', 'true')
  await expect(page.locator('.right-sidebar')).toHaveAttribute('data-right-panel-mode', 'properties')
  await expect(page.getByTestId('selection-context-panel')).toBeVisible()
})
