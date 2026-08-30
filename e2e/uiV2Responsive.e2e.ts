import { expect, test, type Locator, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
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

async function expectNoHorizontalOverflow(locator: Locator) {
  await expect(locator).toBeVisible()
  const width = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(width.scrollWidth).toBeLessThanOrEqual(width.clientWidth + 1)
}

async function expectInlineToolbarIcon(locator: Locator) {
  await expect(locator).toBeVisible()
  await expect(locator.locator('svg').first()).toBeVisible()
  const box = await locator.boundingBox()
  expect(box).not.toBeNull()
  expect(box!.width).toBeLessThanOrEqual(40)
  expect(box!.height).toBeLessThanOrEqual(34)
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

  await expect(page.locator('.ui-v2-favorites-host')).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Инструменты' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Библиотека элементов' })).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Правая панель' })).toBeVisible()

  await expectInsideViewport(page, page.locator('.topbar'))
  await expectInsideViewport(page, page.locator('.canvas-toolbar'))
  await expectInsideViewport(page, page.locator('.right-sidebar'))
  await expect(page.getByRole('button', { name: 'Сохранить', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Поиск по функциям', exact: true })).toBeVisible()
  await expect(page.locator('.topbar-add-favorite')).toBeVisible()

  await expectNoHorizontalOverflow(page.locator('.editor-root-v2'))
  await expectNoHorizontalOverflow(page.locator('.topbar'))
  await expectNoHorizontalOverflow(page.locator('.left-sidebar'))
  await expectNoHorizontalOverflow(page.locator('.right-sidebar'))

  const canvasToolbar = page.locator('.canvas-toolbar')
  await expectNoHorizontalOverflow(canvasToolbar)
  await expectInlineToolbarIcon(canvasToolbar.getByRole('button', { name: 'Ладонь / перемещение поля', exact: true }))
  await expectInlineToolbarIcon(canvasToolbar.getByRole('button', { name: 'Лассо', exact: true }))
  await expectInlineToolbarIcon(canvasToolbar.getByRole('button', { name: 'Линейка', exact: true }))
  await expect(canvasToolbar.getByRole('button', { name: 'Вместить всю схему', exact: true })).toBeVisible()
  await expect(canvasToolbar.getByRole('button', { name: 'Привязка к направляющим', exact: true })).toBeVisible()
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

  await expect(page.locator('.ui-v2-favorites-host')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Новый', exact: true })).toBeVisible()
  await expect(page.getByRole('menubar', { name: 'Меню приложения' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Инструменты' })).toBeVisible()
  await expect(page.getByRole('tablist', { name: 'Правая панель' })).toBeVisible()

  const workspace = page.locator('.workspace')
  const workspaceBox = await workspace.boundingBox()
  expect(workspaceBox).not.toBeNull()
  expect(workspaceBox!.width).toBeGreaterThanOrEqual(300)

  await expectInsideViewport(page, page.locator('.topbar'))
  const canvasToolbar = page.locator('.canvas-toolbar')
  await expectInsideViewport(page, canvasToolbar)
  await expectInsideViewport(page, page.locator('.right-sidebar'))

  await expectNoHorizontalOverflow(page.locator('.editor-root-v2'))
  await expectNoHorizontalOverflow(page.locator('.topbar'))
  await expectNoHorizontalOverflow(page.locator('.left-sidebar'))
  await expectNoHorizontalOverflow(page.locator('.right-sidebar'))

  // Canvas duplicates yield to the canonical ToolRail at narrow desktop sizes;
  // zoom, fit and snapping stay immediately reachable without horizontal scroll.
  await expect(canvasToolbar.getByRole('button', { name: 'Ладонь / перемещение поля', exact: true })).toBeHidden()
  await expect(canvasToolbar.getByRole('button', { name: 'Лассо', exact: true })).toBeHidden()
  await expect(canvasToolbar.getByRole('button', { name: 'Линейка', exact: true })).toBeHidden()
  await expect(canvasToolbar.getByRole('button', { name: 'Вместить всю схему', exact: true })).toBeVisible()
  await expect(canvasToolbar.getByRole('button', { name: 'Привязка к направляющим', exact: true })).toBeVisible()
  await expectNoHorizontalOverflow(canvasToolbar)

  const toolbarGeometry = await canvasToolbar.boundingBox()
  expect(toolbarGeometry).not.toBeNull()
  expect(toolbarGeometry!.height).toBeLessThanOrEqual(40)

  // At the narrow gate the command bar collapses labels and quick favorites,
  // while the full File menu remains available.
  await expect(page.locator('.topbar-file-group')).toBeVisible()
  await page.getByRole('menuitem', { name: 'Файл', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Экспорт SVG…', exact: true })).toBeVisible()
})
