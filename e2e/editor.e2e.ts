import { expect, test, type Page } from '@playwright/test'
import { createGuideFromToolRail } from './helpers/uiV2Guides'
import {
  createLinkedRowFromSelectedGuide,
  openGlobalPanel,
  openRightWorkspaceMode,
} from './helpers/rightWorkspace'

function patternRow(page: Page, number: number) {
  return page.locator('.pattern-row-number').filter({ hasText: new RegExp(`^Ряд ${number}$`) })
}

async function openPatternRows(page: Page) {
  await openGlobalPanel(page, 'pattern-rows-global-panel')
}

async function createFirstPatternRow(page: Page) {
  await createGuideFromToolRail(page, 'Радиальная сетка')
  await createLinkedRowFromSelectedGuide(page)
}

test('places a stitch, restores autosave and manages local projects', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')

  await expect(page.getByTestId('editor-topbar')).toBeVisible()

  await page.getByRole('button', { name: 'Столбик без накида · sc', exact: true }).click()
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)

  const statusbar = page.getByTestId('canvas-statusbar')
  await expect(statusbar).toContainText('1 элементов')
  await expect(statusbar).toContainText('Выбрано: 1')

  // Fit is a keyboard/application command now rather than duplicate floating
  // chrome in the canvas. Exit construction mode and verify the viewport moves.
  await page.keyboard.press('Escape')
  const viewportGroup = canvas.locator(':scope > g[transform*="scale("]').first()
  const beforeFit = await viewportGroup.getAttribute('transform')
  await page.keyboard.press('f')
  await expect.poll(async () => viewportGroup.getAttribute('transform')).not.toBe(beforeFit)

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')

  await page.reload()
  await expect(page.getByTestId('canvas-statusbar')).toContainText('1 элементов')

  await page.getByRole('button', { name: 'Свернуть левую панель' }).click()
  await expect(page.locator('.app-shell')).toHaveClass(/left-collapsed/)
  await page.getByRole('button', { name: 'Развернуть левую панель' }).click()
  await expect(page.locator('.app-shell')).not.toHaveClass(/left-collapsed/)

  await page.getByRole('button', { name: 'Новая', exact: true }).click()
  await expect(page.getByTestId('canvas-statusbar')).toContainText('0 элементов')
  await expect(page.locator('.project-select option')).toHaveCount(2)
})

test('edits explicit parent-child topology and restores it with undo', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await createFirstPatternRow(page)

  await openPatternRows(page)
  await expect(patternRow(page, 1)).toBeVisible()
  await patternRow(page, 1).click()
  await page.getByRole('button', { name: '+6 прибавок' }).click()

  await expect(patternRow(page, 2)).toBeVisible()
  await expect(page.locator('.stitch-topology-link')).toHaveCount(18)
  await openRightWorkspaceMode(page, 'properties')
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
  await openPatternRows(page)
  await expect(page.getByText(/прибавки в петли 3, 4, 6, 8, 10, 12/)).toBeVisible()

  await page.getByRole('button', { name: 'Отменить' }).click()
  await openPatternRows(page)
  await patternRow(page, 2).click()
  await openRightWorkspaceMode(page, 'properties')
  await expect(page.locator('.topology-mode-badge')).toHaveText('Равномерно')
  await expect(page.locator('.topology-change-button').first()).toContainText('+ 2')
  await expect(page.locator('.stitch-topology-link')).toHaveCount(18)
})

