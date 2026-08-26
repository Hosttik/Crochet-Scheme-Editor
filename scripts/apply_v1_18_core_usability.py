from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"Expected exactly one match in {path}, got {count}: {old[:100]!r}")
    file.write_text(text.replace(old, new, 1))


def append_before(path: str, marker: str, addition: str) -> None:
    replace_once(path, marker, addition + marker)


# App: explicit hand tool, visible snap orientation, lean single-selection controls, real legend panel.
replace_once(
    'src/App.tsx',
    "import { LegendOverlay } from './editor/LegendOverlay'\n",
    "import { LegendOverlay } from './editor/LegendOverlay'\nimport { LegendPanel } from './editor/LegendPanel'\n",
)
replace_once(
    'src/App.tsx',
    "type Tool = { type: 'select' } | { type: 'lasso' } | { type: 'ruler' } | { type: 'place'; symbolId: string } | { type: 'row-marker' }\n",
    "type Tool = { type: 'select' } | { type: 'pan' } | { type: 'lasso' } | { type: 'ruler' } | { type: 'place'; symbolId: string } | { type: 'row-marker' }\n",
)
replace_once(
    'src/App.tsx',
    "  orientationMode: 'none',\n",
    "  orientationMode: 'along',\n",
)
replace_once(
    'src/App.tsx',
    "        } else if (event.key.toLowerCase() === 'l') {\n          event.preventDefault()\n          setTool((current) => current.type === 'lasso' ? { type: 'select' } : { type: 'lasso' })\n          setLasso(null)\n          setPreview(null)\n          setSnapTarget(null)\n          setSelectedGuideId(null)\n          setSelectedRowMarkerId(null)\n        }\n",
    "        } else if (event.key.toLowerCase() === 'l') {\n          event.preventDefault()\n          setTool((current) => current.type === 'lasso' ? { type: 'select' } : { type: 'lasso' })\n          setLasso(null)\n          setPreview(null)\n          setSnapTarget(null)\n          setSelectedGuideId(null)\n          setSelectedRowMarkerId(null)\n        } else if (event.key.toLowerCase() === 'h') {\n          event.preventDefault()\n          setTool((current) => current.type === 'pan' ? { type: 'select' } : { type: 'pan' })\n          setLasso(null)\n          setPreview(null)\n          setSnapTarget(null)\n          setRulerDraft(null)\n        }\n",
)
replace_once(
    'src/App.tsx',
    "    if (event.button === 1 || spacePressedRef.current) {\n",
    "    if (event.button === 1 || spacePressedRef.current || tool.type === 'pan') {\n",
)
replace_once(
    'src/App.tsx',
    "          <button\n            className={`tool-button ${tool.type === 'lasso' ? 'active' : ''}`}\n",
    "          <button\n            className={`tool-button ${tool.type === 'pan' ? 'active' : ''}`}\n            aria-label={locale === 'ru' ? 'Ладонь / перемещение поля' : 'Hand / pan canvas'}\n            aria-pressed={tool.type === 'pan'}\n            onClick={() => {\n              setTool((current) => current.type === 'pan' ? { type: 'select' } : { type: 'pan' })\n              setLasso(null)\n              setPreview(null)\n              setSnapTarget(null)\n              setRulerDraft(null)\n            }}\n          >\n            <span>✋</span>{locale === 'ru' ? 'Ладонь' : 'Hand'}<kbd>H</kbd>\n          </button>\n          <button\n            className={`tool-button ${tool.type === 'lasso' ? 'active' : ''}`}\n",
)
replace_once(
    'src/App.tsx',
    "          <small className=\"muted-text\">{locale === 'ru' ? 'Лассо: Shift добавить · Alt вычесть · Линейка: две точки · Space + drag — ладонь' : 'Lasso: Shift add · Alt subtract · Ruler: two points · Space + drag — hand'}</small>\n",
    "          <small className=\"muted-text\">{locale === 'ru' ? 'H — постоянная ладонь · Space + drag — временная · средняя кнопка мыши тоже двигает поле' : 'H — persistent hand · Space + drag — temporary · middle mouse also pans'}</small>\n",
)
replace_once(
    'src/App.tsx',
    "          <button\n            className={`fit-button ${tool.type === 'lasso' ? 'active' : ''}`}\n            aria-label={locale === 'ru' ? 'Лассо' : 'Lasso'}\n",
    "          <button\n            className={`fit-button ${tool.type === 'pan' ? 'active' : ''}`}\n            aria-label={locale === 'ru' ? 'Ладонь / перемещение поля' : 'Hand / pan canvas'}\n            aria-pressed={tool.type === 'pan'}\n            title=\"H\"\n            onClick={() => {\n              setTool((current) => current.type === 'pan' ? { type: 'select' } : { type: 'pan' })\n              setLasso(null)\n              setPreview(null)\n              setSnapTarget(null)\n              setRulerDraft(null)\n            }}\n          >✋</button>\n          <button\n            className={`fit-button ${tool.type === 'lasso' ? 'active' : ''}`}\n            aria-label={locale === 'ru' ? 'Лассо' : 'Lasso'}\n",
)
replace_once(
    'src/App.tsx',
    "          >{snapping.enabled ? (locale === 'ru' ? '🔗 Привязка' : '🔗 Snap') : (locale === 'ru' ? 'Свободно' : 'Free')}</button>\n          <span className=\"canvas-hint\">{t.zoomHint}</span>\n",
    "          >{snapping.enabled ? (locale === 'ru' ? '🔗 Привязка' : '🔗 Snap') : (locale === 'ru' ? 'Свободно' : 'Free')}</button>\n          <select\n            className=\"canvas-orientation-select\"\n            aria-label={locale === 'ru' ? 'Ориентация при привязке' : 'Snap orientation'}\n            title={locale === 'ru' ? 'Автоповорот при привязке к направляющей' : 'Auto-rotate when snapping to a guide'}\n            value={snapping.orientationMode}\n            disabled={!snapping.enabled}\n            onChange={(event) => commitSnapping({ ...snapping, orientationMode: event.target.value as OrientationMode })}\n          >\n            <option value=\"none\">{locale === 'ru' ? 'Не поворачивать' : 'Keep'}</option>\n            <option value=\"along\">{locale === 'ru' ? 'Вдоль' : 'Along'}</option>\n            <option value=\"perpendicular\">{locale === 'ru' ? 'Поперёк' : 'Perpendicular'}</option>\n          </select>\n          <span className=\"canvas-hint\">{t.zoomHint}</span>\n",
)
replace_once(
    'src/App.tsx',
    "          className={`editor-canvas ${pan ? 'panning' : ''} ${tool.type === 'place' ? 'placing' : tool.type === 'lasso' ? 'lassoing' : tool.type === 'ruler' ? 'measuring' : 'selecting'}`}\n",
    "          className={`editor-canvas ${pan ? 'panning' : ''} ${tool.type === 'pan' ? 'pan-tool' : tool.type === 'place' ? 'placing' : tool.type === 'lasso' ? 'lassoing' : tool.type === 'ruler' ? 'measuring' : 'selecting'}`}\n",
)
replace_once(
    'src/App.tsx',
    "            {legendVisible && <LegendOverlay elements={elements} locale={locale} zoom={viewport.zoom} />}\n",
    "            {legendVisible && <LegendOverlay elements={elements} locale={locale} viewport={viewport} />}\n",
)
replace_once(
    'src/App.tsx',
    "        <section className=\"panel-section\">\n          <div className=\"section-title-row\"><h2>{locale === 'ru' ? 'Легенда' : 'Legend'}</h2></div>\n          <label className=\"toggle-row\">\n            <span><strong>{locale === 'ru' ? 'Автоматическая легенда' : 'Automatic legend'}</strong><small>{locale === 'ru' ? 'Только реально используемые элементы; включается и в SVG.' : 'Only symbols actually used; also included in SVG.'}</small></span>\n            <input type=\"checkbox\" checked={legendVisible} onChange={(event) => commitLegendVisible(event.target.checked)} />\n          </label>\n        </section>\n",
    "        <LegendPanel\n          locale={locale}\n          elements={elements}\n          visible={legendVisible}\n          onVisibleChange={commitLegendVisible}\n        />\n",
)
replace_once(
    'src/App.tsx',
    "          ) : selectedElement ? (\n            <div className=\"selection-card\">\n              <div className=\"selection-preview\">\n                <svg viewBox=\"-30 -42 60 84\"><g className=\"symbol-glyph\" style={selectedElement.color ? { color: selectedElement.color } : undefined}><SymbolGlyph symbolId={selectedElement.symbolId} /></g></svg>\n              </div>\n              <div>\n                <strong>{symbolName(selectedElement.symbolId, SYMBOL_BY_ID.get(selectedElement.symbolId)?.name ?? selectedElement.symbolId, locale)}</strong>\n                <small>x {Math.round(selectedElement.x)} · y {Math.round(selectedElement.y)}</small>\n                <small>{Math.round(selectedElement.rotation)}°</small>\n              </div>\n              <div className=\"rotation-controls\">\n",
    "          ) : selectedElement ? (\n            <div className=\"selection-card compact-selection-card\">\n              <div className=\"rotation-controls\">\n",
)

