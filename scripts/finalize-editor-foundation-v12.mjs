import fs from 'node:fs'

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Patch target not found: ${label}`)
  return source.replace(from, to)
}

const appPath = 'src/App.tsx'
let app = fs.readFileSync(appPath, 'utf8')

if (!app.includes('saveLocalProject,')) {
  app = replaceOnce(
    app,
    `  saveAutosave,\n  setActiveProjectId as persistActiveProjectId,`,
    `  saveAutosave,\n  saveLocalProject,\n  setActiveProjectId as persistActiveProjectId,`,
    'save local project import',
  )
  app = replaceOnce(
    app,
    `.then(() => saveAutosave(project))`,
    `.then(() => saveLocalProject(activeProjectId, project))`,
    'autosave captures project id',
  )
  app = replaceOnce(
    app,
    `  }, [elements, guides, hydrated, projectTitle, snapping])`,
    `  }, [activeProjectId, elements, guides, hydrated, projectTitle, snapping])`,
    'autosave project id dependency',
  )
  fs.writeFileSync(appPath, app)
}

const i18nPath = 'src/i18n.ts'
let i18n = fs.readFileSync(i18nPath, 'utf8')
i18n = i18n.replace('Векторный редактор схем · v1.0', 'Векторный редактор схем · v1.2')
i18n = i18n.replace('Vector pattern workspace · v1.0', 'Vector pattern workspace · v1.2')
fs.writeFileSync(i18nPath, i18n)

console.log('Editor foundation v1.2 final integration applied.')
