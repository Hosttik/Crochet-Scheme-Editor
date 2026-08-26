from pathlib import Path


def read(path: str) -> str:
    return Path(path).read_text(encoding='utf-8')


def write(path: str, content: str) -> None:
    Path(path).write_text(content, encoding='utf-8')


def replace_once(path: str, old: str, new: str) -> None:
    content = read(path)
    count = content.count(old)
    if count != 1:
        raise RuntimeError(f'{path}: expected exactly one match, found {count}: {old[:120]!r}')
    write(path, content.replace(old, new, 1))


def insert_before_last(path: str, marker: str, addition: str) -> None:
    content = read(path)
    index = content.rfind(marker)
    if index < 0:
        raise RuntimeError(f'{path}: final marker not found: {marker!r}')
    write(path, content[:index] + addition + content[index:])


# App: keep gauge/rulers fresh during project flush, reconcile dangling ruler refs,
# and refuse manual JSON export of a document that violates current invariants.
replace_once(
    'src/App.tsx',
    "import { emptyGaugeSettings, snapRulerPoint } from './editor/gauge'",
    "import { emptyGaugeSettings, reconcileRulerElementReferences, snapRulerPoint } from './editor/gauge'",
)
replace_once(
    'src/App.tsx',
    "import { CURRENT_PROJECT_SCHEMA_VERSION } from './editor/projectVersion'",
    "import { projectIntegrityIssue } from './editor/projectIntegrity'\nimport { CURRENT_PROJECT_SCHEMA_VERSION } from './editor/projectVersion'",
)
replace_once(
    'src/App.tsx',
    "  const clearElementSelection = useCallback(() => setSelectedIds([]), [])",
    "  useEffect(() => {\n    setRulers((current) => reconcileRulerElementReferences(current, elements))\n  }, [elements])\n\n  const clearElementSelection = useCallback(() => setSelectedIds([]), [])",
)
replace_once(
    'src/App.tsx',
    "  }, [activeProjectId, autosaveDelayMs, backgroundImage, cancelPendingAutosave, elements, enqueueProjectSave, guides, hydrated, legendVisible, locale, projectTitle, rowMarkers, snapping])",
    "  }, [activeProjectId, autosaveDelayMs, backgroundImage, cancelPendingAutosave, elements, enqueueProjectSave, gauge, guides, hydrated, legendVisible, locale, projectTitle, rowMarkers, rulers, snapping])",
)
replace_once(
    'src/App.tsx',
    "const saveProject = () => {\n    const project = buildProject(projectTitle, elements, guides, snapping, rowMarkers, legendVisible, autosaveDelayMs, backgroundImage, gauge, rulers)\n    downloadText('crochet-scheme.json', JSON.stringify(project, null, 2), 'application/json')\n    setStatus(t.projectSaved)\n  }",
    "const saveProject = () => {\n    const project = buildProject(projectTitle, elements, guides, snapping, rowMarkers, legendVisible, autosaveDelayMs, backgroundImage, gauge, rulers)\n    const integrityIssue = projectIntegrityIssue(project)\n    if (integrityIssue) {\n      setStatus(locale === 'ru' ? `Нельзя сохранить: ${integrityIssue}` : `Cannot save: ${integrityIssue}`)\n      return\n    }\n    downloadText('crochet-scheme.json', JSON.stringify(project, null, 2), 'application/json')\n    setStatus(t.projectSaved)\n  }",
)

# Persistence: never write a document that the current strict loader will reject.
replace_once(
    'src/editor/persistence.ts',
    "import type { CrochetProject } from '../types'",
    "import type { CrochetProject } from '../types'\nimport { assertProjectIntegrity } from './projectIntegrity'",
)
replace_once(
    'src/editor/persistence.ts',
    "async function writeProject(id: string, project: CrochetProject): Promise<void> {\n  const database = await openDatabase()",
    "async function writeProject(id: string, project: CrochetProject): Promise<void> {\n  assertProjectIntegrity(project)\n  const database = await openDatabase()",
)

