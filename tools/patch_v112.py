from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text()


def write(path: str, text: str) -> None:
    Path(path).write_text(text)


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected 1 match, found {count}")
    return text.replace(old, new, 1)


# types.ts
path = 'src/types.ts'
s = read(path)
s = s.replace('  visible: boolean\n}', '  visible: boolean\n  locked?: boolean\n}')
s = once(s,
"export type Guide = ArcGuide | LineGuide | CurveGuide | GridGuide | RadialGridGuide\n\nexport type Viewport = {",
"export type Guide = ArcGuide | LineGuide | CurveGuide | GridGuide | RadialGridGuide\n\nexport type RowMarker = {\n  id: string\n  number: number\n  x: number\n  y: number\n  visible?: boolean\n  locked?: boolean\n}\n\nexport type LegendSettings = {\n  visible: boolean\n}\n\nexport type Viewport = {",
"types annotation models")
s = once(s,
"  schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14\n",
"  schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15\n",
"types schema v15")
s = once(s,
"  elements: StitchElement[]\n  guides?: Guide[]\n  settings: {\n    snapping: SnappingSettings\n  }",
"  elements: StitchElement[]\n  guides?: Guide[]\n  rowMarkers?: RowMarker[]\n  settings: {\n    snapping: SnappingSettings\n    legend?: LegendSettings\n  }",
"types project additions")
write(path, s)

# projectSchema.ts
path = 'src/editor/projectSchema.ts'
s = read(path)
s = once(s, '  RowProgram,\n  SnappingSettings,', '  RowProgram,\n  RowMarker,\n  SnappingSettings,', 'schema import RowMarker')
s = once(s,
"function parseGuide(value: unknown): Guide {\n  if (!isRecord(value) || !nonEmptyString(value.id) || typeof value.visible !== 'boolean') throw new ProjectValidationError('Invalid guide')",
"function parseGuide(value: unknown): Guide {\n  if (!isRecord(value) || !nonEmptyString(value.id) || typeof value.visible !== 'boolean' || !optionalBoolean(value.locked)) throw new ProjectValidationError('Invalid guide')",
"schema guide lock validation")
insert_before = "function parseSnapping(value: unknown, fallback: SnappingSettings): SnappingSettings {"
row_parser = """function parseRowMarker(value: unknown): RowMarker {
  if (
    !isRecord(value) || !nonEmptyString(value.id) ||
    !positiveInteger(value.number, 999) || !finite(value.x) || !finite(value.y) ||
    !optionalBoolean(value.visible) || !optionalBoolean(value.locked)
  ) throw new ProjectValidationError('Invalid row marker')
  return {
    id: value.id,
    number: value.number,
    x: value.x,
    y: value.y,
    visible: value.visible !== false,
    locked: value.locked === true,
  }
}

function parseLegend(value: unknown) {
  if (value === undefined) return { visible: true }
  if (!isRecord(value) || typeof value.visible !== 'boolean') {
    throw new ProjectValidationError('Invalid legend settings')
  }
  return { visible: value.visible }
}

"""
s = once(s, insert_before, row_parser + insert_before, 'schema row parser')
s = once(s,
"  if (!finite(raw.schemaVersion) || raw.schemaVersion < 1 || raw.schemaVersion > 14) throw new ProjectValidationError('Unsupported project schema')",
"  if (!finite(raw.schemaVersion) || raw.schemaVersion < 1 || raw.schemaVersion > 15) throw new ProjectValidationError('Unsupported project schema')",
"schema max version")
s = once(s,
"  if (raw.guides !== undefined && !Array.isArray(raw.guides)) throw new ProjectValidationError('Project guides are invalid')\n\n  const metadata",
"  if (raw.guides !== undefined && !Array.isArray(raw.guides)) throw new ProjectValidationError('Project guides are invalid')\n  if (raw.rowMarkers !== undefined && !Array.isArray(raw.rowMarkers)) throw new ProjectValidationError('Project row markers are invalid')\n\n  const metadata",
"schema row marker collection")
s = once(s,
"  const elements = raw.elements.map(parseElement)\n  const guides = (raw.guides ?? []).map(parseGuide)\n\n  return {\n    schemaVersion: 14,",
"  const elements = raw.elements.map(parseElement)\n  const guides = (raw.guides ?? []).map(parseGuide)\n  const rowMarkers = (raw.rowMarkers ?? []).map(parseRowMarker)\n\n  return {\n    schemaVersion: 15,",
"schema normalized version")
s = once(s,
"    elements,\n    guides,\n    settings: { snapping: parseSnapping(settings.snapping, fallbackSnapping) },",
"    elements,\n    guides,\n    rowMarkers,\n    settings: {\n      snapping: parseSnapping(settings.snapping, fallbackSnapping),\n      legend: parseLegend(settings.legend),\n    },",
"schema project return")
write(path, s)

