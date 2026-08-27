from pathlib import Path


def replace_once(path: str, old: str, new: str):
    file = Path(path)
    text = file.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected one match, got {count}: {old[:140]!r}')
    file.write_text(text.replace(old, new, 1))


def append_once(path: str, marker: str, addition: str):
    file = Path(path)
    text = file.read_text()
    if marker in text:
        return
    file.write_text(text.rstrip() + '\n\n' + addition.strip() + '\n')


# ---------------------------------------------------------------------------
# Schema v21: background rotation is persisted and legacy projects normalize to 0°.
# ---------------------------------------------------------------------------
replace_once(
    'src/types.ts',
    "  height: number\n  opacity: number\n",
    "  height: number\n  /** Rotation in degrees around the image center; omitted by legacy projects. */\n  rotation?: number\n  opacity: number\n",
)
replace_once(
    'src/types.ts',
    "schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20\n",
    "schemaVersion: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 16 | 17 | 18 | 19 | 20 | 21\n",
)
replace_once(
    'src/editor/projectVersion.ts',
    'export const CURRENT_PROJECT_SCHEMA_VERSION = 20\n',
    'export const CURRENT_PROJECT_SCHEMA_VERSION = 21\n',
)
replace_once(
    'src/editor/projectSchema.ts',
    "    !finite(value.height) || value.height <= 0 ||\n    !finite(value.opacity) || value.opacity < 0 || value.opacity > 1 ||\n",
    "    !finite(value.height) || value.height <= 0 ||\n    !(value.rotation === undefined || finite(value.rotation)) ||\n    !finite(value.opacity) || value.opacity < 0 || value.opacity > 1 ||\n",
)
replace_once(
    'src/editor/projectSchema.ts',
    "    width: value.width,\n    height: value.height,\n    opacity: value.opacity,\n",
    "    width: value.width,\n    height: value.height,\n    rotation: finite(value.rotation) ? value.rotation : 0,\n    opacity: value.opacity,\n",
)
replace_once(
    'src/editor/projectIntegrity.ts',
    "    if (!bounded(background.x) || !bounded(background.y) || !positive(background.width, MAX_COORDINATE) || !positive(background.height, MAX_COORDINATE)) return 'Background image geometry is out of bounds'\n",
    "    if (!bounded(background.x) || !bounded(background.y) || !positive(background.width, MAX_COORDINATE) || !positive(background.height, MAX_COORDINATE) || !bounded(background.rotation ?? 0)) return 'Background image geometry is out of bounds'\n",
)
replace_once(
    'src/editor/backgroundImage.ts',
    "    width,\n    height,\n    opacity: DEFAULT_BACKGROUND_OPACITY,\n",
    "    width,\n    height,\n    rotation: 0,\n    opacity: DEFAULT_BACKGROUND_OPACITY,\n",
)

# Normalize all existing schema-version assertions to v21.
for root in ('src', 'e2e'):
    for file in Path(root).rglob('*.ts'):
        text = file.read_text()
        text = text.replace('schemaVersion).toBe(20)', 'schemaVersion).toBe(21)')
        file.write_text(text)

replace_once(
    'src/editor/backgroundSchema.test.ts',
    "    expect(parsed.backgroundImage).toEqual(rawProject().backgroundImage)\n",
    "    expect(parsed.backgroundImage).toEqual({ ...rawProject().backgroundImage, rotation: 0 })\n",
)
replace_once(
    'src/editor/backgroundSchema.test.ts',
    "    const badSize = rawProject() as any\n    badSize.backgroundImage.width = 0\n    expect(() => parseProject(badSize, snapping)).toThrow('Invalid background image')\n",
    "    const badSize = rawProject() as any\n    badSize.backgroundImage.width = 0\n    expect(() => parseProject(badSize, snapping)).toThrow('Invalid background image')\n\n    const badRotation = rawProject() as any\n    badRotation.backgroundImage.rotation = Number.NaN\n    expect(() => parseProject(badRotation, snapping)).toThrow('Invalid background image')\n",
)

# ---------------------------------------------------------------------------
# Shared pure geometry for canvas manipulation and output bounds.
# ---------------------------------------------------------------------------
Path('src/editor/backgroundGeometry.ts').write_text(r'''import type { BackgroundImage, Point } from '../types'

export type BackgroundResizeHandle = 'nw' | 'ne' | 'se' | 'sw'

const MIN_BACKGROUND_SIZE = 12

function radians(degrees: number) {
  return (degrees * Math.PI) / 180
}

function degrees(value: number) {
  return (value * 180) / Math.PI
}

export function backgroundRotation(background: BackgroundImage) {
  return Number.isFinite(background.rotation) ? background.rotation ?? 0 : 0
}

export function backgroundCenter(background: BackgroundImage): Point {
  return {
    x: background.x + background.width / 2,
    y: background.y + background.height / 2,
  }
}

export function rotatePointAround(point: Point, center: Point, angleDegrees: number): Point {
  const angle = radians(angleDegrees)
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = point.x - center.x
  const dy = point.y - center.y
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  }
}

export function backgroundCorners(background: BackgroundImage) {
  const center = backgroundCenter(background)
  const rotation = backgroundRotation(background)
  const corners = {
    nw: { x: background.x, y: background.y },
    ne: { x: background.x + background.width, y: background.y },
    se: { x: background.x + background.width, y: background.y + background.height },
    sw: { x: background.x, y: background.y + background.height },
  } as const
  return Object.fromEntries(
    Object.entries(corners).map(([key, point]) => [key, rotatePointAround(point, center, rotation)]),
  ) as Record<BackgroundResizeHandle, Point>
}

export function backgroundImageBounds(background: BackgroundImage) {
  const corners = Object.values(backgroundCorners(background))
  const xs = corners.map((point) => point.x)
  const ys = corners.map((point) => point.y)
  const left = Math.min(...xs)
  const right = Math.max(...xs)
  const top = Math.min(...ys)
  const bottom = Math.max(...ys)
  return { left, right, top, bottom, width: right - left, height: bottom - top }
}

export function moveBackground(background: BackgroundImage, dx: number, dy: number): BackgroundImage {
  return { ...background, x: background.x + dx, y: background.y + dy }
}

const oppositeHandle: Record<BackgroundResizeHandle, BackgroundResizeHandle> = {
  nw: 'se', ne: 'sw', se: 'nw', sw: 'ne',
}

const direction: Record<BackgroundResizeHandle, { x: -1 | 1; y: -1 | 1 }> = {
  nw: { x: -1, y: -1 },
  ne: { x: 1, y: -1 },
  se: { x: 1, y: 1 },
  sw: { x: -1, y: 1 },
}

export function resizeBackgroundFromCorner(
  background: BackgroundImage,
  handle: BackgroundResizeHandle,
  pointer: Point,
  preserveAspect = false,
): BackgroundImage {
  const center = backgroundCenter(background)
  const rotation = backgroundRotation(background)
  const localPointer = rotatePointAround(pointer, center, -rotation)
  const localCorners = {
    nw: { x: background.x, y: background.y },
    ne: { x: background.x + background.width, y: background.y },
    se: { x: background.x + background.width, y: background.y + background.height },
    sw: { x: background.x, y: background.y + background.height },
  } as const
  const opposite = localCorners[oppositeHandle[handle]]
  const sign = direction[handle]
  let width = Math.max(MIN_BACKGROUND_SIZE, Math.abs(localPointer.x - opposite.x))
  let height = Math.max(MIN_BACKGROUND_SIZE, Math.abs(localPointer.y - opposite.y))

  if (preserveAspect) {
    const ratio = Math.max(0.0001, background.width / background.height)
    if (width / height > ratio) height = width / ratio
    else width = height * ratio
  }

  const dragged = {
    x: opposite.x + sign.x * width,
    y: opposite.y + sign.y * height,
  }
  const localCenter = {
    x: (opposite.x + dragged.x) / 2,
    y: (opposite.y + dragged.y) / 2,
  }
  const worldCenter = rotatePointAround(localCenter, center, rotation)
  return {
    ...background,
    x: worldCenter.x - width / 2,
    y: worldCenter.y - height / 2,
    width,
    height,
  }
}

export function rotateBackgroundFromPointer(
  background: BackgroundImage,
  startPointer: Point,
  currentPointer: Point,
  snap = false,
): BackgroundImage {
  const center = backgroundCenter(background)
  const startAngle = Math.atan2(startPointer.y - center.y, startPointer.x - center.x)
  const currentAngle = Math.atan2(currentPointer.y - center.y, currentPointer.x - center.x)
  let rotation = backgroundRotation(background) + degrees(currentAngle - startAngle)
  if (snap) rotation = Math.round(rotation / 15) * 15
  if (Math.abs(rotation) < 1e-9) rotation = 0
  return { ...background, rotation }
}
''')

