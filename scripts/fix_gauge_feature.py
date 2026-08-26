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

print('Gauge compile fixes applied')
