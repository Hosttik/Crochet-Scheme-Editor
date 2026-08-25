import { expect, test, type Page } from '@playwright/test'

function patternRow(page: Page, number: number) {
  return page.locator('.pattern-row-number').filter({ hasText: new RegExp(`^Ряд ${number}$`) })
}

test('places a stitch, restores autosave and manages local projects', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')

  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Вместить всю схему' })).toBeDisabled()

  await page.getByTitle('Столбик без накида').click()
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)

  await expect(page.locator('.statusbar span').last()).toContainText('1 элементов')
  await expect(page.getByRole('button', { name: 'Вместить всю схему' })).toBeEnabled()
  await page.getByRole('button', { name: 'Вместить всю схему' }).click()

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')

  await page.reload()
  await expect(page.locator('.statusbar span').last()).toContainText('1 элементов')

  await page.getByRole('button', { name: 'Свернуть левую панель' }).click()
  await expect(page.locator('.app-shell')).toHaveClass(/left-collapsed/)
  await page.getByRole('button', { name: 'Свернуть левую панель' }).click()
  await expect(page.locator('.app-shell')).not.toHaveClass(/left-collapsed/)

  await page.getByRole('button', { name: 'Новая', exact: true }).click()
  await expect(page.locator('.statusbar span').last()).toContainText('0 элементов')
  await expect(page.locator('.project-select option')).toHaveCount(2)
})

test('edits explicit parent-child topology and restores it with undo', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')

  await page.getByRole('button', { name: /Радиальная/ }).click()
  await expect(page.getByText('Создать параметрический ряд', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()

  await expect(patternRow(page, 1)).toBeVisible()
  await page.getByRole('button', { name: '+6 прибавок' }).click()

  await expect(patternRow(page, 2)).toBeVisible()
  await expect(page.locator('.stitch-topology-link')).toHaveCount(18)
  await expect(page.locator('.topology-mode-badge')).toHaveText('Равномерно')
  await expect(page.locator('.topology-change-button')).toHaveCount(6)
  await expect(page.locator('.topology-change-button').first()).toContainText('+ 2')
  await expect(page.locator('.row-shaping-marker.editable')).toHaveCount(6)

  await page.locator('.row-shaping-marker.editable').first().click()
  await expect(page.locator('.topology-change-button.active')).toHaveCount(1)
  await page.getByTitle('Сдвинуть вправо').click()

  await expect(page.locator('.topology-mode-badge')).toHaveText('Вручную')
  await expect(page.locator('.topology-change-button').first()).toContainText('+ 3')
  await expect(page.locator('.stitch-topology-link')).toHaveCount(18)
  await expect(page.getByText(/прибавки в петли 3, 4, 6, 8, 10, 12/)).toBeVisible()

  await page.getByRole('button', { name: 'Отменить' }).click()
  await patternRow(page, 2).click()
  await expect(page.locator('.topology-mode-badge')).toHaveText('Равномерно')
  await expect(page.locator('.topology-change-button').first()).toContainText('+ 2')
  await expect(page.locator('.stitch-topology-link')).toHaveCount(18)
})

test('edits a mixed stitch rapport and restores it from autosave', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')

  await page.getByRole('button', { name: /Радиальная/ }).click()
  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()
  await expect(patternRow(page, 1)).toBeVisible()
  await page.getByRole('button', { name: 'Дополнительно' }).click()

  await page.getByRole('button', { name: 'Раппорт', exact: true }).click()
  await expect(page.locator('.row-sequence-item')).toHaveCount(2)
  await expect(page.getByText('Смешанный раппорт', { exact: true })).toBeVisible()
  await expect(page.getByText(/\(3 СБН, 1 ВП\) × 3 = 12/)).toBeVisible()

  await page.locator('.row-sequence-item select').nth(1).selectOption('double')
  await expect(page.getByText(/\(3 СБН, 1 ССН\) × 3 = 12/)).toBeVisible()

  await page.locator('.row-sequence-item input').first().fill('2')
  await expect(page.getByText(/\(2 СБН, 1 ССН\) × 4 = 12/)).toBeVisible()

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()

  await expect(page.getByText('Смешанный раппорт', { exact: true })).toBeVisible()
  await expect(page.getByText(/\(2 СБН, 1 ССН\) × 4 = 12/)).toBeVisible()
})