# i18n discoverability copy. Version itself is bumped by npm version/sed in the workflow.
replace_once(
    'src/i18n.ts',
    "    zoomHint: '+/− масштаб · F всё · Shift+F выбор · Space + drag поле',\n",
    "    zoomHint: '+/− масштаб · F всё · Shift+F выбор · H ладонь',\n",
)
replace_once(
    'src/i18n.ts',
    "    zoomHint: '+/− zoom · F all · Shift+F selection · Space + drag pan',\n",
    "    zoomHint: '+/− zoom · F all · Shift+F selection · H hand',\n",
)

# Hand tool pointer routing and compact toolbar controls.
replace_once(
    'src/styles.css',
    ".editor-canvas.selecting { cursor: default; }\n.editor-canvas.space-pan { cursor: grab; }\n.editor-canvas.panning { cursor: grabbing; }\n",
    ".editor-canvas.selecting { cursor: default; }\n.editor-canvas.pan-tool,\n.editor-canvas.space-pan { cursor: grab; }\n.editor-canvas.panning { cursor: grabbing; }\n.editor-canvas.pan-tool .stitch-element,\n.editor-canvas.pan-tool .guide-layer,\n.editor-canvas.pan-tool .measurement-ruler,\n.editor-canvas.pan-tool .row-marker,\n.editor-canvas.pan-tool .mirror-axis-overlay { pointer-events: none; }\n",
)
replace_once(
    'src/styles.css',
    ".canvas-toolbar .snap-toggle.active { color: #245f47; border-color: #7fa994; background: #e9f3ed; font-weight: 700; }\n.canvas-hint { margin: 0 7px; color: #85867f; font-size: 10px; white-space: nowrap; }\n",
    ".canvas-toolbar .snap-toggle.active { color: #245f47; border-color: #7fa994; background: #e9f3ed; font-weight: 700; }\n.canvas-toolbar .canvas-orientation-select { width: auto; min-width: 88px; height: 28px; padding: 0 6px; border-radius: 7px; font-size: 10px; }\n.canvas-hint { margin: 0 7px; color: #85867f; font-size: 10px; white-space: nowrap; }\n",
)
replace_once(
    'src/styles.css',
    ".selection-card { display: grid; grid-template-columns: 54px 1fr; gap: 10px; align-items: center; }\n",
    ".selection-card { display: grid; grid-template-columns: 54px 1fr; gap: 10px; align-items: center; }\n.compact-selection-card { grid-template-columns: 1fr; }\n",
)

