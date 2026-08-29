import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

async function placeChain(page: Page) {
  const library = page.getByRole('region', { name: 'Библиотека элементов' })
  const chain = library.getByRole('button', { name: 'Воздушная петля · ch', exact: true })
  await chain.click()

  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5)
  await expect(page.locator('.stitch-element')).toHaveCount(1)
  return { library, chain, canvas }
}

test('menu and right-tab keyboard navigation never mutate the selected stitch', async ({ page }) => {
  await openEditor(page)
  await placeChain(page)
  await page.keyboard.press('Escape')

  const stitch = page.locator('.stitch-element').first()
  const before = await stitch.getAttribute('transform')
  expect(before).not.toBeNull()

  const file = page.getByRole('menuitem', { name: 'Файл', exact: true })
  await file.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Новая схема', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('menuitem', { name: 'Отменить', exact: true })).toBeFocused()
  await page.keyboard.press('Delete')
  await expect(page.locator('.stitch-element')).toHaveCount(1)
  await page.keyboard.press('Escape')

  const tabs = page.getByRole('tablist', { name: 'Правая панель' })
  const options = tabs.getByRole('tab', { name: 'Опции', exact: true })
  const layers = tabs.getByRole('tab', { name: 'Слои', exact: true })
  await options.focus()
  await page.keyboard.press('ArrowRight')
  await expect(layers).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(options).toBeFocused()

  await expect(stitch).toHaveAttribute('transform', before!)
})

test('guide flyout navigation is isolated from canvas shortcuts and Escape preserves placement', async ({ page }) => {
  await openEditor(page)
  const { library, chain, canvas } = await placeChain(page)
  await page.keyboard.press('Escape')

  const stitch = page.locator('.stitch-element').first()
  const before = await stitch.getAttribute('transform')
  expect(before).not.toBeNull()

  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  const guideTrigger = rail.getByRole('button', { name: 'Направляющие', exact: true })
  await guideTrigger.click()
  const menu = page.getByRole('menu', { name: 'Направляющие', exact: true })
  await expect(menu.getByRole('menuitem', { name: 'Линия', exact: true })).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(menu.getByRole('menuitem', { name: 'Дуга', exact: true })).toBeFocused()
  await expect(stitch).toHaveAttribute('transform', before!)
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)

  await chain.click()
  await expect(canvas).toHaveClass(/placing/)
  await guideTrigger.click()
  await expect(page.getByRole('menu', { name: 'Направляющие', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu', { name: 'Направляющие', exact: true })).toHaveCount(0)
  await expect(canvas).toHaveClass(/placing/)
  await expect(library.getByRole('button', { name: 'Воздушная петля · ch', exact: true })).toHaveAttribute('aria-pressed', 'true')
})

test('closing command search with Escape does not cancel the active placement tool', async ({ page }) => {
  await openEditor(page)
  const library = page.getByRole('region', { name: 'Библиотека элементов' })
  const chain = library.getByRole('button', { name: 'Воздушная петля · ch', exact: true })
  const canvas = page.locator('svg.editor-canvas')

  await chain.click()
  await expect(canvas).toHaveClass(/placing/)
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog', { name: 'Поиск по функциям' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(canvas).toHaveClass(/placing/)
  await expect(chain).toHaveAttribute('aria-pressed', 'true')
})

test('favorites section reports favorite membership independently from placement state', async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 900 })
  await openEditor(page)

  const library = page.getByRole('region', { name: 'Библиотека элементов' })
  const mainChainCard = library.locator('.library-symbol-card:has(.symbol-button[aria-label="Воздушная петля · ch"])')
  await mainChainCard.getByRole('button', { name: 'Добавить в избранное: Воздушная петля', exact: true }).click()

  const favorites = library.getByTestId('favorites-section')
  await expect(favorites).toBeVisible()
  const favoriteToggle = favorites.getByRole('button', { name: 'Удалить из избранного: Воздушная петля', exact: true })
  await expect(favoriteToggle).toHaveAttribute('aria-pressed', 'true')
  await expect(favorites.getByRole('button', { name: 'Воздушная петля · ch', exact: true })).toHaveAttribute('aria-pressed', 'false')

  await favoriteToggle.click()
  await expect(favorites).toHaveCount(0)
})
