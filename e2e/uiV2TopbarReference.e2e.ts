import { expect, test } from '@playwright/test'

test('panel 2 follows the reference command hierarchy and keeps its controls live', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => {
    localStorage.setItem('crochet-scheme-editor-ui-favorites-v1', JSON.stringify([
      'symbol:chain',
      'symbol:single',
      'symbol:double',
    ]))
  })
  await page.goto('/Crochet-Scheme-Editor/')

  const topbar = page.getByTestId('editor-topbar')
  await expect(topbar).toBeVisible()
  const geometry = await topbar.boundingBox()
  expect(geometry).not.toBeNull()
  expect(geometry!.height).toBeGreaterThanOrEqual(63)
  expect(geometry!.height).toBeLessThanOrEqual(65)

  await expect(topbar.locator('.brand')).toHaveCount(0)
  for (const label of ['Новый', 'Открыть', 'Сохранить', 'Отменить', 'Повторить']) {
    await expect(topbar.getByRole('button', { name: label, exact: true })).toBeVisible()
  }

  const zoom = topbar.getByLabel('Масштаб')
  await expect(zoom).toBeVisible()
  await expect(zoom.locator('option')).toHaveCount(6)
  await expect(zoom).toHaveValue('100')
  await zoom.selectOption('125')
  await expect(zoom).toHaveValue('125')
  await expect(page.locator('svg.editor-canvas > g[transform*="scale("]')).toHaveAttribute('transform', /scale\(1\.25\)/)
  await zoom.selectOption('75')
  await expect(zoom).toHaveValue('75')
  await expect(page.locator('svg.editor-canvas > g[transform*="scale("]')).toHaveAttribute('transform', /scale\(0\.75\)/)
  await zoom.selectOption('100')
  await expect(zoom).toHaveValue('100')

  await expect(topbar.getByRole('button', { name: 'Сетка', exact: true })).toBeVisible()
  await expect(topbar.getByRole('button', { name: 'Направляющие', exact: true })).toBeVisible()
  await expect(topbar.getByRole('button', { name: 'Поиск по функциям', exact: true })).toContainText('Ctrl + F')

  const grid = topbar.getByRole('button', { name: 'Сетка', exact: true })
  const canvasGrid = page.locator('svg.editor-canvas rect[fill="url(#grid)"]')
  await expect(grid).toHaveAttribute('aria-pressed', 'true')
  await expect(canvasGrid).toBeVisible()
  await grid.click()
  await expect(grid).toHaveAttribute('aria-pressed', 'false')
  await expect(page.locator('html')).toHaveAttribute('data-canvas-grid', 'off')
  await expect(canvasGrid).toBeHidden()
  await grid.click()
  await expect(grid).toHaveAttribute('aria-pressed', 'true')
  await expect(canvasGrid).toBeVisible()

  await topbar.getByRole('button', { name: 'Направляющие', exact: true }).click()
  await expect(page.getByRole('menu', { name: 'Направляющие', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')

  const commandDialog = page.getByRole('dialog', { name: 'Поиск по функциям', exact: true })
  const commandInput = page.getByRole('combobox', { name: 'Поиск по функциям', exact: true })
  await topbar.getByRole('button', { name: 'Поиск по функциям', exact: true }).click()
  await expect(commandDialog).toBeVisible()
  await commandInput.click()
  await page.keyboard.press('Escape')
  await expect(commandDialog).toBeHidden()
  await page.keyboard.press('Control+f')
  await expect(commandDialog).toBeVisible()
  await commandInput.click()
  await page.keyboard.press('Escape')
  await expect(commandDialog).toBeHidden()

  const autosave = topbar.locator('.topbar-autosave-menu')
  await expect(autosave.locator('summary')).toBeVisible()
  await autosave.locator('summary').click()
  await expect(page.getByLabel('Автосохранение')).toBeVisible()
  await expect(page.getByRole('button', { name: 'RU', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'EN', exact: true })).toBeVisible()

  await expect(topbar.getByRole('button', { name: 'Избранное: 3', exact: true })).toBeVisible()
  const quickBar = topbar.getByTestId('favorite-quick-bar')
  await expect(quickBar).toBeVisible()
  await expect(quickBar.locator('.favorite-quick-button')).toHaveCount(3)
  await expect(topbar.locator('.topbar-add-favorite')).toBeVisible()
})
