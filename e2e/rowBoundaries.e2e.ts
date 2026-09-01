import { expect, test, type Page } from '@playwright/test'
import { createGuideFromToolRail } from './helpers/uiV2Guides'
import {
  createLinkedRowFromSelectedGuide,
  openGlobalPanel,
  openRightWorkspaceMode,
} from './helpers/rightWorkspace'

function patternRow(page: Page, number: number) {
  return page.locator('.pattern-row-card').filter({ hasText: `Ряд ${number}` })
}

async function openPatternRows(page: Page) {
  await openGlobalPanel(page, 'pattern-rows-global-panel')
}

test('persists counted starting chains, skipped stitches and exact joined closure', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')

  await createGuideFromToolRail(page, 'Радиальная сетка')
  await createLinkedRowFromSelectedGuide(page)

  const rowEditor = page.locator('.parametric-row-editor')
  await rowEditor.getByRole('button', { name: 'Дополнительно' }).click()
  await rowEditor.getByRole('button', { name: 'Замкнутый', exact: true }).click()
  await rowEditor.getByLabel('ВП подъёма').fill('3')
  await rowEditor.getByLabel('Считать ВП первой петлёй ряда').check()
  await rowEditor.getByLabel('Пропустить петель основания в начале').fill('1')
  await rowEditor.getByLabel('Куда замыкать ряд').selectOption('start-chain-top')

  await expect(page.getByText(
    /3 ВП подъёма \(считаются первой петлёй ряда\); пропустить 1 петлю основания; 12 СБН = 12; всего в счёте ряда: 13; замкнутый круг ↻; замкнуть СС в верхнюю ВП подъёма/,
  )).toBeVisible()
  await expect(page.locator('.row-construction-join-label')).toHaveText('SL→CH')
  await expect(page.locator('.row-construction-direction')).toContainText('CH×3*')
  await expect(page.locator('.row-construction-direction')).toContainText('SK×1')

  await page.waitForTimeout(900)
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
  await page.reload()
  await openPatternRows(page)

  await patternRow(page, 1).click()
  await openRightWorkspaceMode(page, 'properties')
  const restoredEditor = page.locator('.parametric-row-editor')
  await expect(restoredEditor.getByRole('button', { name: 'Дополнительно' })).toHaveAttribute('aria-expanded', 'true')
  await expect(restoredEditor.getByLabel('ВП подъёма')).toHaveValue('3')
  await expect(restoredEditor.getByLabel('Считать ВП первой петлёй ряда')).toBeChecked()
  await expect(restoredEditor.getByLabel('Пропустить петель основания в начале')).toHaveValue('1')
  await expect(restoredEditor.getByLabel('Куда замыкать ряд')).toHaveValue('start-chain-top')
  await expect(page.getByText(/всего в счёте ряда: 13/)).toBeVisible()
})
