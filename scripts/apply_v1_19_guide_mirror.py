from pathlib import Path


def replace_once(path: str, old: str, new: str):
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, got {count}: {old[:120]!r}')
    file.write_text(text.replace(old, new, 1))


def append_once(path: str, marker: str, addition: str):
    file = Path(path)
    text = file.read_text()
    if marker in text:
        return
    file.write_text(text.rstrip() + '\n\n' + addition.strip() + '\n')


# ---------------------------------------------------------------------------
# Persisted model: schema v20 adds a quadratic/parabola guide and true mirror parity.
# ---------------------------------------------------------------------------
replace_once(
    'src/types.ts',
    "  color?: string\n  visible?: boolean\n",
    "  color?: string\n  /** True when the glyph has odd reflection parity. */\n  mirrored?: boolean\n  visible?: boolean\n",
)
replace_once(
    'src/types.ts',
    "export type GridGuide = {\n",
    "export type ParabolaGuide = {\n  id: string\n  type: 'parabola'\n  start: Point\n  control: Point\n  end: Point\n  divisions: number\n  visible: boolean\n  locked?: boolean\n}\n\nexport type GridGuide = {\n",
)
replace_once(
    'src/types.ts',
    "export type Guide = ArcGuide | LineGuide | CurveGuide | GridGuide | RadialGridGuide\n",
    "export type Guide = ArcGuide | LineGuide | CurveGuide | ParabolaGuide | GridGuide | RadialGridGuide\n",
)
replace_once(
    'src/types.ts',
    "schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19\n",
    "schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20\n",
)
replace_once(
    'src/editor/projectVersion.ts',
    'export const CURRENT_PROJECT_SCHEMA_VERSION = 19\n',
    'export const CURRENT_PROJECT_SCHEMA_VERSION = 20\n',
)

replace_once(
    'src/editor/projectSchema.ts',
    "    !(value.color === undefined || isStitchColor(value.color)) ||\n    !optionalBoolean(value.visible) || !optionalBoolean(value.locked) ||\n",
    "    !(value.color === undefined || isStitchColor(value.color)) ||\n    !optionalBoolean(value.mirrored) ||\n    !optionalBoolean(value.visible) || !optionalBoolean(value.locked) ||\n",
)
replace_once(
    'src/editor/projectSchema.ts',
    "    color: typeof value.color === 'string' ? value.color.toLowerCase() : undefined,\n    visible: value.visible !== false,\n",
    "    color: typeof value.color === 'string' ? value.color.toLowerCase() : undefined,\n    mirrored: value.mirrored === true,\n    visible: value.visible !== false,\n",
)
replace_once(
    'src/editor/projectSchema.ts',
    "  if (value.type === 'curve') {\n    if (!point(value.start) || !point(value.control1) || !point(value.control2) || !point(value.end) || !finite(value.divisions)) throw new ProjectValidationError('Invalid curve guide')\n    return value as unknown as Guide\n  }\n  if (value.type === 'grid') {\n",
    "  if (value.type === 'curve') {\n    if (!point(value.start) || !point(value.control1) || !point(value.control2) || !point(value.end) || !finite(value.divisions)) throw new ProjectValidationError('Invalid curve guide')\n    return value as unknown as Guide\n  }\n  if (value.type === 'parabola') {\n    if (!point(value.start) || !point(value.control) || !point(value.end) || !finite(value.divisions)) throw new ProjectValidationError('Invalid parabola guide')\n    return value as unknown as Guide\n  }\n  if (value.type === 'grid') {\n",
)
replace_once(
    'src/editor/projectSchema.test.ts',
    "  it('migrates legacy projects to schema v17 and normalizes element flags', () => {\n    const project = parseProject(legacyProject(), fallback)\n    expect(project.schemaVersion).toBe(19)\n",
    "  it('migrates legacy projects to the current schema and normalizes element flags', () => {\n    const project = parseProject(legacyProject(), fallback)\n    expect(project.schemaVersion).toBe(20)\n",
)

replace_once(
    'src/editor/projectIntegrity.ts',
    "  } else if (guide.type === 'curve') {\n    const points = [guide.start, guide.control1, guide.control2, guide.end]\n    if (!points.every((point) => bounded(point.x) && bounded(point.y))) return 'Curve guide geometry is out of bounds'\n    if (!positiveInteger(guide.divisions, 100)) return 'Curve guide divisions are out of bounds'\n  } else if (guide.type === 'grid') {\n",
    "  } else if (guide.type === 'curve') {\n    const points = [guide.start, guide.control1, guide.control2, guide.end]\n    if (!points.every((point) => bounded(point.x) && bounded(point.y))) return 'Curve guide geometry is out of bounds'\n    if (!positiveInteger(guide.divisions, 100)) return 'Curve guide divisions are out of bounds'\n  } else if (guide.type === 'parabola') {\n    const points = [guide.start, guide.control, guide.end]\n    if (!points.every((point) => bounded(point.x) && bounded(point.y))) return 'Parabola guide geometry is out of bounds'\n    if (!positiveInteger(guide.divisions, 100)) return 'Parabola guide divisions are out of bounds'\n  } else if (guide.type === 'grid') {\n",
)
replace_once(
    'src/editor/projectIntegrity.ts',
    "      if (guide && guide.type !== 'arc' && guide.type !== 'line' && guide.type !== 'curve') return 'Guide attachment references an incompatible guide'\n",
    "      if (guide && guide.type !== 'arc' && guide.type !== 'line' && guide.type !== 'curve' && guide.type !== 'parabola') return 'Guide attachment references an incompatible guide'\n",
)

# ---------------------------------------------------------------------------
# Quadratic/parabola path semantics.
# ---------------------------------------------------------------------------
replace_once(
    'src/editor/pathGuides.ts',
    "  LineGuide,\n  Point,\n",
    "  LineGuide,\n  ParabolaGuide,\n  Point,\n",
)
replace_once(
    'src/editor/pathGuides.ts',
    'export type PathGuide = ArcGuide | LineGuide | CurveGuide\n',
    'export type PathGuide = ArcGuide | LineGuide | CurveGuide | ParabolaGuide\n',
)
replace_once(
    'src/editor/pathGuides.ts',
    "function cubicPoint(guide: CurveGuide, t: number): Point {\n",
    "function quadraticPoint(guide: ParabolaGuide, t: number): Point {\n  const u = 1 - t\n  return {\n    x: u * u * guide.start.x + 2 * u * t * guide.control.x + t * t * guide.end.x,\n    y: u * u * guide.start.y + 2 * u * t * guide.control.y + t * t * guide.end.y,\n  }\n}\n\nfunction quadraticDerivative(guide: ParabolaGuide, t: number): Point {\n  return {\n    x: 2 * (1 - t) * (guide.control.x - guide.start.x) + 2 * t * (guide.end.x - guide.control.x),\n    y: 2 * (1 - t) * (guide.control.y - guide.start.y) + 2 * t * (guide.end.y - guide.control.y),\n  }\n}\n\nfunction cubicPoint(guide: CurveGuide, t: number): Point {\n",
)
replace_once(
    'src/editor/pathGuides.ts',
    "  return guide.type === 'arc' || guide.type === 'line' || guide.type === 'curve'\n",
    "  return guide.type === 'arc' || guide.type === 'line' || guide.type === 'curve' || guide.type === 'parabola'\n",
)
replace_once(
    'src/editor/pathGuides.ts',
    "  const point = cubicPoint(guide, t)\n  const derivative = cubicDerivative(guide, t)\n",
    "  if (guide.type === 'parabola') {\n    const point = quadraticPoint(guide, t)\n    const derivative = quadraticDerivative(guide, t)\n    return { point, tangent: vectorAngle(derivative.x, derivative.y) }\n  }\n\n  const point = cubicPoint(guide, t)\n  const derivative = cubicDerivative(guide, t)\n",
)
replace_once(
    'src/editor/pathGuides.ts',
    "  const samples = guide.type === 'curve' ? 240 : 160\n",
    "  const samples = guide.type === 'curve' || guide.type === 'parabola' ? 240 : 160\n",
)

