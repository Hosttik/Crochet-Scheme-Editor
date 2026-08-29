import { expect, test, type Locator, type Page } from '@playwright/test'

async function openEditor(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
}

async function expectNoHorizontalOverflow(locator: Locator) {
  await expect(locator).toBeVisible()
  const width = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(width.scrollWidth).toBeLessThanOrEqual(width.clientWidth + 1)
}

async function placeAndSelectSingleStitch(page: Page) {
  await page.getByRole('button', { name: 'Столбик без накида · sc', exact: true }).click()
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  const x = box!.x + box!.width / 2
  const y = box!.y + box!.height / 2
  await page.mouse.click(x, y)
  await page.getByRole('button', { name: 'Выбор / перемещение · Esc', exact: true }).click()
  await page.mouse.click(x, y)
  await expect(page.locator('.productivity-panel')).toBeVisible()
}

test('keeps project actions readable at the 1440px desktop gate', async ({ page }) => {
  await openEditor(page, 1440)

  const actions = page.locator('.project-actions')
  await expectNoHorizontalOverflow(actions)
  for (const name of ['Новая', 'Копия', 'Удалить']) {
    const button = actions.getByRole('button', { name, exact: true })
    await expectNoHorizontalOverflow(button)
  }
})

test('contains productivity controls inside the 900px inspector', async ({ page }) => {
  await openEditor(page, 900)
  await placeAndSelectSingleStitch(page)

  await expectNoHorizontalOverflow(page.locator('.right-sidebar'))
  await expectNoHorizontalOverflow(page.locator('.productivity-panel'))

  const groupActions = page.locator('.productivity-actions').first()
  await expectNoHorizontalOverflow(groupActions)
  await expectNoHorizontalOverflow(groupActions.getByRole('button', { name: 'Группировать', exact: true }))
  await expectNoHorizontalOverflow(groupActions.getByRole('button', { name: 'Разгруппировать', exact: true }))
  await expectNoHorizontalOverflow(page.locator('.mirror-direction-grid'))
  await expectNoHorizontalOverflow(page.locator('.mirror-preview-actions'))
})
