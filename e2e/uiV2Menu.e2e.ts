import { expect, test } from '@playwright/test'

async function openEditor(page: Parameters<typeof test>[0]['page']) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

test('application menu exposes real editor commands without duplicating dead UI', async ({ page }) => {
  await openEditor(page)

  await page.getByRole('button', { name: 'Файл', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Импорт проекта…' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Экспорт проекта…' })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Экспорт SVG…' })).toBeVisible()

  await page.getByRole('menuitem', { name: 'Печать…' }).click()
  await expect(page.getByTestId('print-global-panel')).toHaveAttribute('open', '')

  await page.getByRole('button', { name: 'Вид', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Показать / скрыть свойства' }).click()
  await expect(page.locator('.app-shell')).toHaveClass(/right-collapsed/)

  await page.getByRole('button', { name: 'Вид', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Показать / скрыть свойства' }).click()
  await expect(page.locator('.app-shell')).not.toHaveClass(/right-collapsed/)
})

test('application menu follows the editor language switch', async ({ page }) => {
  await openEditor(page)

  await page.getByRole('button', { name: 'EN', exact: true }).click()
  await expect(page.getByRole('button', { name: 'File', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'View', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Settings', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Help', exact: true })).toBeVisible()
})