replace_once(
    'src/editor/guides.ts',
    "  LineGuide,\n  Point,\n",
    "  LineGuide,\n  ParabolaGuide,\n  Point,\n",
)
replace_once(
    'src/editor/guides.ts',
    'function continuousPathSnapPoints(guide: LineGuide | CurveGuide): GuideSnapPoint[] {\n',
    'function continuousPathSnapPoints(guide: LineGuide | CurveGuide | ParabolaGuide): GuideSnapPoint[] {\n',
)
replace_once(
    'src/editor/guides.ts',
    "export function curveGuideSnapPoints(guide: CurveGuide) {\n  return continuousPathSnapPoints(guide)\n}\n\nexport function gridGuideSnapPoints",
    "export function curveGuideSnapPoints(guide: CurveGuide) {\n  return continuousPathSnapPoints(guide)\n}\n\nexport function parabolaGuideSnapPoints(guide: ParabolaGuide) {\n  return continuousPathSnapPoints(guide)\n}\n\nexport function gridGuideSnapPoints",
)
replace_once(
    'src/editor/guides.ts',
    "    case 'curve':\n      return curveGuideSnapPoints(guide)\n    case 'grid':\n",
    "    case 'curve':\n      return curveGuideSnapPoints(guide)\n    case 'parabola':\n      return parabolaGuideSnapPoints(guide)\n    case 'grid':\n",
)
replace_once(
    'src/editor/guides.ts',
    "export function curveRenderPoints(guide: CurveGuide, segments = 64): Point[] {\n  return pathRenderPoints(guide, segments)\n}\n\nexport function gridLocalBounds",
    "export function curveRenderPoints(guide: CurveGuide, segments = 64): Point[] {\n  return pathRenderPoints(guide, segments)\n}\n\nexport function parabolaRenderPoints(guide: ParabolaGuide, segments = 64): Point[] {\n  return pathRenderPoints(guide, segments)\n}\n\nexport function gridLocalBounds",
)

replace_once(
    'src/editor/guideManipulation.ts',
    "  | 'control1'\n  | 'control2'\n",
    "  | 'control1'\n  | 'control2'\n  | 'control'\n",
)
replace_once(
    'src/editor/guideManipulation.ts',
    "  if (guide.type === 'grid' || guide.type === 'line' || guide.type === 'curve') return null\n",
    "  if (guide.type === 'grid' || guide.type === 'line' || guide.type === 'curve' || guide.type === 'parabola') return null\n",
)
replace_once(
    'src/editor/guideManipulation.ts',
    "    if (guide.type === 'line') {\n      return {\n        ...guide,\n        start: translatePoint(guide.start, dx, dy),\n        end: translatePoint(guide.end, dx, dy),\n      }\n    }\n\n    return {\n",
    "    if (guide.type === 'line') {\n      return {\n        ...guide,\n        start: translatePoint(guide.start, dx, dy),\n        end: translatePoint(guide.end, dx, dy),\n      }\n    }\n\n    if (guide.type === 'parabola') {\n      return {\n        ...guide,\n        start: translatePoint(guide.start, dx, dy),\n        control: translatePoint(guide.control, dx, dy),\n        end: translatePoint(guide.end, dx, dy),\n      }\n    }\n\n    return {\n",
)
replace_once(
    'src/editor/guideManipulation.ts',
    "  if (mode === 'start' && (guide.type === 'line' || guide.type === 'curve')) {\n",
    "  if (mode === 'start' && (guide.type === 'line' || guide.type === 'curve' || guide.type === 'parabola')) {\n",
)
replace_once(
    'src/editor/guideManipulation.ts',
    "  if (mode === 'end' && (guide.type === 'line' || guide.type === 'curve')) {\n",
    "  if (mode === 'end' && (guide.type === 'line' || guide.type === 'curve' || guide.type === 'parabola')) {\n",
)
replace_once(
    'src/editor/guideManipulation.ts',
    "  if (mode === 'control2' && guide.type === 'curve') {\n    return { ...guide, control2: currentPointer }\n  }\n\n  if (mode === 'resize') {\n",
    "  if (mode === 'control2' && guide.type === 'curve') {\n    return { ...guide, control2: currentPointer }\n  }\n  if (mode === 'control' && guide.type === 'parabola') {\n    return { ...guide, control: currentPointer }\n  }\n\n  if (mode === 'resize') {\n",
)

