import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

test('renders persistent context plus switchable Options / Layers tabs', async ({ page }) => {
  await openEditor(page)

  const tabs = page.getByRole('tablist', { name: 'Правая панель' })
  const options = tabs.getByRole('tab', { name: 'Опции', exact: true })
  const layersTab = tabs.getByRole('tab', { name: 'Слои', exact: true })
  const optionsPanel = page.getByRole('tabpanel', { name: 'Опции', exact: true })
  const layersPanel = page.getByRole('tabpanel', { name: 'Слои', exact: true })
  const context = page.getByTestId('selection-context-panel')

  await expect(tabs).toBeVisible()
  await expect(tabs).toHaveAttribute('aria-orientation', 'horizontal')
  await expect(options).toHaveAttribute('aria-selected', 'true')
  await expect(options).toHaveAttribute('aria-controls', 'ui-v2-right-options-panel')
  await expect(options).toHaveAttribute('tabindex', '0')
  await expect(layersTab).toHaveAttribute('aria-selected', 'false')
  await expect(layersTab).toHaveAttribute('aria-controls', 'ui-v2-right-layers-panel')
  await expect(layersTab).toHaveAttribute('tabindex', '-1')
  await expect(optionsPanel).toBeVisible()
  await expect(layersPanel).toBeHidden()
  await expect(context).toBeVisible()

  await expect(page.locator('.left-sidebar > .layers-section')).toHaveCount(0)
  await expect(page.locator('[data-ui-v2-bridge="right-inspector"]')).toHaveCount(0)
  await expect(page.locator('.ui-v2-right-layers-host > .layers-section')).toHaveCount(1)

  await layersTab.click()
  await expect(layersTab).toHaveAttribute('aria-selected', 'true')
  await expect(optionsPanel).toBeHidden()
  await expect(layersPanel).toBeVisible()
  await expect(context).toBeVisible()
  await expect(page.locator('.ui-v2-right-layers-host > .layers-section')).toBeVisible()

  await options.click()
  await expect(options).toHaveAttribute('aria-selected', 'true')
  await expect(optionsPanel).toBeVisible()
  await expect(layersPanel).toBeHidden()
  await expect(context).toBeVisible()
})

test('supports keyboard navigation across right panel tabs', async ({ page }) => {
  await openEditor(page)

  const tabs = page.getByRole('tablist', { name: 'Правая панель' })
  const options = tabs.getByRole('tab', { name: 'Опции', exact: true })
  const layers = tabs.getByRole('tab', { name: 'Слои', exact: true })
  const layersPanel = page.getByRole('tabpanel', { name: 'Слои', exact: true })

  await options.focus()
  await page.keyboard.press('ArrowRight')
  await expect(layers).toBeFocused()
  await expect(layers).toHaveAttribute('aria-selected', 'true')
  await expect(layersPanel).toBeVisible()

  await page.keyboard.press('ArrowLeft')
  await expect(options).toBeFocused()
  await expect(options).toHaveAttribute('aria-selected', 'true')
  await expect(layersPanel).toBeHidden()

  await page.keyboard.press('End')
  await expect(layers).toBeFocused()
  await page.keyboard.press('Home')
  await expect(options).toBeFocused()
})

test('keeps layer selection, selection properties and productivity controls available together', async ({ page }) => {
  await openEditor(page)

  const library = page.getByRole('region', { name: 'Библиотека элементов' })
  await library.getByRole('button', { name: 'Воздушная петля · ch', exact: true }).click()

  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.keyboard.press('Escape')

  const tabs = page.getByRole('tablist', { name: 'Правая панель' })
  await tabs.getByRole('tab', { name: 'Слои', exact: true }).click()

  const layers = page.locator('.ui-v2-right-layers-host .layers-section')
  const row = layers.locator('.layer-row').first()
  await expect(row).toBeVisible()

  await row.locator('.layer-main-button').click()
  await expect(page.locator('.stitch-element.selected')).toHaveCount(1)
  await expect(page.getByTestId('selection-context-panel')).toBeVisible()
  await expect(page.getByTestId('selection-context-panel').locator('.selection-card')).toBeVisible()
  await expect(page.locator('.productivity-panel')).toBeVisible()

  const visibility = row.locator('.layer-icon-button').first()
  const beforeLabel = await visibility.getAttribute('aria-label')
  expect(beforeLabel).not.toBeNull()
  await visibility.click()
  await expect(visibility).not.toHaveAttribute('aria-label', beforeLabel!)
})

test('keeps guide properties reachable while Layers is active', async ({ page }) => {
  await openEditor(page)

  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  await rail.getByRole('button', { name: 'Направляющие', exact: true }).click()
  await page.getByRole('menu', { name: 'Направляющие', exact: true }).getByRole('menuitem', { name: 'Линия', exact: true }).click()

  const tabs = page.getByRole('tablist', { name: 'Правая панель' })
  await tabs.getByRole('tab', { name: 'Слои', exact: true }).click()

  const context = page.getByTestId('selection-context-panel')
  await expect(context).toBeVisible()
  await expect(context.locator('.guide-editor')).toBeVisible()
  await expect(context.getByRole('button', { name: 'По размеру проекта', exact: true })).toBeVisible()
})
