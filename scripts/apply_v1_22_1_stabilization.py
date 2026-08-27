from pathlib import Path
import re

ROOT = Path('.')


def read(path: str) -> str:
    return (ROOT / path).read_text()


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text)


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


# 1) Preserve manual guide attachments when reversing path direction.
path = 'src/editor/pathGuides.ts'
text = read(path)
anchor = """export function moveAttachedElement(\n  element: StitchElement,\n  guide: PathGuide,\n  target: Point,\n): StitchElement {\n  const current = element.guideAttachment\n  if (!current || current.guideId !== guide.id) return element\n  const t = nearestPathParameter(guide, target)\n  return elementFromAttachment(element, guide, { ...current, t })\n}\n\n"""
addition = anchor + """/**\n * Re-map manual attachments after a path has been reversed. Reversing a path\n * maps the same world point from t to 1-t and flips the path normal. Tangent\n * and normal oriented stitches intentionally turn with the new work direction;\n * `keep` orientation stays visually unchanged through elementFromAttachment.\n */\nexport function remapAttachmentsForReversedGuide(\n  elements: StitchElement[],\n  reversedGuide: PathGuide,\n) {\n  return elements.map((element) => {\n    const attachment = element.guideAttachment\n    if (!attachment || attachment.guideId !== reversedGuide.id || element.parametricRow) return element\n    return elementFromAttachment(element, reversedGuide, {\n      ...attachment,\n      t: 1 - attachment.t,\n      normalOffset: -attachment.normalOffset,\n    })\n  })\n}\n\n"""
text = replace_once(text, anchor, addition, 'path guide reverse helper')
write(path, text)

# 2) Wire atomic reverse remap + rotated background bounds into App.
path = 'src/App.tsx'
text = read(path)
old = """  moveAttachedElement,\n  reconcileGuideAttachments,\n} from './editor/pathGuides'"""
new = """  moveAttachedElement,\n  reconcileGuideAttachments,\n  remapAttachmentsForReversedGuide,\n} from './editor/pathGuides'"""
text = replace_once(text, old, new, 'App path guide import')
old = """  const reverseGuideDirection = useCallback((target: Guide) => {\n    if (target.locked === true || !isPathGuide(target)) return\n    commitGuides(guides.map((guide) => guide.id === target.id ? reverseGuide(guide) : guide))\n    setStatus(locale === 'ru' ? 'Направление направляющей изменено' : 'Guide direction reversed')\n  }, [commitGuides, guides, locale])\n"""
new = """  const reverseGuideDirection = useCallback((target: Guide) => {\n    if (target.locked === true || !isPathGuide(target)) return\n    const reversed = reverseGuide(target)\n    if (!isPathGuide(reversed)) return\n    commitGuides(guides.map((guide) => guide.id === target.id ? reversed : guide))\n    setElements(remapAttachmentsForReversedGuide(elements, reversed))\n    setStatus(locale === 'ru' ? 'Направление направляющей изменено' : 'Guide direction reversed')\n  }, [commitGuides, elements, guides, locale])\n"""
text = replace_once(text, old, new, 'App reverse callback')
old = """    if (backgroundImage && backgroundImage.visible !== false) {\n      const imageBounds = {\n        left: backgroundImage.x, top: backgroundImage.y,\n        right: backgroundImage.x + backgroundImage.width, bottom: backgroundImage.y + backgroundImage.height,\n      }\n      bounds = bounds ? {\n        left: Math.min(bounds.left, imageBounds.left), top: Math.min(bounds.top, imageBounds.top),\n        right: Math.max(bounds.right, imageBounds.right), bottom: Math.max(bounds.bottom, imageBounds.bottom),\n      } : imageBounds\n    }\n"""
new = """    if (backgroundImage && backgroundImage.visible !== false) {\n      const imageBounds = backgroundImageBounds(backgroundImage)\n      bounds = bounds ? {\n        left: Math.min(bounds.left, imageBounds.left), top: Math.min(bounds.top, imageBounds.top),\n        right: Math.max(bounds.right, imageBounds.right), bottom: Math.max(bounds.bottom, imageBounds.bottom),\n      } : imageBounds\n    }\n"""
text = replace_once(text, old, new, 'rotated background fit bounds')
write(path, text)

