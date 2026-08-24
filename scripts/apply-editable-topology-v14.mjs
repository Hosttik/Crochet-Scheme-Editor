import fs from 'node:fs'

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Patch target not found: ${label}`)
  return source.replace(from, to)
}

let app = fs.readFileSync('src/App.tsx', 'utf8')

app = replaceOnce(
  app,
  `import { StitchLayer } from './editor/StitchLayer'`,
  `import { StitchLayer } from './editor/StitchLayer'\nimport { TopologyEditorPanel } from './editor/TopologyEditorPanel'`,
  'topology editor import',
)
app = replaceOnce(
  app,
  `import { solveSnap, type SnapCandidate } from './editor/snapping'`,
  `import { solveSnap, type SnapCandidate } from './editor/snapping'\nimport type { TopologyChangeMarker } from './editor/topology'`,
  'topology marker type import',
)
app = replaceOnce(app, '    schemaVersion: 7,', '    schemaVersion: 8,', 'project schema version')
app = replaceOnce(
  app,
  `  const [selectedIds, setSelectedIds] = useState<string[]>([])\n  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null)`,
  `  const [selectedIds, setSelectedIds] = useState<string[]>([])\n  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null)\n  const [selectedTopologyParentId, setSelectedTopologyParentId] = useState<string | null>(null)`,
  'topology selection state',
)
app = replaceOnce(
  app,
  `  const selectedParametricRow = useMemo(\n    () => parametricRowFromSelection(elements, selectedIds),\n    [elements, selectedIds],\n  )\n  const selectedParametricGuide = useMemo(`,
  `  const selectedParametricRow = useMemo(\n    () => parametricRowFromSelection(elements, selectedIds),\n    [elements, selectedIds],\n  )\n  const selectedParametricRowId = selectedParametricRow?.id ?? null\n  useEffect(() => {\n    setSelectedTopologyParentId(null)\n  }, [selectedParametricRowId])\n  const selectedParametricGuide = useMemo(`,
  'reset topology selection when row changes',
)
app = replaceOnce(
  app,
  `  const handleElementPointerDown = (\n    event: ReactPointerEvent<SVGGElement>,\n    element: StitchElement,\n  ) => {`,
  `  const handleTopologyMarkerPointerDown = (\n    event: ReactPointerEvent<SVGGElement>,\n    marker: TopologyChangeMarker,\n  ) => {\n    event.preventDefault()\n    event.stopPropagation()\n    setSelectedTopologyParentId(marker.parentId)\n    setStatus(locale === 'ru' ? 'Выбрана позиция изменения' : 'Topology change selected')\n  }\n\n  const handleElementPointerDown = (\n    event: ReactPointerEvent<SVGGElement>,\n    element: StitchElement,\n  ) => {`,
  'topology marker pointer handler',
)
app = replaceOnce(
  app,
  `![1, 2, 3, 4, 5, 6, 7].includes(raw.schemaVersion)`,
  `![1, 2, 3, 4, 5, 6, 7, 8].includes(raw.schemaVersion)`,
  'load schema list',
)
app = replaceOnce(
  app,
  `            <StitchLayer\n              elements={elements}\n              selectedIds={selectedIds}\n              primaryId={primaryId}\n              zoom={viewport.zoom}\n              sourceAnchor={snapping.sourceAnchor}\n              marquee={marqueeRect}\n              onElementPointerDown={handleElementPointerDown}\n              onRotatePointerDown={handleRotatePointerDown}\n            />`,
  `            <StitchLayer\n              elements={elements}\n              selectedIds={selectedIds}\n              primaryId={primaryId}\n              zoom={viewport.zoom}\n              sourceAnchor={snapping.sourceAnchor}\n              marquee={marqueeRect}\n              selectedTopologyParentId={selectedTopologyParentId}\n              onElementPointerDown={handleElementPointerDown}\n              onRotatePointerDown={handleRotatePointerDown}\n              onTopologyMarkerPointerDown={handleTopologyMarkerPointerDown}\n            />`,
  'StitchLayer topology props',
)
app = replaceOnce(
  app,
  `          {selectedParametricRow && selectedParametricGuide ? (\n            <ParametricRowEditorPanel\n              binding={selectedParametricRow}\n              guide={selectedParametricGuide}\n              locale={locale}\n              parentStitchCount={selectedParametricParentCount}\n              onChange={handleUpdateParametricRow}\n              onDelete={() => handleDeleteParametricRow(selectedParametricRow.id)}\n            />\n          ) : selectedElement ? (`,
  `          {selectedParametricRow && selectedParametricGuide ? (\n            <>\n              <ParametricRowEditorPanel\n                binding={selectedParametricRow}\n                guide={selectedParametricGuide}\n                locale={locale}\n                parentStitchCount={selectedParametricParentCount}\n                onChange={handleUpdateParametricRow}\n                onDelete={() => handleDeleteParametricRow(selectedParametricRow.id)}\n              />\n              <TopologyEditorPanel\n                elements={elements}\n                binding={selectedParametricRow}\n                locale={locale}\n                selectedParentId={selectedTopologyParentId}\n                onSelectParentId={setSelectedTopologyParentId}\n                onChange={handleUpdateParametricRow}\n              />\n            </>\n          ) : selectedElement ? (`,
  'topology editor render',
)

fs.writeFileSync('src/App.tsx', app)

let i18n = fs.readFileSync('src/i18n.ts', 'utf8')
i18n = i18n.replaceAll('v1.3', 'v1.4')
fs.writeFileSync('src/i18n.ts', i18n)

console.log('Editable topology v1.4 integration applied.')