# Selection toolbar: reserve the real rotation-handle point and flip below near the top edge.
replace_once(
    'src/editor/SelectionQuickToolbar.tsx',
    "  const centerX = (bounds.left + bounds.right) / 2\n  const left = viewport.panX + centerX * viewport.zoom\n  const top = viewport.panY + bounds.top * viewport.zoom\n\n  return (\n    <div\n      className=\"selection-quick-toolbar\"\n      style={{ left, top }}\n",
    "  const centerX = (bounds.left + bounds.right) / 2\n  const left = viewport.panX + centerX * viewport.zoom\n  const selectionTop = viewport.panY + bounds.top * viewport.zoom\n  const selectionBottom = viewport.panY + bounds.bottom * viewport.zoom\n  let highestInteractiveY = selectionTop\n\n  if (selectedIds.length === 1) {\n    const element = elements.find((item) => item.id === selectedIds[0])\n    const definition = element ? SYMBOL_SIZES[element.symbolId] : undefined\n    const directRotation = element && definition && element.locked !== true && !element.parametricRow && (\n      !element.guideAttachment || element.guideAttachment.orientation === 'keep'\n    )\n    if (directRotation && element) {\n      const handleLocalY = -definition.height / 2 - 30\n      const radians = (element.rotation * Math.PI) / 180\n      const handleDocumentY = element.y + handleLocalY * Math.cos(radians)\n      const handleScreenY = viewport.panY + handleDocumentY * viewport.zoom\n      highestInteractiveY = Math.min(highestInteractiveY, handleScreenY - 8)\n    }\n  }\n\n  const aboveAnchor = highestInteractiveY - 10\n  const below = aboveAnchor < 52\n  const top = below ? selectionBottom + 14 : aboveAnchor\n\n  return (\n    <div\n      className={`selection-quick-toolbar ${below ? 'below' : ''}`}\n      style={{ left, top }}\n",
)
replace_once(
    'src/editor/selectionQuickToolbar.css',
    "  transform: translate(-50%, calc(-100% - 12px));\n",
    "  transform: translate(-50%, -100%);\n",
)
append_before(
    'src/editor/selectionQuickToolbar.css',
    ".selection-quick-toolbar button {\n",
    ".selection-quick-toolbar.below { transform: translate(-50%, 0); }\n",
)