test('edits a mixed stitch rapport and restores it from autosave', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await createFirstPatternRow(page)

  await openPatternRows(page)
  await expect(patternRow(page, 1)).toBeVisible()
  await patternRow(page, 1).click()
  await openRightWorkspaceMode(page, 'properties')

  const rowEditor = page.locator('.parametric-row-editor')
  await rowEditor.getByRole('button', { name: 'Дополнительно' }).click()
  await rowEditor.getByRole('button', { name: 'Раппорт', exact: true }).click()
  await expect(rowEditor.locator('.row-sequence-item')).toHaveCount(2)
  await expect(rowEditor.locator('.row-sequence-summary')).toContainText('Длина раппорта: 4')
  await expect(rowEditor.locator('.row-sequence-summary')).toContainText('3 полных повторов')

  await rowEditor.locator('.row-sequence-item select').nth(1).selectOption('double')
  await expect(rowEditor.locator('.row-sequence-item select').nth(1)).toHaveValue('double')

  await rowEditor.locator('.row-sequence-item input').first().fill('2')
  await expect(rowEditor.locator('.row-sequence-summary')).toContainText('Длина раппорта: 3')
  await expect(rowEditor.locator('.row-sequence-summary')).toContainText('4 полных повторов')

  await openPatternRows(page)
  await expect(page.getByText('Смешанный раппорт', { exact: true })).toBeVisible()
  await expect(page.getByText(/\(2 СБН, 1 ССН\) × 4 = 12/)).toBeVisible()

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()
  await openPatternRows(page)

  await expect(page.getByText('Смешанный раппорт', { exact: true })).toBeVisible()
  await expect(page.getByText(/\(2 СБН, 1 ССН\) × 4 = 12/)).toBeVisible()
})

test('compiles a semantic rapport into stitch types and exact topology', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await createFirstPatternRow(page)

  await openPatternRows(page)
  await expect(patternRow(page, 1)).toBeVisible()
  await patternRow(page, 1).click()
  await openRightWorkspaceMode(page, 'properties')

  let rowEditor = page.locator('.parametric-row-editor')
  const firstRowAdvanced = rowEditor.getByRole('button', { name: 'Дополнительно' })
  await expect(firstRowAdvanced).toHaveAttribute('aria-expanded', 'false')
  await firstRowAdvanced.click()
  await expect(firstRowAdvanced).toHaveAttribute('aria-expanded', 'true')

  await openPatternRows(page)
  await patternRow(page, 1).click()
  await page.locator('.pattern-row-next-actions').getByRole('button', { name: 'Без изменений' }).click()
  await expect(patternRow(page, 2)).toBeVisible()
  await patternRow(page, 2).click()
  await openRightWorkspaceMode(page, 'properties')

  rowEditor = page.locator('.parametric-row-editor')
  const advanced = rowEditor.getByRole('button', { name: 'Дополнительно' })
  await expect(advanced).toHaveAttribute('aria-expanded', 'false')
  await advanced.click()
  await expect(advanced).toHaveAttribute('aria-expanded', 'true')
  await rowEditor.getByRole('button', { name: 'Семантический', exact: true }).click()
  await expect(rowEditor.locator('.rich-rapport-editor')).toBeVisible()
  await expect(rowEditor.locator('.rich-rapport-leaf')).toHaveCount(1)

  await rowEditor.locator('.rich-rapport-leaf').first().locator('input').fill('11')
  await rowEditor.getByRole('button', { name: '+ Шаг', exact: true }).click()
  await expect(rowEditor.locator('.rich-rapport-leaf')).toHaveCount(2)
  await rowEditor.locator('.rich-rapport-leaf').nth(1).locator('select').first().selectOption('increase')

  await expect(rowEditor.locator('.rich-program-metrics')).toContainText('12 / 12')
  await expect(rowEditor.locator('.rich-program-metrics')).toContainText('13')
  await expect(page.locator('.stitch-topology-link')).toHaveCount(13)
  await openPatternRows(page)
  await expect(page.getByText(/Ряд 2: 11 СБН, прибавка \(СБН\) = 13/)).toBeVisible()

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()
  await openPatternRows(page)

  await expect(page.getByText('Семантический раппорт', { exact: true })).toBeVisible()
  await expect(page.getByText(/Ряд 2: 11 СБН, прибавка \(СБН\) = 13/)).toBeVisible()
  await patternRow(page, 2).click()
  await expect(page.locator('.stitch-topology-link')).toHaveCount(13)
})

