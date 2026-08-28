import type { Page } from '@playwright/test'

export type GuideMenuLabel =
  | 'Линия'
  | 'Дуга'
  | 'Кривая'
  | 'Парабола'
  | 'Прямоугольная сетка'
  | 'Радиальная сетка'

export async function createGuideFromToolRail(page: Page, label: GuideMenuLabel) {
  const rail = page.getByRole('navigation', { name: 'Инструменты' })
  const trigger = rail.getByRole('button', { name: 'Направляющие', exact: true })
  await trigger.click()
  await page
    .getByRole('menu', { name: 'Направляющие', exact: true })
    .getByRole('menuitem', { name: label, exact: true })
    .click()
}