# GuideRenderer.tsx
path = 'src/editor/GuideRenderer.tsx'
s = read(path)
s = once(s, "  if (!guide.visible) return null\n\n  const snapPoints", "  if (!guide.visible) return null\n\n  const locked = guide.locked === true\n  const snapPoints", 'guide renderer lock state')
s = once(s,
"    onPointerDown(event as unknown as ReactPointerEvent<SVGGElement>, guide)\n    if (!event.isPropagationStopped()) return\n\n    event.preventDefault()",
"    onPointerDown(event as unknown as ReactPointerEvent<SVGGElement>, guide)\n    if (!event.isPropagationStopped()) return\n    if (locked) return\n\n    event.preventDefault()",
"guide renderer locked interaction")
s = once(s,
"      className={`guide-layer guide-${guide.type} ${selected ? 'selected' : ''}`}\n",
"      className={`guide-layer guide-${guide.type} ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`}\n",
"guide renderer locked class")
s = s.replace('{selected && (', '{selected && !locked && (')
s = once(s,
"      {snapPoints.map((snapPoint) => (",
"      {selected && locked && (\n        <text x={center.x + 10 / zoom} y={center.y - 10 / zoom} fontSize={12 / zoom} className=\"guide-lock-indicator\">🔒</text>\n      )}\n\n      {snapPoints.map((snapPoint) => (",
"guide renderer lock icon")
write(path, s)

# main.tsx css
path = 'src/main.tsx'
s = read(path)
s = once(s, "import './foundation.css'\n", "import './foundation.css'\nimport './patternAuthoring.css'\n", 'main css import')
write(path, s)

# i18n version / guide help
path = 'src/i18n.ts'
s = read(path)
s = s.replace('v1.11.1', 'v1.12.0')
s = s.replace(
"При вращении сетки Shift фиксирует угол с шагом 15°.'",
"При вращении сетки Shift фиксирует угол с шагом 15°. Заблокированную направляющую можно выбрать, но нельзя случайно переместить или изменить.'")
s = s.replace(
"Shift snaps grid rotation to 15° increments.'",
"Shift snaps grid rotation to 15° increments. A locked guide remains selectable but cannot be moved or edited accidentally.'")
write(path, s)

# package version
path = 'package.json'
s = read(path).replace('"version": "1.11.1"', '"version": "1.12.0"')
write(path, s)

# App.tsx imports/types/state/document model
path = 'src/App.tsx'
s = read(path)
s = once(s,
"import { GuideRenderer } from './editor/GuideRenderer'\n",
"import { GuideRenderer } from './editor/GuideRenderer'\nimport { LegendOverlay } from './editor/LegendOverlay'\nimport { RowMarkerLayer } from './editor/RowMarkerLayer'\nimport { RowMarkersPanel } from './editor/RowMarkersPanel'\n",
"app component imports")
s = once(s,
"import { DEFAULT_STITCH_COLOR } from './editor/elementColor'\n",
"import { DEFAULT_STITCH_COLOR } from './editor/elementColor'\nimport { usedLegendItems } from './editor/legend'\nimport { isRowMarkerLocked, nextRowMarkerNumber, normalizedRowMarkerNumber } from './editor/rowMarkers'\n",
"app model imports")
s = once(s, '  Point,\n  SnappingSettings,', '  Point,\n  RowMarker,\n  SnappingSettings,', 'app RowMarker type')
s = once(s,
"type Tool = { type: 'select' } | { type: 'place'; symbolId: string }\ntype DocumentSnapshot = { elements: StitchElement[]; guides: Guide[] }",
"type Tool = { type: 'select' } | { type: 'place'; symbolId: string } | { type: 'row-marker' }\ntype DocumentSnapshot = { elements: StitchElement[]; guides: Guide[]; rowMarkers: RowMarker[] }",
"app tool snapshot")

