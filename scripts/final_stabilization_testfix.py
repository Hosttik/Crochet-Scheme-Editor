from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

for relative in [
    'src/editor/backgroundSchema.test.ts',
    'src/editor/document.test.ts',
    'src/editor/rowBoundarySchema.test.ts',
]:
    path = ROOT / relative
    text = path.read_text()
    if '.toBe(17)' not in text:
        raise RuntimeError(f'{relative}: expected schema v17 assertions')
    text = text.replace('.toBe(17)', '.toBe(18)')
    text = text.replace('to schema v17', 'to schema v18')
    text = text.replace('migrating to v17', 'migrating to v18')
    path.write_text(text)

print('schema v18 test expectations updated')
