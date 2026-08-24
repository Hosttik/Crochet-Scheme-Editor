import fs from 'node:fs'

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Patch target not found: ${label}`)
  return source.replace(from, to)
}

const appPath = 'src/App.tsx'
let app = fs.readFileSync(appPath, 'utf8')

if (!app.includes("./editor/PatternRowsPanel")) {
  app = replaceOnce(
    app,
    "import { ParametricRowEditorPanel } from './editor/ParametricRowEditorPanel'\nimport { LayersPanel } from './editor/LayersPanel'",
    "import { ParametricRowEditorPanel } from './editor/ParametricRowEditorPanel'\nimport { PatternRowsPanel } from './editor/PatternRowsPanel'\nimport { LayersPanel } from './editor/LayersPanel'",
    'PatternRowsPanel import',
  )

  app = replaceOnce(
    app,
    "import {\n  deleteParametricRow,\n  expandIdsToParametricRows,",
    "import {\n  createNextPatternRow,\n  deleteParametricRow,\n  expandIdsToParametricRows,\n  nextPatternOrder,",
    'pattern row helpers import',
  )

  app = replaceOnce(
    app,
    '    schemaVersion: 4,\n    metadata: { title, updatedAt: new Date().toISOString() },',
    '    schemaVersion: 5,\n    metadata: { title, updatedAt: new Date().toISOString() },',
    'project schema v5',
  )

  app = replaceOnce(
    app,
    '        ![1, 2, 3, 4].includes(raw.schemaVersion) ||',
    '        ![1, 2, 3, 4, 5].includes(raw.schemaVersion) ||',
    'load schema v5',
  )

  app = replaceOnce(
    app,
    `  const handleGenerateGuideRow = (generated: StitchElement[]) => {\n    if (!generated.length) return\n    commitElements([...elements, ...generated])\n    setSelectedIds(generated.map((element) => element.id))\n    setSelectedGuideId(null)\n    setTool({ type: 'select' })\n    setPreview(null)\n    setSnapTarget(null)\n    setStatus(\`${'${'}locale === 'ru' ? 'Создан ряд' : 'Row generated'}: ${'${'}generated.length}\`)\n  }`,
    `  const handleGenerateGuideRow = (generated: StitchElement[]) => {\n    if (!generated.length) return\n    const generatedBinding = generated.find((element) => element.parametricRow)?.parametricRow\n    let prepared = generated\n    if (generatedBinding && generatedBinding.patternOrder == null) {\n      const patternOrder = nextPatternOrder(elements)\n      prepared = generated.map((element) =>\n        element.parametricRow\n          ? { ...element, parametricRow: { ...element.parametricRow, patternOrder } }\n          : element,\n      )\n    }\n    commitElements([...elements, ...prepared])\n    setSelectedIds(prepared.map((element) => element.id))\n    setSelectedGuideId(null)\n    setTool({ type: 'select' })\n    setPreview(null)\n    setSnapTarget(null)\n    setStatus((locale === 'ru' ? 'Создан ряд' : 'Row generated') + ': ' + prepared.length)\n  }`,
    'generated rows receive pattern order',
  )

  app = replaceOnce(
    app,
    `  const handleUpdateParametricRow = (binding: ParametricRowBinding) => {`,
    `  const handleSelectPatternRow = (rowId: string) => {\n    const ids = rowElements(elements, rowId).map((element) => element.id)\n    if (!ids.length) return\n    setSelectedIds(ids)\n    setSelectedGuideId(null)\n    setTool({ type: 'select' })\n    setPreview(null)\n    setSnapTarget(null)\n    setStatus((locale === 'ru' ? 'Выбран ряд' : 'Row selected') + ': ' + ids.length)\n  }\n\n  const handleCreateNextPatternRow = (rowId: string, countIncrement: number) => {\n    const parent = rowElements(elements, rowId)[0]?.parametricRow\n    if (!parent) return\n    const created = createNextPatternRow(elements, guides, parent, countIncrement, createId)\n    if (!created) {\n      setStatus(locale === 'ru' ? 'Для ряда не найдена совместимая направляющая' : 'No compatible guide found for this row')\n      return\n    }\n    commitElements([...elements, ...created.elements])\n    setSelectedIds(created.elements.map((element) => element.id))\n    setSelectedGuideId(null)\n    setTool({ type: 'select' })\n    setPreview(null)\n    setSnapTarget(null)\n    const order = created.binding.patternOrder ?? nextPatternOrder(elements)\n    setStatus((locale === 'ru' ? 'Создан следующий ряд' : 'Next row created') + ' ' + order + ': ' + created.elements.length)\n  }\n\n  const handleUpdateParametricRow = (binding: ParametricRowBinding) => {`,
    'pattern row handlers',
  )

  app = replaceOnce(
    app,
    `        </section>\n\n        <section className="panel-section">\n          <div className="section-title-row"><h2>{t.selection}</h2></div>`,
    `        </section>\n\n        <section className="panel-section">\n          <PatternRowsPanel\n            elements={elements}\n            locale={locale}\n            selectedRowId={selectedParametricRow?.id ?? null}\n            onSelect={handleSelectPatternRow}\n            onCreateNext={handleCreateNextPatternRow}\n          />\n        </section>\n\n        <section className="panel-section">\n          <div className="section-title-row"><h2>{t.selection}</h2></div>`,
    'pattern rows panel UI',
  )

  fs.writeFileSync(appPath, app)
}

const i18nPath = 'src/i18n.ts'
let i18n = fs.readFileSync(i18nPath, 'utf8')
i18n = i18n.replace('Векторный редактор схем · MVP 0.8', 'Векторный редактор схем · MVP 0.9')
i18n = i18n.replace('Vector pattern workspace · MVP 0.8', 'Vector pattern workspace · MVP 0.9')
fs.writeFileSync(i18nPath, i18n)

console.log('Pattern rows v0.9 integration applied.')
