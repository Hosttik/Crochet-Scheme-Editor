import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
}

test('right panel number and select controls share search-field styling', async ({ page }) => {
  await openEditor(page)

  const documentTab = page.getByRole('tablist', { name: 'Правая панель' })
    .getByRole('tab', { name: 'Документ', exact: true })
  await documentTab.click()

  const gauge = page.getByTestId('gauge-global-panel')
  await gauge.locator('summary').click()

  const numberInput = gauge.locator('input[type="number"]').first()
  await expect(numberInput).toBeVisible()

  const numberPresentation = await numberInput.evaluate((node) => {
    const style = getComputedStyle(node)
    return {
      height: node.getBoundingClientRect().height,
      borderRadius: style.borderRadius,
      borderStyle: style.borderStyle,
      backgroundColor: style.backgroundColor,
    }
  })
  expect(numberPresentation.height).toBeGreaterThanOrEqual(34)
  expect(Number.parseFloat(numberPresentation.borderRadius)).toBeGreaterThanOrEqual(7)
  expect(numberPresentation.borderStyle).toBe('solid')
  expect(numberPresentation.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')

  await numberInput.focus()
  await expect.poll(() => numberInput.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe('none')

  await page.getByRole('tab', { name: 'Свойства', exact: true }).click()
  const snapping = page.getByTestId('snapping-global-panel')
  await snapping.locator('summary').click()
  const select = snapping.locator('select').first()
  await expect(select).toBeVisible()
  await select.focus()
  await expect.poll(() => select.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe('none')
})
