from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, content: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(content)


def replace(path: str, old: str, new: str, count: int = 1) -> None:
    text = read(path)
    found = text.count(old)
    if found != count:
        raise RuntimeError(f'{path}: expected {count}, found {found}: {old[:120]!r}')
    write(path, text.replace(old, new))


# Schema version is a compatibility boundary: v18 introduces strict project-wide
# integrity rules while v1-v17 continue to migrate through legacy repair paths.
write('src/editor/projectVersion.ts', """export const MIN_PROJECT_SCHEMA_VERSION = 1\nexport const CURRENT_PROJECT_SCHEMA_VERSION = 18\nexport const STRICT_PROJECT_SCHEMA_VERSION = 18\n""")

replace(
    'src/types.ts',
    'schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17',
    'schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18',
)

replace(
    'src/editor/projectSchema.ts',
    "import { MAX_PROJECT_ELEMENTS, MAX_PROJECT_GUIDES, MAX_PROJECT_ROW_MARKERS, projectIntegrityIssue } from './projectIntegrity'\n",
    "import { MAX_PROJECT_ELEMENTS, MAX_PROJECT_GUIDES, MAX_PROJECT_ROW_MARKERS, projectIntegrityIssue } from './projectIntegrity'\nimport { CURRENT_PROJECT_SCHEMA_VERSION, MIN_PROJECT_SCHEMA_VERSION, STRICT_PROJECT_SCHEMA_VERSION } from './projectVersion'\n",
)
replace(
    'src/editor/projectSchema.ts',
    "  if (!finite(raw.schemaVersion) || raw.schemaVersion < 1 || raw.schemaVersion > 17) throw new ProjectValidationError('Unsupported project schema')\n",
    "  if (\n    !finite(raw.schemaVersion) || !Number.isInteger(raw.schemaVersion) ||\n    raw.schemaVersion < MIN_PROJECT_SCHEMA_VERSION || raw.schemaVersion > CURRENT_PROJECT_SCHEMA_VERSION\n  ) throw new ProjectValidationError('Unsupported project schema')\n",
)
replace(
    'src/editor/projectSchema.ts',
    '    schemaVersion: 17,\n',
    '    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,\n',
)
replace(
    'src/editor/projectSchema.ts',
    '  const integrityIssue = projectIntegrityIssue(project, raw.schemaVersion >= 17)\n',
    '  const integrityIssue = projectIntegrityIssue(project, raw.schemaVersion >= STRICT_PROJECT_SCHEMA_VERSION)\n',
)

replace(
    'src/editor/projectIntegrity.ts',
    'export const MAX_BACKGROUND_DATA_URL_LENGTH = 8_000_000\n',
    'export const MAX_BACKGROUND_DATA_URL_LENGTH = 8_000_000\nconst MAX_LEGACY_BACKGROUND_DATA_URL_LENGTH = 25_000_000\n',
)
replace(
    'src/editor/projectIntegrity.ts',
    "  if (background) {\n    if (background.dataUrl.length > MAX_BACKGROUND_DATA_URL_LENGTH) return 'Background image is too large'\n",
    "  if (background) {\n    const maxBackgroundLength = strictReferences ? MAX_BACKGROUND_DATA_URL_LENGTH : MAX_LEGACY_BACKGROUND_DATA_URL_LENGTH\n    if (background.dataUrl.length > maxBackgroundLength) return 'Background image is too large'\n",
)

