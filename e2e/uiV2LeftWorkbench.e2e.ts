import { expect, test } from '@playwright/test'

async function openEditor(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

test('uses the extracted tool rail and crochet element library', async ({ page }) => {
  await openEditor(page)

  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  const library = page.getByRole('region', { name: 'Библиотека элементов' })
  await expect(rail).toBeVisible()
  await expect(library).toBeVisible()
  // App now owns the complete typed workbench boundary, so the hidden
  // compatibility controls are physically gone rather than merely hidden.
  await expect(page.locator('[data-ui-v2-legacy-tools="true"]')).toHaveCount(0)
  await expect(page.locator('[data-ui-v2-legacy-library="true"]')).toHaveCount(0)
  await expect(page.locator('.ui-v2-legacy-guide-add')).toHaveCount(0)

  // Panel 3 is crochet-specific: no invented generic shape library is introduced.
  await expect(library.getByRole('button', { name: 'Воздушная петля · ch', exact: true })).toHaveCount(1)
  await expect(library.getByText('Базовые фигуры', { exact: true })).toHaveCount(0)

  await rail.getByRole('button', { name: /Ладонь \/ перемещение поля/ }).click()
  await expect(page.locator('.editor-canvas')).toHaveClass(/pan-tool/)
  await expect(rail.getByRole('button', { name: /Ладонь \/ перемещение поля/ })).toHaveAttribute('aria-pressed', 'true')

  await rail.getByRole('button', { name: /Выбор \/ перемещение/ }).click()
  await expect(page.locator('.editor-canvas')).not.toHaveClass(/pan-tool/)

  const selectionTrigger = rail.getByRole('button', { name: 'Выделение', exact: true })
  await selectionTrigger.click()
  const selectionMenu = page.getByRole('menu', { name: 'Выделение', exact: true })
  const marquee = selectionMenu.getByRole('menuitemradio', { name: 'Прямоугольное выделение', exact: true })
  const lasso = selectionMenu.getByRole('menuitemradio', { name: 'Лассо', exact: true })
  await expect(selectionMenu).toBeVisible()
  await expect(marquee).toHaveAttribute('aria-checked', 'true')
  await lasso.click()
  await expect(selectionMenu).toHaveCount(0)

  await selectionTrigger.click()
  await expect(selectionMenu).toBeVisible()
  await expect(lasso).toHaveAttribute('aria-checked', 'true')
  await marquee.click()
  await expect(selectionMenu).toHaveCount(0)

  const chain = library.getByRole('button', { name: 'Воздушная петля · ch', exact: true })
  await chain.click()
  await expect(page.locator('.editor-canvas')).toHaveClass(/placing/)
  await expect(chain).toHaveAttribute('aria-pressed', 'true')
})

test('collapses only the panel content while keeping the tool rail available', async ({ page }) => {
  await openEditor(page)

  const shell = page.locator('.app-shell')
  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  const library = page.getByRole('region', { name: 'Библиотека элементов' })
  const beforeColumns = await shell.evaluate((node) => getComputedStyle(node).gridTemplateColumns)

  await library.getByRole('button', { name: 'Свернуть панель элементов', exact: true }).click()
  await expect(page.getByTestId('element-library-collapsed')).toBeAttached()
  await expect(rail).toBeVisible()
  await expect(rail.getByRole('button', { name: 'Развернуть панель элементов', exact: true })).toBeVisible()
  await expect.poll(() => shell.evaluate((node) => getComputedStyle(node).gridTemplateColumns)).not.toBe(beforeColumns)

  await page.reload()
  await expect(page.getByTestId('element-library-collapsed')).toBeAttached()
  const persistedRail = page.getByRole('navigation', { name: 'Инструменты' })
  await persistedRail.getByRole('button', { name: 'Развернуть панель элементов', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Библиотека элементов' })).toBeVisible()

  await page.getByRole('region', { name: 'Библиотека элементов' })
    .getByRole('button', { name: 'Свернуть панель элементов', exact: true })
    .click()
  await page.getByRole('button', { name: 'Добавить элемент из библиотеки', exact: true }).click()
  const search = page.getByRole('searchbox', { name: 'Поиск элементов' })
  await expect(search).toBeVisible()
  await expect(search).toBeFocused()
})

test('keeps semantic element commands working after a locale switch', async ({ page }) => {
  await openEditor(page)

  await page.locator('.topbar-autosave-menu > summary').click()
  await page.locator('.language-switch button').filter({ hasText: 'EN' }).click()
  const library = page.getByRole('region', { name: 'Element library' })
  await expect(library).toBeVisible()

  await expect(page.locator('[data-ui-v2-legacy-library="true"]')).toHaveCount(0)
  const chain = library.getByRole('button', { name: 'Chain · ch', exact: true })
  await chain.click()
  await expect(page.locator('.editor-canvas')).toHaveClass(/placing/)
  await expect(chain).toHaveAttribute('aria-pressed', 'true')

  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await expect(page.locator('.stitch-element')).toHaveCount(1)
})

test('creates guides only from the ToolRail surface through the real editor handler', async ({ page }) => {
  await openEditor(page)

  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  await expect(page.locator('.left-sidebar .ui-v2-legacy-guide-add')).toHaveCount(0)
  await expect(page.locator('.left-sidebar > .guide-section')).toBeHidden()

  const guideTrigger = rail.getByRole('button', { name: 'Направляющие', exact: true })
  await guideTrigger.click()

  const menu = page.getByRole('menu', { name: 'Направляющие', exact: true })
  const lineItem = menu.getByRole('menuitem', { name: 'Линия', exact: true })
  const arcItem = menu.getByRole('menuitem', { name: 'Дуга', exact: true })
  const radialItem = menu.getByRole('menuitem', { name: 'Радиальная сетка', exact: true })
  await expect(menu).toBeVisible()
  await expect(guideTrigger).toHaveAttribute('aria-expanded', 'true')
  await expect(lineItem).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await expect(arcItem).toBeFocused()
  await page.keyboard.press('End')
  await expect(radialItem).toBeFocused()
  await page.keyboard.press('Home')
  await expect(lineItem).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(guideTrigger).toBeFocused()

  await guideTrigger.click()
  await expect(lineItem).toBeFocused()
  await lineItem.click()
  await expect(menu).toHaveCount(0)
  await expect(guideTrigger).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.left-sidebar > .guide-section')).toBeVisible()
  await expect(page.locator('.left-sidebar > .guide-section .guide-list button')).toHaveCount(1)
  await expect(page.locator('.statusbar')).toContainText('Линия')

  await guideTrigger.click()
  await expect(menu).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(guideTrigger).toBeFocused()
})

test('collapses library categories, persists the choice and reveals matches while searching', async ({ page }) => {
  await openEditor(page)

  let library = page.getByRole('region', { name: 'Библиотека элементов' })
  let chains = library.getByRole('button', { name: 'Цепочки', exact: true })
  const chainPresetName = '2 воздушные петли · 2 ВП'
  await expect(chains).toHaveAttribute('aria-expanded', 'true')
  await expect(library.getByRole('button', { name: chainPresetName, exact: true })).toBeVisible()

  await chains.click()
  await expect(chains).toHaveAttribute('aria-expanded', 'false')
  await expect(library.getByRole('button', { name: chainPresetName, exact: true })).toHaveCount(0)

  await page.reload()
  library = page.getByRole('region', { name: 'Библиотека элементов' })
  chains = library.getByRole('button', { name: 'Цепочки', exact: true })
  await expect(chains).toHaveAttribute('aria-expanded', 'false')

  const search = library.getByRole('searchbox', { name: 'Поиск элементов' })
  await search.fill('2 ВП')
  await expect(chains).toHaveAttribute('aria-expanded', 'true')
  await expect(library.getByRole('button', { name: chainPresetName, exact: true })).toBeVisible()

  await search.fill('')
  await expect(chains).toHaveAttribute('aria-expanded', 'false')
  await expect(library.getByRole('button', { name: chainPresetName, exact: true })).toHaveCount(0)
})

test('filters the extracted library without mutating document state', async ({ page }) => {
  await openEditor(page)

  const library = page.getByRole('region', { name: 'Библиотека элементов' })
  const search = library.getByRole('searchbox', { name: 'Поиск элементов' })
  await search.fill('dc2tog')

  await expect(library.getByRole('button', { name: '2 столбика с накидом с общей вершиной · dc2tog', exact: true })).toBeVisible()
  await expect(library.getByRole('button', { name: 'Воздушная петля · ch', exact: true })).toHaveCount(0)
  await expect(page.locator('.stitch-element')).toHaveCount(0)
})