Path('src/editor/backgroundGeometry.test.ts').write_text(r'''import { describe, expect, it } from 'vitest'
import type { BackgroundImage } from '../types'
import {
  backgroundImageBounds,
  moveBackground,
  resizeBackgroundFromCorner,
  rotateBackgroundFromPointer,
} from './backgroundGeometry'

const background: BackgroundImage = {
  dataUrl: 'data:image/png;base64,abc',
  x: 10,
  y: 20,
  width: 200,
  height: 100,
  rotation: 0,
  opacity: 0.5,
}

describe('background canvas geometry', () => {
  it('computes the AABB of a rotated image', () => {
    const bounds = backgroundImageBounds({ ...background, rotation: 90 })
    expect(bounds.width).toBeCloseTo(100)
    expect(bounds.height).toBeCloseTo(200)
    expect(bounds.left).toBeCloseTo(60)
    expect(bounds.top).toBeCloseTo(-30)
  })

  it('moves without changing size or rotation', () => {
    expect(moveBackground({ ...background, rotation: 20 }, 30, -15)).toMatchObject({
      x: 40, y: 5, width: 200, height: 100, rotation: 20,
    })
  })

  it('resizes from a corner while keeping the opposite corner fixed', () => {
    const resized = resizeBackgroundFromCorner(background, 'se', { x: 310, y: 170 })
    expect(resized).toMatchObject({ x: 10, y: 20, width: 300, height: 150 })
  })

  it('preserves the source aspect ratio while Shift-resizing', () => {
    const resized = resizeBackgroundFromCorner(background, 'se', { x: 310, y: 120 }, true)
    expect(resized.width / resized.height).toBeCloseTo(2)
  })

  it('rotates around the center and Shift-snaps to 15 degrees', () => {
    const center = { x: 110, y: 70 }
    const start = { x: center.x, y: center.y - 100 }
    const current = { x: center.x + 100, y: center.y }
    const rotated = rotateBackgroundFromPointer(background, start, current, true)
    expect(rotated.rotation).toBe(90)
    expect(rotated.x).toBe(background.x)
    expect(rotated.y).toBe(background.y)
  })
})
''')

