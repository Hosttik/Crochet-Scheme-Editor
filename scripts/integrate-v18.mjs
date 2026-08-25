import fs from 'node:fs'

function read(path) {
  return fs.readFileSync(path, 'utf8')
}

function write(path, content) {
  fs.writeFileSync(path, content)
}

function replaceOnce(path, before, after, label) {
  const source = read(path)
  const first = source.indexOf(before)
  if (first < 0) throw new Error(`${label}: source fragment not found in ${path}`)
  if (source.indexOf(before, first + before.length) >= 0) {
    throw new Error(`${label}: source fragment is not unique in ${path}`)
  }
  write(path, source.slice(0, first) + after + source.slice(first + before.length))
}

function replaceRegex(path, pattern, replacement, label) {
  const source = read(path)
  const matches = [...source.matchAll(pattern)]
  if (matches.length !== 1) throw new Error(`${label}: expected 1 match, got ${matches.length} in ${path}`)
  write(path, source.replace(pattern, replacement))
}

// Productivity transform engine: circular arrays rotate around an explicit guide center.
replaceOnce(
  'src/editor/productivity.ts',
  `  | {\n      mode: 'circular'\n      copies: number\n      angleStep: number\n    }`,
  `  | {\n      mode: 'circular'\n      copies: number\n      angleStep: number\n      center?: Point\n    }`,
  'circular repeat center type',
)
replaceOnce(
  'src/editor/productivity.ts',
  `  if (options.mode === 'circular') {\n    for (let index = 1; index <= copies; index += 1) {\n      const angle = options.angleStep * index\n      const targetPivot = rotateAround(pivot, pivot, angle)\n      created.push(...transformedCopy(source, pivot, targetPivot, angle, createId))\n    }\n    return created\n  }`,
  `  if (options.mode === 'circular') {\n    const center = options.center ?? pivot\n    for (let index = 1; index <= copies; index += 1) {\n      const angle = options.angleStep * index\n      const targetPivot = rotateAround(pivot, center, angle)\n      created.push(...transformedCopy(source, pivot, targetPivot, angle, createId))\n    }\n    return created\n  }`,
  'circular repeat center implementation',
)

// Schema v12 persists permanent manual group ids.
replaceOnce(
  'src/editor/projectSchema.ts',
  `    !finite(value.x) || !finite(value.y) || !finite(value.rotation) ||\n    !optionalBoolean(value.visible) || !optionalBoolean(value.locked) ||\n    !optionalStringArray(value.parentStitchIds)`,
  `    !finite(value.x) || !finite(value.y) || !finite(value.rotation) ||\n    !optionalBoolean(value.visible) || !optionalBoolean(value.locked) ||\n    !(value.groupId === undefined || nonEmptyString(value.groupId)) ||\n    !optionalStringArray(value.parentStitchIds)`,
  'group id validation',
)
replaceOnce(
  'src/editor/projectSchema.ts',
  `    visible: value.visible !== false,\n    locked: value.locked === true,\n    parametricRow: parseParametricRow(value.parametricRow),`,
  `    visible: value.visible !== false,\n    locked: value.locked === true,\n    groupId: value.groupId as string | undefined,\n    parametricRow: parseParametricRow(value.parametricRow),`,
  'group id parsing',
)
replaceOnce(
  'src/editor/projectSchema.ts',
  `raw.schemaVersion < 1 || raw.schemaVersion > 11`,
  `raw.schemaVersion < 1 || raw.schemaVersion > 12`,
  'schema max version',
)
replaceOnce(
  'src/editor/projectSchema.ts',
  `    schemaVersion: 11,`,
  `    schemaVersion: 12,`,
  'normalized schema version',
)