# 3) Make Smart Ruler geometry exact for rotated bounds, marker-safe, and row highlights truthful.
path = 'src/editor/gauge.ts'
text = read(path)
old = """  for (const element of elements) {\n    if (element.visible === false) continue\n    const distance = Math.hypot(element.x - point.x, element.y - point.y)\n"""
new = """  for (const element of elements) {\n    if (element.visible === false) continue\n    if (SYMBOL_BY_ID.get(element.symbolId)?.role === 'marker') continue\n    const distance = Math.hypot(element.x - point.x, element.y - point.y)\n"""
text = replace_once(text, old, new, 'ruler marker-safe snap')
old = """function projectedHalfExtent(element: StitchElement, axis: Point) {\n  const definition = SYMBOL_BY_ID.get(element.symbolId)\n  const width = definition?.width ?? 30\n  const height = definition?.height ?? 30\n  const angle = element.rotation * Math.PI / 180\n  const localX = { x: Math.cos(angle), y: Math.sin(angle) }\n  const localY = { x: -Math.sin(angle), y: Math.cos(angle) }\n  return Math.abs(axis.x * localX.x + axis.y * localX.y) * width / 2\n    + Math.abs(axis.x * localY.x + axis.y * localY.y) * height / 2\n}\n\n"""
new = old + """function dot(left: Point, right: Point) {\n  return left.x * right.x + left.y * right.y\n}\n\nfunction elementLocalAxes(element: StitchElement) {\n  const angle = element.rotation * Math.PI / 180\n  return [\n    { x: Math.cos(angle), y: Math.sin(angle) },\n    { x: -Math.sin(angle), y: Math.cos(angle) },\n  ] as const\n}\n\nfunction corridorIntersectsElementBounds(\n  element: StitchElement,\n  corridorCenter: Point,\n  along: Point,\n  normal: Point,\n  halfLength: number,\n  halfWidth: number,\n) {\n  const relative = { x: element.x - corridorCenter.x, y: element.y - corridorCenter.y }\n  const axes = [along, normal, ...elementLocalAxes(element)]\n  return axes.every((axis) => {\n    const centerDistance = Math.abs(dot(relative, axis))\n    const corridorRadius = Math.abs(dot(along, axis)) * halfLength\n      + Math.abs(dot(normal, axis)) * halfWidth\n    const elementRadius = projectedHalfExtent(element, axis)\n    return centerDistance <= corridorRadius + elementRadius + 1e-9\n  })\n}\n\n"""
text = replace_once(text, old, new, 'SAT helpers')
old = """  const along = { x: dx / length, y: dy / length }\n  const normal = { x: -along.y, y: along.x }\n  const hits = elements.filter((element) => {\n    if (element.visible === false) return false\n    if (SYMBOL_BY_ID.get(element.symbolId)?.role === 'marker') return false\n    const relative = { x: element.x - ruler.start.x, y: element.y - ruler.start.y }\n    const t = relative.x * along.x + relative.y * along.y\n    const cross = Math.abs(relative.x * normal.x + relative.y * normal.y)\n    const alongRadius = projectedHalfExtent(element, along)\n    const crossRadius = projectedHalfExtent(element, normal)\n    return t >= -alongRadius && t <= length + alongRadius && cross <= halfWidth + crossRadius\n  })\n"""
new = """  const along = { x: dx / length, y: dy / length }\n  const normal = { x: -along.y, y: along.x }\n  const center = { x: (ruler.start.x + ruler.end.x) / 2, y: (ruler.start.y + ruler.end.y) / 2 }\n  const hits = elements.filter((element) => {\n    if (element.visible === false) return false\n    if (SYMBOL_BY_ID.get(element.symbolId)?.role === 'marker') return false\n    return corridorIntersectsElementBounds(element, center, along, normal, length / 2, Math.max(0, halfWidth))\n  })\n"""
text = replace_once(text, old, new, 'exact corridor intersection')
old = """    const corridorAutomatic = corridor.rowIds.length ? {\n      count: corridor.rowIds.length,\n      startRowId: corridor.rowIds[0],\n      endRowId: corridor.rowIds[corridor.rowIds.length - 1],\n      rowIds: corridor.rowIds,\n      elementIds: corridor.elementIds,\n    } : null\n"""
new = """    const corridorRowSet = new Set(corridor.rowIds)\n    const elementById = new Map(elements.map((element) => [element.id, element] as const))\n    const corridorAutomatic = corridor.rowIds.length ? {\n      count: corridor.rowIds.length,\n      startRowId: corridor.rowIds[0],\n      endRowId: corridor.rowIds[corridor.rowIds.length - 1],\n      rowIds: corridor.rowIds,\n      elementIds: corridor.elementIds.filter((id) => {\n        const rowId = elementById.get(id)?.parametricRow?.id\n        return Boolean(rowId && corridorRowSet.has(rowId))\n      }),\n    } : null\n"""
text = replace_once(text, old, new, 'row corridor highlights')
write(path, text)

