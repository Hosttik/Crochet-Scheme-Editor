import fs from 'node:fs'

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Patch target not found: ${label}`)
  return source.replace(from, to)
}

let panel = fs.readFileSync('src/editor/ParametricRowEditorPanel.tsx', 'utf8')
panel = replaceOnce(
  panel,
  `import { resolveGuideRowCount } from './rowGenerator'`,
  `import { resolveGuideRowCount } from './rowGenerator'\nimport { RowSequenceEditor } from './RowSequenceEditor'`,
  'row sequence editor import',
)
panel = replaceOnce(
  panel,
  `      <label className="row-generator-field">\n        <span>{copy.stitch}</span>\n        <select\n          value={binding.symbolId}\n          onChange={(event) => onChange({ ...binding, symbolId: event.target.value })}\n        >\n          {SYMBOLS.map((symbol) => (\n            <option key={symbol.id} value={symbol.id}>\n              {symbolName(symbol.id, symbol.name, locale)}\n            </option>\n          ))}\n        </select>\n      </label>`,
  `      <label className="row-generator-field">\n        <span>{copy.stitch}</span>\n        <select\n          value={binding.symbolId}\n          onChange={(event) => onChange({ ...binding, symbolId: event.target.value })}\n        >\n          {SYMBOLS.map((symbol) => (\n            <option key={symbol.id} value={symbol.id}>\n              {symbolName(symbol.id, symbol.name, locale)}\n            </option>\n          ))}\n        </select>\n      </label>\n\n      <RowSequenceEditor\n        binding={binding}\n        locale={locale}\n        stitchCount={resolvedCount}\n        onChange={onChange}\n      />`,
  'row sequence editor render',
)
fs.writeFileSync('src/editor/ParametricRowEditorPanel.tsx', panel)

let app = fs.readFileSync('src/App.tsx', 'utf8')
app = replaceOnce(app, '    schemaVersion: 8,', '    schemaVersion: 9,', 'project schema version')
app = replaceOnce(
  app,
  `![1, 2, 3, 4, 5, 6, 7, 8].includes(raw.schemaVersion)`,
  `![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(raw.schemaVersion)`,
  'load schema list',
)
fs.writeFileSync('src/App.tsx', app)

let i18n = fs.readFileSync('src/i18n.ts', 'utf8')
i18n = i18n.replaceAll('v1.4', 'v1.5')
fs.writeFileSync('src/i18n.ts', i18n)

console.log('Mixed rows v1.5 integration applied.')