# Replace SVG serializer and buildProject together.
start = s.index('function serializeSvg(')
end = s.index('function initialLocale()', start)
replacement = r'''function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character] ?? character)
}

function serializeSvg(
  elements: StitchElement[],
  rowMarkers: RowMarker[],
  legendVisible: boolean,
  locale: Locale,
  emptyLabel: string,
) {
  const visibleMarkers = rowMarkers.filter((marker) => marker.visible !== false)
  if (!elements.length && !visibleMarkers.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><text x="320" y="240" text-anchor="middle" font-family="sans-serif" fill="#888">${escapeXml(emptyLabel)}</text></svg>`
  }

  const bounds = elements.map((element) => {
    const definition = SYMBOL_BY_ID.get(element.symbolId)
    const half = Math.max(definition?.width ?? 30, definition?.height ?? 30) / 2 + 12
    return { left: element.x - half, right: element.x + half, top: element.y - half, bottom: element.y + half }
  })
  bounds.push(...visibleMarkers.map((marker) => ({
    left: marker.x - 8, right: marker.x + 42, top: marker.y - 14, bottom: marker.y + 14,
  })))

  const padding = 36
  let left = Math.min(...bounds.map((item) => item.left)) - padding
  let right = Math.max(...bounds.map((item) => item.right)) + padding
  const top = Math.min(...bounds.map((item) => item.top)) - padding
  let bottom = Math.max(...bounds.map((item) => item.bottom)) + padding

  const content = elements
    .map((element) => `<g transform="translate(${element.x} ${element.y}) rotate(${element.rotation})" style="color:${element.color ?? DEFAULT_STITCH_COLOR}">${symbolSvgMarkup(element.symbolId)}</g>`)
    .join('')
  const markerContent = visibleMarkers
    .map((marker) => `<g transform="translate(${marker.x} ${marker.y})"><circle r="5" fill="#c2413b"/><text x="10" y="4" font-family="sans-serif" font-size="13" font-weight="700" fill="#b23833">${marker.number}</text></g>`)
    .join('')

  const legendItems = legendVisible ? usedLegendItems(elements) : []
  let legendContent = ''
  if (legendItems.length) {
    const legendX = right + 18
    const legendY = top + padding
    const legendWidth = 250
    const rowHeight = 30
    const legendHeight = 38 + legendItems.length * rowHeight
    const rows = legendItems.map((symbol, index) => {
      const y = legendY + 48 + index * rowHeight
      const label = symbolName(symbol.id, symbol.name, locale)
      const text = `${symbol.abbreviation ? `${symbol.abbreviation} · ` : ''}${label}`
      return `<g style="color:#202622"><g transform="translate(${legendX + 22} ${y - 4}) scale(0.55)">${symbolSvgMarkup(symbol.id)}</g><text x="${legendX + 48}" y="${y}" font-family="sans-serif" font-size="12" fill="#202622">${escapeXml(text)}</text></g>`
    }).join('')
    legendContent = `<g class="crochet-legend"><rect x="${legendX}" y="${legendY}" width="${legendWidth}" height="${legendHeight}" rx="8" fill="white" stroke="#cbc7be"/><text x="${legendX + 12}" y="${legendY + 23}" font-family="sans-serif" font-size="13" font-weight="700" fill="#202622">${locale === 'ru' ? 'Условные обозначения' : 'Legend'}</text>${rows}</g>`
    right = legendX + legendWidth + padding
    bottom = Math.max(bottom, legendY + legendHeight + padding)
  }

  const width = Math.max(1, right - left)
  const height = Math.max(1, bottom - top)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}" width="${width}" height="${height}"><rect x="${left}" y="${top}" width="${width}" height="${height}" fill="white"/>${content}${markerContent}${legendContent}</svg>`
}

function buildProject(
  title: string,
  elements: StitchElement[],
  guides: Guide[],
  snapping: SnappingSettings,
  rowMarkers: RowMarker[] = [],
  legendVisible = true,
): CrochetProject {
  return {
    schemaVersion: 15,
    metadata: { title, updatedAt: new Date().toISOString() },
    elements: normalizeElements(elements),
    guides,
    rowMarkers,
    settings: { snapping, legend: { visible: legendVisible } },
  }
}

'''
s = s[:start] + replacement + s[end:]

