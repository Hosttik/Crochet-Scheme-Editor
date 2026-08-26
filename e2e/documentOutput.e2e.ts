import { expect, test } from '@playwright/test'

test('persists a background underlay and previews tiled print pages', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')

  const svgSource = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#ddd"/></svg>'
  await page.getByTestId('background-file-input').setInputFiles({
    name: 'reference.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(svgSource),
  })

  await expect(page.locator('image.background-canvas-image')).toHaveCount(1)
  await page.getByTestId('background-export').check()

  const geometry = page.getByTestId('background-panel').locator('.background-geometry-grid input')
  await geometry.nth(2).fill('3000')
  await geometry.nth(3).fill('2000')

  await page.getByTestId('background-opacity').evaluate((node) => {
    const input = node as HTMLInputElement
    input.value = '0.3'
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await page.getByTestId('background-lock').check()

  await expect(page.getByTestId('print-page-count')).not.toHaveText('1')
  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()

  await expect(page.locator('image.background-canvas-image')).toHaveCount(1)
  await expect(page.getByTestId('background-lock')).toBeChecked()
  await expect(page.getByTestId('background-export')).toBeChecked()
  await expect(page.getByTestId('background-opacity')).toHaveValue('0.3')
  await expect(page.getByTestId('print-page-count')).not.toHaveText('1')

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Сохранить JSON' }).click()
  const download = await downloadPromise
  const stream = await download.createReadStream()
  let json = ''
  for await (const chunk of stream) json += chunk.toString()
  const project = JSON.parse(json)
  expect(project.schemaVersion).toBe(17)
  expect(project.backgroundImage.sourceName).toBe('reference.svg')
  expect(project.backgroundImage.opacity).toBe(0.3)
  expect(project.backgroundImage.locked).toBe(true)
  expect(project.backgroundImage.includeInExport).toBe(true)
})