replaceOnce(
  'src/editor/projectSchema.test.ts',
  `it('migrates legacy projects to schema v11 and normalizes element flags', () => {\n    const project = parseProject(legacyProject(), fallback)\n    expect(project.schemaVersion).toBe(11)`,
  `it('migrates legacy projects to schema v12 and normalizes element flags', () => {\n    const project = parseProject(legacyProject(), fallback)\n    expect(project.schemaVersion).toBe(12)`,
  'schema migration test',
)
replaceOnce(
  'src/editor/projectSchema.test.ts',
  `  it('rejects malformed stitch coordinates', () => {`,
  `  it('preserves and validates schema v12 group ids', () => {\n    const raw = legacyProject() as any\n    raw.schemaVersion = 12\n    raw.elements[0].groupId = 'motif-a'\n    expect(parseProject(raw, fallback).elements[0].groupId).toBe('motif-a')\n    raw.elements[0].groupId = ''\n    expect(() => parseProject(raw, fallback)).toThrow(ProjectValidationError)\n  })\n\n  it('rejects malformed stitch coordinates', () => {`,
  'group schema tests',
)

// App integration.
replaceOnce(
  'src/App.tsx',
  `import { ProjectManagerPanel } from './editor/ProjectManagerPanel'`,
  `import { ProjectManagerPanel } from './editor/ProjectManagerPanel'\nimport { ProductivityPanel } from './editor/ProductivityPanel'`,
  'productivity panel import',
)
replaceOnce(
  'src/App.tsx',
  `import { emptyHistory, pushHistory, redoHistory, undoHistory } from './editor/history'`,
  `import { emptyHistory, pushHistory, redoHistory, undoHistory } from './editor/history'\nimport {\n  cloneSelectionWithOffset,\n  cloneWithRepeatedDelta,\n  expandIdsToGroups,\n  groupElements,\n  mirrorElements,\n  repeatSelection,\n  ungroupElements,\n  type MirrorAxis,\n  type RepeatOptions,\n} from './editor/productivity'`,
  'productivity engine import',
)
replaceOnce(
  'src/App.tsx',
  `  const pasteSerialRef = useRef(1)\n  const autosaveQueueRef`,
  `  const pasteSerialRef = useRef(1)\n  const duplicateSeriesRef = useRef<{ previous: StitchElement[]; currentIds: string[] } | null>(null)\n  const autosaveQueueRef`,
  'duplicate transform state',
)
replaceOnce('src/App.tsx', `    schemaVersion: 11,`, `    schemaVersion: 12,`, 'app schema version')
replaceOnce(
  'src/App.tsx',
  `![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].includes(raw.schemaVersion)`,
  `![1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].includes(raw.schemaVersion)`,
  'app schema whitelist',
)

