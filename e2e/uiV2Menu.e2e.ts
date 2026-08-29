import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
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

test('application menu executes App commands without synthetic keyboard dispatch', async ({ page }) => {
  await openEditor(page)

  await page.evaluate(() => {
    sessionStorage.setItem('ui-v2-synthetic-keydowns', '0')
    window.addEventListener('keydown', (event) => {
      if (!event.isTrusted) {
        const count = Number(sessionStorage.getItem('ui-v2-synthetic-keydowns') ?? '0')
        sessionStorage.setItem('ui-v2-synthetic-keydowns', String(count + 1))
      }
    }, true)
  })

  const library = page.getByRole('region', { name: 'Библиотека элементов' })
  await library.getByRole('button', { name: 'Воздушная петля · ch', exact: true }).click()
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Правка', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Выбрать всё', exact: true }).click()
  await expect(page.locator('.stitch-element.selected')).toHaveCount(1)

  await page.getByRole('button', { name: 'Правка', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Дублировать', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(2)

  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('ui-v2-synthetic-keydowns'))).toBe('0')
})

test('application menu supports desktop keyboard navigation', async ({ page }) => {
  await openEditor(page)

  const file = page.getByRole('button', { name: 'Файл', exact: true })
  const edit = page.getByRole('button', { name: 'Правка', exact: true })

  await file.focus()
  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Новая схема', exact: true })).toBeFocused()

  await page.keyboard.press('ArrowDown')
  await expect(page.getByRole('menuitem', { name: 'Импорт проекта…', exact: true })).toBeFocused()

  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('menu', { name: 'Правка', exact: true })).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Отменить', exact: true })).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(edit).toBeFocused()
  await expect(page.getByRole('menu', { name: 'Правка', exact: true })).toHaveCount(0)

  await page.keyboard.press('ArrowLeft')
  await expect(file).toBeFocused()
})

test('command search is reachable from Help and executes real editor commands', async ({ page }) => {
  await openEditor(page)

  const help = page.getByRole('button', { name: 'Справка', exact: true })
  await help.click()
  await page.getByRole('menuitem', { name: 'Поиск по функциям…', exact: true }).click()

  const dialog = page.getByRole('dialog', { name: 'Поиск по функциям' })
  const search = dialog.getByRole('searchbox', { name: 'Поиск по функциям' })
  await expect(dialog).toBeVisible()
  await expect(search).toBeFocused()
  await expect(search).toHaveAttribute('aria-controls', 'command-palette-results')
  await expect(search).toHaveAttribute('aria-activedescendant', 'command-palette-option-file-new')

  await page.keyboard.press('ArrowDown')
  await expect(search).toBeFocused()
  await expect(search).toHaveAttribute('aria-activedescendant', 'command-palette-option-file-import')
  await expect(dialog.getByRole('option', { name: /Импорт проекта/ })).toHaveAttribute('aria-selected', 'true')

  await search.fill('плотность')
  const gaugeOption = dialog.getByRole('option', { name: /Плотность и размер/ })
  await expect(gaugeOption).toHaveCount(1)
  await expect(gaugeOption).toHaveAttribute('aria-selected', 'true')
  await expect(search).toHaveAttribute('aria-activedescendant', 'command-palette-option-settings-gauge')
  await page.keyboard.press('Enter')
  await expect(dialog).toHaveCount(0)
  await expect(page.getByTestId('gauge-global-panel')).toHaveAttribute('open', '')
  await expect(help).toBeFocused()

  await page.keyboard.press('Control+k')
  await expect(page.getByRole('dialog', { name: 'Поиск по функциям' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog', { name: 'Поиск по функциям' })).toHaveCount(0)
  await expect(help).toBeFocused()
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
