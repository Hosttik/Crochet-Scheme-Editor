import { expect, test, type Locator, type Page } from '@playwright/test'
import { createGuideFromToolRail } from './helpers/uiV2Guides'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

async function maskedPresentation(locator: Locator) {
  await expect(locator).toBeVisible()
  return locator.evaluate((element) => {
    const control = getComputedStyle(element)
    const icon = getComputedStyle(element, '::before')
    return {
      fontSize: control.fontSize,
      maskImage: icon.maskImage || icon.webkitMaskImage,
      beforeContent: icon.content,
    }
  })
}

async function placeChain(page: Page) {
  await page.getByRole('region', { name: 'Библиотека элементов' })
    .getByRole('button', { name: 'Воздушная петля · ch', exact: true })
    .click()
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width * .5, box!.y + box!.height * .5)
  await page.keyboard.press('Escape')
}

test('replaces sidebar collapse text glyphs with directional outline icons', async ({ page }) => {
  await openEditor(page)

  const leftToggle = page.getByRole('button', { name: 'Свернуть левую панель', exact: true })
  const expanded = await maskedPresentation(leftToggle)
  expect(expanded.fontSize).toBe('0px')
  expect(expanded.beforeContent).not.toBe('none')
  expect(expanded.maskImage).toContain('data:image/svg+xml')

  await leftToggle.click()
  await expect(page.locator('.app-shell')).toHaveClass(/left-collapsed/)
  const collapsed = await maskedPresentation(leftToggle)
  expect(collapsed.maskImage).toContain('data:image/svg+xml')
  expect(collapsed.maskImage).not.toBe(expanded.maskImage)
})

test('uses the shared lock glyph for locked guides instead of the emoji placeholder', async ({ page }) => {
  await openEditor(page)
  await createGuideFromToolRail(page, 'Линия')

  await page.getByLabel('Заблокировать направляющую', { exact: true }).check()
  const lockIndicator = page.locator('.guide-list span[aria-label="Заблокирована"]').first()
  const presentation = await maskedPresentation(lockIndicator)
  expect(presentation.fontSize).toBe('0px')
  expect(presentation.beforeContent).not.toBe('none')
  expect(presentation.maskImage).toContain('data:image/svg+xml')
})

test('keeps the locked-selection count as real text while replacing its emoji presentation', async ({ page }) => {
  await openEditor(page)
  await placeChain(page)

  const context = page.locator('.right-panel-context')
  await context.getByRole('button', { name: 'Заблокировать элемент', exact: true }).click()

  const lockedCount = context.locator('> .section-title-row .muted-text')
  await expect(lockedCount).toContainText('1')
  const presentation = await lockedCount.evaluate((element) => {
    const icon = getComputedStyle(element, '::before')
    const firstLetter = getComputedStyle(element, '::first-letter')
    return {
      maskImage: icon.maskImage || icon.webkitMaskImage,
      firstLetterSize: firstLetter.fontSize,
    }
  })
  expect(presentation.maskImage).toContain('data:image/svg+xml')
  expect(presentation.firstLetterSize).toBe('0px')
})

test('shows a visible focus surface around command search when opened from the keyboard', async ({ page }) => {
  await openEditor(page)

  await page.keyboard.press('Control+K')
  const input = page.getByRole('searchbox', { name: 'Поиск по функциям', exact: true })
  await expect(input).toBeFocused()

  const focusSurface = page.locator('.command-palette__search')
  const presentation = await focusSurface.evaluate((element) => ({
    boxShadow: getComputedStyle(element).boxShadow,
  }))
  expect(presentation.boxShadow).not.toBe('none')
  expect(presentation.boxShadow).toContain('52, 120, 246')
})
