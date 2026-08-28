import { expect, test, type Locator, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

async function expectInsideViewport(page: Page, locator: Locator) {
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  const viewport = page.viewportSize()
  expect(viewport).not.toBeNull()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1)
}

test('keeps the full desktop workbench usable at 1440px', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => {
    localStorage.setItem('crochet-scheme-editor-ui-favorites-v1', JSON.stringify([
      'symbol:chain',
      'symbol:single',
      'symbol:double',
    ]))
  })
  await openEditor(page)

  await expect(page.locator('.ui-v2-favorites-bridge-host')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Инструменты' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Библиотека элементов' })).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Правая панель' })).toBeVisible()

  await expectInsideViewport(page, page.locator('.topbar'))
  await expectInsideViewport(page, page.locator('.canvas-toolbar'))
  await expectInsideViewport(page, page.locator('.right-sidebar'))
  await expect(page.locator('.topbar .primary-button')).toBeVisible()
})

test('preserves canvas and primary chrome at the 900px narrow-desktop gate', async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 })
  await page.addInitScript(() => {
    localStorage.setItem('crochet-scheme-editor-ui-favorites-v1', JSON.stringify([
      'symbol:chain',
      'symbol:single',
      'symbol:double',
    ]))
  })
  await openEditor(page)

  await expect(page.locator('.ui-v2-favorites-bridge-host')).toBeHidden()
  await expect(page.locator('.brand strong')).toContainText('Редактор схем вязания')
  await expect(page.getByRole('navigation', { name: 'Меню приложения' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Инструменты' })).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Правая панель' })).toBeVisible()

  const workspace = page.locator('.workspace')
  const workspaceBox = await workspace.boundingBox()
  expect(workspaceBox).not.toBeNull()
  expect(workspaceBox!.width).toBeGreaterThanOrEqual(300)

  await expectInsideViewport(page, page.locator('.topbar'))
  await expectInsideViewport(page, page.locator('.canvas-toolbar'))
  await expectInsideViewport(page, page.locator('.right-sidebar'))

  // Duplicate file actions collapse out of the narrow command bar, but the
  // canonical application-menu command remains immediately accessible.
  await expect(page.locator('.topbar .primary-button')).toBeHidden()
  await page.getByRole('button', { name: 'Файл', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Экспорт SVG…', exact: true })).toBeVisible()
})