# ---------------------------------------------------------------------------
# Canvas component: direct select/move, four-corner resize, rotation handle.
# ---------------------------------------------------------------------------
Path('src/editor/BackgroundImageCanvas.tsx').write_text(r'''import type { PointerEvent as ReactPointerEvent } from 'react'
import type { BackgroundImage, Point } from '../types'
import {
  backgroundCenter,
  backgroundRotation,
  moveBackground,
  resizeBackgroundFromCorner,
  rotateBackgroundFromPointer,
  type BackgroundResizeHandle,
} from './backgroundGeometry'

type Props = {
  background: BackgroundImage
  selected: boolean
  zoom: number
  clientToDocument: (clientX: number, clientY: number) => Point
  onSelect: () => void
  onManipulationStart: () => void
  onManipulationPreview: (background: BackgroundImage) => void
  onManipulationEnd: (moved: boolean, cancelled: boolean) => void
}

type Mode = { type: 'move' } | { type: 'rotate' } | { type: 'resize'; handle: BackgroundResizeHandle }

export function BackgroundImageCanvas({
  background,
  selected,
  zoom,
  clientToDocument,
  onSelect,
  onManipulationStart,
  onManipulationPreview,
  onManipulationEnd,
}: Props) {
  if (background.visible === false) return null
  const locked = background.locked === true
  const center = backgroundCenter(background)
  const rotation = backgroundRotation(background)
  const handleRadius = 7 / zoom
  const rotationOffset = 32 / zoom

  const startInteraction = (event: ReactPointerEvent<SVGElement>, mode: Mode) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    onSelect()
    if (locked) return

    const pointerId = event.pointerId
    const startClient = { x: event.clientX, y: event.clientY }
    const startPointer = clientToDocument(event.clientX, event.clientY)
    const initial = background
    let moved = false
    let finished = false
    onManipulationStart()

    const cleanup = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleCancel)
      window.removeEventListener('keydown', handleKeyDown)
    }
    const finish = (cancelled: boolean) => {
      if (finished) return
      finished = true
      cleanup()
      onManipulationEnd(moved, cancelled)
    }
    const handleMove = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return
      if (Math.hypot(nativeEvent.clientX - startClient.x, nativeEvent.clientY - startClient.y) > 1) moved = true
      const current = clientToDocument(nativeEvent.clientX, nativeEvent.clientY)
      if (mode.type === 'move') {
        onManipulationPreview(moveBackground(initial, current.x - startPointer.x, current.y - startPointer.y))
      } else if (mode.type === 'resize') {
        onManipulationPreview(resizeBackgroundFromCorner(initial, mode.handle, current, nativeEvent.shiftKey))
      } else {
        onManipulationPreview(rotateBackgroundFromPointer(initial, startPointer, current, nativeEvent.shiftKey))
      }
    }
    const handleUp = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId === pointerId) finish(false)
    }
    const handleCancel = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId === pointerId) finish(true)
    }
    const handleKeyDown = (nativeEvent: KeyboardEvent) => {
      if (nativeEvent.key === 'Escape') {
        nativeEvent.preventDefault()
        finish(true)
      }
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleCancel)
    window.addEventListener('keydown', handleKeyDown)
  }

  const cornerHandle = (handle: BackgroundResizeHandle, x: number, y: number) => (
    <circle
      key={handle}
      data-handle={handle}
      cx={x}
      cy={y}
      r={handleRadius}
      className="background-resize-handle"
      vectorEffect="non-scaling-stroke"
      onPointerDown={(event) => startInteraction(event, { type: 'resize', handle })}
    />
  )

  return (
    <g className={`background-canvas-layer ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`}>
      <g transform={`rotate(${rotation} ${center.x} ${center.y})`}>
        <image
          data-testid="background-image"
          className="background-canvas-image"
          href={background.dataUrl}
          x={background.x}
          y={background.y}
          width={background.width}
          height={background.height}
          opacity={background.opacity}
          preserveAspectRatio="none"
          onPointerDown={(event) => startInteraction(event, { type: 'move' })}
        />
        {selected && (
          <rect
            data-testid="background-selection-box"
            className="background-selection-box"
            x={background.x}
            y={background.y}
            width={background.width}
            height={background.height}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}
        {selected && !locked && (
          <g className="background-manipulation-ui">
            {cornerHandle('nw', background.x, background.y)}
            {cornerHandle('ne', background.x + background.width, background.y)}
            {cornerHandle('se', background.x + background.width, background.y + background.height)}
            {cornerHandle('sw', background.x, background.y + background.height)}
            <line
              x1={center.x}
              y1={background.y}
              x2={center.x}
              y2={background.y - rotationOffset}
              className="background-rotation-stem"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            <circle
              data-testid="background-rotate-handle"
              cx={center.x}
              cy={background.y - rotationOffset}
              r={handleRadius}
              className="background-rotate-handle"
              vectorEffect="non-scaling-stroke"
              onPointerDown={(event) => startInteraction(event, { type: 'rotate' })}
            />
          </g>
        )}
        {selected && locked && (
          <text x={background.x + 8 / zoom} y={background.y + 18 / zoom} fontSize={13 / zoom} className="background-lock-indicator">🔒</text>
        )}
      </g>
    </g>
  )
}
''')

# Replace the sidebar panel to expose rotation numerically as well.
Path('src/editor/BackgroundImagePanel.tsx').write_text(r'''import { useRef } from 'react'
import { DraftNumberInput } from './DraftNumberInput'
import type { BackgroundImage } from '../types'

type Props = {
  locale: 'ru' | 'en'
  background: BackgroundImage | null
  onUpload: (file: File) => void
  onChange: (patch: Partial<BackgroundImage>) => void
  onRemove: () => void
}

function numeric(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function BackgroundImagePanel({ locale, background, onUpload, onChange, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const ru = locale === 'ru'

  return (
    <section className="panel-section background-image-panel" data-testid="background-panel">
      <div className="section-title-row">
        <h2>{ru ? 'Фоновое изображение' : 'Background image'}</h2>
        {background && <span className="muted-text">{background.sourceName ?? (ru ? 'изображение' : 'image')}</span>}
      </div>

      <div className="background-actions">
        <button onClick={() => inputRef.current?.click()}>{background ? (ru ? 'Заменить' : 'Replace') : (ru ? 'Добавить изображение' : 'Add image')}</button>
        {background && <button className="danger-button" onClick={onRemove}>{ru ? 'Удалить' : 'Remove'}</button>}
        <input
          ref={inputRef}
          data-testid="background-file-input"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
          hidden
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onUpload(file)
            event.currentTarget.value = ''
          }}
        />
      </div>

      {!background ? (
        <p className="empty-state">{ru ? 'Добавьте фото или схему, чтобы использовать её как подложку для обводки.' : 'Add a photo or chart to use as a tracing underlay.'}</p>
      ) : (
        <>
          <label className="toggle-row compact-toggle">
            <span>{ru ? 'Показывать на холсте' : 'Visible on canvas'}</span>
            <input type="checkbox" checked={background.visible !== false} onChange={(event) => onChange({ visible: event.target.checked })} />
          </label>
          <label className="toggle-row compact-toggle">
            <span>{ru ? 'Заблокировать геометрию' : 'Lock geometry'}</span>
            <input data-testid="background-lock" type="checkbox" checked={background.locked === true} onChange={(event) => onChange({ locked: event.target.checked })} />
          </label>
          <label className="toggle-row compact-toggle">
            <span>{ru ? 'Включать в SVG и печать' : 'Include in SVG and print'}</span>
            <input data-testid="background-export" type="checkbox" checked={background.includeInExport === true} onChange={(event) => onChange({ includeInExport: event.target.checked })} />
          </label>
          <label className="range-row">
            <span>{ru ? 'Прозрачность' : 'Opacity'} <strong>{Math.round(background.opacity * 100)}%</strong></span>
            <input
              data-testid="background-opacity"
              type="range"
              min="0.05"
              max="1"
              step="0.05"
              value={background.opacity}
              onChange={(event) => onChange({ opacity: numeric(event.target.value, background.opacity) })}
            />
          </label>
          <fieldset disabled={background.locked === true}>
            <legend>{ru ? 'Положение, размер и поворот' : 'Position, size and rotation'}</legend>
            <div className="number-field-grid background-geometry-grid">
              <label className="number-field"><span>X</span><DraftNumberInput ariaLabel={ru ? 'Фон X' : 'Background X'} commitOnBlur value={background.x} onChange={(x) => onChange({ x })} /></label>
              <label className="number-field"><span>Y</span><DraftNumberInput ariaLabel={ru ? 'Фон Y' : 'Background Y'} commitOnBlur value={background.y} onChange={(y) => onChange({ y })} /></label>
              <label className="number-field"><span>{ru ? 'Ширина' : 'Width'}</span><DraftNumberInput ariaLabel={ru ? 'Ширина фона' : 'Background width'} commitOnBlur min={1} value={background.width} onChange={(width) => onChange({ width })} /></label>
              <label className="number-field"><span>{ru ? 'Высота' : 'Height'}</span><DraftNumberInput ariaLabel={ru ? 'Высота фона' : 'Background height'} commitOnBlur min={1} value={background.height} onChange={(height) => onChange({ height })} /></label>
              <label className="number-field"><span>{ru ? 'Поворот °' : 'Rotation °'}</span><DraftNumberInput ariaLabel={ru ? 'Поворот изображения °' : 'Background rotation °'} commitOnBlur value={background.rotation ?? 0} onChange={(rotation) => onChange({ rotation })} /></label>
            </div>
          </fieldset>
          <small className="muted-text">{ru ? 'Кликните подложку на холсте: тяните саму картинку для перемещения, углы — для размера, круглую ручку — для поворота. Shift сохраняет пропорции при resize и фиксирует поворот по 15°. Блокировка отключает всю геометрию.' : 'Click the underlay on canvas: drag the image to move it, corners to resize, and the round handle to rotate. Shift preserves aspect ratio while resizing and snaps rotation to 15°. Lock disables all geometry edits.'}</small>
        </>
      )}
    </section>
  )
}
''')