# 4) Unit regressions: guide reversal.
path = 'src/editor/pathGuides.test.ts'
text = read(path)
text = replace_once(
    text,
    "import type { CurveGuide, LineGuide, StitchElement } from '../types'",
    "import type { ArcGuide, CurveGuide, LineGuide, ParabolaGuide, StitchElement } from '../types'\nimport { reverseGuide } from './guideGeometry'",
    'path test imports',
)
text = replace_once(
    text,
    """  attachElementToGuide,\n  moveAttachedElement,\n  nearestPathParameter,\n  pathPoseAt,\n  reconcileGuideAttachments,\n""",
    """  attachElementToGuide,\n  elementFromAttachment,\n  isPathGuide,\n  moveAttachedElement,\n  nearestPathParameter,\n  pathPoseAt,\n  reconcileGuideAttachments,\n  remapAttachmentsForReversedGuide,\n""",
    'path test function imports',
)
insert = """

  it('keeps attachment position and path side stable when reversing every continuous guide type', () => {
    const arc: ArcGuide = {
      id: 'arc', type: 'arc', center: { x: 80, y: 30 }, radius: 70,
      startAngle: 15, endAngle: 210, divisions: 12, visible: true,
    }
    const parabola: ParabolaGuide = {
      id: 'parabola', type: 'parabola', start: { x: 0, y: 30 },
      control: { x: 100, y: -80 }, end: { x: 200, y: 30 }, divisions: 12, visible: true,
    }
    for (const guide of [line, curve, arc, parabola]) {
      const attachment = {
        guideId: guide.id,
        t: 0.23,
        orientation: 'keep' as const,
        rotationOffset: 0,
        normalOffset: 12,
      }
      const positioned = elementFromAttachment({ ...stitch, id: `stitch-${guide.id}` }, guide, attachment)
      const reversed = reverseGuide(guide)
      expect(isPathGuide(reversed)).toBe(true)
      if (!isPathGuide(reversed)) throw new Error('Expected a path guide')
      const [remapped] = remapAttachmentsForReversedGuide([positioned], reversed)
      expect(remapped.x).toBeCloseTo(positioned.x, 6)
      expect(remapped.y).toBeCloseTo(positioned.y, 6)
      expect(remapped.rotation).toBeCloseTo(positioned.rotation, 6)
      expect(remapped.guideAttachment?.t).toBeCloseTo(0.77, 8)
      expect(remapped.guideAttachment?.normalOffset).toBe(-12)
    }
  })

  it('lets tangent-oriented stitches turn with the reversed work direction without jumping', () => {
    const attachment = { guideId: line.id, t: 0.3, orientation: 'tangent' as const, rotationOffset: 20, normalOffset: 9 }
    const positioned = elementFromAttachment(stitch, line, attachment)
    const reversed = reverseGuide(line)
    if (!isPathGuide(reversed)) throw new Error('Expected a path guide')
    const [remapped] = remapAttachmentsForReversedGuide([positioned], reversed)
    expect(remapped.x).toBeCloseTo(positioned.x, 6)
    expect(remapped.y).toBeCloseTo(positioned.y, 6)
    expect(Math.abs(remapped.rotation - positioned.rotation)).toBeCloseTo(180, 6)
  })
"""
text = replace_once(text, "\n})\n", insert + "\n})\n", 'append reverse guide tests')
write(path, text)