# Project integrity: add a reusable assertion and semantic rich-program validation.
replace_once(
    'src/editor/projectIntegrity.ts',
    "import { SYMBOL_BY_ID } from '../symbols'",
    "import { SYMBOL_BY_ID } from '../symbols'\nimport { rowConstructionTopologyParents } from './rowConstruction'\nimport { rowProgramHasTopologyOperations, rowProgramMetrics } from './rowProgram'",
)
replace_once(
    'src/editor/projectIntegrity.ts',
    "  for (const marker of markers) {",
    "  if (strictReferences) {\n    const elementsByRow = new Map<string, StitchElement[]>()\n    for (const element of elements) {\n      const rowId = element.parametricRow?.id\n      if (!rowId) continue\n      elementsByRow.set(rowId, [...(elementsByRow.get(rowId) ?? []), element])\n    }\n    for (const children of elementsByRow.values()) {\n      const binding = children[0]?.parametricRow\n      if (!binding?.program) continue\n      if (!binding.parentRowId) {\n        if (rowProgramHasTopologyOperations(binding.program)) {\n          return 'Rich row topology operations require a parent row'\n        }\n        continue\n      }\n      const parents = elementsByRow.get(binding.parentRowId)\n      if (!parents) continue\n      const topologyParents = rowConstructionTopologyParents(parents, binding.construction)\n      if (rowProgramMetrics(binding.program).consumedParents !== topologyParents.length) {\n        return 'Rich row program does not consume exactly the available parent stitches'\n      }\n    }\n  }\n\n  for (const marker of markers) {",
)
content = read('src/editor/projectIntegrity.ts')
if 'export function assertProjectIntegrity' in content:
    raise RuntimeError('src/editor/projectIntegrity.ts: assertion already exists')
write(
    'src/editor/projectIntegrity.ts',
    content.rstrip() + "\n\nexport function assertProjectIntegrity(project: CrochetProject, strictReferences = true) {\n  const issue = projectIntegrityIssue(project, strictReferences)\n  if (issue) throw new Error(issue)\n}\n",
)

# Schema: marker count and marker-number bounds must agree.
replace_once(
    'src/editor/projectSchema.ts',
    '!positiveInteger(value.number, 999)',
    '!positiveInteger(value.number, MAX_PROJECT_ROW_MARKERS)',
)

# Construction semantics: the written direction/skip settings must affect topology too.
replace_once(
    'src/editor/rowConstruction.ts',
    "  RowWorkDirection,\n} from '../types'",
    "  RowWorkDirection,\n  StitchElement,\n} from '../types'",
)
replace_once(
    'src/editor/rowConstruction.ts',
    "export function rowConstructionDirectionSymbol(construction?: RowConstruction) {",
    "export function rowConstructionTopologyParents(\n  parents: StitchElement[],\n  construction?: RowConstruction,\n) {\n  const normalized = normalizeRowConstruction(construction)\n  if (!normalized) return parents\n  const ordered = normalized.direction === 'reverse' ? [...parents].reverse() : parents\n  return normalized.skipFirstStitches > 0\n    ? ordered.slice(normalized.skipFirstStitches)\n    : ordered\n}\n\nexport function rowConstructionDirectionSymbol(construction?: RowConstruction) {",
)