replaceRegex(
  'src/App.tsx',
  /  const copySelection = useCallback\(\(\) => \{[\s\S]*?\n  const selectAll = useCallback/g,
  `  const productivitySelectionIds = useCallback(() => {\n    const unlocked = new Set(unlockedSelectedIds())\n    const manualIds = elements\n      .filter((element) => unlocked.has(element.id) && !element.parametricRow)\n      .map((element) => element.id)\n    const expanded = expandIdsToGroups(elements, manualIds)\n    return expanded.filter((id) => {\n      const element = elements.find((item) => item.id === id)\n      return Boolean(element && !isElementLocked(element) && !element.parametricRow)\n    })\n  }, [elements, unlockedSelectedIds])\n\n  const copySelection = useCallback(() => {\n    const copyIds = new Set(expandIdsToGroups(elements, unlockedSelectedIds()))\n    if (!copyIds.size) return\n    clipboardRef.current = elements\n      .filter((element) => copyIds.has(element.id))\n      .map((element) => ({ ...element }))\n    pasteSerialRef.current = 1\n    setStatus(\`${'${t.copied}'}: ${'${clipboardRef.current.length}'}\`)\n  }, [elements, t.copied, unlockedSelectedIds])\n\n  const pasteSelection = useCallback(() => {\n    if (!clipboardRef.current.length) return\n    const offset = DUPLICATE_OFFSET * pasteSerialRef.current\n    pasteSerialRef.current += 1\n    const pasted = cloneSelectionWithOffset(\n      clipboardRef.current,\n      clipboardRef.current.map((element) => element.id),\n      offset,\n      offset,\n      createId,\n    )\n    if (!pasted.length) return\n    duplicateSeriesRef.current = null\n    commitElements([...elements, ...pasted])\n    setSelectedIds(pasted.map((element) => element.id))\n    setSelectedGuideId(null)\n    setTool({ type: 'select' })\n    setStatus(\`${'${t.pasted}'}: ${'${pasted.length}'}\`)\n  }, [commitElements, elements, t.pasted])\n\n  const duplicateSelection = useCallback(() => {\n    const duplicateIds = new Set(expandIdsToGroups(elements, unlockedSelectedIds()))\n    if (!duplicateIds.size) return\n    const source = elements.filter((element) => duplicateIds.has(element.id))\n    if (!source.length) return\n\n    const series = duplicateSeriesRef.current\n    const isSeries = Boolean(\n      series &&\n      series.currentIds.length === source.length &&\n      series.currentIds.every((id) => duplicateIds.has(id)),\n    )\n    let duplicated: StitchElement[] = []\n    let previousForNext = source.map((element) => ({ ...element }))\n\n    if (series && isSeries) {\n      const current = series.currentIds\n        .map((id) => elements.find((element) => element.id === id))\n        .filter((element): element is StitchElement => Boolean(element))\n      if (current.length === series.previous.length) {\n        duplicated = cloneWithRepeatedDelta(series.previous, current, createId)\n        previousForNext = current.map((element) => ({ ...element }))\n      }\n    }\n\n    if (!duplicated.length) {\n      duplicated = cloneSelectionWithOffset(\n        elements,\n        [...duplicateIds],\n        DUPLICATE_OFFSET,\n        DUPLICATE_OFFSET,\n        createId,\n      )\n    }\n    if (!duplicated.length) return\n\n    duplicateSeriesRef.current = {\n      previous: previousForNext,\n      currentIds: duplicated.map((element) => element.id),\n    }\n    commitElements([...elements, ...duplicated])\n    setSelectedIds(duplicated.map((element) => element.id))\n    setSelectedGuideId(null)\n    setStatus(\`${'${t.duplicated}'}: ${'${duplicated.length}'}\`)\n  }, [commitElements, elements, t.duplicated, unlockedSelectedIds])\n\n  const groupSelection = useCallback(() => {\n    const ids = productivitySelectionIds()\n    if (ids.length < 2) return\n    duplicateSeriesRef.current = null\n    commitElements(groupElements(elements, ids, createId()))\n    setSelectedIds(ids)\n    setStatus(locale === 'ru' ? \`Группа создана: ${'${ids.length}'}\` : \`Group created: ${'${ids.length}'}\`)\n  }, [commitElements, elements, locale, productivitySelectionIds])\n\n  const ungroupSelection = useCallback(() => {\n    const ids = productivitySelectionIds()\n    if (!ids.length) return\n    duplicateSeriesRef.current = null\n    commitElements(ungroupElements(elements, ids))\n    setSelectedIds(ids)\n    setStatus(locale === 'ru' ? 'Группа снята' : 'Group removed')\n  }, [commitElements, elements, locale, productivitySelectionIds])\n\n  const mirrorSelection = useCallback((axis: MirrorAxis) => {\n    const ids = productivitySelectionIds()\n    if (!ids.length) return\n    duplicateSeriesRef.current = null\n    commitElements(mirrorElements(elements, ids, axis))\n    setSelectedIds(ids)\n    setStatus(locale === 'ru' ? \`Отражено: ${'${ids.length}'}\` : \`Mirrored: ${'${ids.length}'}\`)\n  }, [commitElements, elements, locale, productivitySelectionIds])\n\n  const repeatProductivitySelection = useCallback((options: RepeatOptions) => {\n    const ids = productivitySelectionIds()\n    if (!ids.length) return\n    const created = repeatSelection(elements, ids, options, createId)\n    if (!created.length) {\n      setStatus(locale === 'ru' ? 'Не хватило места на направляющей' : 'No room left on the guide')\n      return\n    }\n    duplicateSeriesRef.current = null\n    commitElements([...elements, ...created])\n    setSelectedIds(created.map((element) => element.id))\n    setSelectedGuideId(null)\n    setTool({ type: 'select' })\n    setStatus(locale === 'ru' ? \`Создано элементов: ${'${created.length}'}\` : \`Created elements: ${'${created.length}'}\`)\n  }, [commitElements, elements, locale, productivitySelectionIds])\n\n  const selectAll = useCallback`,
  'selection productivity callbacks',
)

replaceOnce(
  'src/App.tsx',
  `      const targetIds = expandIdsToParametricRows(elements, [id])`,
  `      const targetIds = expandIdsToGroups(elements, expandIdsToParametricRows(elements, [id]))`,
  'layer group expansion',
)
replaceOnce(
  'src/App.tsx',
  `        const next = expandIdsToParametricRows(elements, uniqueIds([...marquee.baseIds, ...hits]))`,
  `        const next = expandIdsToGroups(\n          elements,\n          expandIdsToParametricRows(elements, uniqueIds([...marquee.baseIds, ...hits])),\n        )`,
  'marquee group expansion',
)
replaceRegex(
  'src/App.tsx',
  /    const alreadySelected = selectedIds\.includes\(element\.id\)\n    if \(event\.shiftKey && alreadySelected\) \{[\s\S]*?    const nextSelection = event\.shiftKey\n      \? uniqueIds\(\[\.\.\.selectedIds, element\.id\]\)\n      : alreadySelected\n        \? selectedIds\n        : \[element\.id\]\n/g,
  `    const targetIds = element.groupId && !event.altKey\n      ? elements.filter((item) => item.groupId === element.groupId).map((item) => item.id)\n      : [element.id]\n    const targetSet = new Set(targetIds)\n    const alreadySelected = targetIds.every((id) => selectedIds.includes(id))\n    if (event.shiftKey && alreadySelected) {\n      setSelectedIds(selectedIds.filter((id) => !targetSet.has(id)))\n      return\n    }\n\n    const nextSelection = event.shiftKey\n      ? uniqueIds([...selectedIds, ...targetIds])\n      : alreadySelected\n        ? selectedIds\n        : targetIds\n`,
  'canvas group selection',
)
replaceOnce(
  'src/App.tsx',
  `        </section>\n\n        <section className=\"panel-section\">\n          <div className=\"section-title-row\"><h2>{t.selection}</h2></div>`,
  `        </section>\n\n        <ProductivityPanel\n          locale={locale}\n          guides={guides}\n          selectedCount={productivitySelectionIds().length}\n          canTransform={productivitySelectionIds().length > 0}\n          canGroup={productivitySelectionIds().length > 1}\n          canUngroup={productivitySelectionIds().some((id) => Boolean(elements.find((element) => element.id === id)?.groupId))}\n          onGroup={groupSelection}\n          onUngroup={ungroupSelection}\n          onMirror={mirrorSelection}\n          onRepeat={repeatProductivitySelection}\n        />\n\n        <section className=\"panel-section\">\n          <div className=\"section-title-row\"><h2>{t.selection}</h2></div>`,
  'productivity panel placement',
)

// Visible version label.
{
  const path = 'src/i18n.ts'
  const source = read(path)
  const count = (source.match(/v1\.7/g) ?? []).length
  if (count !== 2) throw new Error(`version subtitle: expected 2 v1.7 labels, got ${count}`)
  write(path, source.replaceAll('v1.7', 'v1.8'))
}

console.log('v1.8 guarded integration applied successfully')