# ---------------------------------------------------------------------------
# True reflection math + directional operations. Mirroring now toggles glyph parity.
# ---------------------------------------------------------------------------
replace_once(
    'src/editor/productivity.ts',
    "export type MirrorAxis = 'left-right' | 'top-bottom'\n",
    "export type MirrorAxis = 'left-right' | 'top-bottom'\nexport type MirrorDirection = 'left' | 'right' | 'up' | 'down'\nexport type MirrorLine = { point: Point; angle: number }\n",
)
replace_once(
    'src/editor/productivity.ts',
    "export function expandIdsToGroups(elements: StitchElement[], ids: string[]) {\n",
    "function selectionWorldBounds(elements: StitchElement[], ids: string[]) {\n  const selected = new Set(ids)\n  const source = elements.filter((element) => selected.has(element.id) && !element.parametricRow)\n  if (!source.length) return null\n  const bounds = source.map((element) => {\n    const definition = SYMBOL_BY_ID.get(element.symbolId)\n    const width = definition?.width ?? 30\n    const height = definition?.height ?? 30\n    const angle = radians(element.rotation)\n    const halfX = Math.abs(Math.cos(angle)) * width / 2 + Math.abs(Math.sin(angle)) * height / 2\n    const halfY = Math.abs(Math.sin(angle)) * width / 2 + Math.abs(Math.cos(angle)) * height / 2\n    return { left: element.x - halfX, right: element.x + halfX, top: element.y - halfY, bottom: element.y + halfY }\n  })\n  return {\n    left: Math.min(...bounds.map((item) => item.left)),\n    right: Math.max(...bounds.map((item) => item.right)),\n    top: Math.min(...bounds.map((item) => item.top)),\n    bottom: Math.max(...bounds.map((item) => item.bottom)),\n  }\n}\n\nexport function mirrorLineForDirection(\n  elements: StitchElement[],\n  ids: string[],\n  direction: MirrorDirection,\n  outwardOffset = 0,\n): MirrorLine | null {\n  const bounds = selectionWorldBounds(elements, ids)\n  if (!bounds) return null\n  if (direction === 'right') return { point: { x: bounds.right + outwardOffset, y: 0 }, angle: 90 }\n  if (direction === 'left') return { point: { x: bounds.left - outwardOffset, y: 0 }, angle: 90 }\n  if (direction === 'down') return { point: { x: 0, y: bounds.bottom + outwardOffset }, angle: 0 }\n  return { point: { x: 0, y: bounds.top - outwardOffset }, angle: 0 }\n}\n\nexport function expandIdsToGroups(elements: StitchElement[], ids: string[]) {\n",
)
old_mirror = """export function mirrorElementsAroundAxis(
  elements: StitchElement[],
  ids: string[],
  axis: MirrorAxis,
  coordinate: number,
) {
  if (!Number.isFinite(coordinate)) return elements
  const selected = new Set(ids)

  return elements.map((element) => {
    if (!selected.has(element.id) || element.parametricRow) return element
    if (axis === 'left-right') {
      return {
        ...element,
        x: coordinate * 2 - element.x,
        rotation: normalizeDegrees(180 - element.rotation),
        guideAttachment: undefined,
      }
    }
    return {
      ...element,
      y: coordinate * 2 - element.y,
      rotation: normalizeDegrees(-element.rotation),
      guideAttachment: undefined,
    }
  })
}

export function mirrorElements(
  elements: StitchElement[],
  ids: string[],
  axis: MirrorAxis,
) {
  const pivot = selectionPivot(elements, ids)
  if (!pivot) return elements
  const coordinate = axis === 'left-right' ? pivot.x : pivot.y
  return mirrorElementsAroundAxis(elements, ids, axis, coordinate)
}
"""
new_mirror = """function reflectedPoint(point: Point, line: MirrorLine): Point {
  const angle = radians(line.angle)
  const axis = { x: Math.cos(angle), y: Math.sin(angle) }
  const relative = { x: point.x - line.point.x, y: point.y - line.point.y }
  const projection = relative.x * axis.x + relative.y * axis.y
  return {
    x: line.point.x + 2 * projection * axis.x - relative.x,
    y: line.point.y + 2 * projection * axis.y - relative.y,
  }
}

export function mirrorElementsAcrossLine(
  elements: StitchElement[],
  ids: string[],
  line: MirrorLine,
) {
  if (!Number.isFinite(line.point.x) || !Number.isFinite(line.point.y) || !Number.isFinite(line.angle)) return elements
  const selected = new Set(ids)
  return elements.map((element) => {
    if (!selected.has(element.id) || element.parametricRow) return element
    const point = reflectedPoint(element, line)
    return {
      ...element,
      ...point,
      rotation: normalizeDegrees(2 * line.angle - element.rotation + 180),
      mirrored: !element.mirrored,
      guideAttachment: undefined,
    }
  })
}

export function mirrorElementsAroundAxis(
  elements: StitchElement[],
  ids: string[],
  axis: MirrorAxis,
  coordinate: number,
) {
  const line: MirrorLine = axis === 'left-right'
    ? { point: { x: coordinate, y: 0 }, angle: 90 }
    : { point: { x: 0, y: coordinate }, angle: 0 }
  return mirrorElementsAcrossLine(elements, ids, line)
}

export function mirrorElements(
  elements: StitchElement[],
  ids: string[],
  axis: MirrorAxis,
) {
  const pivot = selectionPivot(elements, ids)
  if (!pivot) return elements
  const coordinate = axis === 'left-right' ? pivot.x : pivot.y
  return mirrorElementsAroundAxis(elements, ids, axis, coordinate)
}

export function mirrorElementsToward(
  elements: StitchElement[],
  ids: string[],
  direction: MirrorDirection,
) {
  const line = mirrorLineForDirection(elements, ids, direction)
  return line ? mirrorElementsAcrossLine(elements, ids, line) : elements
}
"""
replace_once('src/editor/productivity.ts', old_mirror, new_mirror)
replace_once(
    'src/editor/productivity.ts',
    "  guide: Extract<PathGuide, { type: 'line' | 'curve' }>,\n",
    "  guide: Extract<PathGuide, { type: 'line' | 'curve' | 'parabola' }>,\n",
)
replace_once(
    'src/editor/productivity.ts',
    "  if (guide.type === 'line' || guide.type === 'curve') return continuousPathGuideWalk(guide, pivot)\n",
    "  if (guide.type === 'line' || guide.type === 'curve' || guide.type === 'parabola') return continuousPathGuideWalk(guide, pivot)\n",
)

replace_once(
    'src/editor/mirrorCopy.ts',
    "  mirrorElements,\n  mirrorElementsAroundAxis,\n  type MirrorAxis,\n",
    "  mirrorElements,\n  mirrorElementsAcrossLine,\n  mirrorElementsAroundAxis,\n  mirrorLineForDirection,\n  type MirrorAxis,\n  type MirrorDirection,\n  type MirrorLine,\n",
)
append_once(
    'src/editor/mirrorCopy.ts',
    'export function createMirroredCopyAcrossLine',
    """
export function createMirroredCopyAcrossLine(
  elements: StitchElement[],
  ids: string[],
  line: MirrorLine,
  createId: () => string,
) {
  const selected = new Set(ids)
  const source = elements.filter((element) => selected.has(element.id) && !element.parametricRow)
  if (!source.length) return []
  const copied = cloneSelectionWithOffset(elements, ids, 0, 0, createId)
  const copiedIds = copied.map((element) => element.id)
  const mirrored = mirrorElementsAcrossLine(copied, copiedIds, line)
  return mirrored.length > 1 ? groupElements(mirrored, copiedIds, createId()) : mirrored
}

export function createDirectionalMirroredCopy(
  elements: StitchElement[],
  ids: string[],
  direction: MirrorDirection,
  gap: number,
  createId: () => string,
) {
  const safeGap = Math.max(0, Math.abs(gap))
  const line = mirrorLineForDirection(elements, ids, direction, safeGap / 2)
  return line ? createMirroredCopyAcrossLine(elements, ids, line, createId) : []
}
""",
)

# Render true parity on canvas and in output/ghost previews.
replace_once(
    'src/editor/StitchLayer.tsx',
    "            <g className=\"symbol-glyph\" style={element.color ? { color: element.color } : undefined}>\n",
    "            <g className=\"symbol-glyph\" transform={element.mirrored ? 'scale(-1 1)' : undefined} style={element.color ? { color: element.color } : undefined}>\n",
)
replace_once(
    'src/App.tsx',
    "    .map((element) => `<g transform=\"translate(${element.x} ${element.y}) rotate(${element.rotation})\" style=\"color:${element.color ?? DEFAULT_STITCH_COLOR}\">${symbolSvgMarkup(element.symbolId)}</g>`)\n",
    "    .map((element) => `<g transform=\"translate(${element.x} ${element.y}) rotate(${element.rotation})${element.mirrored ? ' scale(-1 1)' : ''}\" style=\"color:${element.color ?? DEFAULT_STITCH_COLOR}\">${symbolSvgMarkup(element.symbolId)}</g>`)\n",
)
replace_once(
    'src/editor/ProductivityPanel.tsx',
    "              <g className=\"symbol-glyph\" style={element.color ? { color: element.color } : undefined}>\n",
    "              <g className=\"symbol-glyph\" transform={element.mirrored ? 'scale(-1 1)' : undefined} style={element.color ? { color: element.color } : undefined}>\n",
)