replace_once(
    'src/editor/parametricRows.ts',
    "import { nextRowConstruction } from './rowConstruction'",
    "import { nextRowConstruction, rowConstructionTopologyParents } from './rowConstruction'",
)
replace_once(
    'src/editor/parametricRows.ts',
    "    if (!guide || guide.type === 'grid') {",
    "    if (!guide || (guide.type !== 'arc' && guide.type !== 'radial-grid')) {",
)
replace_once(
    'src/editor/parametricRows.ts',
    "    if (!parents.length) {\n      const detachedChildren = children.map((element) => ({",
    "    if (!parents.length) {\n      const detachedChildren = children.map((element) => ({",
)
replace_once(
    'src/editor/parametricRows.ts',
    "      continue\n    }\n\n    if (binding.program) {\n      const compiled = compileRowProgram(binding.program, parents)",
    "      continue\n    }\n\n    const topologyParents = rowConstructionTopologyParents(parents, binding.construction)\n\n    if (binding.program) {\n      const compiled = compileRowProgram(binding.program, topologyParents)",
)
replace_once(
    'src/editor/parametricRows.ts',
    "    const topologyOverride = isTopologyOverrideValid(parents, binding.shaping, binding.topologyOverride)",
    "    const topologyOverride = isTopologyOverrideValid(topologyParents, binding.shaping, binding.topologyOverride)",
)
replace_once(
    'src/editor/parametricRows.ts',
    "      applyRowTopology(reboundChildren, parents, binding.shaping, topologyOverride),",
    "      applyRowTopology(reboundChildren, topologyParents, binding.shaping, topologyOverride),",
)
replace_once(
    'src/editor/parametricRows.ts',
    "  if (!guide || guide.type === 'grid') return null\n\n  const parentElements = rowElements(elements, parent.id)\n  const baseCount = parentElements.length || resolveGuideRowCount(guide, parent.options)",
    "  if (!guide || (guide.type !== 'arc' && guide.type !== 'radial-grid')) return null\n\n  const construction = nextRowConstruction(parent.construction)\n  const parentElements = rowElements(elements, parent.id)\n  const topologyParents = rowConstructionTopologyParents(parentElements, construction)\n  const baseCount = parentElements.length\n    ? topologyParents.length\n    : resolveGuideRowCount(guide, parent.options)\n  if (parentElements.length && baseCount === 0) return null",
)
replace_once(
    'src/editor/parametricRows.ts',
    "    construction: nextRowConstruction(parent.construction),",
    "    construction,",
)
replace_once(
    'src/editor/parametricRows.ts',
    "  const linked = applyRowTopology(generated, parentElements, shaping)",
    "  const linked = applyRowTopology(generated, topologyParents, shaping)",
)

# Gauge/ruler: use canonical semantic row ordering, counted row totals, and clear dead anchors.
replace_once(
    'src/editor/gauge.ts',
    "import type { GaugeProfile, GaugeSettings, MeasurementRuler, Point, StitchElement } from '../types'",
    "import type { GaugeProfile, GaugeSettings, MeasurementRuler, Point, StitchElement } from '../types'\nimport { patternRows } from './parametricRows'\nimport { rowConstructionRowTotal } from './rowConstruction'",
)
replace_once(
    'src/editor/gauge.ts',
    "export function rowLengthEstimateCm(elements: StitchElement[], rowId: string, profile: GaugeProfile) {\n  const count = elements.filter((element) => element.parametricRow?.id === rowId).length\n  return count ? count * stitchWidthCm(profile) : null\n}",
    "export function rowLengthEstimateCm(elements: StitchElement[], rowId: string, profile: GaugeProfile) {\n  const row = elements.filter((element) => element.parametricRow?.id === rowId)\n  if (!row.length) return null\n  const count = rowConstructionRowTotal(row.length, row[0]?.parametricRow?.construction)\n  return count * stitchWidthCm(profile)\n}",
)
replace_once(
    'src/editor/gauge.ts',
    "function automaticRulerStitchCount(ruler: MeasurementRuler, elements: StitchElement[]) {",
    "export function reconcileRulerElementReferences(\n  rulers: MeasurementRuler[],\n  elements: StitchElement[],\n) {\n  const elementIds = new Set(elements.map((element) => element.id))\n  let changed = false\n  const next = rulers.map((ruler) => {\n    const startElementId = ruler.startElementId && elementIds.has(ruler.startElementId)\n      ? ruler.startElementId\n      : undefined\n    const endElementId = ruler.endElementId && elementIds.has(ruler.endElementId)\n      ? ruler.endElementId\n      : undefined\n    if (startElementId === ruler.startElementId && endElementId === ruler.endElementId) return ruler\n    changed = true\n    return { ...ruler, startElementId, endElementId }\n  })\n  return changed ? next : rulers\n}\n\nfunction automaticRulerStitchCount(ruler: MeasurementRuler, elements: StitchElement[]) {",
)
replace_once(
    'src/editor/gauge.ts',
    "function semanticRows(elements: StitchElement[]) {\n  const rows = new Map<string, { id: string; patternOrder?: number; firstIndex: number }>()\n  elements.forEach((element, index) => {\n    const row = element.parametricRow\n    if (!row || rows.has(row.id)) return\n    rows.set(row.id, { id: row.id, patternOrder: row.patternOrder, firstIndex: index })\n  })\n  return [...rows.values()].sort((left, right) => {\n    if (left.patternOrder != null && right.patternOrder != null && left.patternOrder !== right.patternOrder) {\n      return left.patternOrder - right.patternOrder\n    }\n    if (left.patternOrder != null && right.patternOrder == null) return -1\n    if (left.patternOrder == null && right.patternOrder != null) return 1\n    return left.firstIndex - right.firstIndex\n  })\n}\n\n",
    "",
)
replace_once(
    'src/editor/gauge.ts',
    "  const rows = semanticRows(elements)",
    "  const rows = patternRows(elements)",
)