# ---------------------------------------------------------------------------
# App integration: selection/history, rotated export bounds, canvas component.
# ---------------------------------------------------------------------------
replace_once(
    'src/App.tsx',
    "import { BackgroundImagePanel } from './editor/BackgroundImagePanel'\n",
    "import { BackgroundImagePanel } from './editor/BackgroundImagePanel'\nimport { BackgroundImageCanvas } from './editor/BackgroundImageCanvas'\n",
)
replace_once(
    'src/App.tsx',
    "import { clampBackgroundOpacity, prepareBackgroundImage } from './editor/backgroundImage'\n",
    "import { clampBackgroundOpacity, prepareBackgroundImage } from './editor/backgroundImage'\nimport { backgroundImageBounds } from './editor/backgroundGeometry'\n",
)
replace_once(
    'src/App.tsx',
    "  if (exportBackground) {\n    bounds.push({\n      left: exportBackground.x,\n      right: exportBackground.x + exportBackground.width,\n      top: exportBackground.y,\n      bottom: exportBackground.y + exportBackground.height,\n    })\n  }\n",
    "  if (exportBackground) {\n    const backgroundBounds = backgroundImageBounds(exportBackground)\n    bounds.push({\n      left: backgroundBounds.left,\n      right: backgroundBounds.right,\n      top: backgroundBounds.top,\n      bottom: backgroundBounds.bottom,\n    })\n  }\n",
)
replace_once(
    'src/App.tsx',
    "  const backgroundContent = exportBackground\n    ? `<image href=\"${escapeXml(exportBackground.dataUrl)}\" x=\"${exportBackground.x}\" y=\"${exportBackground.y}\" width=\"${exportBackground.width}\" height=\"${exportBackground.height}\" opacity=\"${exportBackground.opacity}\" preserveAspectRatio=\"none\"/>`\n    : ''\n",
    "  const backgroundContent = exportBackground\n    ? `<image href=\"${escapeXml(exportBackground.dataUrl)}\" x=\"${exportBackground.x}\" y=\"${exportBackground.y}\" width=\"${exportBackground.width}\" height=\"${exportBackground.height}\" opacity=\"${exportBackground.opacity}\" transform=\"rotate(${exportBackground.rotation ?? 0} ${exportBackground.x + exportBackground.width / 2} ${exportBackground.y + exportBackground.height / 2})\" preserveAspectRatio=\"none\"/>`\n    : ''\n",
)
replace_once(
    'src/App.tsx',
    "  const guideManipulationSnapshotRef = useRef<DocumentSnapshot | null>(null)\n",
    "  const guideManipulationSnapshotRef = useRef<DocumentSnapshot | null>(null)\n  const backgroundManipulationSnapshotRef = useRef<DocumentSnapshot | null>(null)\n",
)
replace_once(
    'src/App.tsx',
    "  const [backgroundImage, setBackgroundImage] = useState<BackgroundImage | null>(null)\n",
    "  const [backgroundImage, setBackgroundImage] = useState<BackgroundImage | null>(null)\n  const [backgroundSelected, setBackgroundSelected] = useState(false)\n",
)
replace_once(
    'src/App.tsx',
    "  const clearElementSelection = useCallback(() => setSelectedIds([]), [])\n\n  const undo = useCallback(() => {\n",
    "  const clearElementSelection = useCallback(() => setSelectedIds([]), [])\n\n  useEffect(() => {\n    if (!backgroundImage || backgroundImage.visible === false || selectedIds.length || selectedGuideId || selectedRowMarkerId || selectedRulerId) {\n      setBackgroundSelected(false)\n    }\n  }, [backgroundImage, selectedGuideId, selectedIds.length, selectedRowMarkerId, selectedRulerId])\n  useEffect(() => setBackgroundSelected(false), [activeProjectId])\n\n  const selectBackground = useCallback(() => {\n    clearElementSelection()\n    setSelectedGuideId(null)\n    setSelectedRowMarkerId(null)\n    setSelectedRulerId(null)\n    setRulerDraft(null)\n    setTool({ type: 'select' })\n    setPreview(null)\n    setSnapTarget(null)\n    setBackgroundSelected(true)\n  }, [clearElementSelection])\n  const handleBackgroundManipulationStart = useCallback(() => {\n    backgroundManipulationSnapshotRef.current = currentSnapshot()\n    setPreview(null)\n    setSnapTarget(null)\n  }, [currentSnapshot])\n  const handleBackgroundManipulationPreview = useCallback((next: BackgroundImage) => {\n    setBackgroundImage(next)\n  }, [])\n  const handleBackgroundManipulationEnd = useCallback((moved: boolean, cancelled: boolean) => {\n    const before = backgroundManipulationSnapshotRef.current\n    backgroundManipulationSnapshotRef.current = null\n    if (!before) return\n    if (cancelled) {\n      setBackgroundImage(before.backgroundImage)\n      return\n    }\n    if (moved) {\n      recordSnapshot(before)\n      setStatus(locale === 'ru' ? 'Фоновое изображение изменено' : 'Background image transformed')\n    }\n  }, [locale, recordSnapshot])\n\n  const undo = useCallback(() => {\n",
)
replace_once(
    'src/App.tsx',
    "    setSelectedRulerId(null)\n    setStatus(t.statusUndo)\n",
    "    setSelectedRulerId(null)\n    setBackgroundSelected(false)\n    setStatus(t.statusUndo)\n",
)
replace_once(
    'src/App.tsx',
    "    setSelectedRulerId(null)\n    setStatus(t.statusRedo)\n",
    "    setSelectedRulerId(null)\n    setBackgroundSelected(false)\n    setStatus(t.statusRedo)\n",
)
replace_once(
    'src/App.tsx',
    "    if (event.button !== 0) return\n\n    const point = toDocumentPoint(localPoint(event.clientX, event.clientY))\n",
    "    if (event.button !== 0) return\n    setBackgroundSelected(false)\n\n    const point = toDocumentPoint(localPoint(event.clientX, event.clientY))\n",
)
replace_once(
    'src/App.tsx',
    "    width: patch.width === undefined ? backgroundImage.width : Math.max(1, patch.width),\n    height: patch.height === undefined ? backgroundImage.height : Math.max(1, patch.height),\n    opacity: patch.opacity === undefined ? backgroundImage.opacity : clampBackgroundOpacity(patch.opacity),\n",
    "    width: patch.width === undefined ? backgroundImage.width : Math.max(1, patch.width),\n    height: patch.height === undefined ? backgroundImage.height : Math.max(1, patch.height),\n    rotation: patch.rotation === undefined ? backgroundImage.rotation ?? 0 : patch.rotation,\n    opacity: patch.opacity === undefined ? backgroundImage.opacity : clampBackgroundOpacity(patch.opacity),\n",
)
replace_once(
    'src/App.tsx',
    "const removeBackgroundImage = () => {\n  if (!backgroundImage) return\n  commitBackgroundImage(null)\n  setStatus(locale === 'ru' ? 'Фоновое изображение удалено' : 'Background image removed')\n}\n",
    "const removeBackgroundImage = () => {\n  if (!backgroundImage) return\n  commitBackgroundImage(null)\n  setBackgroundSelected(false)\n  setStatus(locale === 'ru' ? 'Фоновое изображение удалено' : 'Background image removed')\n}\n",
)
replace_once(
    'src/App.tsx',
    "            {backgroundImage && backgroundImage.visible !== false && (\n              <image\n                data-testid=\"background-image\"\n                className=\"background-canvas-image\"\n                href={backgroundImage.dataUrl}\n                x={backgroundImage.x}\n                y={backgroundImage.y}\n                width={backgroundImage.width}\n                height={backgroundImage.height}\n                opacity={backgroundImage.opacity}\n                preserveAspectRatio=\"none\"\n              />\n            )}\n",
    "            {backgroundImage && backgroundImage.visible !== false && (\n              <BackgroundImageCanvas\n                background={backgroundImage}\n                selected={backgroundSelected}\n                zoom={viewport.zoom}\n                clientToDocument={clientToDocument}\n                onSelect={selectBackground}\n                onManipulationStart={handleBackgroundManipulationStart}\n                onManipulationPreview={handleBackgroundManipulationPreview}\n                onManipulationEnd={handleBackgroundManipulationEnd}\n              />\n            )}\n",
)

