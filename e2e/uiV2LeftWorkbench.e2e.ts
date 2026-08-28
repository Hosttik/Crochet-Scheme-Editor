import { expect, test } from '@playwright/test'

async function openEditor(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

test('uses the extracted tool rail and crochet element library', async ({ page }) => {
  await openEditor(page)

  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  const library = page.getByRole('region', { name: 'Библиотека элементов' })
  await expect(rail).toBeVisible()
  await expect(library).toBeVisible()
  await expect(page.locator('.left-sidebar > [data-ui-v2-legacy-tools="true"]')).toBeHidden()
  await expect(page.locator('.left-sidebar > .legacy-symbols-section')).toBeHidden()

  // Existing regression selectors must now resolve to the extracted controls only.
  await expect(page.locator('.left-sidebar .tool-button').filter({ hasText: 'Лассо' })).toHaveCount(1)
  await expect(page.locator('.symbols-section .symbol-button[aria-label="Воздушная петля · ch"]')).toHaveCount(1)

  await rail.getByRole('button', { name: /Ладонь \/ перемещение поля/ }).click()
  await expect(page.locator('.editor-canvas')).toHaveClass(/pan-tool/)
  await expect(rail.getByRole('button', { name: /Ладонь \/ перемещение поля/ })).toHaveAttribute('aria-pressed', 'true')

  await rail.getByRole('button', { name: /Выбор \/ перемещение/ }).click()
  await expect(page.locator('.editor-canvas')).not.toHaveClass(/pan-tool/)

  const chain = library.getByRole('button', { name: 'Воздушная петля · ch', exact: true })
  await chain.click()
  await expect(page.locator('.editor-canvas')).toHaveClass(/placing/)
  await expect(chain).toHaveAttribute('aria-pressed', 'true')
})

test('creates guides from the tool rail flyout through the real editor handler', async ({ page }) => {
  await openEditor(page)

  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  const guideTrigger = rail.getByRole('button', { name: 'Направляющие', exact: true })
  await guideTrigger.click()

  const menu = page.getByRole('menu', { name: 'Направляющие', exact: true })
  await expect(menu).toBeVisible()
  await expect(guideTrigger).toHaveAttribute('aria-expanded', 'true')

  await menu.getByRole('menuitem', { name: 'Линия', exact: true }).click()
  await expect(menu).toHaveCount(0)
  await expect(guideTrigger).toHaveAttribute('aria-expanded', 'false')
  await expect(page.locator('.left-sidebar > .guide-section .guide-list button')).toHaveCount(1)
  await expect(page.locator('.statusbar')).toContainText('Линия')

  await guideTrigger.click()
  await expect(menu).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toHaveCount(0)
  await expect(guideTrigger).toBeFocused()
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