# Ruler line must not steal stitch pointer events; the visible label remains selectable.
replace_once(
    'src/editor/RulerLayer.tsx',
    "            <line\n              x1={ruler.start.x}\n              y1={ruler.start.y}\n              x2={ruler.end.x}\n              y2={ruler.end.y}\n              className=\"ruler-hit-line\"\n              strokeWidth={16 / zoom}\n              onPointerDown={(event) => {\n                if (event.button !== 0) return\n                event.stopPropagation()\n                onSelect(ruler.id)\n              }}\n            />",
    "            <line\n              x1={ruler.start.x}\n              y1={ruler.start.y}\n              x2={ruler.end.x}\n              y2={ruler.end.y}\n              className=\"ruler-hit-line\"\n              strokeWidth={16 / zoom}\n              pointerEvents=\"none\"\n            />",
)
replace_once(
    'src/editor/RulerLayer.tsx',
    "              textAnchor=\"middle\"\n              pointerEvents=\"none\"\n            >{label}</text>",
    "              textAnchor=\"middle\"\n              pointerEvents=\"auto\"\n              onPointerDown={(event) => {\n                if (event.button !== 0) return\n                event.stopPropagation()\n                onSelect(ruler.id)\n              }}\n            >{label}</text>",
)

# Written pattern: use the expanded symbol library abbreviations and expose invalid rich topology.
replace_once(
    'src/editor/patternInstructions.ts',
    "  rowConstructionInstructionParts,\n  rowConstructionRowTotal,\n} from './rowConstruction'",
    "  rowConstructionInstructionParts,\n  rowConstructionRowTotal,\n  rowConstructionTopologyParents,\n} from './rowConstruction'",
)
replace_once(
    'src/editor/patternInstructions.ts',
    "export function stitchAbbreviation(symbolId: string, locale: Locale) {\n  return ABBREVIATIONS[symbolId]?.[locale] ?? symbolId\n}",
    "export function stitchAbbreviation(symbolId: string, locale: Locale) {\n  return ABBREVIATIONS[symbolId]?.[locale]\n    ?? SYMBOL_BY_ID.get(symbolId)?.abbreviation\n    ?? symbolId\n}",
)
replace_once(
    'src/editor/patternInstructions.ts',
    "function richProgramComposition(\n  binding: ParametricRowBinding,\n  stitchCount: number,\n  locale: Locale,\n) {\n  const program = normalizeRowProgram(binding.program)\n  if (!program) return null\n  const body = program.items.map((item) => programItemText(item, locale)).join(', ')\n  const expression = program.repeat === 1 ? body : `[${body}] × ${program.repeat}`\n  const metrics = rowProgramMetrics(program)\n  if (metrics.producedChildren === stitchCount) return expression\n  const copy = COPY[locale]\n  return `${expression}; ${copy.programMismatch} ${metrics.producedChildren}, ${copy.actual} ${stitchCount}`\n}",
    "function richProgramComposition(\n  binding: ParametricRowBinding,\n  stitchCount: number,\n  locale: Locale,\n  parentStitchCount?: number,\n) {\n  const program = normalizeRowProgram(binding.program)\n  if (!program) return null\n  const body = program.items.map((item) => programItemText(item, locale)).join(', ')\n  const expression = program.repeat === 1 ? body : `[${body}] × ${program.repeat}`\n  const metrics = rowProgramMetrics(program)\n  const warnings: string[] = []\n  const copy = COPY[locale]\n  if (metrics.producedChildren !== stitchCount) {\n    warnings.push(`${copy.programMismatch} ${metrics.producedChildren}, ${copy.actual} ${stitchCount}`)\n  }\n  if (parentStitchCount !== undefined && metrics.consumedParents !== parentStitchCount) {\n    warnings.push(locale === 'ru'\n      ? `потребляет ${metrics.consumedParents} из ${parentStitchCount} петель предыдущего ряда`\n      : `consumes ${metrics.consumedParents} of ${parentStitchCount} parent stitches`)\n  }\n  return warnings.length ? `${expression}; ${warnings.join('; ')}` : expression\n}",
)
replace_once(
    'src/editor/patternInstructions.ts',
    "  parentPositions?: number[],\n) {\n  const program = richProgramComposition(binding, stitchCount, locale)",
    "  parentPositions?: number[],\n  parentStitchCount?: number,\n) {\n  const program = richProgramComposition(binding, stitchCount, locale, parentStitchCount)",
)
replace_once(
    'src/editor/patternInstructions.ts',
    "  return rows.map((row) => {\n    let parentPositions: number[] | undefined\n    if (row.binding.topologyOverride && row.binding.parentRowId) {\n      const parents = rowElements(elements, row.binding.parentRowId)\n      const indexById = new Map(parents.map((parent, index) => [parent.id, index + 1]))",
    "  return rows.map((row) => {\n    let parentPositions: number[] | undefined\n    let parentStitchCount: number | undefined\n    const rawParents = row.binding.parentRowId\n      ? rowElements(elements, row.binding.parentRowId)\n      : []\n    const parents = rowConstructionTopologyParents(rawParents, row.binding.construction)\n    if (row.binding.parentRowId) parentStitchCount = parents.length\n    if (row.binding.topologyOverride && row.binding.parentRowId) {\n      const indexById = new Map(parents.map((parent, index) => [parent.id, index + 1]))",
)
replace_once(
    'src/editor/patternInstructions.ts',
    "        parentPositions,\n      ),",
    "        parentPositions,\n        parentStitchCount,\n      ),",
)

