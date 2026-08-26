from pathlib import Path

path = Path('e2e/gaugeRuler.e2e.ts')
text = path.read_text()

old = """  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()\n  await expect(page.locator('.stitch-element')).toHaveCount(24)\n"""
new = """  await page.locator('.guide-list button').filter({ hasText: 'Радиальная' }).click()\n  await page.locator('.guide-row-generator').getByLabel('Смещение от направляющей').fill('40')\n  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()\n  await expect(page.locator('.stitch-element')).toHaveCount(24)\n"""
if old not in text:
    raise SystemExit('row-height E2E guide reselection snippet not found')
text = text.replace(old, new, 1)

old = """  await expect(gauge).toContainText('Автоматически по ряду: 12 петель')\n\n  await page.locator('.guide-list button').filter({ hasText: 'Радиальная' }).click()\n"""
new = """  await expect(gauge).toContainText('Автоматически по ряду: 12 петель')\n  await gauge.getByRole('button', { name: 'Удалить линейку' }).click()\n  await expect(page.locator('.measurement-ruler')).toHaveCount(0)\n\n  await page.locator('.guide-list button').filter({ hasText: 'Радиальная' }).click()\n"""
if old not in text:
    raise SystemExit('horizontal ruler cleanup insertion point not found')
text = text.replace(old, new, 1)

old = """  await expect(page.locator('.measurement-ruler')).toHaveCount(2)\n  const rowRuler = page.locator('.measurement-ruler').nth(1)\n"""
new = """  await expect(page.locator('.measurement-ruler')).toHaveCount(1)\n  const rowRuler = page.locator('.measurement-ruler').first()\n"""
if old not in text:
    raise SystemExit('row ruler count snippet not found')
text = text.replace(old, new, 1)

old = """  expect(project.rulers).toHaveLength(2)\n  expect(project.rulers[0].startElementId).toBeTruthy()\n  expect(project.rulers[0].endElementId).toBeTruthy()\n  expect(project.rulers[1]).toMatchObject({ mode: 'rows' })\n  expect(project.rulers[1].startElementId).toBeTruthy()\n  expect(project.rulers[1].endElementId).toBeTruthy()\n"""
new = """  expect(project.rulers).toHaveLength(1)\n  expect(project.rulers[0]).toMatchObject({ mode: 'rows' })\n  expect(project.rulers[0].startElementId).toBeTruthy()\n  expect(project.rulers[0].endElementId).toBeTruthy()\n"""
if old not in text:
    raise SystemExit('JSON ruler expectations not found')
text = text.replace(old, new, 1)

old = """  await expect(page.locator('.measurement-ruler')).toHaveCount(2)\n  await expect(page.locator('.measurement-ruler').first().locator('.ruler-label')).toContainText('≈ 6 см')\n  await expect(page.locator('.measurement-ruler').nth(1).locator('.ruler-label')).toContainText('2 р.')\n"""
new = """  await expect(page.locator('.measurement-ruler')).toHaveCount(1)\n  await expect(page.locator('.measurement-ruler .ruler-label')).toContainText('2 р.')\n"""
if old not in text:
    raise SystemExit('reload ruler expectations not found')
text = text.replace(old, new, 1)

path.write_text(text)
print('Row-height E2E now uses a distinct radial row and overlay-safe ruler flow')