# ---------------------------------------------------------------------------
# Guide renderer: parabola handles, direction arrow, and double-click reverse.
# ---------------------------------------------------------------------------
replace_once(
    'src/editor/GuideRenderer.tsx',
    "  lineRenderPoints,\n} from './guides'\n",
    "  lineRenderPoints,\n  parabolaRenderPoints,\n} from './guides'\nimport { isPathGuide, pathPoseAt } from './pathGuides'\n",
)
replace_once(
    'src/editor/GuideRenderer.tsx',
    "  onManipulationEnd: (\n    mode: GuideManipulationMode,\n    moved: boolean,\n    cancelled: boolean,\n  ) => void\n}\n",
    "  onManipulationEnd: (\n    mode: GuideManipulationMode,\n    moved: boolean,\n    cancelled: boolean,\n  ) => void\n  onReverse: (guide: Guide) => void\n}\n",
)
replace_once(
    'src/editor/GuideRenderer.tsx',
    "  onManipulationPreview,\n  onManipulationEnd,\n}: Props) {\n",
    "  onManipulationPreview,\n  onManipulationEnd,\n  onReverse,\n}: Props) {\n",
)
replace_once(
    'src/editor/GuideRenderer.tsx',
    "  const rotationStem = selected ? gridRotationStemPoint(guide) : null\n",
    "  const rotationStem = selected ? gridRotationStemPoint(guide) : null\n  const directionPose = isPathGuide(guide) ? pathPoseAt(guide, 1) : null\n",
)
replace_once(
    'src/editor/GuideRenderer.tsx',
    "      onPointerDown={(event) => startInteraction(event, 'move')}\n    >\n",
    "      onPointerDown={(event) => startInteraction(event, 'move')}\n      onDoubleClick={(event) => {\n        if (locked || !isPathGuide(guide)) return\n        event.preventDefault()\n        event.stopPropagation()\n        onReverse(guide)\n      }}\n    >\n",
)
replace_once(
    'src/editor/GuideRenderer.tsx',
    "      {guide.type === 'grid' && (() => {\n",
    "      {guide.type === 'parabola' && (\n        <>\n          <polyline\n            points={pointsAttribute(parabolaRenderPoints(guide))}\n            className=\"guide-stroke guide-hit-target\"\n            fill=\"none\"\n            vectorEffect=\"non-scaling-stroke\"\n          />\n          {selected && !locked && (\n            <g className=\"guide-curve-controls\" pointerEvents=\"none\">\n              <line x1={guide.start.x} y1={guide.start.y} x2={guide.control.x} y2={guide.control.y} className=\"guide-handle-link guide-control-link\" vectorEffect=\"non-scaling-stroke\" />\n              <line x1={guide.end.x} y1={guide.end.y} x2={guide.control.x} y2={guide.control.y} className=\"guide-handle-link guide-control-link\" vectorEffect=\"non-scaling-stroke\" />\n            </g>\n          )}\n        </>\n      )}\n\n      {guide.type === 'grid' && (() => {\n",
)
replace_once(
    'src/editor/GuideRenderer.tsx',
    "      {selected && locked && (\n",
    "      {directionPose && (\n        <polygon\n          points={`${-12 / zoom},${-5 / zoom} 0,0 ${-12 / zoom},${5 / zoom}`}\n          transform={`translate(${directionPose.point.x} ${directionPose.point.y}) rotate(${directionPose.tangent})`}\n          className=\"guide-direction-arrow\"\n          vectorEffect=\"non-scaling-stroke\"\n          pointerEvents=\"none\"\n        />\n      )}\n\n      {selected && locked && (\n",
)
replace_once(
    'src/editor/GuideRenderer.tsx',
    "          {guide.type === 'curve' && (\n            <>\n              {pointHandle('curve-start', guide.start, 'start', 'guide-path-endpoint')}\n              {pointHandle('curve-control1', guide.control1, 'control1', 'guide-control-handle')}\n              {pointHandle('curve-control2', guide.control2, 'control2', 'guide-control-handle')}\n              {pointHandle('curve-end', guide.end, 'end', 'guide-path-endpoint')}\n            </>\n          )}\n\n          {resizeHandle && (\n",
    "          {guide.type === 'curve' && (\n            <>\n              {pointHandle('curve-start', guide.start, 'start', 'guide-path-endpoint')}\n              {pointHandle('curve-control1', guide.control1, 'control1', 'guide-control-handle')}\n              {pointHandle('curve-control2', guide.control2, 'control2', 'guide-control-handle')}\n              {pointHandle('curve-end', guide.end, 'end', 'guide-path-endpoint')}\n            </>\n          )}\n\n          {guide.type === 'parabola' && (\n            <>\n              {pointHandle('parabola-start', guide.start, 'start', 'guide-path-endpoint')}\n              {pointHandle('parabola-control', guide.control, 'control', 'guide-control-handle')}\n              {pointHandle('parabola-end', guide.end, 'end', 'guide-path-endpoint')}\n            </>\n          )}\n\n          {resizeHandle && (\n",
)
append_once(
    'src/guides.css',
    '.guide-direction-arrow',
    """
.guide-direction-arrow {
  fill: #c2413b;
  stroke: rgba(255,255,255,.9);
  stroke-width: 1px;
  opacity: .82;
  pointer-events: none;
}

.guide-direction-actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-top: 8px;
}
""",
)

