import fs from 'node:fs'

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Patch target not found: ${label}`)
  return source.replace(from, to)
}

let app = fs.readFileSync('src/App.tsx', 'utf8')
app = replaceOnce(app, '    schemaVersion: 6,', '    schemaVersion: 7,', 'project schema version')
app = replaceOnce(app, '![1, 2, 3, 4, 5, 6].includes(raw.schemaVersion)', '![1, 2, 3, 4, 5, 6, 7].includes(raw.schemaVersion)', 'load schema list')
app = replaceOnce(app, '      parametricRow: undefined,\n    }))', '      parametricRow: undefined,\n      parentStitchIds: undefined,\n    }))', 'paste topology detach')
app = replaceOnce(app, '        parametricRow: undefined,\n      }))', '        parametricRow: undefined,\n        parentStitchIds: undefined,\n      }))', 'duplicate topology detach')
app = replaceOnce(
  app,
  '      commitElements(elements.filter((element) => !deletable.has(element.id)))',
  '      commitElements(reconcileParametricRows(\n        elements.filter((element) => !deletable.has(element.id)),\n        guides,\n        createId,\n      ))',
  'delete topology reconciliation',
)
fs.writeFileSync('src/App.tsx', app)

let rows = fs.readFileSync('src/editor/parametricRows.ts', 'utf8')
rows = replaceOnce(
  rows,
  `    const parents = rowElements(next, binding.parentRowId)\n    const children = rowElements(next, binding.id)\n    const linked = parents.length\n      ? applyRowTopology(children, parents, binding.shaping)\n      : children.map((element) => ({ ...element, parentStitchIds: undefined }))\n    next = replaceRowBlock(next, binding.id, linked)`,
  `    const parents = rowElements(next, binding.parentRowId)\n    const children = rowElements(next, binding.id)\n    if (!parents.length) {\n      const detachedChildren = children.map((element) => ({\n        ...element,\n        parentStitchIds: undefined,\n        parametricRow: element.parametricRow\n          ? { ...element.parametricRow, parentRowId: undefined, shaping: undefined }\n          : undefined,\n      }))\n      next = replaceRowBlock(next, binding.id, detachedChildren)\n      continue\n    }\n    next = replaceRowBlock(next, binding.id, applyRowTopology(children, parents, binding.shaping))`,
  'orphan parent topology cleanup',
)
fs.writeFileSync('src/editor/parametricRows.ts', rows)

let i18n = fs.readFileSync('src/i18n.ts', 'utf8')
i18n = i18n.replaceAll('v1.2', 'v1.3')
fs.writeFileSync('src/i18n.ts', i18n)

console.log('Stitch topology v1.3 integration applied.')
