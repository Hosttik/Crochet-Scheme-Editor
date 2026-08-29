import { expect, test, type Page } from '@playwright/test'

const reviewSizes = [
  { width: 1440, height: 900 },
  { width: 900, height: 900 },
]

async function capture(page: Page, name: string) {
  await page.screenshot({
    path: `visual-review/${name}.png`,
    animations: 'disabled',
  })
}

async function openDetails(page: Page, testId: string) {
  const details = page.getByTestId(testId)
  await details.scrollIntoViewIfNeeded()
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await details.locator(':scope > summary').click()
  }
}

for (const size of reviewSizes) {
  test(`captures visual review states at ${size.width}px`, async ({ page }) => {
    await page.setViewportSize(size)
    await page.goto('/Crochet-Scheme-Editor/')
    await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()

    await capture(page, `${size.width}-workbench`)

    await openDetails(page, 'snapping-global-panel')
    await capture(page, `${size.width}-options-snapping`)

    await page.goto('/Crochet-Scheme-Editor/')
    await page.getByRole('button', { name: 'Столбик без накида · sc', exact: true }).click()
    const canvas = page.locator('svg.editor-canvas')
    const box = await canvas.boundingBox()
    expect(box).not.toBeNull()
    const x = box!.x + box!.width / 2
    const y = box!.y + box!.height / 2
    await page.mouse.click(x, y)
    await page.getByRole('button', { name: 'Выбор / перемещение · Esc', exact: true }).click()
    await page.mouse.click(x, y)
    await expect(page.getByTestId('selection-context-panel')).toBeVisible()
    await capture(page, `${size.width}-selection`)
  })
}