# ---------------------------------------------------------------------------
# Mirror overlay becomes an independent, persistent arbitrary line.
# ---------------------------------------------------------------------------
Path('src/editor/MirrorAxisOverlay.tsx').write_text("""import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Point } from '../types'
import './mirrorAxis.css'

export type MirrorAxisState = {
  point: Point
  angle: number
}

function radians(value: number) {
  return value * Math.PI / 180
}

function normalizedAngle(value: number) {
  let result = value % 180
  if (result > 90) result -= 180
  if (result <= -90) result += 180
  return result
}

export function MirrorAxisOverlay({
  state,
  zoom,
  clientToDocument,
  onChange,
}: {
  state: MirrorAxisState
  zoom: number
  clientToDocument: (clientX: number, clientY: number) => Point
  onChange: (state: MirrorAxisState) => void
}) {
  const safeZoom = Math.max(0.1, zoom)
  const angle = radians(state.angle)
  const axis = { x: Math.cos(angle), y: Math.sin(angle) }
  const halfLength = 900 / safeZoom
  const x1 = state.point.x - axis.x * halfLength
  const y1 = state.point.y - axis.y * halfLength
  const x2 = state.point.x + axis.x * halfLength
  const y2 = state.point.y + axis.y * halfLength
  const rotateDistance = 150 / safeZoom
  const rotatePoint = {
    x: state.point.x + axis.x * rotateDistance,
    y: state.point.y + axis.y * rotateDistance,
  }

  const startMove = (event: ReactPointerEvent<SVGElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const pointerId = event.pointerId
    const start = clientToDocument(event.clientX, event.clientY)
    const original = state.point
    const handleMove = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return
      const current = clientToDocument(nativeEvent.clientX, nativeEvent.clientY)
      onChange({ ...state, point: { x: original.x + current.x - start.x, y: original.y + current.y - start.y } })
    }
    const finish = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }

  const startRotate = (event: ReactPointerEvent<SVGCircleElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const pointerId = event.pointerId
    const handleMove = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return
      const current = clientToDocument(nativeEvent.clientX, nativeEvent.clientY)
      const angleDegrees = Math.atan2(current.y - state.point.y, current.x - state.point.x) * 180 / Math.PI
      onChange({ ...state, angle: normalizedAngle(angleDegrees) })
    }
    const finish = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }

  return (
    <g className=\"mirror-axis-overlay\" data-mirror-angle={state.angle}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} className=\"mirror-axis-hit\" vectorEffect=\"non-scaling-stroke\" onPointerDown={startMove} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} className=\"mirror-axis-line\" vectorEffect=\"non-scaling-stroke\" pointerEvents=\"none\" />
      <circle cx={state.point.x} cy={state.point.y} r={6 / safeZoom} className=\"mirror-axis-handle\" vectorEffect=\"non-scaling-stroke\" onPointerDown={startMove} />
      <line x1={state.point.x} y1={state.point.y} x2={rotatePoint.x} y2={rotatePoint.y} className=\"mirror-axis-rotate-stem\" vectorEffect=\"non-scaling-stroke\" pointerEvents=\"none\" />
      <circle cx={rotatePoint.x} cy={rotatePoint.y} r={7 / safeZoom} className=\"mirror-axis-rotate-handle\" vectorEffect=\"non-scaling-stroke\" onPointerDown={startRotate} />
    </g>
  )
}
""")
append_once(
    'src/editor/mirrorAxis.css',
    '.mirror-axis-rotate-handle',
    """
.mirror-axis-overlay { opacity: .72; }
.mirror-axis-rotate-stem {
  stroke: #c2413b;
  stroke-width: 1;
  stroke-dasharray: 3 4;
  opacity: .55;
}
.mirror-axis-rotate-handle {
  fill: #fff;
  stroke: #c2413b;
  stroke-width: 2;
  cursor: grab;
}
.mirror-axis-rotate-handle:active { cursor: grabbing; }
""",
)

# ---------------------------------------------------------------------------
# Mirror controls: visual directional presets + persistent custom axis.
# ---------------------------------------------------------------------------
replace_once(
    'src/editor/ProductivityPanel.tsx',
    "import type { MirrorAxisState } from './MirrorAxisOverlay'\n",
    "import type { MirrorAxisState } from './MirrorAxisOverlay'\nimport { MirrorControls } from './MirrorControls'\nimport type { MirrorDirection } from './productivity'\n",
)
replace_once(
    'src/editor/ProductivityPanel.tsx',
    "  onMirror,\n  onMirrorCopy,\n  mirrorAxis,\n  onConfigureMirrorAxis,\n  onMirrorAxisCoordinateChange,\n",
    "  onDirectionalMirror,\n  mirrorAxis,\n  onConfigureMirrorAxis,\n  onMirrorAxisChange,\n",
)
replace_once(
    'src/editor/ProductivityPanel.tsx',
    "  onMirror: (axis: 'left-right' | 'top-bottom') => void\n  onMirrorCopy: (axis: 'left-right' | 'top-bottom') => void\n  mirrorAxis: MirrorAxisState | null\n  onConfigureMirrorAxis: (axis: MirrorAxisState['axis']) => void\n  onMirrorAxisCoordinateChange: (coordinate: number) => void\n",
    "  onDirectionalMirror: (direction: MirrorDirection, copy: boolean) => void\n  mirrorAxis: MirrorAxisState | null\n  onConfigureMirrorAxis: (angle: number) => void\n  onMirrorAxisChange: (state: MirrorAxisState) => void\n",
)
start = """        <div className=\"productivity-block\">
          <strong>{copy.mirror}</strong>
"""
end = """        <div className=\"productivity-block\">
          <strong>{copy.repeat}</strong>
"""
file = Path('src/editor/ProductivityPanel.tsx')
text = file.read_text()
start_index = text.find(start)
end_index = text.find(end, start_index)
if start_index < 0 or end_index < 0:
    raise SystemExit('Productivity mirror block markers not found')
replacement = """        <MirrorControls
          locale={locale}
          canTransform={canTransform}
          state={mirrorAxis}
          onDirectional={onDirectionalMirror}
          onPreset={onConfigureMirrorAxis}
          onStateChange={onMirrorAxisChange}
          onCenter={onCenterMirrorAxis}
          onHide={onHideMirrorAxis}
          onReflectCustom={onMirrorAtCustomAxis}
          onCopyCustom={onMirrorCopyAtCustomAxis}
        />

""" + end
file.write_text(text[:start_index] + replacement + text[end_index + len(end):])
replace_once(
    'src/editor/ProductivityPanel.tsx',
    "    : guide.type === 'curve'\n        ? locale === 'ru' ? 'Кривая' : 'Curve'\n        : guide.type === 'grid'\n",
    "    : guide.type === 'curve'\n        ? locale === 'ru' ? 'Кривая' : 'Curve'\n        : guide.type === 'parabola'\n          ? locale === 'ru' ? 'Парабола' : 'Parabola'\n          : guide.type === 'grid'\n",
)
append_once(
    'src/editor/productivity.css',
    '.mirror-direction-grid',
    """
.mirror-direction-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 6px;
}
.mirror-direction-grid button { padding: 4px; min-height: 42px; }
.mirror-direction-icon { width: 100%; height: 28px; display: block; }
.mirror-icon-source { fill: #3c7ed8; }
.mirror-icon-result { fill: #aeb5b2; }
.mirror-icon-axis { stroke: #d34a43; stroke-width: 2; }
.mirror-action-label { color: var(--muted, #66706b); font-size: 11px; }
.mirror-custom-block { display: grid; gap: 7px; padding-top: 4px; }
.mirror-axis-presets { grid-template-columns: repeat(2, minmax(0, 1fr)); }
""",
)

