import { expect, test, type Download, type Page } from '@playwright/test'

async function openEditor(page: Page, width: number, height = 800) {
  await page.setViewportSize({ width, height })
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByTestId('editor-topbar')).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

async function readDownload(download: Download) {
  const stream = await download.createReadStream()
  let text = ''
  for await (const chunk of stream) text += chunk.toString()
  return text
}

async function downloadFromFileMenu(page: Page, label: string) {
  await page.getByRole('menuitem', { name: 'Файл', exact: true }).click()
  const menu = page.getByRole('menu', { name: 'Файл', exact: true })
  const downloadPromise = page.waitForEvent('download')
  await menu.getByRole('menuitem', { name: label, exact: true }).click()
  return readDownload(await downloadPromise)
}

async function placeSingle(page: Page) {
  await page.locator('.symbols-section .symbol-button[title^="Столбик без накида ·"]').click()
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width * 0.5, box!.y + box!.height * 0.5)
  await expect(page.locator('.stitch-element')).toHaveCount(1)
}

test('responsive command bar preserves canonical file actions while collapsing secondary chrome', async ({ page }) => {
  await openEditor(page, 1081)

  const fileGroup = page.locator('.topbar-file-group')
  const save = page.getByRole('button', { name: 'Сохранить', exact: true })
  const canvasToolbar = page.locator('.canvas-toolbar')
  const canvasHand = canvasToolbar.getByRole('button', { name: 'Ладонь / перемещение поля', exact: true })

  await expect(fileGroup).toBeVisible()
  await expect(save).toBeVisible()
  await expect(canvasHand).toBeVisible()

  for (const width of [1080, 1024, 900]) {
    await page.setViewportSize({ width, height: 800 })
    await expect(fileGroup).toBeVisible()
    await expect(save).toBeVisible()
    await expect(canvasHand).toBeHidden()
    await expect(page.getByRole('menubar', { name: 'Меню приложения' })).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Инструменты' })).toBeVisible()
  }
})

test('900px File menu remains the full import/export surface alongside compact file buttons', async ({ page }) => {
  await openEditor(page, 900, 700)
  await expect(page.locator('.topbar-file-group')).toBeVisible()

  const emptyProjectJson = await downloadFromFileMenu(page, 'Экспорт проекта…')
  const emptyProject = JSON.parse(emptyProjectJson)
  expect(emptyProject.schemaVersion).toBe(22)
  expect(emptyProject.elements).toHaveLength(0)

  const svg = await downloadFromFileMenu(page, 'Экспорт SVG…')
  expect(svg).toContain('<svg')

  await placeSingle(page)

  await page.getByRole('menuitem', { name: 'Файл', exact: true }).click()
  const fileMenu = page.getByRole('menu', { name: 'Файл', exact: true })
  const chooserPromise = page.waitForEvent('filechooser')
  await fileMenu.getByRole('menuitem', { name: 'Импорт проекта…', exact: true }).click()
  const chooser = await chooserPromise
  await chooser.setFiles({
    name: 'empty-project.json',
    mimeType: 'application/json',
    buffer: Buffer.from(emptyProjectJson),
  })

  await expect(page.locator('.stitch-element')).toHaveCount(0)
})

test('900px ToolRail replacements operate hidden Hand Selection and Ruler tools', async ({ page }) => {
  await openEditor(page, 900, 700)

  const canvas = page.locator('svg.editor-canvas')
  const canvasToolbar = page.locator('.canvas-toolbar')
  await expect(canvasToolbar.getByRole('button', { name: 'Ладонь / перемещение поля', exact: true })).toBeHidden()
  await expect(canvasToolbar.getByRole('button', { name: 'Лассо', exact: true })).toBeHidden()
  await expect(canvasToolbar.getByRole('button', { name: 'Линейка', exact: true })).toBeHidden()

  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  await rail.getByRole('button', { name: /Ладонь \/ перемещение поля/ }).click()
  await expect(canvas).toHaveClass(/pan-tool/)

  await rail.getByRole('button', { name: 'Выделение', exact: true }).click()
  const selectionMenu = page.getByRole('menu', { name: 'Выделение', exact: true })
  await selectionMenu.getByRole('menuitemradio', { name: 'Лассо', exact: true }).click()
  await expect(canvas).toHaveClass(/lassoing/)

  await rail.getByRole('button', { name: /Линейка/ }).click()
  await expect(canvas).toHaveClass(/measuring/)
})
