from pathlib import Path

path = Path('e2e/gaugeRuler.e2e.ts')
text = path.read_text()
old = """  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()\n  await expect(page.locator('.stitch-element')).toHaveCount(24)\n"""
new = """  await page.locator('.guide-list button').filter({ hasText: 'Радиальная' }).click()\n  await page.getByRole('button', { name: 'Создать связанный ряд' }).click()\n  await expect(page.locator('.stitch-element')).toHaveCount(24)\n"""
if old not in text:
    raise SystemExit('row-height E2E snippet not found')
path.write_text(text.replace(old, new, 1))
print('Row-height E2E guide reselection fix applied')