# refs + state
s = once(s,
"  const guideManipulationSnapshotRef = useRef<DocumentSnapshot | null>(null)\n",
"  const guideManipulationSnapshotRef = useRef<DocumentSnapshot | null>(null)\n  const rowMarkerManipulationSnapshotRef = useRef<DocumentSnapshot | null>(null)\n",
"app row marker ref")
s = once(s,
"  const [guides, setGuides] = useState<Guide[]>([])\n  const [history,",
"  const [guides, setGuides] = useState<Guide[]>([])\n  const [rowMarkers, setRowMarkers] = useState<RowMarker[]>([])\n  const [legendVisible, setLegendVisible] = useState(true)\n  const [history,",
"app row marker state")
s = once(s,
"  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null)\n",
"  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null)\n  const [selectedRowMarkerId, setSelectedRowMarkerId] = useState<string | null>(null)\n",
"app selected row marker")

# restore / autosave
s = once(s,
"          setGuides(project.guides ?? [])\n          setSnapping(project.settings.snapping)\n",
"          setGuides(project.guides ?? [])\n          setRowMarkers(project.rowMarkers ?? [])\n          setLegendVisible(project.settings.legend?.visible ?? true)\n          setSnapping(project.settings.snapping)\n",
"app restore annotations")
s = once(s,
"      const project = buildProject(projectTitle, elements, guides, snapping)\n",
"      const project = buildProject(projectTitle, elements, guides, snapping, rowMarkers, legendVisible)\n",
"app autosave project")
s = once(s,
"  }, [activeProjectId, elements, guides, hydrated, projectTitle, snapping])\n",
"  }, [activeProjectId, elements, guides, hydrated, legendVisible, projectTitle, rowMarkers, snapping])\n",
"app autosave deps")

# selection memos
s = once(s,
"  const selectedGuide = useMemo(\n    () => guides.find((guide) => guide.id === selectedGuideId) ?? null,\n    [guides, selectedGuideId],\n  )\n",
"  const selectedGuide = useMemo(\n    () => guides.find((guide) => guide.id === selectedGuideId) ?? null,\n    [guides, selectedGuideId],\n  )\n  const selectedRowMarker = useMemo(\n    () => rowMarkers.find((marker) => marker.id === selectedRowMarkerId) ?? null,\n    [rowMarkers, selectedRowMarkerId],\n  )\n  const nextRowNumber = useMemo(() => nextRowMarkerNumber(rowMarkers), [rowMarkers])\n",
"app row marker memos")

# snapshot/commit/undo
s = once(s,
"    (): DocumentSnapshot => ({ elements, guides }),\n    [elements, guides],",
"    (): DocumentSnapshot => ({ elements, guides, rowMarkers }),\n    [elements, guides, rowMarkers],",
"app snapshot annotations")
s = once(s,
"  const commitGuides = useCallback(\n    (next: Guide[]) => {\n      recordSnapshot(currentSnapshot())\n      setGuides(next)\n    },\n    [currentSnapshot, recordSnapshot],\n  )\n",
"  const commitGuides = useCallback(\n    (next: Guide[]) => {\n      recordSnapshot(currentSnapshot())\n      setGuides(next)\n    },\n    [currentSnapshot, recordSnapshot],\n  )\n  const commitRowMarkers = useCallback(\n    (next: RowMarker[]) => {\n      recordSnapshot(currentSnapshot())\n      setRowMarkers(next)\n    },\n    [currentSnapshot, recordSnapshot],\n  )\n",
"app commit markers")
s = s.replace(
"    setGuides(step.value.guides)\n    clearElementSelection()\n    setSelectedGuideId(null)",
"    setGuides(step.value.guides)\n    setRowMarkers(step.value.rowMarkers)\n    clearElementSelection()\n    setSelectedGuideId(null)\n    setSelectedRowMarkerId(null)")

