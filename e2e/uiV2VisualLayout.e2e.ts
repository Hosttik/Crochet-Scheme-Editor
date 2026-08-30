import { expect, test, type Locator, type Page } from '@playwright/test'

async function openEditor(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
}

async function expectNoHorizontalOverflow(locator: Locator) {
  await expect(locator).toBeVisible()
  const width = await locator.evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
  }))
  expect(width.scrollWidth).toBeLessThanOrEqual(width.clientWidth + 1)
}

async function expectContainedHorizontally(child: Locator, parent: Locator) {
  await expect(child).toBeVisible()
  await expect(parent).toBeVisible()
  const childBox = await child.boundingBox()
  const parentBox = await parent.boundingBox()
  expect(childBox).not.toBeNull()
  expect(parentBox).not.toBeNull()
  expect(childBox!.x).toBeGreaterThanOrEqual(parentBox!.x - 1)
  expect(childBox!.x + childBox!.width).toBeLessThanOrEqual(parentBox!.x + parentBox!.width + 1)
}

async function expectDescendantsWithoutHorizontalOverflow(locator: Locator) {
  await expect(locator).toBeVisible()
  const offenders = await locator.locator('*').evaluateAll((elements) => elements
    .map((element) => {
      const node = element as HTMLElement
      return {
        tag: node.tagName.toLowerCase(),
        className: typeof node.className === 'string' ? node.className : '',
        text: (node.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 100),
        clientWidth: node.clientWidth,
        scrollWidth: node.scrollWidth,
      }
    })
    .filter((entry) => entry.scrollWidth > entry.clientWidth + 1))
  expect(offenders, JSON.stringify(offenders, null, 2)).toEqual([])
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

  const sidebar = page.locator('.right-sidebar')
  const panel = page.locator('.productivity-panel')
  await expectContainedHorizontally(panel, sidebar)
  await expectDescendantsWithoutHorizontalOverflow(panel)

  const groupActions = page.locator('.productivity-actions').first()
  await expectNoHorizontalOverflow(groupActions)
  await expectNoHorizontalOverflow(groupActions.getByRole('button', { name: 'Группировать', exact: true }))
  await expectNoHorizontalOverflow(groupActions.getByRole('button', { name: 'Разгруппировать', exact: true }))
  await expectNoHorizontalOverflow(page.locator('.mirror-direction-grid'))
  await expectNoHorizontalOverflow(page.locator('.mirror-preview-actions'))
})
