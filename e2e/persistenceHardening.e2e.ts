import { expect, test, type Page } from '@playwright/test'

async function placeSingleCrochet(page: Page) {
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas is not visible')
  await page.locator('.symbols-section .symbol-button[title^="Столбик без накида ·"]').click()
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
}

test('flushes long-delay edits when the page is being hidden', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await page.getByLabel('Автосохранение').selectOption('60000')
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')

  await placeSingleCrochet(page)
  await expect(page.locator('.stitch-element')).toHaveCount(1)

  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')))
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')

  await page.reload()
  await expect(page.getByLabel('Автосохранение')).toHaveValue('60000')
  await expect(page.locator('.stitch-element')).toHaveCount(1)
})

test('surfaces storage failure instead of reporting a successful autosave', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      configurable: true,
      value: undefined,
    })
  })

  await page.goto('/Crochet-Scheme-Editor/')

  await expect(page.locator('.autosave-indicator')).toContainText(/ошиб|error/i)
  await expect(page.locator('.project-error')).toContainText('IndexedDB is unavailable')
  await expect(page.locator('.autosave-indicator')).not.toContainText('Автосохранено')
})
