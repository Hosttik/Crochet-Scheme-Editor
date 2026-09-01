import { expect, type Page } from '@playwright/test'

const DOCUMENT_PANEL_IDS = new Set([
  'background-global-panel',
  'gauge-global-panel',
  'print-global-panel',
  'pattern-rows-global-panel',
  'row-markers-global-panel',
  'legend-global-panel',
  'help-global-panel',
])

export async function openRightWorkspaceMode(page: Page, mode: 'properties' | 'layers' | 'document') {
  const tab = mode === 'properties'
    ? page.locator('#ui-v2-right-tab-options')
    : page.locator(`#ui-v2-right-tab-${mode}`)
  if ((await tab.getAttribute('aria-selected')) !== 'true') await tab.click()
  await expect(tab).toHaveAttribute('aria-selected', 'true')
}

export async function openGlobalPanel(page: Page, testId: string) {
  await openRightWorkspaceMode(page, DOCUMENT_PANEL_IDS.has(testId) ? 'document' : 'properties')
  const details = page.getByTestId(testId)
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await details.locator(':scope > summary').click()
  }
  await expect(details).toBeVisible()
  return details
}