# Shift snapping for line endpoints uses the same 15-degree convention as rotation.
replace_once(
    'src/editor/GuideRenderer.tsx',
    "          mode === 'rotate' && nativeEvent.shiftKey,\n",
    "          nativeEvent.shiftKey,\n",
)
replace_once(
    'src/editor/guideManipulation.ts',
    "function translatePoint(point: Point, dx: number, dy: number): Point {\n  return { x: point.x + dx, y: point.y + dy }\n}\n",
    "function translatePoint(point: Point, dx: number, dy: number): Point {\n  return { x: point.x + dx, y: point.y + dy }\n}\n\nfunction snapLineEndpoint(origin: Point, point: Point): Point {\n  const length = distance(origin, point)\n  if (length < 1e-6) return point\n  const rawAngle = angleDegrees(origin, point)\n  const angle = Math.round(rawAngle / ROTATION_SNAP_DEGREES) * ROTATION_SNAP_DEGREES\n  const radians = (angle * Math.PI) / 180\n  return {\n    x: origin.x + Math.cos(radians) * length,\n    y: origin.y + Math.sin(radians) * length,\n  }\n}\n",
)
replace_once(
    'src/editor/guideManipulation.ts',
    "  if (mode === 'start' && (guide.type === 'line' || guide.type === 'curve')) {\n    return { ...guide, start: currentPointer }\n  }\n  if (mode === 'end' && (guide.type === 'line' || guide.type === 'curve')) {\n    return { ...guide, end: currentPointer }\n  }\n",
    "  if (mode === 'start' && (guide.type === 'line' || guide.type === 'curve')) {\n    const start = guide.type === 'line' && snapRotation\n      ? snapLineEndpoint(guide.end, currentPointer)\n      : currentPointer\n    return { ...guide, start }\n  }\n  if (mode === 'end' && (guide.type === 'line' || guide.type === 'curve')) {\n    const end = guide.type === 'line' && snapRotation\n      ? snapLineEndpoint(guide.start, currentPointer)\n      : currentPointer\n    return { ...guide, end }\n  }\n",
)

# Numeric draft validity so an empty Copies field cannot silently reuse the old value.
replace_once(
    'src/editor/DraftNumberInput.tsx',
    "  commitOnBlur?: boolean\n}\n",
    "  commitOnBlur?: boolean\n  integer?: boolean\n  onValidityChange?: (valid: boolean) => void\n}\n",
)
replace_once(
    'src/editor/DraftNumberInput.tsx',
    "export function DraftNumberInput({ value, onChange, min, max, step = 1, ariaLabel, commitOnBlur = false }: Props) {\n",
    "export function DraftNumberInput({ value, onChange, min, max, step = 1, ariaLabel, commitOnBlur = false, integer = false, onValidityChange }: Props) {\n",
)
replace_once(
    'src/editor/DraftNumberInput.tsx',
    "    if (!Number.isFinite(parsed)) return null\n    if (min != null && parsed < min) return null\n",
    "    if (!Number.isFinite(parsed)) return null\n    if (integer && !Number.isInteger(parsed)) return null\n    if (min != null && parsed < min) return null\n",
)
replace_once(
    'src/editor/DraftNumberInput.tsx',
    "    if (next === null) {\n      setDraft(String(value))\n      return\n    }\n",
    "    if (next === null) {\n      setDraft(String(value))\n      onValidityChange?.(true)\n      return\n    }\n",
)
replace_once(
    'src/editor/DraftNumberInput.tsx',
    "      setDraft(String(value))\n      event.currentTarget.blur()\n",
    "      setDraft(String(value))\n      onValidityChange?.(true)\n      event.currentTarget.blur()\n",
)
replace_once(
    'src/editor/DraftNumberInput.tsx',
    "      value={draft}\n      min={min}\n",
    "      value={draft}\n      aria-invalid={normalizedDraft(draft) === null}\n      min={min}\n",
)
replace_once(
    'src/editor/DraftNumberInput.tsx',
    "        const next = normalizedDraft(nextDraft)\n        if (next === null) {\n          clearDeferredCommit()\n          return\n        }\n",
    "        const next = normalizedDraft(nextDraft)\n        onValidityChange?.(next !== null)\n        if (next === null) {\n          clearDeferredCommit()\n          return\n        }\n",
)

