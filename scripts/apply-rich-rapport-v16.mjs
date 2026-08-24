import fs from 'node:fs'

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Patch target not found: ${label}`)
  return source.replace(from, to)
}

let app = fs.readFileSync('src/App.tsx', 'utf8')
app = replaceOnce(app, '    schemaVersion: 9,', '    schemaVersion: 10,', 'buildProject schema')
app = replaceOnce(
  app,
  '![1, 2, 3, 4, 5, 6, 7, 8, 9].includes(raw.schemaVersion)',
  '![1, 2, 3, 4, 5, 6, 7, 8, 9, 10].includes(raw.schemaVersion)',
  'load schema whitelist',
)
fs.writeFileSync('src/App.tsx', app)

let i18n = fs.readFileSync('src/i18n.ts', 'utf8')
if (!i18n.includes('v1.5')) throw new Error('Patch target not found: v1.5 subtitle')
i18n = i18n.replaceAll('v1.5', 'v1.6')
fs.writeFileSync('src/i18n.ts', i18n)

console.log('Rich rapport v1.6 integration applied.')