# 5) Unit regressions: Smart Ruler exact geometry / markers / row highlights.
path = 'src/editor/gauge.test.ts'
text = read(path)
insert = """

  it('does not snap ruler endpoints to Start/End marker-role symbols', () => {
    const sample: StitchElement[] = [
      { id: 'marker', symbolId: 'start-marker', x: 0, y: 0, rotation: 0 },
      { id: 'stitch', symbolId: 'chain', x: 5, y: 0, rotation: 0 },
    ]
    const snapped = snapRulerPoint({ x: 0, y: 0 }, sample, 1)
    expect(snapped.elementId).toBe('stitch')
    expect(snapped.point).toEqual({ x: 5, y: 0 })
  })

  it('uses full oriented-rectangle SAT so a rotated stitch near a corridor corner is not a false positive', () => {
    const sample: StitchElement[] = [
      { id: 'corner-miss', symbolId: 'single', x: -12, y: -24, rotation: 5 },
      { id: 'real-hit', symbolId: 'single', x: 20, y: 0, rotation: 5 },
    ]
    const hits = rulerCorridorHits({ id: 'sat', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }, sample)
    expect(hits.elementIds).toEqual(['real-hit'])
  })

  it('highlights only semantic stitch hits when row corridor count ignores free stitches', () => {
    const semantic = [
      rowElement('row-a', 'semantic-a', 0, 1),
      rowElement('row-b', 'semantic-b', 0, 2),
    ]
    const free: StitchElement = { id: 'free-between', symbolId: 'chain', x: 0, y: 60, rotation: 0 }
    const estimate = rulerEstimate({
      id: 'row-highlight', start: { x: 0, y: 28 }, end: { x: 0, y: 92 }, mode: 'rows',
    }, [...semantic, free], gauge)
    expect(estimate).toMatchObject({ rowCount: 2, source: 'automatic', strategy: 'corridor' })
    expect(estimate.elementIds).toEqual(['row-a', 'row-b'])
    expect(estimate.elementIds).not.toContain('free-between')
  })
"""
text = replace_once(text, "\n})\n", insert + "\n})\n", 'append gauge stabilization tests')
write(path, text)

# 6) Unit regression: rotated background resize keeps the opposite world corner fixed.
path = 'src/editor/backgroundGeometry.test.ts'
text = read(path)
text = replace_once(
    text,
    """  backgroundImageBounds,\n  moveBackground,\n""",
    """  backgroundCorners,\n  backgroundImageBounds,\n  moveBackground,\n""",
    'background test import',
)
insert = """

  it('keeps the opposite world-space corner fixed while resizing a rotated image', () => {
    const rotated = { ...background, rotation: 37 }
    const before = backgroundCorners(rotated).nw
    const resized = resizeBackgroundFromCorner(rotated, 'se', { x: 330, y: 210 })
    const after = backgroundCorners(resized).nw
    expect(after.x).toBeCloseTo(before.x, 6)
    expect(after.y).toBeCloseTo(before.y, 6)
  })
"""
text = replace_once(text, "\n})\n", insert + "\n})\n", 'append rotated background test')
write(path, text)