# ---------------------------------------------------------------------------
# App wiring: parabola creation/editor, semantic line dimensions, reverse direction,
# project-span line fitting, persistent mirror axis, directional mirror actions.
# ---------------------------------------------------------------------------
replace_once(
    'src/App.tsx',
    "import type { GuideManipulationMode } from './editor/guideManipulation'\n",
    "import type { GuideManipulationMode } from './editor/guideManipulation'\nimport { fitLineGuideToRect, lineGuideAngle, lineGuideLength, reverseGuide, setLineGuideAngle, setLineGuideLength } from './editor/guideGeometry'\n",
)
replace_once(
    'src/App.tsx',
    "import { createMirroredCopy, createMirroredCopyAroundAxis } from './editor/mirrorCopy'\n",
    "import { createDirectionalMirroredCopy, createMirroredCopy, createMirroredCopyAcrossLine } from './editor/mirrorCopy'\n",
)
replace_once(
    'src/App.tsx',
    "  mirrorElements,\n  mirrorElementsAroundAxis,\n  repeatSelection,\n  selectionPivot,\n  ungroupElements,\n  type MirrorAxis,\n  type RepeatOptions,\n",
    "  mirrorElements,\n  mirrorElementsAcrossLine,\n  mirrorElementsToward,\n  repeatSelection,\n  selectionPivot,\n  ungroupElements,\n  type MirrorAxis,\n  type MirrorDirection,\n  type RepeatOptions,\n",
)
replace_once(
    'src/App.tsx',
    "  idsInLasso,\n  idsInMarquee,\n  normalizeRect,\n",
    "  idsInLasso,\n  idsInMarquee,\n  normalizeRect,\n  selectionAabb,\n",
)
replace_once(
    'src/App.tsx',
    "  if (guide.type === 'curve') return locale === 'ru' ? 'Кривая' : 'Curve'\n  if (guide.type === 'grid') return t.rectangularGrid\n",
    "  if (guide.type === 'curve') return locale === 'ru' ? 'Кривая' : 'Curve'\n  if (guide.type === 'parabola') return locale === 'ru' ? 'Парабола' : 'Parabola'\n  if (guide.type === 'grid') return t.rectangularGrid\n",
)
replace_once(
    'src/App.tsx',
    "  useEffect(() => {\n    if (!selectedIds.length) setMirrorAxis(null)\n  }, [selectedIds.length])\n\n",
    "",
)
replace_once(
    'src/App.tsx',
    "        setRulerDraft(null)\n        setRulerDrag(null)\n        setMirrorAxis(null)\n        snapLockRef.current = null\n",
    "        setRulerDraft(null)\n        setRulerDrag(null)\n        snapLockRef.current = null\n",
)
replace_once(
    'src/App.tsx',
    "      else if (mode === 'resize' || mode === 'start' || mode === 'end' || mode === 'control1' || mode === 'control2') setStatus(t.guideResized)\n",
    "      else if (mode === 'resize' || mode === 'start' || mode === 'end' || mode === 'control1' || mode === 'control2' || mode === 'control') setStatus(t.guideResized)\n",
)
replace_once(
    'src/App.tsx',
    "    } else if (type === 'curve') {\n      guide = {\n        id,\n        type,\n        start: { x: center.x - 150, y: center.y },\n        control1: { x: center.x - 70, y: center.y - 90 },\n        control2: { x: center.x + 70, y: center.y + 90 },\n        end: { x: center.x + 150, y: center.y },\n        divisions: 16,\n        visible: true,\n      }\n    } else if (type === 'grid') {\n",
    "    } else if (type === 'curve') {\n      guide = {\n        id,\n        type,\n        start: { x: center.x - 150, y: center.y },\n        control1: { x: center.x - 70, y: center.y - 90 },\n        control2: { x: center.x + 70, y: center.y + 90 },\n        end: { x: center.x + 150, y: center.y },\n        divisions: 16,\n        visible: true,\n      }\n    } else if (type === 'parabola') {\n      guide = {\n        id,\n        type,\n        start: { x: center.x - 150, y: center.y + 40 },\n        control: { x: center.x, y: center.y - 100 },\n        end: { x: center.x + 150, y: center.y + 40 },\n        divisions: 16,\n        visible: true,\n      }\n    } else if (type === 'grid') {\n",
)
replace_once(
    'src/App.tsx',
    "  const handleGenerateGuideRow = (generated: StitchElement[]) => {\n",
    "  const reverseGuideDirection = useCallback((target: Guide) => {\n    if (target.locked === true || !isPathGuide(target)) return\n    commitGuides(guides.map((guide) => guide.id === target.id ? reverseGuide(guide) : guide))\n    setStatus(locale === 'ru' ? 'Направление направляющей изменено' : 'Guide direction reversed')\n  }, [commitGuides, guides, locale])\n\n  const fitSelectedLineToProject = useCallback(() => {\n    if (!selectedGuide || selectedGuide.type !== 'line' || selectedGuide.locked === true) return\n    const ids = visibleElements.map((element) => element.id)\n    let bounds = selectionAabb(visibleElements, ids, SYMBOL_SIZES)\n    if (backgroundImage && backgroundImage.visible !== false) {\n      const imageBounds = {\n        left: backgroundImage.x, top: backgroundImage.y,\n        right: backgroundImage.x + backgroundImage.width, bottom: backgroundImage.y + backgroundImage.height,\n      }\n      bounds = bounds ? {\n        left: Math.min(bounds.left, imageBounds.left), top: Math.min(bounds.top, imageBounds.top),\n        right: Math.max(bounds.right, imageBounds.right), bottom: Math.max(bounds.bottom, imageBounds.bottom),\n      } : imageBounds\n    }\n    if (!bounds) {\n      const rect = svgRef.current?.getBoundingClientRect()\n      const topLeft = screenToDocument({ x: 0, y: 0 }, viewport)\n      const bottomRight = screenToDocument({ x: rect?.width ?? 800, y: rect?.height ?? 600 }, viewport)\n      bounds = { left: topLeft.x, top: topLeft.y, right: bottomRight.x, bottom: bottomRight.y }\n    }\n    updateSelectedGuide((guide) => guide.type === 'line'\n      ? fitLineGuideToRect(guide, bounds!, 32 / Math.max(0.1, viewport.zoom))\n      : guide)\n    setStatus(locale === 'ru' ? 'Направляющая растянута по размеру проекта' : 'Guide fitted to project bounds')\n  }, [backgroundImage, locale, selectedGuide, viewport, visibleElements])\n\n  const handleGenerateGuideRow = (generated: StitchElement[]) => {\n",
)
# Mirror callback block.
old_custom = """  const configureMirrorAxis = useCallback((axis: MirrorAxis) => {
    const ids = productivitySelectionIds()
    const pivot = selectionPivot(elements, ids)
    if (!pivot) return
    const coordinate = axis === 'left-right' ? pivot.x : pivot.y
    setMirrorAxis((current) => current?.axis === axis ? current : { axis, coordinate })
    setStatus(locale === 'ru'
      ? axis === 'left-right' ? 'Вертикальная ось зеркалирования активна' : 'Горизонтальная ось зеркалирования активна'
      : axis === 'left-right' ? 'Vertical mirror axis active' : 'Horizontal mirror axis active')
  }, [elements, locale, productivitySelectionIds])

  const moveMirrorAxis = useCallback((coordinate: number) => {
    if (!Number.isFinite(coordinate)) return
    setMirrorAxis((current) => current ? { ...current, coordinate } : current)
  }, [])

  const centerMirrorAxis = useCallback(() => {
    if (!mirrorAxis) return
    const ids = productivitySelectionIds()
    const pivot = selectionPivot(elements, ids)
    if (!pivot) return
    setMirrorAxis({ ...mirrorAxis, coordinate: mirrorAxis.axis === 'left-right' ? pivot.x : pivot.y })
  }, [elements, mirrorAxis, productivitySelectionIds])

  const mirrorSelectionAroundCustomAxis = useCallback(() => {
    if (!mirrorAxis) return
    const ids = productivitySelectionIds()
    if (!ids.length) return
    duplicateSeriesRef.current = null
    commitElements(mirrorElementsAroundAxis(elements, ids, mirrorAxis.axis, mirrorAxis.coordinate))
    setSelectedIds(ids)
    setStatus(locale === 'ru' ? `Отражено по пользовательской оси: ${ids.length}` : `Flipped across custom axis: ${ids.length}`)
  }, [commitElements, elements, locale, mirrorAxis, productivitySelectionIds])

  const mirrorCopySelectionAroundCustomAxis = useCallback(() => {
    if (!mirrorAxis) return
    const ids = productivitySelectionIds()
    if (!ids.length) return
    const created = createMirroredCopyAroundAxis(elements, ids, mirrorAxis.axis, mirrorAxis.coordinate, createId)
    if (!created.length) return
    duplicateSeriesRef.current = null
    commitElements([...elements, ...created])
    setSelectedIds(created.map((element) => element.id))
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setStatus(locale === 'ru' ? `Создана копия через пользовательскую ось: ${created.length}` : `Custom-axis mirrored copy created: ${created.length}`)
  }, [commitElements, elements, locale, mirrorAxis, productivitySelectionIds])
"""
new_custom = """  const directionalMirrorSelection = useCallback((direction: MirrorDirection, copy: boolean) => {
    const ids = productivitySelectionIds()
    if (!ids.length) return
    duplicateSeriesRef.current = null
    if (copy) {
      const created = createDirectionalMirroredCopy(elements, ids, direction, DUPLICATE_OFFSET, createId)
      if (!created.length) return
      commitElements([...elements, ...created])
      setSelectedIds(created.map((element) => element.id))
      setSelectedGuideId(null)
      setTool({ type: 'select' })
      setStatus(locale === 'ru' ? `Создана зеркальная копия: ${created.length}` : `Mirrored copy created: ${created.length}`)
      return
    }
    commitElements(mirrorElementsToward(elements, ids, direction))
    setSelectedIds(ids)
    setStatus(locale === 'ru' ? `Отражено ${ids.length} элементов` : `Reflected ${ids.length} elements`)
  }, [commitElements, elements, locale, productivitySelectionIds])

  const configureMirrorAxis = useCallback((angle: number) => {
    if (!Number.isFinite(angle)) return
    const ids = productivitySelectionIds()
    const pivot = selectionPivot(elements, ids)
    if (!pivot) return
    setMirrorAxis((current) => current ? { ...current, angle } : { point: pivot, angle })
    setStatus(locale === 'ru' ? 'Пользовательская ось зеркалирования активна' : 'Custom mirror axis active')
  }, [elements, locale, productivitySelectionIds])

  const moveMirrorAxis = useCallback((next: MirrorAxisState) => {
    if (![next.point.x, next.point.y, next.angle].every(Number.isFinite)) return
    setMirrorAxis(next)
  }, [])

  const centerMirrorAxis = useCallback(() => {
    if (!mirrorAxis) return
    const ids = productivitySelectionIds()
    const pivot = selectionPivot(elements, ids)
    if (!pivot) return
    setMirrorAxis({ ...mirrorAxis, point: pivot })
  }, [elements, mirrorAxis, productivitySelectionIds])

  const mirrorSelectionAroundCustomAxis = useCallback(() => {
    if (!mirrorAxis) return
    const ids = productivitySelectionIds()
    if (!ids.length) return
    duplicateSeriesRef.current = null
    commitElements(mirrorElementsAcrossLine(elements, ids, mirrorAxis))
    setSelectedIds(ids)
    setStatus(locale === 'ru' ? `Отражено по пользовательской оси: ${ids.length}` : `Flipped across custom axis: ${ids.length}`)
  }, [commitElements, elements, locale, mirrorAxis, productivitySelectionIds])

  const mirrorCopySelectionAroundCustomAxis = useCallback(() => {
    if (!mirrorAxis) return
    const ids = productivitySelectionIds()
    if (!ids.length) return
    const created = createMirroredCopyAcrossLine(elements, ids, mirrorAxis, createId)
    if (!created.length) return
    duplicateSeriesRef.current = null
    commitElements([...elements, ...created])
    setSelectedIds(created.map((element) => element.id))
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setStatus(locale === 'ru' ? `Создана копия через пользовательскую ось: ${created.length}` : `Custom-axis mirrored copy created: ${created.length}`)
  }, [commitElements, elements, locale, mirrorAxis, productivitySelectionIds])
"""
replace_once('src/App.tsx', old_custom, new_custom)
replace_once(
    'src/App.tsx',
    "            <button onClick={() => addGuide('curve')}><strong>∿</strong><span>{locale === 'ru' ? 'Кривая' : 'Curve'}</span></button>\n            <button onClick={() => addGuide('grid')}><strong>▦</strong><span>{t.grid}</span></button>\n",
    "            <button onClick={() => addGuide('curve')}><strong>∿</strong><span>{locale === 'ru' ? 'Кривая' : 'Curve'}</span></button>\n            <button onClick={() => addGuide('parabola')}><strong>∩</strong><span>{locale === 'ru' ? 'Парабола' : 'Parabola'}</span></button>\n            <button onClick={() => addGuide('grid')}><strong>▦</strong><span>{t.grid}</span></button>\n",
)
replace_once(
    'src/App.tsx',
    "                onManipulationPreview={handleGuideManipulationPreview}\n                onManipulationEnd={handleGuideManipulationEnd}\n              />\n",
    "                onManipulationPreview={handleGuideManipulationPreview}\n                onManipulationEnd={handleGuideManipulationEnd}\n                onReverse={reverseGuideDirection}\n              />\n",
)
replace_once(
    'src/App.tsx',
    "            {mirrorAxis && productivitySelectionIds().length > 0 && (\n              <MirrorAxisOverlay\n                state={mirrorAxis}\n                elements={elements}\n                selectedIds={productivitySelectionIds()}\n                zoom={viewport.zoom}\n                clientToDocument={clientToDocument}\n                onChange={moveMirrorAxis}\n              />\n            )}\n",
    "            {mirrorAxis && (\n              <MirrorAxisOverlay\n                state={mirrorAxis}\n                zoom={viewport.zoom}\n                clientToDocument={clientToDocument}\n                onChange={moveMirrorAxis}\n              />\n            )}\n",
)
replace_once(
    'src/App.tsx',
    "            onMirror={mirrorSelection}\n            onMirrorCopy={mirrorCopySelection}\n            mirrorAxis={mirrorAxis}\n            onConfigureMirrorAxis={configureMirrorAxis}\n            onMirrorAxisCoordinateChange={moveMirrorAxis}\n",
    "            onDirectionalMirror={directionalMirrorSelection}\n            mirrorAxis={mirrorAxis}\n            onConfigureMirrorAxis={configureMirrorAxis}\n            onMirrorAxisChange={moveMirrorAxis}\n",
)
# Line inspector: add semantic length/angle + fit action.
replace_once(
    'src/App.tsx',
    "                  <NumberField label={locale === 'ru' ? 'Конец Y' : 'End Y'} value={selectedGuide.end.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? { ...guide, end: { ...guide.end, y: value } } : guide)} />\n                  <NumberField label={t.divisions} value={selectedGuide.divisions} min={1} max={100} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? { ...guide, divisions: Math.round(clamp(value, 1, 100)) } : guide)} />\n                </div>\n              )}\n\n              {selectedGuide.type === 'curve' && (\n",
    "                  <NumberField label={locale === 'ru' ? 'Конец Y' : 'End Y'} value={selectedGuide.end.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? { ...guide, end: { ...guide.end, y: value } } : guide)} />\n                  <NumberField label={locale === 'ru' ? 'Длина' : 'Length'} value={Math.round(lineGuideLength(selectedGuide) * 100) / 100} min={1} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? setLineGuideLength(guide, value) : guide)} />\n                  <NumberField label={locale === 'ru' ? 'Угол °' : 'Angle °'} value={Math.round(lineGuideAngle(selectedGuide) * 100) / 100} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? setLineGuideAngle(guide, value) : guide)} />\n                  <NumberField label={t.divisions} value={selectedGuide.divisions} min={1} max={100} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? { ...guide, divisions: Math.round(clamp(value, 1, 100)) } : guide)} />\n                  <button type=\"button\" onClick={fitSelectedLineToProject}>{locale === 'ru' ? 'По размеру проекта' : 'Fit to project'}</button>\n                </div>\n              )}\n\n              {selectedGuide.type === 'curve' && (\n",
)
# Parabola inspector.
replace_once(
    'src/App.tsx',
    "              {selectedGuide.type === 'grid' && (\n",
    "              {selectedGuide.type === 'parabola' && (\n                <div className=\"number-field-grid\">\n                  <NumberField label={locale === 'ru' ? 'Начало X' : 'Start X'} value={selectedGuide.start.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'parabola' ? { ...guide, start: { ...guide.start, x: value } } : guide)} />\n                  <NumberField label={locale === 'ru' ? 'Начало Y' : 'Start Y'} value={selectedGuide.start.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'parabola' ? { ...guide, start: { ...guide.start, y: value } } : guide)} />\n                  <NumberField label={locale === 'ru' ? 'Вершина X' : 'Control X'} value={selectedGuide.control.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'parabola' ? { ...guide, control: { ...guide.control, x: value } } : guide)} />\n                  <NumberField label={locale === 'ru' ? 'Вершина Y' : 'Control Y'} value={selectedGuide.control.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'parabola' ? { ...guide, control: { ...guide.control, y: value } } : guide)} />\n                  <NumberField label={locale === 'ru' ? 'Конец X' : 'End X'} value={selectedGuide.end.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'parabola' ? { ...guide, end: { ...guide.end, x: value } } : guide)} />\n                  <NumberField label={locale === 'ru' ? 'Конец Y' : 'End Y'} value={selectedGuide.end.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'parabola' ? { ...guide, end: { ...guide.end, y: value } } : guide)} />\n                  <NumberField label={t.divisions} value={selectedGuide.divisions} min={1} max={100} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'parabola' ? { ...guide, divisions: Math.round(clamp(value, 1, 100)) } : guide)} />\n                </div>\n              )}\n\n              {selectedGuide.type === 'grid' && (\n",
)
replace_once(
    'src/App.tsx',
    "              </fieldset>\n\n              {(selectedGuide.type === 'arc' || selectedGuide.type === 'radial-grid') && (\n",
    "              </fieldset>\n\n              {isPathGuide(selectedGuide) && (\n                <div className=\"guide-direction-actions\">\n                  <button disabled={selectedGuide.locked === true} onClick={() => reverseGuideDirection(selectedGuide)}>{locale === 'ru' ? '↔ Сменить направление' : '↔ Reverse direction'}</button>\n                  <small>{locale === 'ru' ? 'Также: двойной клик по направляющей' : 'Also: double-click the guide'}</small>\n                </div>\n              )}\n\n              {(selectedGuide.type === 'arc' || selectedGuide.type === 'radial-grid') && (\n",
)

