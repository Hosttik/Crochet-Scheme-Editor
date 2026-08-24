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

test('edits explicit parent-child topology and restores it with undo', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')

  await page.getByRole('button', { name: /Радиальная/ }).click()
  await expect(page.getByText('Создать параметрический ряд', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()

  await expect(page.getByText('Ряд 1', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: '+6 прибавок' }).click()

  await expect(page.getByText('Ряд 2', { exact: true })).toBeVisible()
  await expect(page.locator('.stitch-topology-link')).toHaveCount(18)
  await expect(page.locator('.topology-mode-badge')).toHaveText('Равномерно')
  await expect(page.locator('.topology-change-button')).toHaveCount(6)
  await expect(page.locator('.topology-change-button').first()).toContainText('+ 2')
  await expect(page.locator('.row-shaping-marker.editable')).toHaveCount(6)

  await page.locator('.row-shaping-marker.editable').first().click()
  await expect(page.locator('.topology-change-button.active')).toHaveCount(1)
  await page.getByTitle('Сдвинуть вправо').click()

  await expect(page.locator('.topology-mode-badge')).toHaveText('Вручную')
  await expect(page.locator('.topology-change-button').first()).toContainText('+ 3')
  await expect(page.locator('.stitch-topology-link')).toHaveCount(18)
  await expect(page.getByText(/прибавки в петли 3, 4, 6, 8, 10, 12/)).toBeVisible()

  await page.getByRole('button', { name: 'Отменить' }).click()
  await page.getByText('Ряд 2', { exact: true }).click()
  await expect(page.locator('.topology-mode-badge')).toHaveText('Равномерно')
  await expect(page.locator('.topology-change-button').first()).toContainText('+ 2')
  await expect(page.locator('.stitch-topology-link')).toHaveCount(18)
})

test('edits a mixed stitch rapport and restores it from autosave', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')

  await page.getByRole('button', { name: /Радиальная/ }).click()
  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()
  await expect(page.getByText('Ряд 1', { exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Раппорт', exact: true }).click()
  await expect(page.locator('.row-sequence-item')).toHaveCount(2)
  await expect(page.getByText('Смешанный раппорт', { exact: true })).toBeVisible()
  await expect(page.getByText(/\(3 СБН, 1 ВП\) × 3 = 12/)).toBeVisible()

  await page.locator('.row-sequence-item select').nth(1).selectOption('double')
  await expect(page.getByText(/\(3 СБН, 1 ССН\) × 3 = 12/)).toBeVisible()

  await page.locator('.row-sequence-item input').first().fill('2')
  await expect(page.getByText(/\(2 СБН, 1 ССН\) × 4 = 12/)).toBeVisible()

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()

  await expect(page.getByText('Смешанный раппорт', { exact: true })).toBeVisible()
  await expect(page.getByText(/\(2 СБН, 1 ССН\) × 4 = 12/)).toBeVisible()
})
