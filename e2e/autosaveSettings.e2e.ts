import { expect, test, type Page } from '@playwright/test'

async function placeSingleCrochet(page: Page) {
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas is not visible')
  await page.getByRole('button', { name: 'Столбик без накида' }).click()
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
}

test('persists autosave intervals immediately, supports off and resumes the fast delay', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  const control = page.getByLabel('Автосохранение')
  await expect(control).toHaveValue('650')

  // The setting itself must survive a reload without waiting for the selected 60 s interval.
  await control.selectOption('60000')
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()
  await expect(page.getByLabel('Автосохранение')).toHaveValue('60000')

  await page.getByLabel('Автосохранение').selectOption('0')
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранение выключено')
  await page.waitForTimeout(250)

  await placeSingleCrochet(page)
  await expect(page.locator('.stitch-element')).toHaveCount(1)
  await page.waitForTimeout(900)
  await page.reload()
  await expect(page.getByLabel('Автосохранение')).toHaveValue('0')
  await expect(page.locator('.stitch-element')).toHaveCount(0)

  await page.getByLabel('Автосохранение').selectOption('650')
  await placeSingleCrochet(page)
  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()
  await expect(page.getByLabel('Автосохранение')).toHaveValue('650')
  await expect(page.locator('.stitch-element')).toHaveCount(1)
})
