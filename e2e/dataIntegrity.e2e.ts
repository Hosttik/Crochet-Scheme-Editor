import { expect, test, type Page } from '@playwright/test'

async function placeSingleCrochet(page: Page) {
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  if (!box) throw new Error('Canvas is not visible')
  await page.locator('.symbols-section .symbol-button[title^="Столбик без накида ·"]').click()
  await page.mouse.click(box.x + box.width * 0.5, box.y + box.height * 0.5)
}

test('flushes pending edits before switching local projects', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await page.getByLabel('Автосохранение').selectOption('60000')
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  const projectSelect = page.locator('.project-select')
  const originalId = await projectSelect.inputValue()

  await placeSingleCrochet(page)
  await page.getByRole('button', { name: 'Новая', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(0)

  await projectSelect.selectOption(originalId)
  await expect(page.locator('.stitch-element')).toHaveCount(1)
})

test('does not resurrect a deleted project while autosave is pending', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await page.getByRole('button', { name: 'Новая', exact: true }).click()
  await expect(page.locator('.project-select option')).toHaveCount(2)
  await page.getByLabel('Автосохранение').selectOption('60000')
  await placeSingleCrochet(page)

  page.once('dialog', (dialog) => dialog.accept())
  await page.locator('.project-manager-panel').getByRole('button', { name: 'Удалить', exact: true }).click()
  await expect(page.locator('.project-select option')).toHaveCount(1)
  await page.waitForTimeout(1000)
  await page.reload()
  await expect(page.locator('.project-select option')).toHaveCount(1)
})

test('loading JSON starts a clean document history', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await placeSingleCrochet(page)
  const project = {
    schemaVersion: 17,
    metadata: { title: 'Imported', updatedAt: '2026-08-26T00:00:00Z' },
    elements: [], guides: [], rowMarkers: [],
    settings: { snapping: { enabled: false, sourceAnchor: 'center', orientationMode: 'none', snapToVertices: false, tolerancePx: 12 }, legend: { visible: false }, autosave: { delayMs: 650 } },
  }
  await page.locator('input[type=file][accept*="json"]').setInputFiles({ name: 'import.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(project)) })
  await expect(page.locator('.stitch-element')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Отменить' })).toBeDisabled()
})


test('preserves an invalid stored project when hydration validation fails', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('crochet-scheme-editor', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const invalid = {
      schemaVersion: 17,
      metadata: { title: 'Recovery target', updatedAt: '2026-08-26T00:00:00Z' },
      elements: [{ id: 'keep-me', symbolId: 'unknown-legacy-symbol', x: 10, y: 20, rotation: 0 }],
      guides: [], rowMarkers: [],
      settings: { snapping: { enabled: true, sourceAnchor: 'bottom', orientationMode: 'none', snapToVertices: true, tolerancePx: 12 } },
    }
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(['projects', 'project-summaries'], 'readwrite')
      transaction.objectStore('projects').put(invalid, 'default-project')
      transaction.objectStore('project-summaries').put({ id: 'default-project', title: 'Recovery target', updatedAt: invalid.metadata.updatedAt }, 'default-project')
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    database.close()
    localStorage.setItem('crochet-scheme-editor-active-project', 'default-project')
  })

  await page.reload()
  await expect(page.locator('.autosave-indicator')).toContainText(/ошиб|error/i)
  await page.waitForTimeout(1200)

  const storedSymbol = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('crochet-scheme-editor', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const project = await new Promise<any>((resolve, reject) => {
      const request = database.transaction('projects', 'readonly').objectStore('projects').get('default-project')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    database.close()
    return project?.elements?.[0]?.symbolId
  })
  expect(storedSymbol).toBe('unknown-legacy-symbol')
})