# Regression tests: gauge ordering/counts/anchors.
replace_once(
    'src/editor/gauge.test.ts',
    "  patternHeightEstimateCm,\n  rowHeightCm,",
    "  patternHeightEstimateCm,\n  reconcileRulerElementReferences,\n  rowHeightCm,",
)
insert_before_last(
    'src/editor/gauge.test.ts',
    "\n})\n",
    "\n  it('uses the written row total when a starting chain counts as a stitch', () => {\n    const counted = elements.map((element) => element.parametricRow?.id === 'row-1'\n      ? {\n          ...element,\n          parametricRow: {\n            ...element.parametricRow,\n            construction: {\n              mode: 'turning' as const,\n              direction: 'along' as const,\n              startChainCount: 1,\n              startChainCountsAsStitch: true,\n              skipFirstStitches: 0,\n              joinWithSlipStitch: false,\n              joinTarget: 'first-stitch' as const,\n            },\n          },\n        }\n      : element)\n    expect(rowLengthEstimateCm(counted, 'row-1', profile)).toBe(2.5)\n  })\n\n  it('uses the same mixed legacy/explicit row ordering as patternRows', () => {\n    const first = rowElement('legacy-1', 'legacy-row-1', 0, 1)\n    const second = rowElement('legacy-2', 'legacy-row-2', 0, 2)\n    first.parametricRow = { ...first.parametricRow!, patternOrder: undefined }\n    second.parametricRow = { ...second.parametricRow!, patternOrder: undefined }\n    const third = rowElement('explicit-3', 'explicit-row-3', 0, 3)\n    const mixed = [first, second, third]\n    expect(rulerEstimate({\n      id: 'mixed-order',\n      start: { x: 0, y: 0 },\n      end: { x: 0, y: 0 },\n      startElementId: first.id,\n      endElementId: third.id,\n      mode: 'rows',\n    }, mixed, gauge).rowCount).toBe(3)\n  })\n\n  it('clears ruler stitch references when their target stitches disappear', () => {\n    const rulers: MeasurementRuler[] = [{\n      id: 'dead-anchor',\n      start: { x: 0, y: 0 },\n      end: { x: 20, y: 0 },\n      startElementId: 'a',\n      endElementId: 'missing',\n    }]\n    const reconciled = reconcileRulerElementReferences(rulers, elements)\n    expect(reconciled[0].startElementId).toBe('a')\n    expect(reconciled[0].endElementId).toBeUndefined()\n    expect(reconcileRulerElementReferences(reconciled, elements)).toBe(reconciled)\n  })\n",
)