# Repeat: blank/invalid copies disables action and multi-stitch motifs use their real projected span as the guide gap basis.
replace_once(
    'src/editor/ProductivityPanel.tsx',
    "    copies: 'Копий',\n",
    "    copies: 'Копий',\n    copiesInvalid: 'Введите целое число от 1 до 100.',\n",
)
replace_once(
    'src/editor/ProductivityPanel.tsx',
    "    copies: 'Copies',\n",
    "    copies: 'Copies',\n    copiesInvalid: 'Enter a whole number from 1 to 100.',\n",
)
replace_once(
    'src/editor/ProductivityPanel.tsx',
    "  const [copies, setCopies] = useState(5)\n",
    "  const [copies, setCopies] = useState(5)\n  const [copiesValid, setCopiesValid] = useState(true)\n",
)
replace_once(
    'src/editor/ProductivityPanel.tsx',
    "  const disabled = !canTransform || (needsGuide && !selectedGuide)\n",
    "  const disabled = !canTransform || !copiesValid || (needsGuide && !selectedGuide)\n",
)
replace_once(
    'src/editor/ProductivityPanel.tsx',
    "  const options = useMemo<RepeatOptions | null>(() => {\n    if (mode === 'linear') return { mode, copies, deltaX, deltaY }\n",
    "  const options = useMemo<RepeatOptions | null>(() => {\n    if (!copiesValid) return null\n    if (mode === 'linear') return { mode, copies, deltaX, deltaY }\n",
)
replace_once(
    'src/editor/ProductivityPanel.tsx',
    "  }, [angleStep, copies, deltaX, deltaY, mode, orientation, selectedGuide, spacing])\n",
    "  }, [angleStep, copies, copiesValid, deltaX, deltaY, mode, orientation, selectedGuide, spacing])\n",
)
replace_once(
    'src/editor/ProductivityPanel.tsx',
    "            <DraftNumberInput ariaLabel={copy.copies} min={1} max={100} value={copies} onChange={setCopies} />\n          </label>\n",
    "            <DraftNumberInput ariaLabel={copy.copies} min={1} max={100} integer value={copies} onChange={setCopies} onValidityChange={setCopiesValid} />\n          </label>\n          {!copiesValid && <small className=\"productivity-field-error\" role=\"alert\">{copy.copiesInvalid}</small>}\n",
)
append_before(
    'src/productivity.css',
    ".productivity-field-grid {",
    ".productivity-field-error { display: block; margin-top: -5px; color: #a44036; font-size: 10px; }\n",
)
replace_once(
    'src/editor/productivity.ts',
    "import type { Guide, Point, StitchElement } from '../types'\n",
    "import { SYMBOL_BY_ID } from '../symbols'\nimport type { Guide, Point, StitchElement } from '../types'\n",
)
append_before(
    'src/editor/productivity.ts',
    "function transformedCopy(\n",
    "function motifSpanAlongAngle(source: StitchElement[], pivot: Point, angle: number) {\n  const axisRadians = radians(angle)\n  const axisX = Math.cos(axisRadians)\n  const axisY = Math.sin(axisRadians)\n  let min = Number.POSITIVE_INFINITY\n  let max = Number.NEGATIVE_INFINITY\n\n  for (const element of source) {\n    const definition = SYMBOL_BY_ID.get(element.symbolId)\n    const width = definition?.width ?? 30\n    const height = definition?.height ?? 30\n    const centerProjection = (element.x - pivot.x) * axisX + (element.y - pivot.y) * axisY\n    const relativeRadians = radians(element.rotation - angle)\n    const halfExtent = Math.abs(Math.cos(relativeRadians)) * width / 2 + Math.abs(Math.sin(relativeRadians)) * height / 2\n    min = Math.min(min, centerProjection - halfExtent)\n    max = Math.max(max, centerProjection + halfExtent)\n  }\n\n  return Number.isFinite(min) && Number.isFinite(max) ? Math.max(0, max - min) : 0\n}\n\n",
)
replace_once(
    'src/editor/productivity.ts',
    "  const spacing = Math.max(EPSILON, Math.abs(options.spacing))\n\n  for (let index = 1; index <= copies; index += 1) {\n    const target = walk.atOffset(spacing * index)\n",
    "  const spacing = Math.max(EPSILON, Math.abs(options.spacing))\n  const motifSpan = source.length > 1 ? motifSpanAlongAngle(source, pivot, walk.source.tangent) : 0\n  const pathStep = spacing + motifSpan\n\n  for (let index = 1; index <= copies; index += 1) {\n    const target = walk.atOffset(pathStep * index)\n",
)

