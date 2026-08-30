import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

async function expectSelectionMode(page: Page, mode: 'marquee' | 'lasso') {
  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  const trigger = rail.getByRole('button', { name: 'Выделение', exact: true })
  await trigger.click()
  const menu = page.getByRole('menu', { name: 'Выделение', exact: true })
  const item = menu.getByRole('menuitemradio', {
    name: mode === 'lasso' ? 'Лассо' : 'Прямоугольное выделение',
    exact: true,
  })
  await expect(item).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
}

test('H L R use the same toggle transitions as ToolRail controls', async ({ page }) => {
  await openEditor(page)

  const canvas = page.locator('svg.editor-canvas')
  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  const hand = rail.getByRole('button', { name: /Ладонь \/ перемещение поля/ })
  const selection = rail.getByRole('button', { name: 'Выделение', exact: true })
  const ruler = rail.getByRole('button', { name: /Линейка/ })

  await page.keyboard.press('h')
  await expect(canvas).toHaveClass(/pan-tool/)
  await expect(hand).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('h')
  await expect(canvas).toHaveClass(/selecting/)
  await expect(hand).toHaveAttribute('aria-pressed', 'false')

  await page.keyboard.press('l')
  await expect(canvas).toHaveClass(/lassoing/)
  await expectSelectionMode(page, 'lasso')
  await page.keyboard.press('l')
  await expect(canvas).toHaveClass(/selecting/)
  await expectSelectionMode(page, 'marquee')

  await page.keyboard.press('r')
  await expect(canvas).toHaveClass(/measuring/)
  await expect(ruler).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('r')
  await expect(canvas).toHaveClass(/selecting/)
  await expect(ruler).toHaveAttribute('aria-pressed', 'false')

  await hand.click()
  await expect(canvas).toHaveClass(/pan-tool/)
  await selection.click()
  await page.getByRole('menu', { name: 'Выделение', exact: true })
    .getByRole('menuitemradio', { name: 'Лассо', exact: true })
    .click()
  await expect(canvas).toHaveClass(/lassoing/)
  await ruler.click()
  await expect(canvas).toHaveClass(/measuring/)
})

test('switching from ruler to lasso through L follows the ToolRail selection transition', async ({ page }) => {
  await openEditor(page)

  const canvas = page.locator('svg.editor-canvas')
  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  const ruler = rail.getByRole('button', { name: /Линейка/ })

  await ruler.click()
  await expect(canvas).toHaveClass(/measuring/)
  await page.keyboard.press('l')

  await expect(canvas).toHaveClass(/lassoing/)
  await expectSelectionMode(page, 'lasso')
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

  await canvas.click({ position: { x: 12, y: 12 } })
  await page.keyboard.press('h')
  await expect(canvas).toHaveClass(/pan-tool/)
})
