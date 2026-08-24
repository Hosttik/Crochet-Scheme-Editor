import fs from 'node:fs'

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Patch target not found: ${label}`)
  return source.replace(from, to)
}

const appPath = 'src/App.tsx'
let app = fs.readFileSync(appPath, 'utf8')
if (app.includes("./editor/ParametricRowEditorPanel")) {
  console.log('App already patched; nothing to do.')
  process.exit(0)
}

app = replaceOnce(
  app,
  "import { GuideRowGeneratorPanel } from './editor/GuideRowGeneratorPanel'\nimport { LayersPanel } from './editor/LayersPanel'",
  "import { GuideRowGeneratorPanel } from './editor/GuideRowGeneratorPanel'\nimport { ParametricRowEditorPanel } from './editor/ParametricRowEditorPanel'\nimport { LayersPanel } from './editor/LayersPanel'",
  'editor imports',
)

app = replaceOnce(
  app,
  "import { loadAutosave, saveAutosave } from './editor/persistence'\nimport {\n  idsInMarquee,",
  "import { loadAutosave, saveAutosave } from './editor/persistence'\nimport {\n  deleteParametricRow,\n  expandIdsToParametricRows,\n  parametricRowFromSelection,\n  reconcileParametricRows,\n  rowElements,\n  updateParametricRow,\n} from './editor/parametricRows'\nimport {\n  idsInMarquee,",
  'parametric imports',
)

app = replaceOnce(
  app,
  "  OrientationMode,\n  Point,",
  "  OrientationMode,\n  ParametricRowBinding,\n  Point,",
  'parametric row type import',
)

app = replaceOnce(app, '    schemaVersion: 3,', '    schemaVersion: 4,', 'schema version')
app = app.replaceAll(
  'setElements(project.elements)',
  'setElements(reconcileParametricRows(project.elements, project.guides ?? [], createId))',
)
app = replaceOnce(
  app,
  '![1, 2, 3].includes(raw.schemaVersion)',
  '![1, 2, 3, 4].includes(raw.schemaVersion)',
  'load schema validation',
)

app = replaceOnce(
  app,
  '  const primaryId = selectedIds.at(-1) ?? null',
  `  useEffect(() => {\n    if (!hydrated) return\n    setElements((current) => reconcileParametricRows(current, guides, createId))\n  }, [guides, hydrated])\n\n  const primaryId = selectedIds.at(-1) ?? null`,
  'guide reconciliation effect',
)

app = replaceOnce(
  app,
  `  const visibleElements = useMemo(() => elements.filter(isElementVisible), [elements])`,
  `  const selectedParametricRow = useMemo(\n    () => parametricRowFromSelection(elements, selectedIds),\n    [elements, selectedIds],\n  )\n  const selectedParametricGuide = useMemo(\n    () => selectedParametricRow\n      ? guides.find((guide) => guide.id === selectedParametricRow.guideId) ?? null\n      : null,\n    [guides, selectedParametricRow],\n  )\n  const visibleElements = useMemo(() => elements.filter(isElementVisible), [elements])`,
  'selected parametric row derivation',
)

app = replaceOnce(
  app,
  '      const deletable = new Set(unlockedSelectedIds())',
  '      const deletable = new Set(expandIdsToParametricRows(elements, unlockedSelectedIds()))',
  'delete whole parametric row',
)

app = replaceOnce(
  app,
  `      y: element.y + offset,\n      locked: false,\n    }))\n    commitElements([...elements, ...pasted])`,
  `      y: element.y + offset,\n      locked: false,\n      parametricRow: undefined,\n    }))\n    commitElements([...elements, ...pasted])`,
  'paste detaches parametric metadata',
)

app = replaceOnce(
  app,
  `        y: element.y + DUPLICATE_OFFSET,\n        locked: false,\n      }))\n    commitElements([...elements, ...duplicated])`,
  `        y: element.y + DUPLICATE_OFFSET,\n        locked: false,\n        parametricRow: undefined,\n      }))\n    commitElements([...elements, ...duplicated])`,
  'duplicate detaches parametric metadata',
)

app = replaceOnce(
  app,
  `    setSelectedIds((current) => {\n      if (!additive) return [id]\n      return current.includes(id) ? current.filter((item) => item !== id) : [...current, id]\n    })`,
  `    setSelectedIds((current) => {\n      const targetIds = expandIdsToParametricRows(elements, [id])\n      if (!additive) return targetIds\n      const targetSet = new Set(targetIds)\n      const allSelected = targetIds.every((item) => current.includes(item))\n      return allSelected\n        ? current.filter((item) => !targetSet.has(item))\n        : uniqueIds([...current, ...targetIds])\n    })`,
  'layer selection expands parametric row',
)

app = replaceOnce(
  app,
  '        const next = uniqueIds([...marquee.baseIds, ...hits])',
  '        const next = expandIdsToParametricRows(elements, uniqueIds([...marquee.baseIds, ...hits]))',
  'marquee expands parametric row',
)

app = replaceOnce(
  app,
  `    event.stopPropagation()\n\n    const alreadySelected = selectedIds.includes(element.id)`,
  `    event.stopPropagation()\n\n    if (element.parametricRow) {\n      const rowIds = rowElements(elements, element.parametricRow.id).map((item) => item.id)\n      const rowSet = new Set(rowIds)\n      const rowAlreadySelected = rowIds.every((id) => selectedIds.includes(id))\n      setSelectedIds(\n        event.shiftKey\n          ? rowAlreadySelected\n            ? selectedIds.filter((id) => !rowSet.has(id))\n            : uniqueIds([...selectedIds, ...rowIds])\n          : rowIds,\n      )\n      setSelectedGuideId(null)\n      setTool({ type: 'select' })\n      setStatus(\\`${locale === 'ru' ? 'Выбран параметрический ряд' : 'Parametric row selected'}: \\${rowIds.length}\\`)\n      return\n    }\n\n    const alreadySelected = selectedIds.includes(element.id)`,
  'parametric row pointer selection',
)

app = replaceOnce(
  app,
  'if (event.button !== 0 || spacePressedRef.current || isElementLocked(element)) return',
  'if (event.button !== 0 || spacePressedRef.current || isElementLocked(element) || element.parametricRow) return',
  'disable direct row rotation',
)

app = replaceOnce(
  app,
  '          if (!selectedSet.has(element.id) || isElementLocked(element)) return element',
  '          if (!selectedSet.has(element.id) || isElementLocked(element) || element.parametricRow) return element',
  'disable direct row drag',
)

app = replaceOnce(
  app,
  `        selected.has(element.id)\n          ? { ...element, rotation: element.rotation + delta }`,
  `        selected.has(element.id) && !element.parametricRow\n          ? { ...element, rotation: element.rotation + delta }`,
  'disable row nudge rotation',
)

app = replaceOnce(
  app,
  `  const saveProject = () => {`,
  `  const handleUpdateParametricRow = (binding: ParametricRowBinding) => {\n    const next = updateParametricRow(elements, guides, binding.id, binding, createId)\n    commitElements(next)\n    setSelectedIds(rowElements(next, binding.id).map((element) => element.id))\n    setSelectedGuideId(null)\n    setStatus(locale === 'ru' ? 'Параметрический ряд перестроен' : 'Parametric row rebuilt')\n  }\n\n  const handleDeleteParametricRow = (rowId: string) => {\n    commitElements(deleteParametricRow(elements, rowId))\n    clearElementSelection()\n    setStatus(locale === 'ru' ? 'Параметрический ряд удалён' : 'Parametric row deleted')\n  }\n\n  const saveProject = () => {`,
  'parametric row edit handlers',
)

app = replaceOnce(
  app,
  `          {selectedElement ? (`,
  `          {selectedParametricRow && selectedParametricGuide ? (\n            <ParametricRowEditorPanel\n              binding={selectedParametricRow}\n              guide={selectedParametricGuide}\n              locale={locale}\n              onChange={handleUpdateParametricRow}\n              onDelete={() => handleDeleteParametricRow(selectedParametricRow.id)}\n            />\n          ) : selectedElement ? (`,
  'parametric row editor UI',
)

fs.writeFileSync(appPath, app)

const i18nPath = 'src/i18n.ts'
let i18n = fs.readFileSync(i18nPath, 'utf8')
i18n = i18n.replace('Векторный редактор схем · MVP 0.7', 'Векторный редактор схем · MVP 0.8')
i18n = i18n.replace('Vector pattern workspace · MVP 0.7', 'Vector pattern workspace · MVP 0.8')
fs.writeFileSync(i18nPath, i18n)

const packagePath = 'package.json'
const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'))
pkg.version = '0.8.0'
fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`)

console.log('Parametric row v0.8 integration applied.')