# delete selected row marker
needle = "    if (selectedGuideId) {\n      commitGuides(guides.filter((guide) => guide.id !== selectedGuideId))"
s = once(s, needle,
"    if (selectedRowMarkerId) {\n      const marker = rowMarkers.find((item) => item.id === selectedRowMarkerId)\n      if (!marker || isRowMarkerLocked(marker)) return\n      commitRowMarkers(rowMarkers.filter((item) => item.id !== selectedRowMarkerId))\n      setSelectedRowMarkerId(null)\n      setStatus(locale === 'ru' ? 'Номер ряда удалён' : 'Row number deleted')\n      return\n    }\n    if (selectedGuideId) {\n      commitGuides(guides.filter((guide) => guide.id !== selectedGuideId))",
"app delete marker")
s = once(s, "    commitGuides,\n    elements,", "    commitGuides,\n    commitRowMarkers,\n    elements,", 'app delete deps commit')
s = once(s, "    guides,\n    selectedGuideId,", "    guides,\n    locale,\n    rowMarkers,\n    selectedGuideId,\n    selectedRowMarkerId,", 'app delete deps marker')

# nudge marker first
needle = "  const nudgeSelection = useCallback((dx: number, dy: number) => {\n    const selected = new Set(unlockedSelectedIds())"
s = once(s, needle,
"  const nudgeSelection = useCallback((dx: number, dy: number) => {\n    if (selectedRowMarkerId) {\n      const marker = rowMarkers.find((item) => item.id === selectedRowMarkerId)\n      if (!marker || isRowMarkerLocked(marker)) return\n      commitRowMarkers(rowMarkers.map((item) => item.id === marker.id ? { ...item, x: item.x + dx, y: item.y + dy } : item))\n      setStatus(locale === 'ru' ? `Номер ряда сдвинут: ${dx}, ${dy}` : `Row number nudged: ${dx}, ${dy}`)\n      return\n    }\n    const selected = new Set(unlockedSelectedIds())",
"app nudge marker")
s = once(s,
"  }, [commitElements, elements, guides, locale, unlockedSelectedIds])\n\n  const zoomCanvas",
"  }, [commitElements, commitRowMarkers, elements, guides, locale, rowMarkers, selectedRowMarkerId, unlockedSelectedIds])\n\n  const zoomCanvas",
"app nudge deps")

# canvas placement
needle = "    const point = toDocumentPoint(localPoint(event.clientX, event.clientY))\n    if (tool.type === 'place') {"
s = once(s, needle,
"    const point = toDocumentPoint(localPoint(event.clientX, event.clientY))\n    if (tool.type === 'row-marker') {\n      const marker: RowMarker = {\n        id: createId(), number: nextRowNumber, x: point.x, y: point.y, visible: true, locked: false,\n      }\n      commitRowMarkers([...rowMarkers, marker])\n      setSelectedRowMarkerId(marker.id)\n      clearElementSelection()\n      setSelectedGuideId(null)\n      setStatus(locale === 'ru' ? `Добавлен номер ряда ${marker.number}` : `Added row number ${marker.number}`)\n      return\n    }\n    if (tool.type === 'place') {",
"app place marker")
s = once(s,
"      setSelectedIds([placed.id])\n      setSelectedGuideId(null)\n",
"      setSelectedIds([placed.id])\n      setSelectedGuideId(null)\n      setSelectedRowMarkerId(null)\n",
"app stitch clears marker")
s = once(s,
"    event.currentTarget.setPointerCapture(event.pointerId)\n    setSelectedGuideId(null)\n    setMarquee({",
"    event.currentTarget.setPointerCapture(event.pointerId)\n    setSelectedGuideId(null)\n    setSelectedRowMarkerId(null)\n    setMarquee({",
"app marquee clears marker")