# Regression tests: incompatible guide migration + construction-aware topology.
insert_before_last(
    'src/editor/parametricRows.test.ts',
    "\n})\n",
    "\n  it('detaches a legacy row from a line guide instead of deleting its stitches', () => {\n    const lineGuide = {\n      id: guide.id,\n      type: 'line' as const,\n      start: { x: -100, y: 0 },\n      end: { x: 100, y: 0 },\n      divisions: 4,\n      visible: true,\n    }\n    const result = reconcileParametricRows(row(), [lineGuide], () => 'unused')\n    expect(result).toHaveLength(3)\n    expect(result.every((element) => element.parametricRow === undefined)).toBe(true)\n  })\n\n  it('applies reverse direction and skipped base stitches to parent topology', () => {\n    const parent: ParametricRowBinding = {\n      ...binding,\n      id: 'parent-row',\n      patternOrder: 1,\n      options: { ...binding.options, count: 3 },\n    }\n    const child: ParametricRowBinding = {\n      ...binding,\n      id: 'child-row',\n      patternOrder: 2,\n      parentRowId: parent.id,\n      construction: {\n        mode: 'turning',\n        direction: 'reverse',\n        startChainCount: 1,\n        startChainCountsAsStitch: false,\n        skipFirstStitches: 1,\n        joinWithSlipStitch: false,\n        joinTarget: 'first-stitch',\n      },\n      options: { ...binding.options, count: 2, radialOffset: 40 },\n    }\n    const result = reconcileParametricRows(\n      [...row(3, parent), ...row(2, child)],\n      [guide],\n      () => 'unused',\n    )\n    const children = result.filter((element) => element.parametricRow?.id === child.id)\n    expect(children.map((element) => element.parentStitchIds)).toEqual([\n      ['parent-row-1'],\n      ['parent-row-0'],\n    ])\n  })\n",
)

# Regression tests: expanded symbol abbreviations + invalid rich program disclosure.
insert_before_last(
    'src/editor/patternInstructions.test.ts',
    "\n})\n",
    "\n  it('uses canonical abbreviations for symbols added in the expanded library', () => {\n    expect(stitchAbbreviation('double-treble', 'en')).toBe('dtr')\n    expect(stitchAbbreviation('front-post-double', 'en')).toBe('FPdc')\n    expect(stitchAbbreviation('single-2-together', 'ru')).toBe('sc2tog')\n  })\n\n  it('does not hide a rich-program parent-count mismatch in written instructions', () => {\n    const rich: ParametricRowBinding = {\n      ...binding('row-2', 2, undefined, 'row-1'),\n      program: { repeat: 1, items: [{ kind: 'stitch', symbolId: 'single', count: 2 }] },\n    }\n    expect(formatPatternRowInstruction(rich, 2, 2, 'ru', undefined, 3)).toContain(\n      'потребляет 2 из 3 петель предыдущего ряда',\n    )\n  })\n",
)