# ---------------------------------------------------------------------------
# Print UX: full page frames replace crop-corner markers; add a live tile preview.
# ---------------------------------------------------------------------------
Path('src/editor/printLayout.ts').write_text(r'''export type PrintPaper = 'a4' | 'letter'
export type PrintOrientation = 'portrait' | 'landscape'

export type PrintSettings = {
  paper: PrintPaper
  orientation: PrintOrientation
  scalePercent: number
  overlapMm: number
  marginMm: number
  pageFrames: boolean
}

export type PrintBounds = {
  left: number
  top: number
  width: number
  height: number
}

export type PrintTile = {
  row: number
  column: number
  x: number
  y: number
  width: number
  height: number
}

export type PrintLayout = {
  paperWidthMm: number
  paperHeightMm: number
  printableWidthMm: number
  printableHeightMm: number
  rows: number
  columns: number
  tiles: PrintTile[]
}

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paper: 'a4',
  orientation: 'portrait',
  scalePercent: 100,
  overlapMm: 5,
  marginMm: 10,
  pageFrames: true,
}

const PAPER_MM: Record<PrintPaper, { width: number; height: number }> = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
}

const PX_PER_MM = 96 / 25.4

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

export function normalizedPrintSettings(settings: PrintSettings): PrintSettings {
  const base = PAPER_MM[settings.paper] ?? PAPER_MM.a4
  const width = settings.orientation === 'landscape' ? base.height : base.width
  const height = settings.orientation === 'landscape' ? base.width : base.height
  const maxMargin = Math.max(0, Math.min(width, height) / 2 - 5)
  const marginMm = clamp(Number.isFinite(settings.marginMm) ? settings.marginMm : 10, 0, maxMargin)
  const printableMin = Math.min(width - marginMm * 2, height - marginMm * 2)
  return {
    paper: settings.paper === 'letter' ? 'letter' : 'a4',
    orientation: settings.orientation === 'landscape' ? 'landscape' : 'portrait',
    scalePercent: clamp(Number.isFinite(settings.scalePercent) ? settings.scalePercent : 100, 10, 400),
    overlapMm: clamp(Number.isFinite(settings.overlapMm) ? settings.overlapMm : 5, 0, Math.max(0, printableMin - 1)),
    marginMm,
    pageFrames: settings.pageFrames !== false,
  }
}

function axisPositions(start: number, contentSize: number, tileSize: number, overlap: number) {
  if (contentSize <= tileSize) return [start]
  const stride = Math.max(1, tileSize - overlap)
  const count = 1 + Math.ceil((contentSize - tileSize) / stride)
  const maxStart = start + contentSize - tileSize
  return Array.from({ length: count }, (_, index) => Math.min(start + index * stride, maxStart))
}

export function layoutPrintTiles(bounds: PrintBounds, rawSettings: PrintSettings): PrintLayout {
  const settings = normalizedPrintSettings(rawSettings)
  const base = PAPER_MM[settings.paper]
  const paperWidthMm = settings.orientation === 'landscape' ? base.height : base.width
  const paperHeightMm = settings.orientation === 'landscape' ? base.width : base.height
  const printableWidthMm = paperWidthMm - settings.marginMm * 2
  const printableHeightMm = paperHeightMm - settings.marginMm * 2
  const scale = settings.scalePercent / 100
  const docUnitsPerMm = PX_PER_MM / scale
  const tileWidth = printableWidthMm * docUnitsPerMm
  const tileHeight = printableHeightMm * docUnitsPerMm
  const overlap = settings.overlapMm * docUnitsPerMm
  const safeBounds = {
    left: Number.isFinite(bounds.left) ? bounds.left : 0,
    top: Number.isFinite(bounds.top) ? bounds.top : 0,
    width: Math.max(1, Number.isFinite(bounds.width) ? bounds.width : 1),
    height: Math.max(1, Number.isFinite(bounds.height) ? bounds.height : 1),
  }
  const xs = axisPositions(safeBounds.left, safeBounds.width, tileWidth, overlap)
  const ys = axisPositions(safeBounds.top, safeBounds.height, tileHeight, overlap)
  const tiles = ys.flatMap((y, row) => xs.map((x, column) => ({
    row,
    column,
    x,
    y,
    width: tileWidth,
    height: tileHeight,
  })))
  return {
    paperWidthMm,
    paperHeightMm,
    printableWidthMm,
    printableHeightMm,
    rows: ys.length,
    columns: xs.length,
    tiles,
  }
}

export function parseSvgViewBox(markup: string): PrintBounds {
  const match = markup.match(/viewBox=["']\s*([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s+([-+\d.eE]+)\s*["']/)
  if (!match) return { left: 0, top: 0, width: 640, height: 480 }
  const [, left, top, width, height] = match.map(Number)
  if (![left, top, width, height].every(Number.isFinite) || width <= 0 || height <= 0) {
    return { left: 0, top: 0, width: 640, height: 480 }
  }
  return { left, top, width, height }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character] ?? character)
}

function svgInner(markup: string) {
  return markup.replace(/^\s*<svg\b[^>]*>/i, '').replace(/<\/svg>\s*$/i, '')
}

export function buildTiledPrintHtml(
  svgMarkup: string,
  bounds: PrintBounds,
  rawSettings: PrintSettings,
  title: string,
  locale: 'ru' | 'en',
) {
  const settings = normalizedPrintSettings(rawSettings)
  const layout = layoutPrintTiles(bounds, settings)
  const inner = svgInner(svgMarkup)
  const frame = settings.pageFrames ? '<div class="page-frame" aria-hidden="true"></div>' : ''
  const pages = layout.tiles.map((tile, index) => `
    <section class="print-page">
      <div class="printable">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="${tile.x} ${tile.y} ${tile.width} ${tile.height}" preserveAspectRatio="xMinYMin meet">${inner}</svg>
      </div>
      ${frame}
      <div class="page-label">${escapeHtml(title)} · ${index + 1}/${layout.tiles.length}</div>
    </section>`).join('')
  const instruction = locale === 'ru'
    ? 'Для точного масштаба оставьте масштаб печати браузера 100%. Рамка показывает границу печатной области каждой страницы.'
    : 'For exact sizing, keep the browser print scale at 100%. The frame marks each page printable area.'
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>
  @page { size: ${layout.paperWidthMm}mm ${layout.paperHeightMm}mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #eee; font-family: system-ui, sans-serif; }
  .screen-note { padding: 10px 14px; font-size: 12px; color: #555; background: white; position: sticky; top: 0; z-index: 5; }
  .print-page { position: relative; width: ${layout.paperWidthMm}mm; height: ${layout.paperHeightMm}mm; margin: 8px auto; background: white; break-after: page; page-break-after: always; overflow: hidden; }
  .printable { position: absolute; left: ${settings.marginMm}mm; top: ${settings.marginMm}mm; width: ${layout.printableWidthMm}mm; height: ${layout.printableHeightMm}mm; overflow: hidden; }
  .printable svg { display: block; width: 100%; height: 100%; }
  .page-frame { position: absolute; left: ${settings.marginMm}mm; top: ${settings.marginMm}mm; width: ${layout.printableWidthMm}mm; height: ${layout.printableHeightMm}mm; border: .25mm solid #222; pointer-events: none; }
  .page-label { position: absolute; right: ${Math.max(2, settings.marginMm / 2)}mm; bottom: ${Math.max(2, settings.marginMm / 2)}mm; font-size: 8pt; color: #666; }
  @media print {
    html, body { background: white; }
    .screen-note { display: none; }
    .print-page { margin: 0; }
  }
</style>
</head>
<body>
<div class="screen-note">${escapeHtml(instruction)}</div>
${pages}
</body>
</html>`
}
''')

