import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

async function placeElement(page: Page, name: string, xOffset = 0) {
  const library = page.getByRole('region', { name: 'Библиотека элементов' })
  await library.getByRole('button', { name, exact: true }).click()
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width / 2 + xOffset, box!.y + box!.height / 2)
  await page.keyboard.press('Escape')
}

function rightWorkspace(page: Page) {
  const tabs = page.getByRole('tablist', { name: 'Правая панель' })
  return {
    tabs,
    properties: tabs.getByRole('tab', { name: 'Свойства', exact: true }),
    layers: tabs.getByRole('tab', { name: 'Слои', exact: true }),
    document: tabs.getByRole('tab', { name: 'Документ', exact: true }),
    optionsPanel: page.locator('#ui-v2-right-options-panel'),
    layersPanel: page.locator('#ui-v2-right-layers-panel'),
    sidebar: page.locator('.right-sidebar'),
  }
}

test('renders a single Properties / Layers / Document right workspace', async ({ page }) => {
  await openEditor(page)
  const workspace = rightWorkspace(page)

  await expect(workspace.tabs).toBeVisible()
  await expect(workspace.tabs).toHaveAttribute('aria-orientation', 'horizontal')
  await expect(workspace.properties).toHaveAttribute('aria-selected', 'true')
  await expect(workspace.properties).toHaveAttribute('aria-controls', 'ui-v2-right-options-panel')
  await expect(workspace.properties).toHaveAttribute('tabindex', '0')
  await expect(workspace.layers).toHaveAttribute('aria-selected', 'false')
  await expect(workspace.document).toHaveAttribute('aria-selected', 'false')
  await expect(workspace.optionsPanel).toBeVisible()
  await expect(workspace.layersPanel).toBeHidden()
  await expect(workspace.sidebar).toHaveAttribute('data-right-panel-mode', 'properties')
  await expect(page.getByTestId('right-properties-selection')).toBeVisible()
  await expect(page.getByTestId('right-properties-global')).toBeVisible()
  await expect(page.getByTestId('right-document-global')).toBeHidden()
  await expect(page.getByTestId('right-panel-contexts')).toHaveCount(0)

  await workspace.document.click()
  await expect(workspace.document).toHaveAttribute('aria-selected', 'true')
  await expect(workspace.optionsPanel).toBeVisible()
  await expect(workspace.sidebar).toHaveAttribute('data-right-panel-mode', 'document')
  await expect(page.getByTestId('right-properties-selection')).toBeHidden()
  await expect(page.getByTestId('right-properties-global')).toBeHidden()
  await expect(page.getByTestId('right-document-global')).toBeVisible()

  await workspace.layers.click()
  await expect(workspace.layers).toHaveAttribute('aria-selected', 'true')
  await expect(workspace.optionsPanel).toBeHidden()
  await expect(workspace.layersPanel).toBeVisible()
  await expect(page.locator('.ui-v2-right-layers-host > .layers-section')).toBeVisible()

  await workspace.properties.click()
  await expect(workspace.properties).toHaveAttribute('aria-selected', 'true')
  await expect(workspace.optionsPanel).toBeVisible()
  await expect(workspace.layersPanel).toBeHidden()
  await expect(page.getByTestId('right-properties-selection')).toBeVisible()
})

test('supports keyboard navigation across all three right workspace tabs', async ({ page }) => {
  await openEditor(page)
  const workspace = rightWorkspace(page)

  await workspace.properties.focus()
  await page.keyboard.press('ArrowRight')
  await expect(workspace.layers).toBeFocused()
  await expect(workspace.layers).toHaveAttribute('aria-selected', 'true')

  await page.keyboard.press('ArrowRight')
  await expect(workspace.document).toBeFocused()
  await expect(workspace.document).toHaveAttribute('aria-selected', 'true')
  await expect(workspace.sidebar).toHaveAttribute('data-right-panel-mode', 'document')

  await page.keyboard.press('ArrowRight')
  await expect(workspace.properties).toBeFocused()
  await expect(workspace.properties).toHaveAttribute('aria-selected', 'true')

  await page.keyboard.press('End')
  await expect(workspace.document).toBeFocused()
  await expect(workspace.document).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Home')
  await expect(workspace.properties).toBeFocused()
})

test('uses one scrolling surface while right workspace tabs stay fixed', async ({ page }) => {
  await openEditor(page)
  const workspace = rightWorkspace(page)

  await workspace.document.click()
  await expect.poll(() => workspace.sidebar.evaluate((node) => getComputedStyle(node).overflowY)).toBe('hidden')
  await expect.poll(() => workspace.optionsPanel.evaluate((node) => getComputedStyle(node).overflowY)).toBe('auto')

  await page.getByTestId('right-document-global').locator('details').evaluateAll((nodes) => {
    nodes.forEach((node) => { (node as HTMLDetailsElement).open = true })
  })
  const before = await workspace.tabs.boundingBox()
  expect(before).not.toBeNull()
  const didScroll = await workspace.optionsPanel.evaluate((node) => {
    node.scrollTop = node.scrollHeight
    return node.scrollTop > 0
  })
  expect(didScroll).toBe(true)
  const after = await workspace.tabs.boundingBox()
  expect(after).not.toBeNull()
  expect(Math.abs(after!.y - before!.y)).toBeLessThan(1)
})