# Regression tests: invariant assertion and rich parent compatibility.
replace_once(
    'src/editor/projectIntegrity.test.ts',
    "import { parseProject } from './projectSchema'",
    "import { assertProjectIntegrity, projectIntegrityIssue } from './projectIntegrity'\nimport { parseProject } from './projectSchema'",
)
insert_before_last(
    'src/editor/projectIntegrity.test.ts',
    "\n})\n",
    "\n  it('provides a persistence assertion for documents above hard limits', () => {\n    const project = base() as any\n    project.gauge = {\n      profiles: Array.from({ length: 51 }, (_, index) => ({\n        id: `g-${index}`,\n        name: `Gauge ${index}`,\n        symbolId: 'single',\n        stitchCount: 20,\n        rowCount: 20,\n        widthCm: 10,\n        heightCm: 10,\n      })),\n    }\n    expect(projectIntegrityIssue(project)).toBe('Project contains too many gauge profiles')\n    expect(() => assertProjectIntegrity(project)).toThrow('Project contains too many gauge profiles')\n  })\n\n  it('rejects a rich row program that does not consume the effective parent row', () => {\n    const project = base() as any\n    project.guides = [{\n      id: 'guide', type: 'arc', center: { x: 0, y: 0 }, radius: 100,\n      startAngle: 0, endAngle: 180, divisions: 4, visible: true,\n    }]\n    const options = {\n      distributionMode: 'count', count: 3, spacing: 40, orientation: 'radial',\n      rotationOffset: 0, radialOffset: 0, ringIndex: 1,\n    }\n    const parent = { id: 'parent', guideId: 'guide', symbolId: 'single', patternOrder: 1, options }\n    const child = {\n      id: 'child', guideId: 'guide', symbolId: 'single', patternOrder: 2, parentRowId: 'parent',\n      program: { repeat: 1, items: [{ kind: 'stitch', symbolId: 'single', count: 2 }] },\n      options: { ...options, count: 2 },\n    }\n    project.elements = [\n      ...Array.from({ length: 3 }, (_, index) => ({\n        id: `p-${index}`, symbolId: 'single', x: index, y: 0, rotation: 0, parametricRow: parent,\n      })),\n      ...Array.from({ length: 2 }, (_, index) => ({\n        id: `c-${index}`, symbolId: 'single', x: index, y: 40, rotation: 0, parametricRow: child,\n      })),\n    ]\n    expect(projectIntegrityIssue(project)).toBe(\n      'Rich row program does not consume exactly the available parent stitches',\n    )\n  })\n",
)

# E2E: keep the first ruler in place. Starting a second ruler through the same endpoint
# must select the stitch, not the old ruler's invisible hit line.
replace_once(
    'e2e/gaugeRuler.e2e.ts',
    "  await expect(gauge).toContainText('Автоматически по ряду: 12 петель')\n  await gauge.getByRole('button', { name: 'Удалить линейку' }).click()\n  await expect(page.locator('.measurement-ruler')).toHaveCount(0)\n\n  await page.locator('.guide-list button').filter({ hasText: 'Радиальная' }).click()",
    "  await expect(gauge).toContainText('Автоматически по ряду: 12 петель')\n\n  await page.locator('.guide-list button').filter({ hasText: 'Радиальная' }).click()",
)
replace_once(
    'e2e/gaugeRuler.e2e.ts',
    "  await expect(page.locator('.measurement-ruler')).toHaveCount(1)\n  const rowRuler = page.locator('.measurement-ruler').first()",
    "  await expect(page.locator('.measurement-ruler')).toHaveCount(2)\n  const rowRuler = page.locator('.measurement-ruler').nth(1)",
)
replace_once(
    'e2e/gaugeRuler.e2e.ts',
    "  expect(project.rulers).toHaveLength(1)\n  expect(project.rulers[0]).toMatchObject({ mode: 'rows' })\n  expect(project.rulers[0].startElementId).toBeTruthy()\n  expect(project.rulers[0].endElementId).toBeTruthy()",
    "  expect(project.rulers).toHaveLength(2)\n  expect(project.rulers[1]).toMatchObject({ mode: 'rows' })\n  expect(project.rulers[1].startElementId).toBeTruthy()\n  expect(project.rulers[1].endElementId).toBeTruthy()",
)
replace_once(
    'e2e/gaugeRuler.e2e.ts',
    "  await expect(page.locator('.measurement-ruler')).toHaveCount(1)\n  await expect(page.locator('.measurement-ruler .ruler-label')).toContainText('2 р.')",
    "  await expect(page.locator('.measurement-ruler')).toHaveCount(2)\n  await expect(page.locator('.measurement-ruler').nth(1).locator('.ruler-label')).toContainText('2 р.')",
)

print('v1.17.1 stabilization patch applied')