Path('src/editor/PrintPanel.tsx').write_text(r'''import { useMemo, useState } from 'react'
import {
  DEFAULT_PRINT_SETTINGS,
  layoutPrintTiles,
  type PrintBounds,
  type PrintOrientation,
  type PrintPaper,
  type PrintSettings,
} from './printLayout'

type Props = {
  locale: 'ru' | 'en'
  bounds: PrintBounds
  onPrint: (settings: PrintSettings) => void
}

function previewViewBox(bounds: PrintBounds, tiles: { x: number; y: number; width: number; height: number }[]) {
  const left = Math.min(bounds.left, ...tiles.map((tile) => tile.x))
  const top = Math.min(bounds.top, ...tiles.map((tile) => tile.y))
  const right = Math.max(bounds.left + bounds.width, ...tiles.map((tile) => tile.x + tile.width))
  const bottom = Math.max(bounds.top + bounds.height, ...tiles.map((tile) => tile.y + tile.height))
  const pad = Math.max(12, Math.max(right - left, bottom - top) * 0.03)
  return `${left - pad} ${top - pad} ${right - left + pad * 2} ${bottom - top + pad * 2}`
}

export function PrintPanel({ locale, bounds, onPrint }: Props) {
  const [settings, setSettings] = useState<PrintSettings>(DEFAULT_PRINT_SETTINGS)
  const ru = locale === 'ru'
  const layout = useMemo(() => layoutPrintTiles(bounds, settings), [bounds, settings])
  const previewBox = useMemo(() => previewViewBox(bounds, layout.tiles), [bounds, layout.tiles])

  const patch = (next: Partial<PrintSettings>) => setSettings((current) => ({ ...current, ...next }))

  return (
    <section className="panel-section print-panel" data-testid="print-panel">
      <div className="section-title-row">
        <h2>{ru ? 'Печать по страницам' : 'Tiled print'}</h2>
        <span className="badge" data-testid="print-page-count">{layout.tiles.length}</span>
      </div>
      <div className="print-settings-grid">
        <label>
          <span>{ru ? 'Бумага' : 'Paper'}</span>
          <select value={settings.paper} onChange={(event) => patch({ paper: event.target.value as PrintPaper })}>
            <option value="a4">A4</option>
            <option value="letter">Letter</option>
          </select>
        </label>
        <label>
          <span>{ru ? 'Ориентация' : 'Orientation'}</span>
          <select value={settings.orientation} onChange={(event) => patch({ orientation: event.target.value as PrintOrientation })}>
            <option value="portrait">{ru ? 'Книжная' : 'Portrait'}</option>
            <option value="landscape">{ru ? 'Альбомная' : 'Landscape'}</option>
          </select>
        </label>
        <label>
          <span>{ru ? 'Масштаб' : 'Scale'}</span>
          <input data-testid="print-scale" type="number" min="10" max="400" step="5" value={settings.scalePercent} onChange={(event) => patch({ scalePercent: Number(event.target.value) || 100 })} />
          <small>%</small>
        </label>
        <label>
          <span>{ru ? 'Перекрытие' : 'Overlap'}</span>
          <input type="number" min="0" max="30" step="1" value={settings.overlapMm} onChange={(event) => patch({ overlapMm: Math.max(0, Number(event.target.value) || 0) })} />
          <small>mm</small>
        </label>
      </div>
      <label className="toggle-row compact-toggle">
        <span>{ru ? 'Печатать рамки страниц' : 'Print page frames'}</span>
        <input data-testid="print-page-frames" type="checkbox" checked={settings.pageFrames} onChange={(event) => patch({ pageFrames: event.target.checked })} />
      </label>
      <div className="print-tile-preview" data-testid="print-tile-preview">
        <svg viewBox={previewBox} aria-label={ru ? 'Предпросмотр рамок страниц' : 'Page-frame preview'}>
          <rect x={bounds.left} y={bounds.top} width={bounds.width} height={bounds.height} className="print-preview-content" />
          {layout.tiles.map((tile, index) => (
            <g key={`${tile.row}-${tile.column}`}>
              <rect
                data-testid="print-preview-frame"
                x={tile.x}
                y={tile.y}
                width={tile.width}
                height={tile.height}
                className="print-preview-frame"
                vectorEffect="non-scaling-stroke"
              />
              <text x={tile.x + 8} y={tile.y + 16} className="print-preview-label">{index + 1}</text>
            </g>
          ))}
        </svg>
      </div>
      <p className="print-summary">
        {ru
          ? `${layout.columns} × ${layout.rows} стр. · ${layout.tiles.length} всего`
          : `${layout.columns} × ${layout.rows} pages · ${layout.tiles.length} total`}
      </p>
      <button className="primary-button print-button" onClick={() => onPrint(settings)}>
        {ru ? 'Открыть печать' : 'Open print view'}
      </button>
      <small className="muted-text">{ru ? 'Предпросмотр показывает реальные границы и перекрытие страниц. Для физически точного масштаба в диалоге браузера оставьте 100%.' : 'Preview shows the actual page boundaries and overlap. For physical scale fidelity, keep the browser print dialog at 100%.'}</small>
    </section>
  )
}
''')