test('filters layers without changing the document and keeps ordering actions contextual', async ({ page }) => {
  await openEditor(page)
  await placeElement(page, 'Воздушная петля · ch', -45)
  await placeElement(page, 'Столбик без накида · sc', 45)

  const workspace = rightWorkspace(page)
  await workspace.layers.click()

  const search = workspace.layersPanel.getByRole('searchbox', { name: 'Поиск слоев', exact: true })
  const rows = workspace.layersPanel.locator('.layer-row')
  await expect(search).toBeVisible()
  await expect(workspace.layersPanel.locator('.layer-order-controls')).toHaveCount(1)
  await expect(rows).toHaveCount(2)
  await expect(page.locator('.stitch-element')).toHaveCount(2)

  await search.fill('воздушная')
  await expect(rows).toHaveCount(1)
  await expect(rows.locator('.layer-main-button')).toHaveAttribute('aria-label', 'Воздушная петля')
  await expect(page.locator('.stitch-element')).toHaveCount(2)

  await search.fill('такого слоя нет')
  await expect(rows).toHaveCount(0)
  await expect(workspace.layersPanel.getByText('Нет слоев, подходящих под поиск', { exact: true })).toBeVisible()
  await expect(page.locator('.stitch-element')).toHaveCount(2)

  await search.fill('')
  await expect(rows).toHaveCount(2)
})

test('uses flatter properties hierarchy while preserving usable transform targets', async ({ page }) => {
  await openEditor(page)
  await placeElement(page, 'Воздушная петля · ch')

  const context = page.getByTestId('selection-context-panel')
  const rotation = context.locator('.rotation-controls')
  const utilities = context.locator('.layer-selection-controls')
  const danger = context.locator('.danger-button')

  await expect(rotation).toBeVisible()
  await expect(utilities).toBeVisible()
  await expect(danger).toBeVisible()

  const presentation = await context.evaluate((node) => {
    const rotation = node.querySelector<HTMLElement>('.rotation-controls')!
    const utilities = node.querySelector<HTMLElement>('.layer-selection-controls')!
    const danger = node.querySelector<HTMLElement>('.danger-button')!
    const rotateButton = rotation.querySelector<HTMLElement>('button')!
    return {
      rotationBackground: getComputedStyle(rotation).backgroundColor,
      utilitiesBackground: getComputedStyle(utilities).backgroundColor,
      dangerBackground: getComputedStyle(danger).backgroundColor,
      rotateHeight: rotateButton.getBoundingClientRect().height,
      dangerHeight: danger.getBoundingClientRect().height,
    }
  })
  expect(presentation.rotationBackground).toBe('rgba(0, 0, 0, 0)')
  expect(presentation.utilitiesBackground).toBe('rgba(0, 0, 0, 0)')
  expect(presentation.dangerBackground).toBe('rgba(0, 0, 0, 0)')
  expect(presentation.rotateHeight).toBeGreaterThanOrEqual(30)
  expect(presentation.dangerHeight).toBeGreaterThanOrEqual(30)
})

test('keeps the right workspace compact and usable on a short viewport', async ({ page }) => {
  await page.setViewportSize({ width: 1000, height: 640 })
  await openEditor(page)
  await placeElement(page, 'Воздушная петля · ch')

  const workspace = rightWorkspace(page)
  const tabsHost = page.locator('.ui-v2-right-tabs-host')
  const hostBox = await tabsHost.boundingBox()
  const sidebarBox = await workspace.sidebar.boundingBox()
  expect(hostBox).not.toBeNull()
  expect(sidebarBox).not.toBeNull()
  expect(hostBox!.height).toBeLessThan(70)
  expect(hostBox!.height).toBeLessThan(sidebarBox!.height * .2)
  await expect(page.getByTestId('selection-context-panel').locator('.rotation-controls')).toBeVisible()
  await expect(workspace.optionsPanel.getByTestId('snapping-global-panel')).toBeVisible()
})

test('preserves layer selection while moving into Properties for editing', async ({ page }) => {
  await openEditor(page)
  await placeElement(page, 'Воздушная петля · ch')

  const workspace = rightWorkspace(page)
  await workspace.layers.click()

  const row = workspace.layersPanel.locator('.layer-row').first()
  await expect(row).toBeVisible()
  await row.locator('.layer-main-button').click()
  await expect(page.locator('.stitch-element.selected')).toHaveCount(1)
  await expect(row.locator('.layer-main-button')).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('right-properties-selection')).toBeHidden()

  await workspace.properties.click()
  await expect(page.getByTestId('selection-context-panel')).toBeVisible()
  await expect(page.getByTestId('selection-context-panel').locator('.selection-card')).toBeVisible()
  await expect(page.locator('.productivity-panel')).toBeVisible()

  await workspace.layers.click()
  const visibility = row.locator('.layer-icon-button').first()
  const beforeLabel = await visibility.getAttribute('aria-label')
  expect(beforeLabel).not.toBeNull()
  await visibility.click()
  await expect(visibility).not.toHaveAttribute('aria-label', beforeLabel!)
})

test('keeps guide properties in Properties instead of duplicating them above Layers', async ({ page }) => {
  await openEditor(page)

  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  await rail.getByRole('button', { name: 'Направляющие', exact: true }).click()
  await page.getByRole('menu', { name: 'Направляющие', exact: true }).getByRole('menuitem', { name: 'Линия', exact: true }).click()

  const workspace = rightWorkspace(page)
  await workspace.layers.click()
  await expect(page.getByTestId('right-properties-selection')).toBeHidden()

  await workspace.properties.click()
  const context = page.getByTestId('selection-context-panel')
  await expect(context).toBeVisible()
  await expect(context.locator('.guide-editor')).toBeVisible()
  await expect(context.getByRole('button', { name: 'По размеру проекта', exact: true })).toBeVisible()
})