# ---------------------------------------------------------------------------
# Tests for quadratic guide behavior and mirror parity.
# ---------------------------------------------------------------------------
replace_once(
    'src/editor/guideManipulation.test.ts',
    "import type { ArcGuide, CurveGuide, GridGuide, LineGuide, RadialGridGuide } from '../types'\n",
    "import type { ArcGuide, CurveGuide, GridGuide, LineGuide, ParabolaGuide, RadialGridGuide } from '../types'\n",
)
replace_once(
    'src/editor/guideManipulation.test.ts',
    "const grid: GridGuide = {\n",
    "const parabola: ParabolaGuide = {\n  id: 'parabola', type: 'parabola', start: { x: -100, y: 0 }, control: { x: 0, y: -80 }, end: { x: 100, y: 0 }, divisions: 12, visible: true,\n}\n\nconst grid: GridGuide = {\n",
)
replace_once(
    'src/editor/guideManipulation.test.ts',
    "  it('resizes an arc from its center', () => {\n",
    "  it('moves and edits a quadratic parabola with one control point', () => {\n    const moved = applyGuideManipulation(parabola, 'move', { x: 0, y: 0 }, { x: 10, y: 20 })\n    expect(moved.type).toBe('parabola')\n    if (moved.type === 'parabola') {\n      expect(moved.start).toEqual({ x: -90, y: 20 })\n      expect(moved.control).toEqual({ x: 10, y: -60 })\n      expect(moved.end).toEqual({ x: 110, y: 20 })\n    }\n    const edited = applyGuideManipulation(parabola, 'control', parabola.control, { x: 5, y: -120 })\n    expect(edited.type).toBe('parabola')\n    if (edited.type === 'parabola') expect(edited.control).toEqual({ x: 5, y: -120 })\n  })\n\n  it('resizes an arc from its center', () => {\n",
)
replace_once(
    'src/editor/productivity.test.ts',
    "    expect(mirrored[0]).toMatchObject({ x: 30, y: 20, rotation: -180 })\n    expect(mirrored[1].x).toBe(10)\n    expect(mirrored[1].rotation).toBe(150)\n",
    "    expect(mirrored[0]).toMatchObject({ x: 30, y: 20, rotation: 0, mirrored: true })\n    expect(mirrored[1].x).toBe(10)\n    expect(mirrored[1].rotation).toBe(-30)\n    expect(mirrored[1].mirrored).toBe(true)\n",
)
replace_once(
    'src/editor/productivity.test.ts',
    "    expect(mirrored[0]).toMatchObject({ x: 10, y: 40, rotation: 0 })\n    expect(mirrored[1]).toMatchObject({ x: 30, y: 20, rotation: -30 })\n",
    "    expect(mirrored[0]).toMatchObject({ x: 10, y: 40, rotation: -180, mirrored: true })\n    expect(mirrored[1]).toMatchObject({ x: 30, y: 20, rotation: 150, mirrored: true })\n",
)

# Version text; npm version updates package.json + package-lock in workflow.
replace_once('src/i18n.ts', 'v1.18.0', 'v1.19.0')
replace_once('src/i18n.ts', 'v1.18.0', 'v1.19.0')
append_once(
    'README.md',
    'v1.19.0 Guide & Mirror Geometry',
    """
### v1.19.0 Guide & Mirror Geometry
- semantic line length/angle, project-span fitting, visible guide direction and reversible path direction
- quadratic Parabola guide with one control point while legacy cubic Curve remains compatible
- true reflected stitch parity, directional mirror/copy presets, and a persistent movable/rotatable custom mirror axis
""",
)
