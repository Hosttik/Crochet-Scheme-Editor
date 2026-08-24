import { expect, test } from '@playwright/test'

test('places a stitch, restores autosave and manages local projects', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')

  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Вместить всю схему' })).toBeDisabled()

  await page.getByTitle('Столбик без накида').click()
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)

  await expect(page.locator('.statusbar span').last()).toContainText('1 элементов')
  await expect(page.getByRole('button', { name: 'Вместить всю схему' })).toBeEnabled()
  await page.getByRole('button', { name: 'Вместить всю схему' }).click()

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')

  await page.reload()
  await expect(page.locator('.statusbar span').last()).toContainText('1 элементов')

  await page.getByRole('button', { name: 'Свернуть левую панель' }).click()
  await expect(page.locator('.app-shell')).toHaveClass(/left-collapsed/)
  await page.getByRole('button', { name: 'Свернуть левую панель' }).click()
  await expect(page.locator('.app-shell')).not.toHaveClass(/left-collapsed/)

  await page.getByRole('button', { name: 'Новая', exact: true }).click()
  await expect(page.locator('.statusbar span').last()).toContainText('0 элементов')
  await expect(page.locator('.project-select option')).toHaveCount(2)
})
