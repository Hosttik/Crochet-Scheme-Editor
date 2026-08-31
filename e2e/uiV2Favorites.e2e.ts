import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

test('persists crochet favorites in the element library without duplicating them in the topbar', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await openEditor(page)

  let library = page.getByRole('region', { name: 'Библиотека элементов' })
  let mainChainCard = library.locator('.library-symbol-card:has(.symbol-button[aria-label="Воздушная петля · ch"])')

  await mainChainCard.getByRole('button', { name: 'Добавить в избранное: Воздушная петля', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(0)

  let favorites = library.getByTestId('favorites-section')
  await expect(favorites).toBeVisible()
  await expect(favorites.getByRole('button', { name: 'Воздушная петля · ch', exact: true })).toBeVisible()

  // Favorites now have one canonical home: the element library. Topbar quick
  // actions are intentionally absent so document/view chrome stays uncluttered.
  await expect(page.getByTestId('favorite-quick-bar')).toBeHidden()
  await expect(page.locator('.topbar-favorites-trigger')).toBeHidden()
  await expect(page.locator('.topbar-add-favorite')).toBeHidden()

  await page.reload()
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
  library = page.getByRole('region', { name: 'Библиотека элементов' })
  favorites = library.getByTestId('favorites-section')
  await expect(favorites).toBeVisible()
  const favoriteChain = favorites.getByRole('button', { name: 'Воздушная петля · ch', exact: true })
  await expect(favoriteChain).toBeVisible()
  await expect(page.getByTestId('favorite-quick-bar')).toBeHidden()

  await favoriteChain.click()
  await expect(page.locator('.editor-canvas')).toHaveClass(/placing/)

  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5)
  await expect(page.locator('.stitch-element')).toHaveCount(1)
  await page.keyboard.press('Escape')

  mainChainCard = library.locator('.library-symbol-card:has(.symbol-button[aria-label="Воздушная петля · ch"])')
  await mainChainCard.getByRole('button', { name: 'Удалить из избранного: Воздушная петля', exact: true }).click()
  await expect(library.getByTestId('favorites-section')).toHaveCount(0)

  await page.reload()
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
  await expect(page.getByRole('region', { name: 'Библиотека элементов' }).getByTestId('favorites-section')).toHaveCount(0)
})