# Automatic legend stays visible while panning/zooming, plus a real used-symbol window in the sidebar.
Path('src/editor/LegendOverlay.tsx').write_text("""import type { StitchElement, Viewport } from '../types'\nimport { symbolName } from '../i18n'\nimport { SymbolGlyph } from '../symbols'\nimport { usedLegendItems } from './legend'\n\ntype Props = {\n  elements: StitchElement[]\n  locale: 'ru' | 'en'\n  viewport: Viewport\n}\n\nexport function LegendOverlay({ elements, locale, viewport }: Props) {\n  const visible = elements.filter((element) => element.visible !== false)\n  const items = usedLegendItems(visible)\n  if (!visible.length || !items.length) return null\n\n  const width = 230\n  const rowHeight = 30\n  const height = 34 + items.length * rowHeight\n  const x = (14 - viewport.panX) / viewport.zoom\n  const y = (54 - viewport.panY) / viewport.zoom\n\n  return (\n    <g\n      className=\"legend-overlay legend-screen-overlay\"\n      transform={`translate(${x} ${y}) scale(${1 / viewport.zoom})`}\n      pointerEvents=\"none\"\n    >\n      <rect className=\"legend-background\" width={width} height={height} rx={8} vectorEffect=\"non-scaling-stroke\" />\n      <text className=\"legend-title\" x={12} y={22} fontSize={13}>\n        {locale === 'ru' ? 'Условные обозначения' : 'Legend'}\n      </text>\n      {items.map((symbol, index) => {\n        const rowY = 38 + index * rowHeight\n        const label = symbolName(symbol.id, symbol.name, locale)\n        const abbreviation = symbol.abbreviation ? `${symbol.abbreviation} · ` : ''\n        return (\n          <g key={symbol.id} transform={`translate(20 ${rowY + 9})`}>\n            <g className=\"symbol-glyph legend-glyph\" transform=\"scale(0.55)\"><SymbolGlyph symbolId={symbol.id} /></g>\n            <text className=\"legend-label\" x={24} y={4} fontSize={12}>{abbreviation}{label}</text>\n          </g>\n        )\n      })}\n    </g>\n  )\n}\n""")
Path('src/editor/LegendPanel.tsx').write_text("""import type { Locale } from '../i18n'\nimport { symbolName } from '../i18n'\nimport { SymbolGlyph } from '../symbols'\nimport type { StitchElement } from '../types'\nimport { usedLegendItems } from './legend'\nimport './legendPanel.css'\n\nexport function LegendPanel({\n  locale,\n  elements,\n  visible,\n  onVisibleChange,\n}: {\n  locale: Locale\n  elements: StitchElement[]\n  visible: boolean\n  onVisibleChange: (visible: boolean) => void\n}) {\n  const ru = locale === 'ru'\n  const visibleElements = elements.filter((element) => element.visible !== false)\n  const items = usedLegendItems(visibleElements)\n  const counts = new Map<string, number>()\n  for (const element of visibleElements) counts.set(element.symbolId, (counts.get(element.symbolId) ?? 0) + 1)\n\n  return (\n    <section className=\"panel-section legend-panel\" data-testid=\"legend-panel\">\n      <div className=\"section-title-row\">\n        <h2>{ru ? 'Легенда' : 'Legend'}</h2>\n        <span className=\"muted-text\">{items.length}</span>\n      </div>\n      <label className=\"toggle-row\">\n        <span>\n          <strong>{ru ? 'Показывать на схеме' : 'Show on canvas'}</strong>\n          <small>{ru ? 'Легенда закреплена в видимой области и также включается в SVG.' : 'The legend stays in view and is also included in SVG.'}</small>\n        </span>\n        <input type=\"checkbox\" checked={visible} onChange={(event) => onVisibleChange(event.target.checked)} />\n      </label>\n      <div className=\"legend-used-heading\">{ru ? 'Использованные символы' : 'Used symbols'}</div>\n      {!items.length ? (\n        <p className=\"empty-state\">{ru ? 'На схеме пока нет видимых символов.' : 'No visible symbols are used yet.'}</p>\n      ) : (\n        <div className=\"legend-used-list\">\n          {items.map((symbol) => (\n            <div className=\"legend-used-row\" key={symbol.id}>\n              <svg viewBox=\"-24 -38 48 76\" aria-hidden=\"true\"><g className=\"symbol-glyph\"><SymbolGlyph symbolId={symbol.id} /></g></svg>\n              <div>\n                <strong>{symbol.abbreviation ?? symbol.id}</strong>\n                <small>{symbolName(symbol.id, symbol.name, locale)}</small>\n              </div>\n              <span className=\"legend-used-count\" aria-label={ru ? 'Количество' : 'Count'}>{counts.get(symbol.id) ?? 0}</span>\n            </div>\n          ))}\n        </div>\n      )}\n    </section>\n  )\n}\n""")
Path('src/editor/legendPanel.css').write_text(""".legend-used-heading { margin: 2px 0 8px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .07em; color: #777a74; }\n.legend-used-list { display: grid; gap: 6px; }\n.legend-used-row { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid #e1ddd5; border-radius: 8px; background: #fff; }\n.legend-used-row svg { width: 30px; height: 34px; overflow: visible; }\n.legend-used-row strong { display: block; font-size: 10px; }\n.legend-used-row small { display: block; margin-top: 2px; overflow: hidden; color: #858780; font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }\n.legend-used-count { min-width: 24px; padding: 3px 6px; border-radius: 999px; background: #edf2ee; color: #355e50; font-size: 10px; font-weight: 700; text-align: center; }\n""")

