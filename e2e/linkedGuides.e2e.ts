import { expect, test, type Page } from '@playwright/test'
import { readFile } from 'node:fs/promises'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

async function canvasBox(page: Page) {
  const box = await page.locator('svg.editor-canvas').boundingBox()
  expect(box).not.toBeNull()
  return box!
}

async function placeAt(page: Page, title: string, rx: number, ry: number) {
  await page.locator(`.symbols-section .symbol-button[title^="${title}"]`).click()
  const box = await canvasBox(page)
  await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry)
}

function transformParts(value: string | null) {
  const transform = value ?? ''
  const translate = transform.match(/translate\(([-\d.]+) ([-\d.]+)\)/)
  const rotate = transform.match(/rotate\(([-\d.]+)\)/)
  return {
    x: translate ? Number(translate[1]) : Number.NaN,
    y: translate ? Number(translate[2]) : Number.NaN,
    rotation: rotate ? Number(rotate[1]) : Number.NaN,
  }
}

test('keeps a stitch attached to a line through guide edits, autosave and detach', async ({ page }) => {
  await openEditor(page)

  await page.locator('.guide-add-grid button').filter({ hasText: 'Линия' }).click()
  await expect(page.locator('.guide-line')).toHaveCount(1)
  await expect(page.locator('.guide-line')).toHaveClass(/selected/)

  const guideEditor = page.locator('.guide-editor')
  const startY = Number(await guideEditor.getByLabel('Начало Y').inputValue())
  const endY = Number(await guideEditor.getByLabel('Конец Y').inputValue())

  await placeAt(page, 'Столбик без накида', 0.46, 0.38)
  const stitch = page.locator('.stitch-element').first()
  await expect(stitch).toHaveClass(/selected/)

  const attachment = page.locator('.guide-attachment-panel')
  await expect(attachment).toBeVisible()
  await attachment.getByRole('button', { name: 'Закрепить на направляющей', exact: true }).click()
  await expect(stitch).toHaveAttribute('data-guide-attached', 'true')
  await expect(attachment).toContainText('Закреплено')

  const attachedBefore = transformParts(await stitch.getAttribute('transform'))

  await page.locator('.guide-list button').filter({ hasText: 'Линия' }).click()
  await expect(guideEditor).toBeVisible()
  await guideEditor.getByLabel('Начало Y').fill(String(startY + 60))
  await guideEditor.getByLabel('Начало Y').press('Enter')
  await guideEditor.getByLabel('Конец Y').fill(String(endY + 60))
  await guideEditor.getByLabel('Конец Y').press('Enter')

  const attachedAfter = transformParts(await stitch.getAttribute('transform'))
  expect(attachedAfter.x).toBeCloseTo(attachedBefore.x, 2)
  expect(attachedAfter.y - attachedBefore.y).toBeCloseTo(60, 2)

  await stitch.click()
  await expect(attachment).toContainText('Закреплено')
  await attachment.getByLabel('Ориентация').selectOption('normal')
  const normalPose = transformParts(await stitch.getAttribute('transform'))
  expect(Math.abs(normalPose.rotation - attachedAfter.rotation)).toBeGreaterThan(45)

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()

  const restored = page.locator('.stitch-element').first()
  await expect(restored).toHaveAttribute('data-guide-attached', 'true')
  const restoredPose = transformParts(await restored.getAttribute('transform'))
  expect(restoredPose.x).toBeCloseTo(normalPose.x, 2)
  expect(restoredPose.y).toBeCloseTo(normalPose.y, 2)
  expect(restoredPose.rotation).toBeCloseTo(normalPose.rotation, 2)

  await restored.click()
  const restoredAttachment = page.locator('.guide-attachment-panel')
  await expect(restoredAttachment).toContainText('Закреплено')
  await expect(restoredAttachment.getByLabel('Ориентация')).toHaveValue('normal')

  const jsonDownload = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Сохранить JSON' }).click()
  const jsonPath = await (await jsonDownload).path()
  expect(jsonPath).not.toBeNull()
  const project = JSON.parse(await readFile(jsonPath!, 'utf8'))
  expect(project.schemaVersion).toBe(16)
  expect(project.guides).toHaveLength(1)
  expect(project.guides[0].type).toBe('line')
  expect(project.elements[0].guideAttachment.guideId).toBe(project.guides[0].id)
  expect(project.elements[0].guideAttachment.orientation).toBe('normal')

  await restoredAttachment.getByRole('button', { name: 'Отвязать', exact: true }).click()
  await expect(restored).not.toHaveAttribute('data-guide-attached', 'true')
  await expect(restoredAttachment).not.toContainText('Закреплено')
})
