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

async function expectMaskedToolbarIcon(locator: Locator) {
  await expect(locator).toBeVisible()
  const presentation = await locator.evaluate((element) => {
    const control = getComputedStyle(element)
    const icon = getComputedStyle(element, '::before')
    return {
      fontSize: control.fontSize,
      maskImage: icon.maskImage || icon.webkitMaskImage,
      beforeContent: icon.content,
    }
  })
  expect(presentation.fontSize).toBe('0px')
  expect(presentation.beforeContent).not.toBe('none')
  expect(presentation.maskImage).toContain('data:image/svg+xml')
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
  await expect(page.locator('.topbar .primary-button')).toBeVisible()

  const canvasToolbar = page.locator('.canvas-toolbar')
  await expectMaskedToolbarIcon(canvasToolbar.getByRole('button', { name: 'Ладонь / перемещение поля', exact: true }))
  await expectMaskedToolbarIcon(canvasToolbar.getByRole('button', { name: 'Лассо', exact: true }))
  await expectMaskedToolbarIcon(canvasToolbar.getByRole('button', { name: 'Линейка', exact: true }))
  await expectMaskedToolbarIcon(canvasToolbar.getByRole('button', { name: 'Вместить всю схему', exact: true }))
  await expectMaskedToolbarIcon(canvasToolbar.locator('.snap-toggle'))
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
  await expect(page.locator('.brand strong')).toContainText('Редактор схем вязания')
  await expect(page.getByRole('navigation', { name: 'Меню приложения' })).toBeVisible()
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

  // Canvas duplicates yield to the canonical ToolRail at narrow desktop sizes;
  // zoom, fit and snapping stay immediately reachable without horizontal scroll.
  await expect(canvasToolbar.getByRole('button', { name: 'Ладонь / перемещение поля', exact: true })).toBeHidden()
  await expect(canvasToolbar.getByRole('button', { name: 'Лассо', exact: true })).toBeHidden()
  await expect(canvasToolbar.getByRole('button', { name: 'Линейка', exact: true })).toBeHidden()
  await expectMaskedToolbarIcon(canvasToolbar.getByRole('button', { name: 'Вместить всю схему', exact: true }))
  await expectMaskedToolbarIcon(canvasToolbar.locator('.snap-toggle'))

  const toolbarWidth = await canvasToolbar.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(toolbarWidth.scrollWidth).toBeLessThanOrEqual(toolbarWidth.clientWidth + 1)

  // Duplicate file actions collapse out of the narrow command bar, but the
  // canonical application-menu command remains immediately accessible.
  await expect(page.locator('.topbar .primary-button')).toBeHidden()
  await page.getByRole('button', { name: 'Файл', exact: true }).click()
  await expect(page.getByRole('menuitem', { name: 'Экспорт SVG…', exact: true })).toBeVisible()
})