# Guide select clears row marker
s = once(s,
"    setSelectedGuideId(guide.id)\n    clearElementSelection()\n    setStatus(`${guideLabel(guide, locale)} ${t.selected}`)",
"    setSelectedGuideId(guide.id)\n    setSelectedRowMarkerId(null)\n    clearElementSelection()\n    setStatus(`${guideLabel(guide, locale)} ${t.selected}`)",
"app guide selection clears marker")

# Row marker callbacks inserted before guide manipulation callbacks
needle = "  const handleGuideManipulationStart = useCallback(() => {"
callbacks = """  const handleSelectRowMarker = useCallback((id: string) => {
    setSelectedRowMarkerId(id)
    clearElementSelection()
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setPreview(null)
    setSnapTarget(null)
  }, [clearElementSelection])

  const handleRowMarkerMoveStart = useCallback(() => {
    rowMarkerManipulationSnapshotRef.current = currentSnapshot()
  }, [currentSnapshot])

  const handleRowMarkerMovePreview = useCallback((marker: RowMarker) => {
    setRowMarkers((current) => current.map((item) => item.id === marker.id ? marker : item))
  }, [])

  const handleRowMarkerMoveEnd = useCallback((moved: boolean, cancelled: boolean) => {
    const before = rowMarkerManipulationSnapshotRef.current
    rowMarkerManipulationSnapshotRef.current = null
    if (moved && !cancelled && before) {
      recordSnapshot(before)
      setStatus(locale === 'ru' ? 'Номер ряда перемещён' : 'Row number moved')
    }
  }, [locale, recordSnapshot])

  const updateRowMarker = useCallback((id: string, patch: Partial<RowMarker>) => {
    const current = rowMarkers.find((marker) => marker.id === id)
    if (!current) return
    const nextNumber = patch.number === undefined ? current.number : normalizedRowMarkerNumber(patch.number)
    if (rowMarkers.some((marker) => marker.id !== id && marker.number === nextNumber)) {
      setStatus(locale === 'ru' ? `Ряд №${nextNumber} уже существует` : `Row #${nextNumber} already exists`)
      return
    }
    commitRowMarkers(rowMarkers.map((marker) => marker.id === id ? { ...marker, ...patch, number: nextNumber } : marker))
  }, [commitRowMarkers, locale, rowMarkers])

  const deleteRowMarker = useCallback((id: string) => {
    const marker = rowMarkers.find((item) => item.id === id)
    if (!marker || isRowMarkerLocked(marker)) return
    commitRowMarkers(rowMarkers.filter((item) => item.id !== id))
    if (selectedRowMarkerId === id) setSelectedRowMarkerId(null)
    setStatus(locale === 'ru' ? 'Номер ряда удалён' : 'Row number deleted')
  }, [commitRowMarkers, locale, rowMarkers, selectedRowMarkerId])

"""
s = once(s, needle, callbacks + needle, 'app row marker callbacks')

# updateSelectedGuide refuses numeric updater only through disabled UI; guide manipulation handled in renderer.