Path('src/editor/printLayout.test.ts').write_text(r'''import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PRINT_SETTINGS,
  buildTiledPrintHtml,
  layoutPrintTiles,
  parseSvgViewBox,
} from './printLayout'

describe('tiled print layout', () => {
  it('keeps small content on one A4 page', () => {
    const layout = layoutPrintTiles({ left: 0, top: 0, width: 400, height: 400 }, DEFAULT_PRINT_SETTINGS)
    expect(layout.columns).toBe(1)
    expect(layout.rows).toBe(1)
    expect(layout.tiles).toHaveLength(1)
  })

  it('creates overlapping tiles for large content', () => {
    const settings = { ...DEFAULT_PRINT_SETTINGS, scalePercent: 100, overlapMm: 10 }
    const layout = layoutPrintTiles({ left: -100, top: 20, width: 2200, height: 1600 }, settings)
    expect(layout.columns).toBeGreaterThan(1)
    expect(layout.rows).toBeGreaterThan(1)
    const first = layout.tiles[0]
    const second = layout.tiles[1]
    expect(second.x - first.x).toBeLessThan(first.width)
  })

  it('uses landscape dimensions when requested', () => {
    const layout = layoutPrintTiles(
      { left: 0, top: 0, width: 1000, height: 400 },
      { ...DEFAULT_PRINT_SETTINGS, orientation: 'landscape' },
    )
    expect(layout.paperWidthMm).toBeGreaterThan(layout.paperHeightMm)
  })

  it('parses exported SVG viewBox', () => {
    expect(parseSvgViewBox('<svg viewBox="-20 10 640 480"></svg>')).toEqual({
      left: -20,
      top: 10,
      width: 640,
      height: 480,
    })
  })

  it('builds printable HTML with complete page frames instead of crop corners', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 2000 1500"><circle cx="10" cy="10" r="5"/></svg>'
    const html = buildTiledPrintHtml(svg, parseSvgViewBox(svg), DEFAULT_PRINT_SETTINGS, 'Chart', 'en')
    expect(html).toContain('class="print-page"')
    expect(html).toContain('class="page-frame"')
    expect(html).not.toContain('class="crop ')
    expect(html).toContain('Chart · 1/')
    expect(html).toContain('@page')
  })

  it('can omit printed page frames without changing the page grid', () => {
    const svg = '<svg viewBox="0 0 2000 1500"></svg>'
    const settings = { ...DEFAULT_PRINT_SETTINGS, pageFrames: false }
    const html = buildTiledPrintHtml(svg, parseSvgViewBox(svg), settings, 'Chart', 'en')
    expect(html).not.toContain('class="page-frame"')
    expect(layoutPrintTiles(parseSvgViewBox(svg), settings).tiles.length).toBeGreaterThan(1)
  })
})
''')

