import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

test('persists crochet favorites and exposes them as real quick placement actions', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await openEditor(page)

  const library = page.getByRole('region', { name: 'Библиотека элементов' })
  const mainChainCard = library.locator('.library-symbol-card:has(.symbol-button[aria-label="Воздушная петля · ch"])')

  await mainChainCard.getByRole('button', { name: 'Добавить в избранное: Воздушная петля', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(0)

  const favorites = library.getByTestId('favorites-section')
  await expect(favorites).toBeVisible()
  await expect(favorites.getByRole('button', { name: 'Воздушная петля · ch', exact: true })).toBeVisible()

  const quickBar = page.getByTestId('favorite-quick-bar')
  await expect(quickBar).toBeVisible()
  await expect(quickBar.getByRole('button', { name: 'Воздушная петля · ch', exact: true })).toBeVisible()

  await page.reload()
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(library.getByTestId('favorites-section')).toBeVisible()
  await expect(page.getByTestId('favorite-quick-bar')).toBeVisible()

  await page.getByTestId('favorite-quick-bar').getByRole('button', { name: 'Воздушная петля · ch', exact: true }).click()
  await expect(page.locator('.editor-canvas')).toHaveClass(/placing/)

  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5)
  await expect(page.locator('.stitch-element')).toHaveCount(1)

  const reloadedCard = library.locator('.library-symbol-card:has(.symbol-button[aria-label="Воздушная петля · ch"])')
  await reloadedCard.getByRole('button', { name: 'Удалить из избранного: Воздушная петля', exact: true }).click()
  await expect(library.getByTestId('favorites-section')).toHaveCount(0)
  await expect(page.getByTestId('favorite-quick-bar')).toHaveCount(0)

  await page.reload()
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Библиотека элементов' }).getByTestId('favorites-section')).toHaveCount(0)
})