# Unit regression coverage.
append_before(
    'src/editor/guideManipulation.test.ts',
    "  it('provides visible resize and rotation handles only where they apply', () => {\n",
    "  it('snaps a dragged line endpoint to 15 degree increments with Shift', () => {\n    const current = { x: 100, y: 100 }\n    const free = applyGuideManipulation(line, 'end', line.end, current)\n    const snapped = applyGuideManipulation(line, 'end', line.end, current, true)\n    expect(free.type).toBe('line')\n    expect(snapped.type).toBe('line')\n    if (free.type === 'line' && snapped.type === 'line') {\n      const snappedAngle = Math.atan2(snapped.end.y - line.start.y, snapped.end.x - line.start.x) * 180 / Math.PI\n      expect(snappedAngle / 15).toBeCloseTo(Math.round(snappedAngle / 15))\n      expect(snapped.end).not.toEqual(free.end)\n      expect(Math.hypot(snapped.end.x - line.start.x, snapped.end.y - line.start.y)).toBeCloseTo(\n        Math.hypot(current.x - line.start.x, current.y - line.start.y),\n      )\n    }\n  })\n\n",
)
replace_once(
    'src/editor/productivity.test.ts',
    "import type { ArcGuide, RadialGridGuide, StitchElement } from '../types'\n",
    "import type { ArcGuide, LineGuide, RadialGridGuide, StitchElement } from '../types'\n",
)
append_before(
    'src/editor/productivity.test.ts',
    "const radial: RadialGridGuide = {\n",
    "const lineGuide: LineGuide = {\n  id: 'line',\n  type: 'line',\n  start: { x: 0, y: 0 },\n  end: { x: 500, y: 0 },\n  divisions: 10,\n  visible: true,\n}\n\n",
)
append_before(
    'src/editor/productivity.test.ts',
    "  it('walks a motif along a closed arc and follows its tangent', () => {\n",
    "  it('places a multi-stitch motif after its own bounds when repeating along a guide', () => {\n    const source: StitchElement[] = [\n      { id: 'a', symbolId: 'single', x: 50, y: 0, rotation: 0 },\n      { id: 'b', symbolId: 'double', x: 90, y: 0, rotation: 0 },\n    ]\n    const created = repeatSelection(source, ['a', 'b'], {\n      mode: 'guide', copies: 1, spacing: 10, orientation: 'keep', guide: lineGuide,\n    }, ids())\n    expect(created).toHaveLength(2)\n    expect(created[0].x).toBeCloseTo(127)\n    expect(created[1].x).toBeCloseTo(167)\n    expect(created[0].x - 12).toBeCloseTo(105 + 10)\n  })\n\n",
)

