import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
}

async function ensureDetailsOpen(details: ReturnType<Page['getByTestId']>) {
  const isOpen = await details.evaluate((node) => (node as HTMLDetailsElement).open)
  if (!isOpen) await details.locator('summary').click()
}

test('right panel inputs and selects share search-field styling', async ({ page }) => {
  await openEditor(page)

  const tabs = page.getByRole('tablist', { name: 'Правая панель' })
  await tabs.getByRole('tab', { name: 'Слои', exact: true }).click()

  const search = page.locator('#ui-v2-right-layers-panel')
    .getByRole('searchbox', { name: 'Поиск слоев', exact: true })
  await expect(search).toBeVisible()

  const inputPresentation = await search.evaluate((node) => {
    const style = getComputedStyle(node)
    return {
      height: node.getBoundingClientRect().height,
      borderRadius: style.borderRadius,
      borderStyle: style.borderStyle,
      backgroundColor: style.backgroundColor,
    }
  })
  expect(inputPresentation.height).toBeGreaterThanOrEqual(34)
  expect(Number.parseFloat(inputPresentation.borderRadius)).toBeGreaterThanOrEqual(7)
  expect(inputPresentation.borderStyle).toBe('solid')
  expect(inputPresentation.backgroundColor).not.toBe('rgba(0, 0, 0, 0)')

  await search.focus()
  await expect.poll(() => search.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe('none')

  await tabs.getByRole('tab', { name: 'Свойства', exact: true }).click()
  const snapping = page.getByTestId('snapping-global-panel')
  await ensureDetailsOpen(snapping)

  const select = snapping.locator('select').first()
  await expect(select).toBeVisible()
  const selectPresentation = await select.evaluate((node) => {
    const style = getComputedStyle(node)
    return {
      height: node.getBoundingClientRect().height,
      borderRadius: style.borderRadius,
    }
  })
  expect(selectPresentation.height).toBeGreaterThanOrEqual(34)
  expect(Number.parseFloat(selectPresentation.borderRadius)).toBeGreaterThanOrEqual(7)

  await select.focus()
  await expect.poll(() => select.evaluate((node) => getComputedStyle(node).boxShadow)).not.toBe('none')
})
