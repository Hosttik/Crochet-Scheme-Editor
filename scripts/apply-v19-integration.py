from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected exactly 1 match, found {count}')
    return text.replace(old, new, 1)

app_path = Path('src/App.tsx')
app = app_path.read_text()

app = replace_once(
    app,
    "import { ProductivityPanel } from './editor/ProductivityPanel'\nimport { LayersPanel } from './editor/LayersPanel'\n",
    "import { ProductivityPanel } from './editor/ProductivityPanel'\nimport { SelectionQuickToolbar } from './editor/SelectionQuickToolbar'\nimport { LayersPanel } from './editor/LayersPanel'\n",
    'toolbar import',
)

app = replace_once(
    app,
    """    if (\n      tool.type !== 'select' ||\n      event.button !== 0 ||\n      spacePressedRef.current ||\n      isElementLocked(element)\n    ) return\n    event.stopPropagation()\n\n    if (element.parametricRow) {\n""",
    """    if (\n      event.button !== 0 ||\n      spacePressedRef.current ||\n      isElementLocked(element)\n    ) return\n    event.stopPropagation()\n\n    if (tool.type === 'place') {\n      setTool({ type: 'select' })\n      setPreview(null)\n      setSnapTarget(null)\n    }\n\n    if (element.parametricRow) {\n""",
    'smart place/select',
)

app = replace_once(
    app,
    "className={`editor-canvas ${pan ? 'panning' : ''}`}",
    "className={`editor-canvas ${pan ? 'panning' : ''} ${tool.type === 'place' ? 'placing' : 'selecting'}`}",
    'canvas mode class',
)

app = replace_once(
    app,
    """          <span className=\"canvas-hint\">{t.zoomHint}</span>\n        </div>\n\n        <svg\n""",
    """          <span className=\"canvas-hint\">{t.zoomHint}</span>\n        </div>\n\n        <SelectionQuickToolbar\n          locale={locale}\n          elements={elements}\n          selectedIds={productivitySelectionIds()}\n          viewport={viewport}\n          canGroup={productivitySelectionIds().length > 1}\n          canUngroup={productivitySelectionIds().some((id) => Boolean(elements.find((element) => element.id === id)?.groupId))}\n          onDuplicate={duplicateSelection}\n          onGroup={groupSelection}\n          onUngroup={ungroupSelection}\n          onMirror={mirrorSelection}\n          onRotate={rotateSelected}\n          onDelete={deleteSelected}\n        />\n\n        <svg\n""",
    'selection toolbar render',
)

old_productivity = """        <ProductivityPanel\n          locale={locale}\n          guides={guides}\n          selectedCount={productivitySelectionIds().length}\n          canTransform={productivitySelectionIds().length > 0}\n          canGroup={productivitySelectionIds().length > 1}\n          canUngroup={productivitySelectionIds().some((id) => Boolean(elements.find((element) => element.id === id)?.groupId))}\n          onGroup={groupSelection}\n          onUngroup={ungroupSelection}\n          onMirror={mirrorSelection}\n          onRepeat={repeatProductivitySelection}\n        />\n"""
new_productivity = """        {productivitySelectionIds().length > 0 && (\n          <ProductivityPanel\n            locale={locale}\n            guides={guides}\n            elements={elements}\n            selectedIds={productivitySelectionIds()}\n            selectedCount={productivitySelectionIds().length}\n            canTransform\n            canGroup={productivitySelectionIds().length > 1}\n            canUngroup={productivitySelectionIds().some((id) => Boolean(elements.find((element) => element.id === id)?.groupId))}\n            onGroup={groupSelection}\n            onUngroup={ungroupSelection}\n            onMirror={mirrorSelection}\n            onRepeat={repeatProductivitySelection}\n          />\n        )}\n"""
app = replace_once(app, old_productivity, new_productivity, 'contextual productivity panel')
app_path.write_text(app)

styles_path = Path('src/styles.css')
styles = styles_path.read_text()
styles = replace_once(
    styles,
    ".editor-canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: crosshair; user-select: none; }\n.editor-canvas.panning { cursor: grabbing; }\n",
    ".editor-canvas { position: absolute; inset: 0; width: 100%; height: 100%; touch-action: none; cursor: default; user-select: none; }\n.editor-canvas.placing { cursor: crosshair; }\n.editor-canvas.selecting { cursor: default; }\n.editor-canvas.panning { cursor: grabbing; }\n",
    'canvas cursor styles',
)
styles = replace_once(
    styles,
    ".stitch-element { cursor: pointer; color: #202622; }\n",
    ".stitch-element { cursor: grab; color: #202622; }\n.editor-canvas.placing .stitch-element { cursor: pointer; }\n.stitch-element:active { cursor: grabbing; }\n",
    'stitch cursor styles',
)
styles_path.write_text(styles)
