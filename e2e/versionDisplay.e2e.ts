import { expect, test } from '@playwright/test'
import packageJson from '../package.json'

test('shows the package.json version persistently in the topbar', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()

  const versionHost = page.locator('.topbar-flex-spacer')
  await expect(versionHost).toBeVisible()

  const visibleVersion = await versionHost.evaluate((element) => (
    getComputedStyle(element, '::after').content.replace(/^['"]|['"]$/g, '')
  ))

  expect(visibleVersion).toBe(`v${packageJson.version}`)
})
