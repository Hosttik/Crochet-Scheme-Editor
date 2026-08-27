from pathlib import Path


def replace_once(path: str, old: str, new: str):
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, got {count}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1))


# All exported projects are normalized to the current v20 schema.
for file in Path('e2e').rglob('*.ts'):
    text = file.read_text().replace('schemaVersion).toBe(19)', 'schemaVersion).toBe(20)')
    file.write_text(text)

# Existing productivity coverage now uses the visual directional/custom-axis mirror controls.
replace_once(
    'e2e/productivity.e2e.ts',
    "await productivity.getByRole('button', { name: '↔ Слева / справа', exact: true }).click()",
    "await productivity.getByRole('button', { name: 'Вертикальная', exact: true }).click()\n  await productivity.getByRole('button', { name: 'Отразить по своей оси', exact: true }).click()",
)
replace_once(
    'e2e/productivity.e2e.ts',
    "await productivity.getByRole('button', { name: '⧉↔ Копия справа', exact: true }).click()",
    "await productivity.getByRole('button', { name: 'Копия через ось вправо', exact: true }).click()",
)

# Update the dedicated custom-axis test to the persistent arbitrary-axis model.
path = Path('e2e/mirrorAxis.e2e.ts')
text = path.read_text()
text = text.replace("{ name: 'Вертикальная ось', exact: true }", "{ name: 'Вертикальная', exact: true }")
text = text.replace("page.locator('.mirror-axis-overlay[data-mirror-axis=\"vertical\"]')", "page.locator('.mirror-axis-overlay[data-mirror-angle=\"90\"]')")
text = text.replace("getByLabel('Позиция оси X')", "getByLabel('Ось X')")
text = text.replace("{ name: 'Отразить по оси', exact: true }", "{ name: 'Отразить по своей оси', exact: true }")
text = text.replace("{ name: 'Горизонтальная ось', exact: true }", "{ name: 'Горизонтальная', exact: true }")
text = text.replace("page.locator('.mirror-axis-overlay[data-mirror-axis=\"horizontal\"]')", "page.locator('.mirror-axis-overlay[data-mirror-angle=\"0\"]')")
text = text.replace("getByLabel('Позиция оси Y')", "getByLabel('Ось Y')")
text = text.replace("{ name: 'Копия через ось', exact: true }", "{ name: 'Создать копию по своей оси', exact: true }")
path.write_text(text)

# New guide tests address controls through the same robust containers as the established guide suite.
path = Path('e2e/guide-mirror-geometry.e2e.ts')
text = path.read_text()
text = text.replace(
    "await page.getByRole('button', { name: 'Линия', exact: true }).click()",
    "await page.locator('.guide-add-grid button').filter({ hasText: 'Линия' }).click()",
    1,
)
text = text.replace(
    "await page.getByRole('button', { name: 'Парабола', exact: true }).click()",
    "await page.locator('.guide-add-grid button').filter({ hasText: 'Парабола' }).click()",
    1,
)
old_fit = """  await placeAt(page, 'Столбик без накида', 0.78, 0.70)
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Линия', exact: true }).first().click()
  await page.getByRole('button', { name: 'По размеру проекта' }).click()
  const fittedLength = Number(await page.getByLabel('Длина').inputValue())
  expect(fittedLength).toBeGreaterThan(420)
"""
new_fit = """  await placeAt(page, 'Столбик без накида', 0.12, 0.70)
  await placeAt(page, 'Столбик с накидом', 0.88, 0.70)
  await page.keyboard.press('Escape')
  await page.locator('.guide-list button').filter({ hasText: 'Линия' }).click()
  await page.getByRole('button', { name: 'По размеру проекта' }).click()
  const fittedLength = Number(await page.getByLabel('Длина').inputValue())
  expect(fittedLength).toBeGreaterThan(420)
"""
if old_fit not in text:
    raise SystemExit('guide fit E2E block not found')
text = text.replace(old_fit, new_fit, 1)
path.write_text(text)