# 7) Regression: repeated/mirrored grouped motifs keep parity and fresh grouping.
path = 'src/editor/productivity.test.ts'
text = read(path)
insert = """

  it('preserves mirror parity and creates fresh groups when repeating a mirrored motif', () => {
    const mirroredGroup: StitchElement[] = [
      { id: 'm1', symbolId: 'chain', x: 20, y: 0, rotation: 10, mirrored: true, groupId: 'source-group' },
      { id: 'm2', symbolId: 'chain', x: 42, y: 0, rotation: 10, mirrored: true, groupId: 'source-group' },
    ]
    const created = repeatSelection(mirroredGroup, ['m1', 'm2'], {
      mode: 'linear', copies: 1, deltaX: 60, deltaY: 0,
    }, ids())
    expect(created).toHaveLength(2)
    expect(created.every((element) => element.mirrored === true)).toBe(true)
    expect(created[0].groupId).toBe(created[1].groupId)
    expect(created[0].groupId).not.toBe('source-group')
  })
"""
text = replace_once(text, "\n})\n", insert + "\n})\n", 'append mirrored motif regression')
write(path, text)

# 8) Browser-level integration regressions for guide reverse/history and rotated underlay fitting.
e2e = r'''import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

async function canvasBox(page: Page) {
  const box = await page.locator('svg.editor-canvas').boundingBox()
  expect(box).not.toBeNull()
  return box!
}

async function placeAt(page: Page, title: string, rx: number, ry: number) {
  await page.locator(`.symbols-section .symbol-button[title^="${title} · "]`).click()
  const box = await canvasBox(page)
  await page.mouse.click(box.x + box.width * rx, box.y + box.height * ry)
}

function transformParts(value: string | null) {
  const transform = value ?? ''
  const translate = transform.match(/translate\(([-\d.]+) ([-\d.]+)\)/)
  const rotate = transform.match(/rotate\(([-\d.]+)\)/)
  return {
    x: translate ? Number(translate[1]) : Number.NaN,
    y: translate ? Number(translate[2]) : Number.NaN,
    rotation: rotate ? Number(rotate[1]) : Number.NaN,
  }
}

function angleDistance(left: number, right: number) {
  const delta = ((right - left + 180) % 360 + 360) % 360 - 180
  return Math.abs(delta)
}

async function uploadReference(page: Page) {
  await page.getByTestId('background-file-input').setInputFiles({
    name: 'reference.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="#ddd"/></svg>'),
  })
  await expect(page.getByTestId('background-image')).toBeVisible()
}

test('reversing a guide keeps attached stitch position stable and remains one undoable document edit', async ({ page }) => {
  await openEditor(page)
  await page.locator('.guide-add-grid button').filter({ hasText: 'Линия' }).click()
  await placeAt(page, 'Столбик без накида', 0.54, 0.42)

  const stitch = page.locator('.stitch-element').first()
  const attachment = page.locator('.guide-attachment-panel')
  await attachment.getByRole('button', { name: 'Закрепить на направляющей', exact: true }).click()
  await attachment.getByLabel('Отступ от пути').fill('18')
  await attachment.getByLabel('Отступ от пути').press('Enter')
  const before = transformParts(await stitch.getAttribute('transform'))

  await page.locator('.guide-list button').filter({ hasText: 'Линия' }).click()
  const strokeBox = await page.locator('.guide-line .guide-stroke').boundingBox()
  expect(strokeBox).not.toBeNull()
  await page.mouse.click(strokeBox!.x + strokeBox!.width / 2, strokeBox!.y + strokeBox!.height / 2, { clickCount: 2 })

  await expect.poll(async () => transformParts(await stitch.getAttribute('transform')).x).toBeCloseTo(before.x, 2)
  const reversed = transformParts(await stitch.getAttribute('transform'))
  expect(reversed.y).toBeCloseTo(before.y, 2)
  expect(angleDistance(before.rotation, reversed.rotation)).toBeCloseTo(180, 1)

  await page.keyboard.press('Control+z')
  await expect.poll(async () => transformParts(await stitch.getAttribute('transform')).rotation).toBeCloseTo(before.rotation, 2)
  const undone = transformParts(await stitch.getAttribute('transform'))
  expect(undone.x).toBeCloseTo(before.x, 2)
  expect(undone.y).toBeCloseTo(before.y, 2)

  await page.keyboard.press('Control+Shift+z')
  await expect.poll(async () => angleDistance(before.rotation, transformParts(await stitch.getAttribute('transform')).rotation)).toBeCloseTo(180, 1)
})

test('rotated tracing underlay participates in project-span fitting and its edit is undoable', async ({ page }) => {
  await openEditor(page)
  await uploadReference(page)

  const rotation = page.getByLabel('Поворот изображения °')
  await rotation.fill('45')
  await rotation.press('Enter')
  await expect(rotation).toHaveValue('45')
  await page.keyboard.press('Control+z')
  await expect(rotation).toHaveValue('0')
  await page.keyboard.press('Control+Shift+z')
  await expect(rotation).toHaveValue('45')

  const width = Number(await page.getByLabel('Ширина фона').inputValue())
  const height = Number(await page.getByLabel('Высота фона').inputValue())
  const rotatedWidth = (width + height) / Math.sqrt(2)

  await page.locator('.guide-add-grid button').filter({ hasText: 'Линия' }).click()
  await page.getByRole('button', { name: 'По размеру проекта' }).click()
  const fittedLength = Number(await page.getByLabel('Длина').inputValue())
  expect(fittedLength).toBeCloseTo(rotatedWidth + 64, 0)
})
'''
write('e2e/stabilization-v1221.e2e.ts', e2e)

