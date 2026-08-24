import fs from 'node:fs'

function replaceOnce(source, from, to, label) {
  if (!source.includes(from)) throw new Error(`Patch target not found: ${label}`)
  return source.replace(from, to)
}

const path = 'src/App.tsx'
let app = fs.readFileSync(path, 'utf8')

if (!app.includes("./editor/ProjectManagerPanel")) {
  app = replaceOnce(
    app,
    "import { PatternRowsPanel } from './editor/PatternRowsPanel'\n",
    "import { PatternRowsPanel } from './editor/PatternRowsPanel'\nimport { ProjectManagerPanel } from './editor/ProjectManagerPanel'\n",
    'project manager import',
  )

  app = replaceOnce(
    app,
    "import { clamp, screenToDocument } from './editor/geometry'\nimport { loadAutosave, saveAutosave } from './editor/persistence'\n",
    "import { clamp, screenToDocument } from './editor/geometry'\nimport { emptyHistory, pushHistory, redoHistory, undoHistory } from './editor/history'\nimport {\n  createLocalProject,\n  deleteLocalProject,\n  duplicateLocalProject,\n  getActiveProjectId,\n  listLocalProjects,\n  loadAutosave,\n  loadLocalProject,\n  saveAutosave,\n  setActiveProjectId as persistActiveProjectId,\n} from './editor/persistence'\nimport { viewportForElements } from './editor/viewportFit'\n",
    'foundation imports',
  )

  app = replaceOnce(
    app,
    `function NumberField({\n  label,\n  value,\n  onChange,\n  min,\n  max,\n  step = 1,\n}: {\n  label: string\n  value: number\n  onChange: (value: number) => void\n  min?: number\n  max?: number\n  step?: number\n}) {\n  return (\n    <label className="number-field">\n      <span>{label}</span>\n      <input\n        type="number"\n        value={Number.isFinite(value) ? value : 0}\n        min={min}\n        max={max}\n        step={step}\n        onChange={(event) => onChange(Number(event.target.value))}\n      />\n    </label>\n  )\n}`,
    `function NumberField({\n  label,\n  value,\n  onChange,\n  min,\n  max,\n  step = 1,\n}: {\n  label: string\n  value: number\n  onChange: (value: number) => void\n  min?: number\n  max?: number\n  step?: number\n}) {\n  const [draft, setDraft] = useState(String(Number.isFinite(value) ? value : 0))\n  useEffect(() => setDraft(String(Number.isFinite(value) ? value : 0)), [value])\n\n  const commit = () => {\n    const parsed = Number(draft)\n    if (!Number.isFinite(parsed)) {\n      setDraft(String(value))\n      return\n    }\n    if (parsed !== value) onChange(parsed)\n  }\n\n  return (\n    <label className="number-field">\n      <span>{label}</span>\n      <input\n        type="number"\n        value={draft}\n        min={min}\n        max={max}\n        step={step}\n        onChange={(event) => setDraft(event.target.value)}\n        onBlur={commit}\n        onKeyDown={(event) => {\n          if (event.key === 'Enter') event.currentTarget.blur()\n          if (event.key === 'Escape') {\n            setDraft(String(value))\n            event.currentTarget.blur()\n          }\n        }}\n      />\n    </label>\n  )\n}`,
    'transactional number field',
  )

  app = replaceOnce(
    app,
    `  const [locale, setLocale] = useState<Locale>(initialLocale)\n  const t = UI[locale]\n  const [elements, setElements] = useState<StitchElement[]>([])\n  const [guides, setGuides] = useState<Guide[]>([])\n  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] })`,
    `  const [locale, setLocale] = useState<Locale>(initialLocale)\n  const t = UI[locale]\n  const [activeProjectId, setActiveProjectIdState] = useState(getActiveProjectId)\n  const [projectTitle, setProjectTitle] = useState(UI[DEFAULT_LOCALE].projectTitle)\n  const [leftCollapsed, setLeftCollapsed] = useState(false)\n  const [rightCollapsed, setRightCollapsed] = useState(false)\n  const [elements, setElements] = useState<StitchElement[]>([])\n  const [guides, setGuides] = useState<Guide[]>([])\n  const [history, setHistory] = useState<HistoryState>(emptyHistory<DocumentSnapshot>())`,
    'foundation state',
  )

  app = replaceOnce(
    app,
    `        if (saved) {\n          const project = normalizeProject(saved, DEFAULT_SNAPPING)\n          setElements(reconcileParametricRows(project.elements, project.guides ?? [], createId))\n          setGuides(project.guides ?? [])\n          setSnapping(project.settings.snapping)\n          setStatus(UI[locale].autosaveRestored)\n        }\n        setAutosaveState('saved')`,
    `        if (saved) {\n          const project = normalizeProject(saved, DEFAULT_SNAPPING)\n          setProjectTitle(project.metadata.title)\n          setElements(reconcileParametricRows(project.elements, project.guides ?? [], createId))\n          setGuides(project.guides ?? [])\n          setSnapping(project.settings.snapping)\n          setStatus(UI[locale].autosaveRestored)\n        } else {\n          const initial = buildProject(UI[locale].projectTitle, [], [], DEFAULT_SNAPPING)\n          await saveAutosave(initial)\n          setProjectTitle(initial.metadata.title)\n        }\n        setAutosaveState('saved')`,
    'autosave restore project title',
  )

  app = replaceOnce(
    app,
    `      const project = buildProject(t.projectTitle, elements, guides, snapping)`,
    `      const project = buildProject(projectTitle, elements, guides, snapping)`,
    'autosave project title',
  )
  app = replaceOnce(
    app,
    `  }, [elements, guides, hydrated, snapping, t.projectTitle])`,
    `  }, [elements, guides, hydrated, projectTitle, snapping])`,
    'autosave dependencies',
  )

  app = replaceOnce(
    app,
    `  const recordSnapshot = useCallback((before: DocumentSnapshot) => {\n    setHistory((current) => ({\n      past: [...current.past.slice(-99), before],\n      future: [],\n    }))\n  }, [])`,
    `  const recordSnapshot = useCallback((before: DocumentSnapshot) => {\n    setHistory((current) => pushHistory(current, before))\n  }, [])`,
    'history push',
  )

  app = replaceOnce(
    app,
    `  const undo = useCallback(() => {\n    const previous = history.past.at(-1)\n    if (!previous) return\n    setHistory({\n      past: history.past.slice(0, -1),\n      future: [currentSnapshot(), ...history.future].slice(0, 100),\n    })\n    setElements(previous.elements)\n    setGuides(previous.guides)\n    clearElementSelection()\n    setSelectedGuideId(null)\n    setStatus(t.statusUndo)\n  }, [clearElementSelection, currentSnapshot, history, t.statusUndo])\n\n  const redo = useCallback(() => {\n    const next = history.future[0]\n    if (!next) return\n    setHistory({\n      past: [...history.past, currentSnapshot()].slice(-100),\n      future: history.future.slice(1),\n    })\n    setElements(next.elements)\n    setGuides(next.guides)\n    clearElementSelection()\n    setSelectedGuideId(null)\n    setStatus(t.statusRedo)\n  }, [clearElementSelection, currentSnapshot, history, t.statusRedo])`,
    `  const undo = useCallback(() => {\n    const step = undoHistory(history, currentSnapshot())\n    if (!step) return\n    setHistory(step.history)\n    setElements(step.value.elements)\n    setGuides(step.value.guides)\n    clearElementSelection()\n    setSelectedGuideId(null)\n    setStatus(t.statusUndo)\n  }, [clearElementSelection, currentSnapshot, history, t.statusUndo])\n\n  const redo = useCallback(() => {\n    const step = redoHistory(history, currentSnapshot())\n    if (!step) return\n    setHistory(step.history)\n    setElements(step.value.elements)\n    setGuides(step.value.guides)\n    clearElementSelection()\n    setSelectedGuideId(null)\n    setStatus(t.statusRedo)\n  }, [clearElementSelection, currentSnapshot, history, t.statusRedo])`,
    'history undo redo',
  )

  app = replaceOnce(
    app,
    `  const saveProject = () => {\n    const project = buildProject(t.projectTitle, elements, guides, snapping)`,
    `  const openLocalProjectDocument = (project: CrochetProject, id: string) => {\n    const normalized = normalizeProject(project, DEFAULT_SNAPPING)\n    persistActiveProjectId(id)\n    setActiveProjectIdState(id)\n    setProjectTitle(normalized.metadata.title)\n    setHistory(emptyHistory<DocumentSnapshot>())\n    setElements(reconcileParametricRows(normalized.elements, normalized.guides ?? [], createId))\n    setGuides(normalized.guides ?? [])\n    setSnapping(normalized.settings.snapping)\n    clearElementSelection()\n    setSelectedGuideId(null)\n    setTool({ type: 'select' })\n    setPreview(null)\n    setSnapTarget(null)\n  }\n\n  const handleOpenLocalProject = async (id: string) => {\n    const project = await loadLocalProject(id)\n    if (project) openLocalProjectDocument(project, id)\n  }\n\n  const handleNewLocalProject = async () => {\n    const existing = await listLocalProjects()\n    const base = locale === 'ru' ? 'Новая схема' : 'New pattern'\n    const title = base + ' ' + (existing.length + 1)\n    const project = buildProject(title, [], [], DEFAULT_SNAPPING)\n    const id = await createLocalProject(project)\n    openLocalProjectDocument(project, id)\n  }\n\n  const handleDuplicateLocalProject = async () => {\n    const title = projectTitle + (locale === 'ru' ? ' — копия' : ' — copy')\n    const project = buildProject(projectTitle, elements, guides, snapping)\n    const id = await duplicateLocalProject(project, title)\n    const copy = await loadLocalProject(id)\n    if (copy) openLocalProjectDocument(copy, id)\n  }\n\n  const handleDeleteLocalProject = async (id: string) => {\n    await deleteLocalProject(id)\n    const remaining = await listLocalProjects()\n    if (remaining[0]) {\n      await handleOpenLocalProject(remaining[0].id)\n    } else {\n      await handleNewLocalProject()\n    }\n  }\n\n  const saveProject = () => {\n    const project = buildProject(projectTitle, elements, guides, snapping)`,
    'local project handlers',
  )

  app = replaceOnce(
    app,
    `      const project = normalizeProject(raw, DEFAULT_SNAPPING)\n      setHistory({ past: [currentSnapshot()], future: [] })`,
    `      const project = normalizeProject(raw, DEFAULT_SNAPPING)\n      setProjectTitle(project.metadata.title)\n      setHistory({ past: [currentSnapshot()], future: [] })`,
    'loaded project title',
  )

  app = replaceOnce(
    app,
    `  const resetView = () => setViewport(DEFAULT_VIEWPORT)`,
    `  const resetView = () => setViewport(DEFAULT_VIEWPORT)\n  const fitAll = () => {\n    const rect = svgRef.current?.getBoundingClientRect()\n    if (!rect) return\n    const next = viewportForElements(visibleElements, SYMBOL_SIZES, rect.width, rect.height)\n    if (next) setViewport(next)\n  }\n  const fitSelection = () => {\n    if (!selectedIds.length) return\n    const rect = svgRef.current?.getBoundingClientRect()\n    if (!rect) return\n    const next = viewportForElements(visibleElements, SYMBOL_SIZES, rect.width, rect.height, selectedIds)\n    if (next) setViewport(next)\n  }`,
    'viewport fit handlers',
  )

  app = replaceOnce(
    app,
    `    <div className="app-shell">`,
    `    <div className={\`app-shell \${leftCollapsed ? 'left-collapsed' : ''} \${rightCollapsed ? 'right-collapsed' : ''}\`}>`,
    'collapsible app shell',
  )

  app = replaceOnce(
    app,
    `        </section>\n\n        <section className="panel-section guide-section">`,
    `        </section>\n\n        <ProjectManagerPanel\n          locale={locale}\n          activeProjectId={activeProjectId}\n          currentTitle={projectTitle}\n          onRename={setProjectTitle}\n          onOpen={handleOpenLocalProject}\n          onNew={handleNewLocalProject}\n          onDuplicate={handleDuplicateLocalProject}\n          onDelete={handleDeleteLocalProject}\n        />\n\n        <section className="panel-section guide-section">`,
    'project manager panel',
  )

  app = replaceOnce(
    app,
    `      <main className="workspace">\n        <div className="canvas-toolbar">`,
    `      <main className="workspace">\n        <button\n          className="sidebar-toggle left"\n          aria-label={locale === 'ru' ? 'Свернуть левую панель' : 'Toggle left sidebar'}\n          onClick={() => setLeftCollapsed((value) => !value)}\n        >{leftCollapsed ? '›' : '‹'}</button>\n        <button\n          className="sidebar-toggle right"\n          aria-label={locale === 'ru' ? 'Свернуть правую панель' : 'Toggle right sidebar'}\n          onClick={() => setRightCollapsed((value) => !value)}\n        >{rightCollapsed ? '‹' : '›'}</button>\n\n        <div className="canvas-toolbar">`,
    'sidebar toggle buttons',
  )

  app = replaceOnce(
    app,
    `          <button onClick={() => setViewport((value) => ({ ...value, zoom: clamp(value.zoom * 1.2, 0.1, 5) }))}>+</button>\n          <span className="canvas-hint">{t.zoomHint}</span>`,
    `          <button onClick={() => setViewport((value) => ({ ...value, zoom: clamp(value.zoom * 1.2, 0.1, 5) }))}>+</button>\n          <button\n            className="fit-button"\n            aria-label={locale === 'ru' ? 'Вместить всю схему' : 'Fit all'}\n            onClick={fitAll}\n            disabled={!visibleElements.length}\n          >{locale === 'ru' ? 'Всё' : 'All'}</button>\n          <button\n            className="fit-button"\n            aria-label={locale === 'ru' ? 'Вместить выделение' : 'Fit selection'}\n            onClick={fitSelection}\n            disabled={!selectedIds.length}\n          >{locale === 'ru' ? 'Выбор' : 'Sel'}</button>\n          <span className="canvas-hint">{t.zoomHint}</span>`,
    'fit toolbar buttons',
  )

  fs.writeFileSync(path, app)
}

console.log('Editor foundation v1.2 App integration applied.')