# open/load/save project annotation state
s = once(s,
"    setGuides(normalized.guides ?? [])\n    setSnapping(normalized.settings.snapping)\n",
"    setGuides(normalized.guides ?? [])\n    setRowMarkers(normalized.rowMarkers ?? [])\n    setLegendVisible(normalized.settings.legend?.visible ?? true)\n    setSnapping(normalized.settings.snapping)\n",
"app open annotations")
s = once(s,
"    clearElementSelection()\n    setSelectedGuideId(null)\n    setTool({ type: 'select' })",
"    clearElementSelection()\n    setSelectedGuideId(null)\n    setSelectedRowMarkerId(null)\n    setTool({ type: 'select' })",
"app open clear marker")
s = once(s,
"    const project = buildProject(projectTitle, elements, guides, snapping)\n    const id = await duplicateLocalProject(project, title)",
"    const project = buildProject(projectTitle, elements, guides, snapping, rowMarkers, legendVisible)\n    const id = await duplicateLocalProject(project, title)",
"app duplicate annotations")
s = once(s,
"    const project = buildProject(projectTitle, elements, guides, snapping)\n    downloadText('crochet-scheme.json'",
"    const project = buildProject(projectTitle, elements, guides, snapping, rowMarkers, legendVisible)\n    downloadText('crochet-scheme.json'",
"app save annotations")
s = once(s,
"        ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].includes(raw.schemaVersion)",
"        ![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].includes(raw.schemaVersion)",
"app load v15")
s = once(s,
"      setGuides(project.guides ?? [])\n      setSnapping(project.settings.snapping)\n",
"      setGuides(project.guides ?? [])\n      setRowMarkers(project.rowMarkers ?? [])\n      setLegendVisible(project.settings.legend?.visible ?? true)\n      setSnapping(project.settings.snapping)\n",
"app file load annotations")
s = once(s,
"      clearElementSelection()\n      setSelectedGuideId(null)\n      setTool({ type: 'select' })",
"      clearElementSelection()\n      setSelectedGuideId(null)\n      setSelectedRowMarkerId(null)\n      setTool({ type: 'select' })",
"app load clear marker")
s = once(s,
"      serializeSvg(visibleElements, t.emptySvg),",
"      serializeSvg(visibleElements, rowMarkers, legendVisible, locale, t.emptySvg),",
"app svg annotations")

# Left guide list lock icon
s = once(s,
"                  <span>{index + 1}. {guideLabel(guide, locale)}</span>\n",
"                  <span>{index + 1}. {guideLabel(guide, locale)}</span>\n                  {guide.locked && <span aria-label={locale === 'ru' ? 'Заблокирована' : 'Locked'}>🔒</span>}\n",
"app guide list lock")

# Canvas layers: row markers / legend
needle = "            {mirrorAxis && productivitySelectionIds().length > 0 && ("
canvas_insert = """            <RowMarkerLayer
              markers={rowMarkers}
              selectedId={selectedRowMarkerId}
              zoom={viewport.zoom}
              clientToDocument={clientToDocument}
              onSelect={handleSelectRowMarker}
              onMoveStart={handleRowMarkerMoveStart}
              onMovePreview={handleRowMarkerMovePreview}
              onMoveEnd={handleRowMarkerMoveEnd}
            />

            {legendVisible && <LegendOverlay elements={elements} locale={locale} zoom={viewport.zoom} />}

"""
s = once(s, needle, canvas_insert + needle, 'app canvas annotations')

# status bar
s = once(s,
"          <span>{elements.length} {t.stitchCount} · {guides.length} {t.guideCount}{selectedIds.length ? ` · ${selectedIds.length} ${t.selectedShort}` : ''}</span>",
"          <span>{elements.length} {t.stitchCount} · {guides.length} {t.guideCount} · {rowMarkers.length} {locale === 'ru' ? 'номеров рядов' : 'row numbers'}{selectedIds.length ? ` · ${selectedIds.length} ${t.selectedShort}` : ''}</span>",
"app status row marker count")

# Right sidebar row markers + legend after PatternRowsPanel section
needle = "        {productivitySelectionIds().length > 0 && ("
right_insert = """        <section className="panel-section">
          <RowMarkersPanel
            locale={locale}
            markers={rowMarkers}
            selectedId={selectedRowMarkerId}
            nextNumber={nextRowNumber}
            placing={tool.type === 'row-marker'}
            onStartPlacement={() => {
              setTool((current) => current.type === 'row-marker' ? { type: 'select' } : { type: 'row-marker' })
              clearElementSelection()
              setSelectedGuideId(null)
              setSelectedRowMarkerId(null)
              setPreview(null)
              setSnapTarget(null)
            }}
            onSelect={handleSelectRowMarker}
            onChange={updateRowMarker}
            onDelete={deleteRowMarker}
          />
        </section>

        <section className="panel-section">
          <div className="section-title-row"><h2>{locale === 'ru' ? 'Легенда' : 'Legend'}</h2></div>
          <label className="toggle-row">
            <span><strong>{locale === 'ru' ? 'Автоматическая легенда' : 'Automatic legend'}</strong><small>{locale === 'ru' ? 'Только реально используемые элементы; включается и в SVG.' : 'Only symbols actually used; also included in SVG.'}</small></span>
            <input type="checkbox" checked={legendVisible} onChange={(event) => setLegendVisible(event.target.checked)} />
          </label>
        </section>

"""
s = once(s, needle, right_insert + needle, 'app authoring panels')