# 9) Version + release documentation hygiene.
path = 'src/i18n.ts'
text = read(path)
if text.count('v1.22.0') < 2:
    raise RuntimeError('Expected RU/EN v1.22.0 subtitles')
text = text.replace('v1.22.0', 'v1.22.1')
write(path, text)

path = 'README.md'
text = read(path)
block_pattern = re.compile(r'## v1\.(22|21|20|19|18)\.0\n\n.*?(?=\n## )', re.S)
blocks = {match.group(1): match.group(0) for match in block_pattern.finditer(text)}
if set(blocks) != {'18', '19', '20', '21', '22'}:
    raise RuntimeError(f'Unexpected release blocks: {sorted(blocks)}')
start = min(match.start() for match in block_pattern.finditer(text))
end = max(match.end() for match in block_pattern.finditer(text))
release = """## v1.22.1\n\nStabilization review release: path-direction reversal now preserves manual guide-attachment positions and normal-side offsets; Smart Ruler uses exact oriented-rectangle corridor intersection, ignores marker-role snap targets, and highlights only elements that actually contribute to row counts; Line project-span fitting now respects rotated tracing-underlay bounds. Additional regressions cover rotated background resize/history and mirrored grouped Repeat behavior. Project schema remains v21.\n\n"""
ordered = '\n\n'.join(blocks[key].strip() for key in ['22', '21', '20', '19', '18'])
text = text[:start] + release + ordered + text[end:]
text = text.replace('configurable page overlap and crop marks; the preview reports', 'configurable page overlap and complete printable-area frames; the preview reports')
text = text.replace('current project JSON schema is v21; v1-v19 remain loadable', 'current project JSON schema is v21; v1-v20 remain loadable')
needle = '- schema v20 adds quadratic Parabola guides and persisted stitch mirror parity\n'
if needle not in text:
    raise RuntimeError('README schema v20 line not found')
text = text.replace(needle, needle + '- schema v21 adds persisted background-image rotation while retaining legacy zero-rotation defaults\n', 1)
text = text.replace('- public GitHub Pages endpoint smoke check\n', '- `main` repeats the build/unit/Chromium gate before GitHub Pages deployment\n')
write(path, text)

print('Applied v1.22.1 stabilization changes')
