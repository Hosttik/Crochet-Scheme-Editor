from pathlib import Path

app = Path('src/App.tsx')
text = app.read_text()
block = """    if (rulerDrag?.pointerId === event.pointerId) {
      if (cancelled) setRulers(rulerDrag.startSnapshot.rulers)
      else if (interactionMovedRef.current) {
        recordSnapshot(rulerDrag.startSnapshot)
        setStatus(locale === 'ru' ? 'Линейка изменена' : 'Ruler changed')
      }
      setRulerDrag(null)
      interactionMovedRef.current = false
      return
    }

"""
first = text.find(block)
if first < 0:
    raise SystemExit('misplaced ruler drag block not found')
text = text[:first] + text[first + len(block):]
finish = text.find('  const finishPointerInteraction =')
if finish < 0:
    raise SystemExit('finishPointerInteraction not found')
lasso = text.find('    if (lasso?.pointerId === event.pointerId) {', finish)
if lasso < 0:
    raise SystemExit('finish lasso block not found')
text = text[:lasso] + block + text[lasso:]
app.write_text(text)

schema = Path('src/editor/projectSchema.ts')
schema_text = schema.read_text()
schema_text = schema_text.replace('    stitchCount: value.stitchCount,', '    stitchCount: value.stitchCount as number,', 1)
schema_text = schema_text.replace('    rowCount: value.rowCount,', '    rowCount: value.rowCount as number,', 1)
schema.write_text(schema_text)

version = Path('src/editor/projectVersion.ts')
version_text = version.read_text().replace(
    'export const STRICT_PROJECT_SCHEMA_VERSION = 19',
    'export const STRICT_PROJECT_SCHEMA_VERSION = 18',
)
version.write_text(version_text)

for root in (Path('src'), Path('e2e')):
    for test_file in root.rglob('*.ts'):
        test_text = test_file.read_text()
        updated = test_text.replace('schemaVersion).toBe(18)', 'schemaVersion).toBe(19)')
        if updated != test_text:
            test_file.write_text(updated)

print('Gauge compile and schema migration fixes applied')
