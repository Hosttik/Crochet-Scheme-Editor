import { expect, test } from '@playwright/test'

test('persists a background underlay and previews tiled print pages', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')

  const readDownload = async (buttonName: string) => {
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: buttonName }).click()
    const download = await downloadPromise
    const stream = await download.createReadStream()
    let text = ''
    for await (const chunk of stream) text += chunk.toString()
    return text
  }

  const svgSource = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="400"><rect width="800" height="400" fill="#ddd"/></svg>'
  await page.getByTestId('background-file-input').setInputFiles({
    name: 'reference.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from(svgSource),
  })

  await expect(page.locator('image.background-canvas-image')).toHaveCount(1)

  const editorOnlySvg = await readDownload('Экспорт SVG')
  expect(editorOnlySvg).not.toContain('<image')

  await page.getByTestId('background-export').check()

  const geometry = page.getByTestId('background-panel').locator('.background-geometry-grid input')
  await geometry.nth(2).fill('3000')
  await geometry.nth(3).fill('2000')

  const opacity = page.getByTestId('background-opacity')
  await opacity.focus()
  await opacity.press('Home')
  for (let step = 0; step < 5; step += 1) await opacity.press('ArrowRight')
  await expect(opacity).toHaveValue('0.3')
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

  const json = await readDownload('Сохранить JSON')
  const project = JSON.parse(json)
  expect(project.schemaVersion).toBe(21)
  expect(project.backgroundImage.sourceName).toBe('reference.svg')
  expect(project.backgroundImage.opacity).toBe(0.3)
  expect(project.backgroundImage.locked).toBe(true)
  expect(project.backgroundImage.includeInExport).toBe(true)

  const exportedSvg = await readDownload('Экспорт SVG')
  expect(exportedSvg).toContain('<image')
  expect(exportedSvg).toContain('data:image/svg+xml')
  expect(exportedSvg).toContain('opacity="0.3"')
})