# App writes the current schema centrally and blocks persistence if hydration of
# an existing document failed validation. This preserves the original bytes for
# recovery instead of silently autosaving an empty document over them.
replace(
    'src/App.tsx',
    "import { semanticLockIds, semanticSelectionIds } from './editor/selectionModel'\n",
    "import { semanticLockIds, semanticSelectionIds } from './editor/selectionModel'\nimport { CURRENT_PROJECT_SCHEMA_VERSION } from './editor/projectVersion'\n",
)
replace(
    'src/App.tsx',
    '    schemaVersion: 17,\n',
    '    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,\n',
)
replace(
    'src/App.tsx',
    "  const autosaveSettingsWriteRef = useRef<AutosaveDelayMs | null>(null)\n",
    "  const autosaveSettingsWriteRef = useRef<AutosaveDelayMs | null>(null)\n  const persistenceBlockedRef = useRef(false)\n",
)
replace(
    'src/App.tsx',
    "        if (saved) {\n          const project = normalizeProject(saved, DEFAULT_SNAPPING)\n",
    "        if (saved) {\n          const project = normalizeProject(saved, DEFAULT_SNAPPING)\n          persistenceBlockedRef.current = false\n",
)
replace(
    'src/App.tsx',
    "        } else {\n          const initial = buildProject(UI[locale].projectTitle, [], [], DEFAULT_SNAPPING)\n          await saveAutosave(initial)\n          setProjectTitle(initial.metadata.title)\n        }\n        setAutosaveState('saved')\n      } catch {\n        if (!cancelled) setAutosaveState('error')\n",
    "        } else {\n          const initial = buildProject(UI[locale].projectTitle, [], [], DEFAULT_SNAPPING)\n          await saveAutosave(initial)\n          persistenceBlockedRef.current = false\n          setProjectTitle(initial.metadata.title)\n        }\n        setAutosaveState('saved')\n      } catch {\n        if (!cancelled) {\n          persistenceBlockedRef.current = true\n          setAutosaveState('error')\n        }\n",
)
replace(
    'src/App.tsx',
    "  useEffect(() => {\n    if (!hydrated) return\n    if (autosaveSettingsWriteRef.current === autosaveDelayMs) {\n",
    "  useEffect(() => {\n    if (!hydrated) return\n    if (persistenceBlockedRef.current) {\n      setAutosaveState('error')\n      return\n    }\n    if (autosaveSettingsWriteRef.current === autosaveDelayMs) {\n",
)
replace(
    'src/App.tsx',
    "  const flushCurrentProject = useCallback(async () => {\n    if (!hydrated) return\n",
    "  const flushCurrentProject = useCallback(async () => {\n    if (!hydrated || persistenceBlockedRef.current) return\n",
)
replace(
    'src/App.tsx',
    "  const openLocalProjectDocument = (project: CrochetProject, id: string) => {\n    cancelPendingAutosave()\n    autosaveRevisionRef.current += 1\n    const normalized = normalizeProject(project, DEFAULT_SNAPPING)\n",
    "  const openLocalProjectDocument = (project: CrochetProject, id: string) => {\n    cancelPendingAutosave()\n    autosaveRevisionRef.current += 1\n    const normalized = normalizeProject(project, DEFAULT_SNAPPING)\n    persistenceBlockedRef.current = false\n",
)
replace(
    'src/App.tsx',
    "  const handleAutosaveDelayChange = (delayMs: AutosaveDelayMs) => {\n    cancelPendingAutosave()\n    autosaveSettingsWriteRef.current = delayMs\n",
    "  const handleAutosaveDelayChange = (delayMs: AutosaveDelayMs) => {\n    cancelPendingAutosave()\n    if (persistenceBlockedRef.current) {\n      setAutosaveDelayMs(delayMs)\n      setAutosaveState('error')\n      return\n    }\n    autosaveSettingsWriteRef.current = delayMs\n",
)
replace(
    'src/App.tsx',
    "      const project = normalizeProject(raw, DEFAULT_SNAPPING)\n      setProjectTitle(project.metadata.title)\n",
    "      const project = normalizeProject(raw, DEFAULT_SNAPPING)\n      persistenceBlockedRef.current = false\n      setProjectTitle(project.metadata.title)\n",
)

# Tests: current projects are v18; old versions still migrate to v18.
text = read('src/editor/projectSchema.test.ts')
if 'toBe(17)' not in text:
    raise RuntimeError('projectSchema.test.ts: expected current-version assertions')
write('src/editor/projectSchema.test.ts', text.replace('toBe(17)', 'toBe(18)'))