test('reopens Advanced for a manually changed child row offset', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await createFirstPatternRow(page)

  await openPatternRows(page)
  await expect(patternRow(page, 1)).toBeVisible()
  await patternRow(page, 1).click()
  await page.locator('.pattern-row-next-actions').getByRole('button', { name: 'Без изменений' }).click()
  await expect(patternRow(page, 2)).toBeVisible()
  await patternRow(page, 2).click()
  await openRightWorkspaceMode(page, 'properties')

  const rowEditor = page.locator('.parametric-row-editor')
  const advanced = rowEditor.getByRole('button', { name: 'Дополнительно' })
  await expect(advanced).toHaveAttribute('aria-expanded', 'false')
  await advanced.click()

  const radialOffset = rowEditor.getByLabel('Смещение от направляющей')
  const automaticValue = Number(await radialOffset.inputValue())
  const manualValue = automaticValue + 7
  await radialOffset.fill(String(manualValue))
  await expect(radialOffset).toHaveValue(String(manualValue))

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()
  await openPatternRows(page)

  await patternRow(page, 2).click()
  await openRightWorkspaceMode(page, 'properties')
  const restoredEditor = page.locator('.parametric-row-editor')
  const restoredAdvanced = restoredEditor.getByRole('button', { name: 'Дополнительно' })
  await expect(restoredAdvanced).toHaveAttribute('aria-expanded', 'true')
  await expect(restoredEditor.getByLabel('Смещение от направляющей')).toHaveValue(String(manualValue))
})

test('persists joined and turning row construction semantics', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await createFirstPatternRow(page)

  const rowEditor = page.locator('.parametric-row-editor')
  await rowEditor.getByRole('button', { name: 'Дополнительно' }).click()
  await rowEditor.getByRole('button', { name: 'Замкнутый', exact: true }).click()
  await expect(page.locator('.row-construction-status strong')).toHaveText('↻')
  await rowEditor.getByLabel('ВП подъёма').fill('2')
  await expect(rowEditor.getByLabel('Замыкать соединительным столбиком')).toBeChecked()
  await expect(page.locator('.row-construction-marker')).toHaveCount(2)
  await expect(page.locator('.row-construction-path')).toHaveCount(1)

  await openPatternRows(page)
  await expect(page.getByText(/2 ВП подъёма \(вне счёта ряда\); 12 СБН = 12; замкнутый круг ↻; замкнуть СС в первую провязанную петлю/)).toBeVisible()
  await patternRow(page, 1).click()
  await page.locator('.pattern-row-next-actions').getByRole('button', { name: 'Без изменений' }).click()
  await expect(patternRow(page, 2)).toBeVisible()
  await expect(page.getByText(/замкнутый круг ↻; замкнуть СС в первую провязанную петлю/).last()).toBeVisible()

  await patternRow(page, 2).click()
  await openRightWorkspaceMode(page, 'properties')
  const secondRowEditor = page.locator('.parametric-row-editor')
  await secondRowEditor.getByRole('button', { name: 'Поворотный', exact: true }).click()
  await expect(page.locator('.row-construction-status strong')).toHaveText('→')

  await openPatternRows(page)
  await patternRow(page, 2).click()
  await page.locator('.pattern-row-next-actions').getByRole('button', { name: 'Без изменений' }).click()
  await expect(patternRow(page, 3)).toBeVisible()
  await expect(page.getByText(/поворотный ряд ←; повернуть работу/).last()).toBeVisible()
  await expect(page.locator('.row-construction-marker')).toHaveCount(2)

  await patternRow(page, 3).click()
  await openRightWorkspaceMode(page, 'properties')
  await expect(page.locator('.row-construction-status strong')).toHaveText('←')

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()
  await openPatternRows(page)

  await patternRow(page, 3).click()
  await expect(page.getByText(/поворотный ряд ←; повернуть работу/).last()).toBeVisible()
  await openRightWorkspaceMode(page, 'properties')
  await expect(page.locator('.row-construction-status strong')).toHaveText('←')
})