append_once(
    'src/documentOutput.css',
    '.background-selection-box',
    r'''
.background-canvas-image {
  pointer-events: visiblePainted;
  cursor: move;
}

.background-canvas-layer.locked .background-canvas-image {
  cursor: default;
}

.background-selection-box {
  fill: none;
  stroke: #2c6fc1;
  stroke-width: 1.5px;
  stroke-dasharray: 6 4;
}

.background-resize-handle,
.background-rotate-handle {
  fill: #fff;
  stroke: #2c6fc1;
  stroke-width: 1.8px;
  cursor: nwse-resize;
}

.background-resize-handle[data-handle="ne"],
.background-resize-handle[data-handle="sw"] {
  cursor: nesw-resize;
}

.background-rotate-handle {
  cursor: grab;
}

.background-rotation-stem {
  stroke: #2c6fc1;
  stroke-width: 1.4px;
}

.background-lock-indicator {
  pointer-events: none;
}

.print-tile-preview {
  margin-top: 9px;
  border: 1px solid #d5d0c7;
  border-radius: 7px;
  background: #f8f6f1;
  padding: 5px;
  height: 132px;
}

.print-tile-preview svg {
  width: 100%;
  height: 100%;
  display: block;
}

.print-preview-content {
  fill: rgba(60, 65, 62, .08);
  stroke: #8d8880;
  stroke-width: 1px;
  vector-effect: non-scaling-stroke;
}

.print-preview-frame {
  fill: rgba(44, 111, 193, .035);
  stroke: #2c6fc1;
  stroke-width: 1.2px;
}

.print-preview-label {
  font-size: 12px;
  font-weight: 700;
  fill: #2c6fc1;
  pointer-events: none;
}
''',
)
# Remove the old pointer-events:none declaration which would override direct selection.
text = Path('src/documentOutput.css').read_text()
text = text.replace("\n.background-canvas-image {\n  pointer-events: none;\n}\n", "\n", 1)
Path('src/documentOutput.css').write_text(text)

# ---------------------------------------------------------------------------
# Chromium regressions for direct underlay manipulation and visible print frames.
# ---------------------------------------------------------------------------
Path('e2e/background-print.e2e.ts').write_text(r'''import { expect, test, type Page } from '@playwright/test'

async function openEditor(page: Page) {
  await page.goto('/Crochet-Scheme-Editor/')
  await expect(page.getByText('Редактор схем вязания', { exact: true })).toBeVisible()
  await expect(page.locator('.autosave-indicator')).toContainText('Автосохранено')
}

async function uploadReference(page: Page) {
  await page.getByTestId('background-file-input').setInputFiles({
    name: 'reference.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="300"><rect width="600" height="300" fill="#ddd"/><circle cx="300" cy="150" r="80" fill="#999"/></svg>'),
  })
  await expect(page.getByTestId('background-image')).toBeVisible()
}

test('selects, resizes and rotates an existing background directly on canvas', async ({ page }) => {
  await openEditor(page)
  await uploadReference(page)

  const image = page.getByTestId('background-image')
  await image.click()
  await expect(page.getByTestId('background-selection-box')).toBeVisible()
  await expect(page.locator('.background-resize-handle')).toHaveCount(4)
  await expect(page.getByTestId('background-rotate-handle')).toBeVisible()

  const widthInput = page.getByLabel('Ширина фона')
  const heightInput = page.getByLabel('Высота фона')
  const beforeWidth = Number(await widthInput.inputValue())
  const beforeHeight = Number(await heightInput.inputValue())
  const se = page.locator('.background-resize-handle[data-handle="se"]')
  const seBox = await se.boundingBox()
  expect(seBox).not.toBeNull()
  await page.mouse.move(seBox!.x + seBox!.width / 2, seBox!.y + seBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(seBox!.x + seBox!.width / 2 + 70, seBox!.y + seBox!.height / 2 + 35, { steps: 5 })
  await page.mouse.up()
  expect(Number(await widthInput.inputValue())).toBeGreaterThan(beforeWidth)
  expect(Number(await heightInput.inputValue())).toBeGreaterThan(beforeHeight)

  const rotate = page.getByTestId('background-rotate-handle')
  const rotateBox = await rotate.boundingBox()
  expect(rotateBox).not.toBeNull()
  await page.mouse.move(rotateBox!.x + rotateBox!.width / 2, rotateBox!.y + rotateBox!.height / 2)
  await page.mouse.down()
  await page.mouse.move(rotateBox!.x + rotateBox!.width / 2 + 100, rotateBox!.y + rotateBox!.height / 2 + 45, { steps: 6 })
  await page.mouse.up()
  const rotation = Number(await page.getByLabel('Поворот изображения °').inputValue())
  expect(Math.abs(rotation)).toBeGreaterThan(5)

  await page.getByTestId('background-lock').check()
  await expect(page.locator('.background-resize-handle')).toHaveCount(0)
  await expect(page.getByTestId('background-rotate-handle')).toHaveCount(0)
})

test('shows full page frames in tiled-print preview', async ({ page }) => {
  await openEditor(page)
  const panel = page.getByTestId('print-panel')
  await panel.getByTestId('print-scale').fill('400')
  const count = Number(await panel.getByTestId('print-page-count').textContent())
  expect(count).toBeGreaterThan(1)
  await expect(panel.getByTestId('print-preview-frame')).toHaveCount(count)
  await expect(panel.getByTestId('print-page-frames')).toBeChecked()
  await panel.getByTestId('print-page-frames').uncheck()
  await expect(panel.getByTestId('print-page-frames')).not.toBeChecked()
  // Preview remains visible even when printed frames are disabled so the user can still see tiling.
  await expect(panel.getByTestId('print-preview-frame')).toHaveCount(count)
})
''')

# ---------------------------------------------------------------------------
# Version/documentation.
# ---------------------------------------------------------------------------
text = Path('src/i18n.ts').read_text()
if text.count('v1.19.0') != 2:
    raise SystemExit(f'i18n: expected two v1.19.0 labels, got {text.count("v1.19.0")}')
Path('src/i18n.ts').write_text(text.replace('v1.19.0', 'v1.20.0'))

readme = Path('README.md').read_text()
anchor = '## v1.18.0\n'
if anchor not in readme:
    raise SystemExit('README v1.18.0 anchor missing')
section = '''## v1.20.0\n\nCanvas/output usability release: background underlays can be selected directly on the canvas, moved, resized from four corners, Shift-resized with preserved aspect ratio, and rotated with a dedicated handle (Shift snaps to 15°). Rotation persists in schema v21 and is honored by SVG/print bounds. Tiled print now uses complete printable-area page frames instead of corner crop marks and includes a live page/overlap preview.\n\n'''
readme = readme.replace(anchor, section + anchor, 1)
readme = readme.replace('project JSON schema is v20', 'project JSON schema is v21')
readme = readme.replace('schema-v20 feature set', 'schema-v21 feature set')
Path('README.md').write_text(readme)
