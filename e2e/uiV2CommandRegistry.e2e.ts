import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

async function openMenu(page: Page, name: string) {
  const trigger = page.getByRole('menuitem', { name, exact: true })
  await trigger.click()
  return page.getByRole('menu', { name, exact: true })
}

async function placeSingle(page: Page) {
  await page.locator('.symbols-section .symbol-button[title^="Столбик без накида ·"]').click()
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5)
  await expect(page.locator('.stitch-element')).toHaveCount(1)
}

test('menu command availability follows document state and disabled commands are inert', async ({ page }) => {
  await openEditor(page)

  let editMenu = await openMenu(page, 'Правка')
  for (const label of ['Отменить', 'Повторить', 'Копировать', 'Вставить', 'Дублировать', 'Удалить', 'Выбрать всё']) {
    await expect(editMenu.getByRole('menuitem', { name: label, exact: true })).toHaveAttribute('aria-disabled', 'true')
  }

  const disabledPaste = editMenu.getByRole('menuitem', { name: 'Вставить', exact: true })
  await disabledPaste.click()
  await expect(editMenu).toBeVisible()
  await expect(page.locator('.stitch-element')).toHaveCount(0)

  await page.getByRole('menuitem', { name: 'Правка', exact: true }).click()
  const viewMenu = await openMenu(page, 'Вид')
  await expect(viewMenu.getByRole('menuitem', { name: 'Вместить всю схему', exact: true })).toHaveAttribute('aria-disabled', 'true')
  await expect(viewMenu.getByRole('menuitem', { name: 'Вместить выделение', exact: true })).toHaveAttribute('aria-disabled', 'true')
  await expect(viewMenu.getByRole('menuitem', { name: 'Масштаб 100%', exact: true })).not.toHaveAttribute('aria-disabled', 'true')
  await page.getByRole('menuitem', { name: 'Вид', exact: true }).click()

  await placeSingle(page)

  editMenu = await openMenu(page, 'Правка')
  for (const label of ['Отменить', 'Копировать', 'Дублировать', 'Удалить', 'Выбрать всё']) {
    await expect(editMenu.getByRole('menuitem', { name: label, exact: true })).not.toHaveAttribute('aria-disabled', 'true')
  }
  await expect(editMenu.getByRole('menuitem', { name: 'Повторить', exact: true })).toHaveAttribute('aria-disabled', 'true')
  await expect(editMenu.getByRole('menuitem', { name: 'Вставить', exact: true })).toHaveAttribute('aria-disabled', 'true')

  await editMenu.getByRole('menuitem', { name: 'Копировать', exact: true }).click()
  editMenu = await openMenu(page, 'Правка')
  await expect(editMenu.getByRole('menuitem', { name: 'Вставить', exact: true })).not.toHaveAttribute('aria-disabled', 'true')
  await editMenu.getByRole('menuitem', { name: 'Вставить', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(2)

  await page.keyboard.press('Control+z')
  await expect(page.locator('.stitch-element')).toHaveCount(1)
})

test('command palette exposes disabled state and keeps disabled commands open', async ({ page }) => {
  await openEditor(page)

  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog', { name: 'Поиск по функциям', exact: true })
  await expect(dialog).toBeVisible()
  const search = dialog.getByRole('combobox', { name: 'Поиск по функциям', exact: true })
  await search.fill('Вставить')
  const paste = dialog.getByRole('option').filter({ hasText: 'Вставить' })
  await expect(paste).toHaveAttribute('aria-disabled', 'true')

  await search.press('Enter')
  await expect(dialog).toBeVisible()
  await expect(page.locator('.stitch-element')).toHaveCount(0)
  await search.press('Escape')
  await expect(dialog).toBeHidden()

  await placeSingle(page)
  await page.keyboard.press('Control+c')
  await page.keyboard.press('Control+k')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('combobox', { name: 'Поиск по функциям', exact: true }).fill('Вставить')
  await expect(paste).not.toHaveAttribute('aria-disabled', 'true')
  await dialog.getByRole('combobox', { name: 'Поиск по функциям', exact: true }).press('Enter')
  await expect(dialog).toBeHidden()
  await expect(page.locator('.stitch-element')).toHaveCount(2)
})

test('editing shortcuts stay inside text inputs and do not update the editor clipboard', async ({ page }) => {
  await openEditor(page)
  await placeSingle(page)

  const library = page.getByRole('region', { name: 'Библиотека элементов' })
  const search = library.getByRole('searchbox', { name: 'Поиск элементов' })
  await search.fill('single')
  await search.press('Control+a')
  await search.press('Control+c')
  await expect(search).toHaveValue('single')

  const editMenu = await openMenu(page, 'Правка')
  await expect(editMenu.getByRole('menuitem', { name: 'Вставить', exact: true })).toHaveAttribute('aria-disabled', 'true')
  await expect(page.locator('.stitch-element')).toHaveCount(1)
})
