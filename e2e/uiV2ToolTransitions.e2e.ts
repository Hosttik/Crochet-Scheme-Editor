import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

test('H L R use the same toggle transitions as ToolRail controls', async ({ page }) => {
  await openEditor(page)

  const canvas = page.locator('svg.editor-canvas')
  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  const hand = rail.getByRole('button', { name: /Ладонь \/ перемещение поля/ })
  const lasso = rail.getByRole('button', { name: /Лассо/ })
  const ruler = rail.getByRole('button', { name: /Линейка/ })

  await page.keyboard.press('h')
  await expect(canvas).toHaveClass(/pan-tool/)
  await expect(hand).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('h')
  await expect(canvas).toHaveClass(/selecting/)
  await expect(hand).toHaveAttribute('aria-pressed', 'false')

  await page.keyboard.press('l')
  await expect(canvas).toHaveClass(/lassoing/)
  await expect(lasso).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('l')
  await expect(canvas).toHaveClass(/selecting/)
  await expect(lasso).toHaveAttribute('aria-pressed', 'false')

  await page.keyboard.press('r')
  await expect(canvas).toHaveClass(/measuring/)
  await expect(ruler).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('r')
  await expect(canvas).toHaveClass(/selecting/)
  await expect(ruler).toHaveAttribute('aria-pressed', 'false')

  await hand.click()
  await expect(canvas).toHaveClass(/pan-tool/)
  await lasso.click()
  await expect(canvas).toHaveClass(/lassoing/)
  await ruler.click()
  await expect(canvas).toHaveClass(/measuring/)
})

test('switching from ruler to lasso through L follows the ToolRail lasso transition', async ({ page }) => {
  await openEditor(page)

  const canvas = page.locator('svg.editor-canvas')
  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  const lasso = rail.getByRole('button', { name: /Лассо/ })
  const ruler = rail.getByRole('button', { name: /Линейка/ })

  await ruler.click()
  await expect(canvas).toHaveClass(/measuring/)
  await page.keyboard.press('l')

  await expect(canvas).toHaveClass(/lassoing/)
  await expect(lasso).toHaveAttribute('aria-pressed', 'true')
  await expect(ruler).toHaveAttribute('aria-pressed', 'false')
})

test('tool shortcuts keep the existing editing and application-menu focus contracts', async ({ page }) => {
  await openEditor(page)

  const canvas = page.locator('svg.editor-canvas')
  const library = page.getByRole('region', { name: 'Библиотека элементов' })
  const search = library.getByRole('searchbox', { name: 'Поиск элементов' })

  await search.focus()
  await page.keyboard.press('h')
  await expect(search).toHaveValue('h')
  await expect(canvas).toHaveClass(/selecting/)

  await search.fill('')
  const fileMenu = page.getByRole('menuitem', { name: 'Файл', exact: true })
  await fileMenu.focus()
  await page.keyboard.press('h')
  await expect(canvas).toHaveClass(/selecting/)

  await page.locator('svg.editor-canvas').focus()
  await page.keyboard.press('h')
  await expect(canvas).toHaveClass(/pan-tool/)
})