replace(
    'src/editor/projectIntegrity.test.ts',
    '  schemaVersion: 17,\n',
    '  schemaVersion: 18,\n',
)

# Regression: an invalid persisted project must never be overwritten by the
# default in-memory state after restore fails.
data_test = read('e2e/dataIntegrity.e2e.ts')
data_test += """

test('preserves an invalid stored project when hydration validation fails', async ({ page }) => {
  await page.goto('/Crochet-Scheme-Editor/')
  await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('crochet-scheme-editor', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const invalid = {
      schemaVersion: 17,
      metadata: { title: 'Recovery target', updatedAt: '2026-08-26T00:00:00Z' },
      elements: [{ id: 'keep-me', symbolId: 'unknown-legacy-symbol', x: 10, y: 20, rotation: 0 }],
      guides: [], rowMarkers: [],
      settings: { snapping: { enabled: true, sourceAnchor: 'bottom', orientationMode: 'none', snapToVertices: true, tolerancePx: 12 } },
    }
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(['projects', 'project-summaries'], 'readwrite')
      transaction.objectStore('projects').put(invalid, 'default-project')
      transaction.objectStore('project-summaries').put({ id: 'default-project', title: 'Recovery target', updatedAt: invalid.metadata.updatedAt }, 'default-project')
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error)
    })
    database.close()
    localStorage.setItem('crochet-scheme-editor-active-project', 'default-project')
  })

  await page.reload()
  await expect(page.locator('.autosave-indicator')).toContainText(/ошиб|error/i)
  await page.waitForTimeout(1200)

  const storedSymbol = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('crochet-scheme-editor', 3)
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    const project = await new Promise<any>((resolve, reject) => {
      const request = database.transaction('projects', 'readonly').objectStore('projects').get('default-project')
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
    database.close()
    return project?.elements?.[0]?.symbolId
  })
  expect(storedSymbol).toBe('unknown-legacy-symbol')
})
"""
write('e2e/dataIntegrity.e2e.ts', data_test)

# Release metadata.
replace('package.json', '"version": "1.15.0"', '"version": "1.15.1"')
replace('package-lock.json', '"version": "1.15.0"', '"version": "1.15.1"', count=2)

readme = read('README.md')
marker = '## v1.15.0\n'
if marker not in readme:
    raise RuntimeError('README.md: v1.15.0 marker missing')
release = """## v1.15.1\n\nStability and data-integrity release. It hardens local project persistence, autosave transitions, semantic locking, project import validation, large background handling and release verification without changing the authoring model introduced in v1.15.\n\n- pending document changes are flushed before project switches and cannot race project deletion\n- Undo/Redo snapshots cover persisted document settings instead of only canvas entities\n- groups and parametric rows now obey one lock-aware semantic selection model\n- project schema v18 adds strict integrity/resource validation while v1-v17 remain migration-compatible\n- project lists read metadata only; large underlays are bounded and compressed before persistence\n- Repeat and snapping have explicit performance safeguards\n- Chromium E2E is now a required Pages deployment gate\n\n"""
write('README.md', readme.replace(marker, release + marker, 1))

write('RELEASE_v1.15.1.md', """# v1.15.1 — Data Integrity & Stabilization\n\nThis release hardens the editor before the next feature milestone.\n\n- Prevents pending autosave loss during local-project transitions and serializes deletion against queued writes.\n- Makes JSON import a clean history boundary and extends Undo/Redo to persisted document settings.\n- Unifies semantic selection and locking for groups and parametric rows.\n- Introduces schema v18 with project-wide integrity checks, resource budgets and legacy v1-v17 migration compatibility.\n- Stores lightweight project summaries separately from full documents and bounds/compresses large tracing images.\n- Caps Repeat output, removes per-pointer snap sorting, and makes expensive numeric edits transactional.\n- Waits for print images to decode, confirms destructive project deletion and surfaces persistence errors.\n- Uses deterministic `npm ci`; Pages deployment is gated by the full Chromium Playwright suite.\n""")

print('final stabilization migration applied')
