import fs from 'node:fs'

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Patch target not found: ${label}`)
  return source.replace(from, to)
}

const appPath = 'src/App.tsx'
let app = fs.readFileSync(appPath, 'utf8')

if (!app.includes('createPatternIncreaseSequence')) {
  app = replaceOnce(
    app,
    `import {\n  createNextPatternRow,\n  deleteParametricRow,`,
    `import {\n  createNextPatternRow,\n  createPatternIncreaseSequence,\n  deleteParametricRow,`,
    'sequence import',
  )

  app = replaceOnce(
    app,
    '    schemaVersion: 5,\n    metadata: { title, updatedAt: new Date().toISOString() },',
    '    schemaVersion: 6,\n    metadata: { title, updatedAt: new Date().toISOString() },',
    'project schema v6',
  )

  app = replaceOnce(
    app,
    '        ![1, 2, 3, 4, 5].includes(raw.schemaVersion) ||',
    '        ![1, 2, 3, 4, 5, 6].includes(raw.schemaVersion) ||',
    'load schema v6',
  )

  app = replaceOnce(
    app,
    `  const selectedParametricGuide = useMemo(\n    () => selectedParametricRow\n      ? guides.find((guide) => guide.id === selectedParametricRow.guideId) ?? null\n      : null,\n    [guides, selectedParametricRow],\n  )\n  const visibleElements`,
    `  const selectedParametricGuide = useMemo(\n    () => selectedParametricRow\n      ? guides.find((guide) => guide.id === selectedParametricRow.guideId) ?? null\n      : null,\n    [guides, selectedParametricRow],\n  )\n  const selectedParametricParentCount = useMemo(() => {\n    const parentRowId = selectedParametricRow?.parentRowId\n    if (!parentRowId) return undefined\n    const count = rowElements(elements, parentRowId).length\n    return count || undefined\n  }, [elements, selectedParametricRow])\n  const visibleElements`,
    'parent row count derivation',
  )

  app = replaceOnce(
    app,
    `  const handleUpdateParametricRow = (binding: ParametricRowBinding) => {`,
    `  const handleCreatePatternSequence = (rowId: string) => {\n    const parent = rowElements(elements, rowId)[0]?.parametricRow\n    if (!parent) return\n    const created = createPatternIncreaseSequence(elements, guides, parent, 6, 4, createId)\n    const lastRow = created.rows.at(-1)\n    if (!lastRow || !created.elements.length) {\n      setStatus(locale === 'ru' ? 'Нельзя создать серию +6 для этого ряда' : 'Cannot create a +6 sequence from this row')\n      return\n    }\n    commitElements([...elements, ...created.elements])\n    setSelectedIds(lastRow.elements.map((element) => element.id))\n    setSelectedGuideId(null)\n    setTool({ type: 'select' })\n    setPreview(null)\n    setSnapTarget(null)\n    const counts = created.rows.map((row) => row.elements.length).join(' → ')\n    setStatus((locale === 'ru' ? 'Создана серия рядов' : 'Row sequence created') + ': ' + counts)\n  }\n\n  const handleUpdateParametricRow = (binding: ParametricRowBinding) => {`,
    'sequence handler',
  )

  app = replaceOnce(
    app,
    `            onSelect={handleSelectPatternRow}\n            onCreateNext={handleCreateNextPatternRow}\n          />`,
    `            onSelect={handleSelectPatternRow}\n            onCreateNext={handleCreateNextPatternRow}\n            onCreateSequence={handleCreatePatternSequence}\n          />`,
    'rows panel sequence prop',
  )

  app = replaceOnce(
    app,
    `              guide={selectedParametricGuide}\n              locale={locale}\n              onChange={handleUpdateParametricRow}`,
    `              guide={selectedParametricGuide}\n              locale={locale}\n              parentStitchCount={selectedParametricParentCount}\n              onChange={handleUpdateParametricRow}`,
    'parametric editor parent count prop',
  )

  fs.writeFileSync(appPath, app)
}

const i18nPath = 'src/i18n.ts'
let i18n = fs.readFileSync(i18nPath, 'utf8')
i18n = i18n.replace('Векторный редактор схем · MVP 0.9', 'Векторный редактор схем · v1.0')
i18n = i18n.replace('Vector pattern workspace · MVP 0.9', 'Vector pattern workspace · v1.0')
fs.writeFileSync(i18nPath, i18n)

console.log('Row shaping v1.0 integration applied.')