test('compiles a semantic rapport into stitch types and exact topology', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')

  await page.getByRole('button', { name: /Радиальная/ }).click()
  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()
  await expect(patternRow(page, 1)).toBeVisible()

  const rowEditor = page.locator('.parametric-row-editor')
  const firstRowAdvanced = rowEditor.getByRole('button', { name: 'Дополнительно' })
  await expect(firstRowAdvanced).toHaveAttribute('aria-expanded', 'false')
  await firstRowAdvanced.click()
  await expect(firstRowAdvanced).toHaveAttribute('aria-expanded', 'true')

  await page.getByRole('button', { name: 'Без изменений' }).click()
  await expect(patternRow(page, 2)).toBeVisible()

  const advanced = rowEditor.getByRole('button', { name: 'Дополнительно' })
  await expect(advanced).toHaveAttribute('aria-expanded', 'false')
  await advanced.click()
  await expect(advanced).toHaveAttribute('aria-expanded', 'true')
  await rowEditor.getByRole('button', { name: 'Семантический', exact: true }).click()
  await expect(page.getByText('Семантический раппорт', { exact: true })).toBeVisible()
  await expect(page.locator('.rich-rapport-leaf')).toHaveCount(1)

  await page.locator('.rich-rapport-leaf').first().locator('input').fill('11')
  await page.getByRole('button', { name: '+ Шаг', exact: true }).click()
  await expect(page.locator('.rich-rapport-leaf')).toHaveCount(2)
  await page.locator('.rich-rapport-leaf').nth(1).locator('select').first().selectOption('increase')

  await expect(page.locator('.rich-program-metrics')).toContainText('12 / 12')
  await expect(page.locator('.rich-program-metrics')).toContainText('13')
  await expect(page.getByText(/Ряд 2: 11 СБН, прибавка \(СБН\) = 13/)).toBeVisible()
  await expect(page.locator('.stitch-topology-link')).toHaveCount(13)

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()

  await expect(page.getByText('Семантический раппорт', { exact: true })).toBeVisible()
  await expect(page.getByText(/Ряд 2: 11 СБН, прибавка \(СБН\) = 13/)).toBeVisible()
  await patternRow(page, 2).click()
  await expect(page.locator('.stitch-topology-link')).toHaveCount(13)
})

test('persists joined and turning row construction semantics', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')

  await page.getByRole('button', { name: /Радиальная/ }).click()
  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()
  await expect(patternRow(page, 1)).toBeVisible()
  await page.getByRole('button', { name: 'Дополнительно' }).click()

  await page.getByRole('button', { name: 'Замкнутый', exact: true }).click()
  await expect(page.locator('.row-construction-status strong')).toHaveText('↻')
  await page.getByLabel('ВП подъёма').fill('2')
  await expect(page.getByLabel('Замыкать соединительным столбиком')).toBeChecked()
  await expect(page.locator('.row-construction-marker')).toHaveCount(2)
  await expect(page.locator('.row-construction-path')).toHaveCount(1)
  await expect(page.getByText(/2 ВП подъёма \(вне счёта ряда\); 12 СБН = 12; замкнутый круг ↻; замкнуть СС/)).toBeVisible()

  await page.locator('.pattern-row-next-actions').getByRole('button', { name: 'Без изменений' }).click()
  await expect(patternRow(page, 2)).toBeVisible()
  await expect(page.getByText(/замкнутый круг ↻; замкнуть СС/).last()).toBeVisible()

  await page.getByRole('button', { name: 'Поворотный', exact: true }).click()
  await expect(page.locator('.row-construction-status strong')).toHaveText('→')
  await page.locator('.pattern-row-next-actions').getByRole('button', { name: 'Без изменений' }).click()

  await expect(patternRow(page, 3)).toBeVisible()
  await expect(page.locator('.row-construction-status strong')).toHaveText('←')
  await expect(page.getByText(/поворотный ряд ←; повернуть работу/).last()).toBeVisible()
  await expect(page.locator('.row-construction-marker')).toHaveCount(2)

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()

  await patternRow(page, 3).click()
  await expect(page.locator('.row-construction-status strong')).toHaveText('←')
  await expect(page.getByText(/поворотный ряд ←; повернуть работу/).last()).toBeVisible()
})