# E2E: Hand tool, blank Copies guard, toolbar/rotation collision, used-symbol legend.
replace_once(
    'e2e/productivity.e2e.ts',
    "  const copies = productivity.getByLabel('Копий')\n  await copies.fill('')\n  await expect(copies).toHaveValue('')\n  await copies.fill('2')\n  await expect(copies).toHaveValue('2')\n",
    "  const copies = productivity.getByLabel('Копий')\n  const createCopies = productivity.getByRole('button', { name: 'Создать копии', exact: true })\n  await copies.fill('')\n  await expect(copies).toHaveValue('')\n  await expect(createCopies).toBeDisabled()\n  await expect(productivity.getByText('Введите целое число от 1 до 100.')).toBeVisible()\n  await copies.fill('1')\n  await expect(createCopies).toBeEnabled()\n  await copies.fill('2')\n  await expect(copies).toHaveValue('2')\n",
)
replace_once(
    'e2e/productivity.e2e.ts',
    "  expect(await world.getAttribute('transform')).not.toBe(worldBefore)\n\n  const productivity = page.locator('.productivity-panel')\n",
    "  expect(await world.getAttribute('transform')).not.toBe(worldBefore)\n\n  await page.getByRole('button', { name: 'Ладонь / перемещение поля' }).first().click()\n  await expect(canvas).toHaveClass(/pan-tool/)\n  const handBefore = await world.getAttribute('transform')\n  const handStitchBox = await stitch.boundingBox()\n  expect(handStitchBox).not.toBeNull()\n  await page.mouse.move(handStitchBox!.x + handStitchBox!.width / 2, handStitchBox!.y + handStitchBox!.height / 2)\n  await page.mouse.down()\n  await page.mouse.move(handStitchBox!.x + handStitchBox!.width / 2 + 38, handStitchBox!.y + handStitchBox!.height / 2 + 22, { steps: 4 })\n  await page.mouse.up()\n  expect(await world.getAttribute('transform')).not.toBe(handBefore)\n  await page.keyboard.press('Escape')\n  await expect(canvas).not.toHaveClass(/pan-tool/)\n\n  const snapOrientation = page.getByLabel('Ориентация при привязке')\n  await expect(snapOrientation).toHaveValue('along')\n\n  const productivity = page.locator('.productivity-panel')\n",
)
append_before(
    'e2e/usability.e2e.ts',
    "test('keeps common row controls visible and hides expert settings until requested', async ({ page }) => {\n",
    "test('keeps the quick toolbar clear of the rotation handle and shows a live used-symbol legend', async ({ page }) => {\n  await openEditor(page)\n  await placeAt(page, 'Столбик без накида', 0.48, 0.48)\n\n  const toolbarBox = await page.locator('.selection-quick-toolbar').boundingBox()\n  const rotationBox = await page.locator('.stitch-rotation-handle').boundingBox()\n  expect(toolbarBox).not.toBeNull()\n  expect(rotationBox).not.toBeNull()\n  const overlaps = !(\n    toolbarBox!.x + toolbarBox!.width <= rotationBox!.x ||\n    rotationBox!.x + rotationBox!.width <= toolbarBox!.x ||\n    toolbarBox!.y + toolbarBox!.height <= rotationBox!.y ||\n    rotationBox!.y + rotationBox!.height <= toolbarBox!.y\n  )\n  expect(overlaps).toBe(false)\n\n  const legendPanel = page.getByTestId('legend-panel')\n  await expect(legendPanel.getByText('Использованные символы')).toBeVisible()\n  await expect(legendPanel.locator('.legend-used-row')).toHaveCount(1)\n  await expect(legendPanel.locator('.legend-used-count')).toHaveText('1')\n  await expect(page.locator('.legend-overlay')).toBeVisible()\n\n  const canvas = await canvasBox(page)\n  const legendBox = await page.locator('.legend-overlay').boundingBox()\n  expect(legendBox).not.toBeNull()\n  expect(legendBox!.x).toBeGreaterThanOrEqual(canvas.x)\n  expect(legendBox!.y).toBeGreaterThanOrEqual(canvas.y)\n})\n\n",
)

# README current release note, leaving historical sections intact.
replace_once(
    'README.md',
    "Browser-based semantic editor for crochet charts and written patterns.\n\n## v1.15.1\n",
    "Browser-based semantic editor for crochet charts and written patterns.\n\n## v1.18.0\n\nCore usability release: explicit Hand/Pan mode, visible snap-orientation control with guide auto-rotation, 15° Shift snapping for straight-guide endpoints, safer Repeat inputs, motif-aware guide spacing, non-overlapping selection actions and a persistent used-symbol legend window. The symbol library currently contains 44 definitions and project schema remains v19.\n\n## v1.15.1\n",
)

print('v1.18 core usability patch applied')