# Guide lock UI: toggle plus disabled fieldset.
s = once(s,
"              <label className=\"toggle-row compact-toggle\">\n                <span>{t.visible}</span>\n                <input type=\"checkbox\" checked={selectedGuide.visible} onChange={(event) => updateSelectedGuide((guide) => ({ ...guide, visible: event.target.checked }))} />\n              </label>\n\n              {selectedGuide.type === 'arc' && (",
"              <label className=\"toggle-row compact-toggle\">\n                <span>{t.visible}</span>\n                <input type=\"checkbox\" checked={selectedGuide.visible} onChange={(event) => updateSelectedGuide((guide) => ({ ...guide, visible: event.target.checked }))} />\n              </label>\n              <label className=\"toggle-row compact-toggle\">\n                <span>{locale === 'ru' ? 'Заблокировать направляющую' : 'Lock guide'}</span>\n                <input type=\"checkbox\" checked={selectedGuide.locked === true} onChange={(event) => updateSelectedGuide((guide) => ({ ...guide, locked: event.target.checked }))} />\n              </label>\n\n              <fieldset className=\"guide-locked-fields\" disabled={selectedGuide.locked === true}>\n              {selectedGuide.type === 'arc' && (",
"app guide lock toggle")
s = once(s,
"              <p className=\"guide-note\">{t.guideNote}</p>\n",
"              </fieldset>\n\n              <p className=\"guide-note\">{t.guideNote}</p>\n",
"app guide lock fieldset close")

write(path, s)

# projectSchema tests: current normalized version and v15 authoring data.
path = 'src/editor/projectSchema.test.ts'
s = read(path)
s = s.replace("migrates legacy projects to schema v14", "migrates legacy projects to schema v15")
s = s.replace("expect(project.schemaVersion).toBe(14)", "expect(project.schemaVersion).toBe(15)", 1)
s = s.replace("preserves and validates schema v13 stitch colors while migrating to v14", "preserves and validates schema v13 stitch colors while migrating to v15")
s = s.replace("expect(parsed.schemaVersion).toBe(14)", "expect(parsed.schemaVersion).toBe(15)")
s = once(s,
"  it('rejects malformed stitch coordinates', () => {",
"  it('preserves schema v15 guide locks, row numbers and legend settings', () => {\n    const raw = legacyProject() as any\n    raw.schemaVersion = 15\n    raw.guides = [{ id: 'line-1', type: 'line', start: { x: 0, y: 0 }, end: { x: 100, y: 0 }, divisions: 8, visible: true, locked: true }]\n    raw.rowMarkers = [{ id: 'row-number-1', number: 1, x: -20, y: 15, visible: true, locked: false }]\n    raw.settings.legend = { visible: false }\n    const parsed = parseProject(raw, fallback)\n    expect(parsed.schemaVersion).toBe(15)\n    expect(parsed.guides?.[0].locked).toBe(true)\n    expect(parsed.rowMarkers).toEqual([{ id: 'row-number-1', number: 1, x: -20, y: 15, visible: true, locked: false }])\n    expect(parsed.settings.legend).toEqual({ visible: false })\n  })\n\n  it('rejects malformed schema v15 row numbers and legend settings', () => {\n    const raw = legacyProject() as any\n    raw.schemaVersion = 15\n    raw.rowMarkers = [{ id: 'bad', number: 0, x: 0, y: 0 }]\n    expect(() => parseProject(raw, fallback)).toThrow('Invalid row marker')\n    raw.rowMarkers = []\n    raw.settings.legend = { visible: 'yes' }\n    expect(() => parseProject(raw, fallback)).toThrow('Invalid legend settings')\n  })\n\n  it('rejects malformed stitch coordinates', () => {",
"schema authoring tests")
write(path, s)

print('v1.12 patch applied')
