import { expect, test } from '@playwright/test'

test('removes duplicate topbar guides and renders lighter favorite shortcuts', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'crochet-scheme-editor-ui-favorites-v1',
      JSON.stringify(['symbol:chain', 'symbol:single', 'symbol:double']),
    )
  })
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()

  await expect(page.locator('.topbar-v2 > button[aria-label="Направляющие"]')).toBeHidden()

  const favorites = page.getByTestId('favorite-quick-bar')
  await expect(favorites).toBeVisible()
  const quickButtons = favorites.locator('.favorite-quick-button')
  expect(await quickButtons.count()).toBeGreaterThanOrEqual(3)

  const glyph = quickButtons.first().locator('.symbol-glyph')
  await expect(glyph).toBeVisible()
  const opacity = await glyph.evaluate((element) => Number(getComputedStyle(element).opacity))
  expect(opacity).toBeLessThan(0.9)

  const iconBox = await glyph.boundingBox()
  expect(iconBox).not.toBeNull()
  expect(iconBox!.width).toBeLessThanOrEqual(20.5)
  expect(iconBox!.height).toBeLessThanOrEqual(20.5)

  const gap = await favorites.evaluate((element) => parseFloat(getComputedStyle(element).gap))
  expect(gap).toBeGreaterThanOrEqual(4)
})

test('projects and guide list collapse independently and remember their state', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')

  const projects = page.getByTestId('projects-panel')
  const guides = page.getByTestId('guides-panel')
  await expect(projects).toBeVisible()
  await expect(guides).toHaveCount(1)
  expect(await projects.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(true)
  expect(await guides.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(true)

  // Guides can sit below the initial left-workbench fold while Projects is open.
  // The disclosure still exists and is independently usable after scrolling.
  await guides.scrollIntoViewIfNeeded()
  await expect(guides.locator('summary')).toBeVisible()

  await projects.scrollIntoViewIfNeeded()
  await projects.locator('summary').click()
  expect(await projects.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false)
  expect(await guides.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(true)

  await guides.scrollIntoViewIfNeeded()
  await guides.locator('summary').click()
  expect(await guides.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false)

  await page.reload()
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
  const reloadedProjects = page.getByTestId('projects-panel')
  const reloadedGuides = page.getByTestId('guides-panel')
  expect(await reloadedProjects.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false)
  expect(await reloadedGuides.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false)

  await reloadedProjects.scrollIntoViewIfNeeded()
  await reloadedProjects.locator('summary').click()
  expect(await reloadedProjects.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(true)
  expect(await reloadedGuides.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false)
})
