import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { GuideRenderer } from './editor/GuideRenderer'
import { LegendOverlay } from './editor/LegendOverlay'
import { LegendPanel } from './editor/LegendPanel'
import { RowMarkerLayer } from './editor/RowMarkerLayer'
import { RowMarkersPanel } from './editor/RowMarkersPanel'
import { LassoOverlay, type LassoMode } from './editor/LassoOverlay'
import { BackgroundImagePanel } from './editor/BackgroundImagePanel'
import { BackgroundImageCanvas } from './editor/BackgroundImageCanvas'
import { PrintPanel } from './editor/PrintPanel'
import { GuideAttachmentPanel } from './editor/GuideAttachmentPanel'
import { MirrorAxisOverlay, type MirrorAxisState } from './editor/MirrorAxisOverlay'
import { GuideRowGeneratorPanel } from './editor/GuideRowGeneratorPanel'
import { ParametricRowEditorPanel } from './editor/ParametricRowEditorPanel'
import { PatternRowsPanel } from './editor/PatternRowsPanel'
import { ProjectManagerPanel } from './editor/ProjectManagerPanel'
import { ProductivityPanel } from './editor/ProductivityPanel'
import { SelectionColorControl } from './editor/SelectionColorControl'
import { SelectionQuickToolbar } from './editor/SelectionQuickToolbar'
import { LayersPanel } from './editor/LayersPanel'
import { StitchLayer } from './editor/StitchLayer'
import { TopologyEditorPanel } from './editor/TopologyEditorPanel'
import { GaugeRulerPanel } from './editor/GaugeRulerPanel'
import { RulerLayer } from './editor/RulerLayer'
import {
  bringForward as bringElementsForward,
  bringToFront as bringElementsToFront,
  isElementLocked,
  isElementVisible,
  normalizeElements,
  normalizeProject,
  sendBackward as sendElementsBackward,
  sendToBack as sendElementsToBack,
} from './editor/document'
import { DEFAULT_STITCH_COLOR } from './editor/elementColor'
import { clampBackgroundOpacity, prepareBackgroundImage } from './editor/backgroundImage'
import { backgroundImageBounds } from './editor/backgroundGeometry'
import { chainBundleLayout, createChainBundle, type ChainBundleCount } from './editor/chainBundle'
import { buildTiledPrintHtml, parseLegendPrintBounds, parseSvgViewBox, type PrintSettings } from './editor/printLayout'
import { usedLegendItems } from './editor/legend'
import { deleteRowMarkerAndRenumber, isRowMarkerLocked, nextRowMarkerNumber, normalizedRowMarkerNumber } from './editor/rowMarkers'
import type { GuideManipulationMode } from './editor/guideManipulation'
import { fitLineGuideToRect, lineGuideAngle, lineGuideLength, reverseGuide, setLineGuideAngle, setLineGuideLength } from './editor/guideGeometry'
import { clamp, screenToDocument } from './editor/geometry'
import { emptyHistory, pushHistory, redoHistory, undoHistory } from './editor/history'
import { emptyGaugeSettings, reconcileRulerElementReferences, snapRulerPoint } from './editor/gauge'
import {
  attachElementToGuide,
  elementFromAttachment,
  isPathGuide,
  moveAttachedElement,
  reconcileGuideAttachments,
  remapAttachmentsForReversedGuide,
} from './editor/pathGuides'
import { createDirectionalMirroredCopy, createMirroredCopy, createMirroredCopyAcrossLine } from './editor/mirrorCopy'
import {
  cloneSelectionWithOffset,
  cloneWithRepeatedDelta,
  groupElements,
  mirrorElements,
  mirrorElementsAcrossLine,
  mirrorElementsToward,
  repeatSelection,
  selectionPivot,
  ungroupElements,
  type MirrorAxis,
  type MirrorDirection,
  type RepeatOptions,
} from './editor/productivity'
import {
  createLocalProject,
  deleteLocalProject,
  duplicateLocalProject,
  getActiveProjectId,
  listLocalProjects,
  loadAutosave,
  loadLocalProject,
  saveAutosave,
  saveLocalProject,
  setActiveProjectId as persistActiveProjectId,
} from './editor/persistence'
import { viewportForElements } from './editor/viewportFit'
import { semanticLockIds, semanticSelectionIds } from './editor/selectionModel'
import { projectIntegrityIssue } from './editor/projectIntegrity'
import { rowConstructionTopologyParents } from './editor/rowConstruction'
import { CURRENT_PROJECT_SCHEMA_VERSION } from './editor/projectVersion'
import {
  createNextPatternRow,
  createPatternIncreaseSequence,
  deleteParametricRow,
  nextPatternOrder,
  parametricRowFromSelection,
  reconcileParametricRows,
  rowElements,
  updateParametricRow,
} from './editor/parametricRows'
import {
  elementAabb,
  idsInLasso,
  idsInMarquee,
  normalizeRect,
  selectionAabb,
  pointerAngle,
  rotationFromPointer,
  type Rect,
} from './editor/selection'
import { solveSnap, type SnapCandidate } from './editor/snapping'
import { resolvedStitchGeometry } from './editor/stitchGeometry'
import type { TopologyChangeMarker } from './editor/topology'
import {
  DEFAULT_LOCALE,
  UI,
  symbolName,
  type Locale,
} from './i18n'
import { SYMBOLS, SYMBOL_BY_ID, SymbolGlyph, symbolSvgMarkup } from './symbols'
import { CanvasToolbar } from './ui/CanvasToolbar'
import { EditorShell } from './ui/EditorShell'
import { EditorStatusbar } from './ui/EditorStatusbar'
import { EditorTopbar } from './ui/EditorTopbar'
import { FavoriteQuickBar } from './ui/FavoriteQuickBar'
import { GuideListPanel } from './ui/GuideListPanel'
import { loadFavorites, saveFavorites, type FavoriteElementKey } from './ui/favorites'
import { LeftWorkbenchSurface } from './ui/LeftWorkbenchSurface'
import { RightPanelTabs, type RightPanelTab } from './ui/RightPanelTabs'
import { WorkspaceSidebarControls } from './ui/WorkspaceSidebarControls'
import type { ApplicationCommandId, ApplicationCommandRunner } from './ui/applicationCommands'
import type { WorkbenchTool } from './ui/workbenchTypes'
import type {
  AutosaveDelayMs,
  AnchorName,
  BackgroundImage,
  CrochetProject,
  GaugeProfile,
  GaugeSettings,
  Guide,
  GuideAttachment,
  GuideAttachmentOrientation,
  MeasurementRuler,
  OrientationMode,
  ParametricRowBinding,
  Point,
  RowMarker,
  SnappingSettings,
  StitchElement,
  Viewport,
} from './types'

const DEFAULT_VIEWPORT: Viewport = { zoom: 1, panX: 460, panY: 320 }
const DEFAULT_SNAPPING: SnappingSettings = {
  enabled: true,
  sourceAnchor: 'bottom',
  orientationMode: 'along',
  snapToVertices: true,
  tolerancePx: 12,
}
const LOCALE_STORAGE_KEY = 'crochet-scheme-editor-locale'
const DUPLICATE_OFFSET = 24
const DEFAULT_AUTOSAVE_DELAY_MS: AutosaveDelayMs = 650
const SYMBOL_SIZES = Object.fromEntries(
  SYMBOLS.map((symbol) => [symbol.id, { width: symbol.width, height: symbol.height }]),
)

type DocumentSnapshot = {
  elements: StitchElement[]
  guides: Guide[]
  rowMarkers: RowMarker[]
  gauge: GaugeSettings
  rulers: MeasurementRuler[]
  backgroundImage: BackgroundImage | null
  legendVisible: boolean
  snapping: SnappingSettings
  projectTitle: string
}
type PanState = {
  pointerId: number
  startPointer: Point
  startViewport: Viewport
}
type DragState = {
  pointerId: number
  referenceId: string
  selectedIds: string[]
  startPointer: Point
  startSnapshot: DocumentSnapshot
}
type MarqueeState = {
  pointerId: number
  start: Point
  current: Point
  baseIds: string[]
}
type LassoState = {
  pointerId: number
  points: Point[]
  baseIds: string[]
  mode: LassoMode
}
type RotateState = {
  pointerId: number
  elementId: string
  startRotation: number
  startPointerAngle: number
  startSnapshot: DocumentSnapshot
}
type RulerDraftState = {
  start: Point
  current: Point
  startElementId?: string
  currentElementId?: string
}
type RulerDragState = {
  pointerId: number
  rulerId: string
  endpoint: 'start' | 'end'
  startSnapshot: DocumentSnapshot
}
type HistoryState = {
  past: DocumentSnapshot[]
  future: DocumentSnapshot[]
}
type AutosaveState = 'loading' | 'saving' | 'saved' | 'error' | 'off'

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function reconcileLinkedElements(elements: StitchElement[], guides: Guide[]) {
  return reconcileGuideAttachments(reconcileParametricRows(elements, guides, createId), guides)
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function guideLabel(guide: Guide, locale: Locale) {
  const t = UI[locale]
  if (guide.type === 'arc') return t.arc
  if (guide.type === 'line') return locale === 'ru' ? 'Линия' : 'Line'
  if (guide.type === 'curve') return locale === 'ru' ? 'Кривая' : 'Curve'
  if (guide.type === 'parabola') return locale === 'ru' ? 'Парабола' : 'Parabola'
  if (guide.type === 'grid') return t.rectangularGrid
  return t.radialGrid
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
}: {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
}) {
  const [draft, setDraft] = useState(String(Number.isFinite(value) ? value : 0))
  useEffect(() => setDraft(String(Number.isFinite(value) ? value : 0)), [value])

  const commit = () => {
    const parsed = Number(draft)
    if (!Number.isFinite(parsed)) {
      setDraft(String(value))
      return
    }
    if (parsed !== value) onChange(parsed)
  }

  return (
    <label className="number-field">
      <span>{label}</span>
      <input
        type="number"
        value={draft}
        min={min}
        max={max}
        step={step}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') event.currentTarget.blur()
          if (event.key === 'Escape') {
            setDraft(String(value))
            event.currentTarget.blur()
          }
        }}
      />
    </label>
  )
}

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character] ?? character)
}

function serializeSvg(
  elements: StitchElement[],
  rowMarkers: RowMarker[],
  backgroundImage: BackgroundImage | null,
  legendVisible: boolean,
  locale: Locale,
  emptyLabel: string,
) {
  const visibleMarkers = rowMarkers.filter((marker) => marker.visible !== false)
  const exportBackground = backgroundImage && backgroundImage.visible !== false && backgroundImage.includeInExport === true
    ? backgroundImage
    : null
  if (!elements.length && !visibleMarkers.length && !exportBackground) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><text x="320" y="240" text-anchor="middle" font-family="sans-serif" fill="#888">${escapeXml(emptyLabel)}</text></svg>`
  }

  const bounds = elements.map((element) =>
    elementAabb(element, SYMBOL_SIZES[element.symbolId] ?? { width: 30, height: 30 }, 12),
  )
  bounds.push(...visibleMarkers.map((marker) => ({
    left: marker.x - 8, right: marker.x + 42, top: marker.y - 14, bottom: marker.y + 14,
  })))
  if (exportBackground) {
    const backgroundBounds = backgroundImageBounds(exportBackground)
    bounds.push({
      left: backgroundBounds.left,
      right: backgroundBounds.right,
      top: backgroundBounds.top,
      bottom: backgroundBounds.bottom,
    })
  }

  const padding = 36
  let left = Math.min(...bounds.map((item) => item.left)) - padding
  let right = Math.max(...bounds.map((item) => item.right)) + padding
  const top = Math.min(...bounds.map((item) => item.top)) - padding
  let bottom = Math.max(...bounds.map((item) => item.bottom)) + padding

  const backgroundContent = exportBackground
    ? `<image href="${escapeXml(exportBackground.dataUrl)}" x="${exportBackground.x}" y="${exportBackground.y}" width="${exportBackground.width}" height="${exportBackground.height}" opacity="${exportBackground.opacity}" transform="rotate(${exportBackground.rotation ?? 0} ${exportBackground.x + exportBackground.width / 2} ${exportBackground.y + exportBackground.height / 2})" preserveAspectRatio="none"/>`
    : ''
  const content = elements
    .map((element) => {
      const geometry = resolvedStitchGeometry(element)
      const scaleX = (element.mirrored ? -1 : 1) * geometry.scaleX
      return `<g transform="translate(${element.x} ${element.y}) rotate(${element.rotation}) scale(${scaleX} ${geometry.scaleY})" style="color:${element.color ?? DEFAULT_STITCH_COLOR}">${symbolSvgMarkup(element.symbolId, geometry.spread)}</g>`
    })
    .join('')
  const markerContent = visibleMarkers
    .map((marker) => `<g transform="translate(${marker.x} ${marker.y})"><circle r="5" fill="#c2413b"/><text x="10" y="4" font-family="sans-serif" font-size="13" font-weight="700" fill="#b23833">${marker.number}</text></g>`)
    .join('')

  const legendItems = legendVisible ? usedLegendItems(elements) : []
  let legendContent = ''
  if (legendItems.length) {
    const legendX = right + 18
    const legendY = top + padding
    const legendWidth = 250
    const rowHeight = 30
    const legendHeight = 38 + legendItems.length * rowHeight
    const rows = legendItems.map((symbol, index) => {
      const y = legendY + 48 + index * rowHeight
      const label = symbolName(symbol.id, symbol.name, locale)
      const text = `${symbol.abbreviation ? `${symbol.abbreviation} · ` : ''}${label}`
      return `<g style="color:#202622"><g transform="translate(${legendX + 22} ${y - 4}) scale(0.55)">${symbolSvgMarkup(symbol.id)}</g><text x="${legendX + 48}" y="${y}" font-family="sans-serif" font-size="12" fill="#202622">${escapeXml(text)}</text></g>`
    }).join('')
    legendContent = `<g class="crochet-legend"><rect x="${legendX}" y="${legendY}" width="${legendWidth}" height="${legendHeight}" rx="8" fill="white" stroke="#cbc7be"/><text x="${legendX + 12}" y="${legendY + 23}" font-family="sans-serif" font-size="13" font-weight="700" fill="#202622">${locale === 'ru' ? 'Условные обозначения' : 'Legend'}</text>${rows}</g>`
    right = legendX + legendWidth + padding
    bottom = Math.max(bottom, legendY + legendHeight + padding)
  }

  const width = Math.max(1, right - left)
  const height = Math.max(1, bottom - top)
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}" width="${width}" height="${height}"><rect x="${left}" y="${top}" width="${width}" height="${height}" fill="white"/>${backgroundContent}${content}${markerContent}${legendContent}</svg>`
}

function buildProject(
  title: string,
  elements: StitchElement[],
  guides: Guide[],
  snapping: SnappingSettings,
  rowMarkers: RowMarker[] = [],
  legendVisible = true,
  autosaveDelayMs: AutosaveDelayMs = DEFAULT_AUTOSAVE_DELAY_MS,
  backgroundImage: BackgroundImage | null = null,
  gauge: GaugeSettings = emptyGaugeSettings(),
  rulers: MeasurementRuler[] = [],
): CrochetProject {
  return {
    schemaVersion: CURRENT_PROJECT_SCHEMA_VERSION,
    metadata: { title, updatedAt: new Date().toISOString() },
    elements: normalizeElements(elements),
    guides,
    rowMarkers,
    backgroundImage: backgroundImage ?? undefined,
    gauge,
    rulers,
    settings: {
      snapping,
      legend: { visible: legendVisible },
      autosave: { delayMs: autosaveDelayMs },
    },
  }
}

function initialLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE
  const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY)
  return stored === 'ru' || stored === 'en' ? stored : DEFAULT_LOCALE
}

function isEditingTarget(target: EventTarget | null) {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  )
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids)]
}

function sameOrder(left: StitchElement[], right: StitchElement[]) {
  return (
    left.length === right.length &&
    left.every((element, index) => element.id === right[index]?.id)
  )
}

function App() {
  const svgRef = useRef<SVGSVGElement>(null)
  const loadInputRef = useRef<HTMLInputElement>(null)
  const printPanelRef = useRef<HTMLDetailsElement>(null)
  const snappingPanelRef = useRef<HTMLDetailsElement>(null)
  const gaugePanelRef = useRef<HTMLDetailsElement>(null)
  const patternRowsPanelRef = useRef<HTMLDetailsElement>(null)
  const rowMarkersPanelRef = useRef<HTMLDetailsElement>(null)
  const legendPanelRef = useRef<HTMLDetailsElement>(null)
  const helpPanelRef = useRef<HTMLDetailsElement>(null)
  const snapLockRef = useRef<string | null>(null)
  const spacePressedRef = useRef(false)
  const interactionMovedRef = useRef(false)
  const guideManipulationSnapshotRef = useRef<DocumentSnapshot | null>(null)
  const backgroundManipulationSnapshotRef = useRef<DocumentSnapshot | null>(null)
  const rowMarkerManipulationSnapshotRef = useRef<DocumentSnapshot | null>(null)
  const clipboardRef = useRef<StitchElement[]>([])
  const pasteSerialRef = useRef(1)
  const duplicateSeriesRef = useRef<{ previous: StitchElement[]; currentIds: string[] } | null>(null)
  const duplicateKeyDownRef = useRef(false)
  const autosaveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const autosaveTimerRef = useRef<number | null>(null)
  const autosaveRevisionRef = useRef(0)
  const autosaveSettingsWriteRef = useRef<AutosaveDelayMs | null>(null)
  const persistenceBlockedRef = useRef(false)

  const [locale, setLocale] = useState<Locale>(initialLocale)
  const t = UI[locale]
  const [activeProjectId, setActiveProjectIdState] = useState(getActiveProjectId)
  const [projectTitle, setProjectTitle] = useState(UI[DEFAULT_LOCALE].projectTitle)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [elements, setElements] = useState<StitchElement[]>([])
  const [guides, setGuides] = useState<Guide[]>([])
  const [rowMarkers, setRowMarkers] = useState<RowMarker[]>([])
  const [gauge, setGauge] = useState<GaugeSettings>(emptyGaugeSettings)
  const [rulers, setRulers] = useState<MeasurementRuler[]>([])
  const [backgroundImage, setBackgroundImage] = useState<BackgroundImage | null>(null)
  const [backgroundSelected, setBackgroundSelected] = useState(false)
  const [legendVisible, setLegendVisible] = useState(true)
  const [autosaveDelayMs, setAutosaveDelayMs] = useState<AutosaveDelayMs>(DEFAULT_AUTOSAVE_DELAY_MS)
  const [history, setHistory] = useState<HistoryState>(emptyHistory<DocumentSnapshot>())
  const [tool, setTool] = useState<WorkbenchTool>({ type: 'select' })
  const [workbenchQuery, setWorkbenchQuery] = useState('')
  const [favorites, setFavorites] = useState<FavoriteElementKey[]>(loadFavorites)
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('options')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null)
  const [selectedRowMarkerId, setSelectedRowMarkerId] = useState<string | null>(null)
  const [selectedRulerId, setSelectedRulerId] = useState<string | null>(null)
  const [selectedTopologyParentId, setSelectedTopologyParentId] = useState<string | null>(null)
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT)
  const [snapping, setSnapping] = useState<SnappingSettings>(DEFAULT_SNAPPING)
  const [preview, setPreview] = useState<StitchElement | null>(null)
  const [snapTarget, setSnapTarget] = useState<SnapCandidate | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [marquee, setMarquee] = useState<MarqueeState | null>(null)
  const [lasso, setLasso] = useState<LassoState | null>(null)
  const [rotate, setRotate] = useState<RotateState | null>(null)
  const [pan, setPan] = useState<PanState | null>(null)
  const [rulerDraft, setRulerDraft] = useState<RulerDraftState | null>(null)
  const [rulerDrag, setRulerDrag] = useState<RulerDragState | null>(null)
  const [mirrorAxis, setMirrorAxis] = useState<MirrorAxisState | null>(null)
  const [status, setStatus] = useState<string>(UI[DEFAULT_LOCALE].ready)
  const [hydrated, setHydrated] = useState(false)
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('loading')

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    document.documentElement.lang = locale
    if (hydrated) setStatus(UI[locale].ready)
  }, [hydrated, locale])

  useEffect(() => saveFavorites(favorites), [favorites])

  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      try {
        const saved = await loadAutosave()
        if (cancelled) return
        if (saved) {
          const project = normalizeProject(saved, DEFAULT_SNAPPING)
          persistenceBlockedRef.current = false
          setProjectTitle(project.metadata.title)
          setElements(reconcileLinkedElements(project.elements, project.guides ?? []))
          setGuides(project.guides ?? [])
          setRowMarkers(project.rowMarkers ?? [])
          setGauge(project.gauge ?? emptyGaugeSettings())
          setRulers(project.rulers ?? [])
          setBackgroundImage(project.backgroundImage ?? null)
          setLegendVisible(project.settings.legend?.visible ?? true)
          setAutosaveDelayMs(project.settings.autosave?.delayMs ?? DEFAULT_AUTOSAVE_DELAY_MS)
          setSnapping(project.settings.snapping)
          setStatus(UI[locale].autosaveRestored)
        } else {
          const initial = buildProject(UI[locale].projectTitle, [], [], DEFAULT_SNAPPING)
          await saveAutosave(initial)
          persistenceBlockedRef.current = false
          setProjectTitle(initial.metadata.title)
        }
        setAutosaveState('saved')
      } catch {
        if (!cancelled) {
          persistenceBlockedRef.current = true
          setAutosaveState('error')
        }
      } finally {
        if (!cancelled) setHydrated(true)
      }
    }

    void restore()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    if (persistenceBlockedRef.current) {
      setAutosaveState('error')
      return
    }
    if (autosaveSettingsWriteRef.current === autosaveDelayMs) {
      autosaveSettingsWriteRef.current = null
      return
    }
    if (autosaveDelayMs === 0) {
      autosaveRevisionRef.current += 1
      setAutosaveState('off')
      return
    }

    const revision = ++autosaveRevisionRef.current
    setAutosaveState('saving')
    autosaveTimerRef.current = window.setTimeout(() => {
      autosaveTimerRef.current = null
      const project = buildProject(projectTitle, elements, guides, snapping, rowMarkers, legendVisible, autosaveDelayMs, backgroundImage, gauge, rulers)
      const task = autosaveQueueRef.current
        .catch(() => undefined)
        .then(() => saveLocalProject(activeProjectId, project))
      autosaveQueueRef.current = task
      void task
        .then(() => {
          if (autosaveRevisionRef.current === revision) setAutosaveState('saved')
        })
        .catch(() => {
          if (autosaveRevisionRef.current === revision) setAutosaveState('error')
        })
    }, autosaveDelayMs)

    return () => {
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current)
        autosaveTimerRef.current = null
      }
    }
  }, [activeProjectId, autosaveDelayMs, backgroundImage, elements, gauge, guides, hydrated, legendVisible, projectTitle, rowMarkers, rulers, snapping])

  useEffect(() => {
    if (!hydrated) return
    setElements((current) => reconcileLinkedElements(current, guides))
  }, [guides, hydrated])

  const primaryId = selectedIds.at(-1) ?? null
  const selectedElement = useMemo(
    () =>
      selectedIds.length === 1
        ? elements.find((element) => element.id === primaryId) ?? null
        : null,
    [elements, primaryId, selectedIds.length],
  )
  const selectedGuide = useMemo(
    () => guides.find((guide) => guide.id === selectedGuideId) ?? null,
    [guides, selectedGuideId],
  )
  const selectedRowMarker = useMemo(
    () => rowMarkers.find((marker) => marker.id === selectedRowMarkerId) ?? null,
    [rowMarkers, selectedRowMarkerId],
  )
  const selectedRuler = useMemo(
    () => rulers.find((ruler) => ruler.id === selectedRulerId) ?? null,
    [rulers, selectedRulerId],
  )
  useEffect(() => {
    if (selectedRulerId && !selectedRuler) setSelectedRulerId(null)
  }, [selectedRuler, selectedRulerId])
  const nextRowNumber = useMemo(() => nextRowMarkerNumber(rowMarkers), [rowMarkers])
  const selectedParametricRow = useMemo(
    () => parametricRowFromSelection(elements, selectedIds),
    [elements, selectedIds],
  )
  const selectedParametricRowId = selectedParametricRow?.id ?? null
  useEffect(() => {
    setSelectedTopologyParentId(null)
  }, [selectedParametricRowId])
  const selectedParametricGuide = useMemo(
    () => selectedParametricRow
      ? guides.find((guide) => guide.id === selectedParametricRow.guideId) ?? null
      : null,
    [guides, selectedParametricRow],
  )
  const selectedParametricParentCount = useMemo(() => {
    const parentRowId = selectedParametricRow?.parentRowId
    if (!parentRowId) return undefined
    const parents = rowElements(elements, parentRowId)
    const count = rowConstructionTopologyParents(
      parents,
      selectedParametricRow.construction,
    ).length
    return count || undefined
  }, [elements, selectedParametricRow])
  const visibleElements = useMemo(() => elements.filter(isElementVisible), [elements])
  const outputSvg = useMemo(
    () => serializeSvg(visibleElements, rowMarkers, backgroundImage, legendVisible, locale, t.emptySvg),
    [backgroundImage, legendVisible, locale, rowMarkers, t.emptySvg, visibleElements],
  )
  const outputBounds = useMemo(() => parseSvgViewBox(outputSvg), [outputSvg])
  const outputLegendBounds = useMemo(() => parseLegendPrintBounds(outputSvg), [outputSvg])
  const lockedSelectedCount = useMemo(() => elements.filter(
    (element) => selectedIds.includes(element.id) && isElementLocked(element),
  ).length, [elements, selectedIds])

  const localPoint = useCallback((clientX: number, clientY: number): Point => {
    const rect = svgRef.current?.getBoundingClientRect()
    return { x: clientX - (rect?.left ?? 0), y: clientY - (rect?.top ?? 0) }
  }, [])
  const toDocumentPoint = useCallback(
    (screen: Point) => screenToDocument(screen, viewport),
    [viewport],
  )
  const clientToDocument = useCallback(
    (clientX: number, clientY: number) => toDocumentPoint(localPoint(clientX, clientY)),
    [localPoint, toDocumentPoint],
  )

  const currentSnapshot = useCallback(
    (): DocumentSnapshot => ({ elements, guides, rowMarkers, gauge, rulers, backgroundImage, legendVisible, snapping, projectTitle }),
    [backgroundImage, elements, gauge, guides, legendVisible, projectTitle, rowMarkers, rulers, snapping],
  )
  const applySnapshot = useCallback((snapshot: DocumentSnapshot) => {
    setElements(snapshot.elements)
    setGuides(snapshot.guides)
    setRowMarkers(snapshot.rowMarkers)
    setGauge(snapshot.gauge)
    setRulers(snapshot.rulers)
    setBackgroundImage(snapshot.backgroundImage)
    setLegendVisible(snapshot.legendVisible)
    setSnapping(snapshot.snapping)
    setProjectTitle(snapshot.projectTitle)
  }, [])
  const recordSnapshot = useCallback((before: DocumentSnapshot) => {
    setHistory((current) => pushHistory(current, before))
  }, [])
  const commitElements = useCallback(
    (next: StitchElement[]) => {
      recordSnapshot(currentSnapshot())
      setElements(next)
    },
    [currentSnapshot, recordSnapshot],
  )
  const commitGuides = useCallback(
    (next: Guide[]) => {
      recordSnapshot(currentSnapshot())
      setGuides(next)
    },
    [currentSnapshot, recordSnapshot],
  )
  const commitRowMarkers = useCallback(
    (next: RowMarker[]) => {
      recordSnapshot(currentSnapshot())
      setRowMarkers(next)
    },
    [currentSnapshot, recordSnapshot],
  )
  const commitGauge = useCallback((next: GaugeSettings) => {
    recordSnapshot(currentSnapshot())
    setGauge(next)
  }, [currentSnapshot, recordSnapshot])
  const commitRulers = useCallback((next: MeasurementRuler[]) => {
    recordSnapshot(currentSnapshot())
    setRulers(next)
  }, [currentSnapshot, recordSnapshot])
  const commitBackgroundImage = useCallback((next: BackgroundImage | null) => {
    recordSnapshot(currentSnapshot())
    setBackgroundImage(next)
  }, [currentSnapshot, recordSnapshot])
  const commitLegendVisible = useCallback((next: boolean) => {
    recordSnapshot(currentSnapshot())
    setLegendVisible(next)
  }, [currentSnapshot, recordSnapshot])
  const commitSnapping = useCallback((next: SnappingSettings) => {
    recordSnapshot(currentSnapshot())
    setSnapping(next)
  }, [currentSnapshot, recordSnapshot])

  const cancelPendingAutosave = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
  }, [])
  const enqueueProjectSave = useCallback((projectId: string, project: CrochetProject) => {
    const task = autosaveQueueRef.current
      .catch(() => undefined)
      .then(() => saveLocalProject(projectId, project))
    autosaveQueueRef.current = task
    return task
  }, [])
  const flushCurrentProject = useCallback(async () => {
    if (!hydrated || persistenceBlockedRef.current) return
    cancelPendingAutosave()
    const revision = ++autosaveRevisionRef.current
    const project = buildProject(projectTitle, elements, guides, snapping, rowMarkers, legendVisible, autosaveDelayMs, backgroundImage, gauge, rulers)
    setAutosaveState('saving')
    try {
      await enqueueProjectSave(activeProjectId, project)
      if (autosaveRevisionRef.current === revision) setAutosaveState(autosaveDelayMs === 0 ? 'off' : 'saved')
    } catch {
      if (autosaveRevisionRef.current === revision) setAutosaveState('error')
      throw new Error(locale === 'ru' ? 'Не удалось сохранить текущий проект' : 'Could not save current project')
    }
  }, [activeProjectId, autosaveDelayMs, backgroundImage, cancelPendingAutosave, elements, enqueueProjectSave, gauge, guides, hydrated, legendVisible, locale, projectTitle, rowMarkers, rulers, snapping])

  useEffect(() => {
    setRulers((current) => reconcileRulerElementReferences(current, elements))
  }, [elements])

  const clearElementSelection = useCallback(() => setSelectedIds([]), [])

  useEffect(() => {
    if (!backgroundImage || backgroundImage.visible === false || selectedIds.length || selectedGuideId || selectedRowMarkerId || selectedRulerId) {
      setBackgroundSelected(false)
    }
  }, [backgroundImage, selectedGuideId, selectedIds.length, selectedRowMarkerId, selectedRulerId])
  useEffect(() => setBackgroundSelected(false), [activeProjectId])

  const selectBackground = useCallback(() => {
    clearElementSelection()
    setSelectedGuideId(null)
    setSelectedRowMarkerId(null)
    setSelectedRulerId(null)
    setRulerDraft(null)
    setTool({ type: 'select' })
    setPreview(null)
    setSnapTarget(null)
    setBackgroundSelected(true)
  }, [clearElementSelection])
  const handleBackgroundManipulationStart = useCallback(() => {
    backgroundManipulationSnapshotRef.current = currentSnapshot()
    setPreview(null)
    setSnapTarget(null)
  }, [currentSnapshot])
  const handleBackgroundManipulationPreview = useCallback((next: BackgroundImage) => {
    setBackgroundImage(next)
  }, [])
  const handleBackgroundManipulationEnd = useCallback((moved: boolean, cancelled: boolean) => {
    const before = backgroundManipulationSnapshotRef.current
    backgroundManipulationSnapshotRef.current = null
    if (!before) return
    if (cancelled) {
      setBackgroundImage(before.backgroundImage)
      return
    }
    if (moved) {
      recordSnapshot(before)
      setStatus(locale === 'ru' ? 'Фоновое изображение изменено' : 'Background image transformed')
    }
  }, [locale, recordSnapshot])

  const undo = useCallback(() => {
    const step = undoHistory(history, currentSnapshot())
    if (!step) return
    setHistory(step.history)
    applySnapshot(step.value)
    clearElementSelection()
    setSelectedGuideId(null)
    setSelectedRowMarkerId(null)
    setSelectedRulerId(null)
    setBackgroundSelected(false)
    setStatus(t.statusUndo)
  }, [applySnapshot, clearElementSelection, currentSnapshot, history, t.statusUndo])

  const redo = useCallback(() => {
    const step = redoHistory(history, currentSnapshot())
    if (!step) return
    setHistory(step.history)
    applySnapshot(step.value)
    clearElementSelection()
    setSelectedGuideId(null)
    setSelectedRowMarkerId(null)
    setSelectedRulerId(null)
    setBackgroundSelected(false)
    setStatus(t.statusRedo)
  }, [applySnapshot, clearElementSelection, currentSnapshot, history, t.statusRedo])

  const unlockedSelectedIds = useCallback(() => {
    const selected = new Set(selectedIds)
    return elements
      .filter((element) => selected.has(element.id) && !isElementLocked(element))
      .map((element) => element.id)
  }, [elements, selectedIds])

  const deleteSelected = useCallback(() => {
    if (selectedIds.length) {
      const deletable = new Set(semanticSelectionIds(elements, unlockedSelectedIds(), { expandGroups: false, expandRows: true }))
      if (!deletable.size) return
      commitElements(reconcileParametricRows(
        elements.filter((element) => !deletable.has(element.id)),
        guides,
        createId,
      ))
      setSelectedIds((current) => current.filter((id) => !deletable.has(id)))
      setStatus(deletable.size > 1 ? t.elementsDeleted : t.elementDeleted)
      return
    }
    if (selectedRulerId) {
      commitRulers(rulers.filter((ruler) => ruler.id !== selectedRulerId))
      setSelectedRulerId(null)
      setStatus(locale === 'ru' ? 'Линейка удалена' : 'Ruler deleted')
      return
    }
    if (selectedRowMarkerId) {
      const marker = rowMarkers.find((item) => item.id === selectedRowMarkerId)
      if (!marker || isRowMarkerLocked(marker)) return
      commitRowMarkers(deleteRowMarkerAndRenumber(rowMarkers, selectedRowMarkerId))
      setSelectedRowMarkerId(null)
      setStatus(locale === 'ru' ? 'Номер ряда удалён' : 'Ruler deleted')
      return
    }
    if (selectedGuideId) {
      const guide = guides.find((item) => item.id === selectedGuideId)
      if (!guide || guide.locked === true) return
      commitGuides(guides.filter((item) => item.id !== selectedGuideId))
      setSelectedGuideId(null)
      setStatus(t.guideDeleted)
    }
  }, [
    commitElements,
    commitGuides,
    commitRowMarkers,
    commitRulers,
    elements,
    guides,
    locale,
    rowMarkers,
    rulers,
    selectedGuideId,
    selectedRowMarkerId,
    selectedRulerId,
    selectedIds.length,
    t.elementDeleted,
    t.elementsDeleted,
    t.guideDeleted,
    unlockedSelectedIds,
  ])

  const productivitySelectionIds = useCallback(() => {
    const unlocked = new Set(unlockedSelectedIds())
    return elements
      .filter((element) => unlocked.has(element.id) && !element.parametricRow)
      .map((element) => element.id)
  }, [elements, unlockedSelectedIds])

  const copySelection = useCallback(() => {
    const copyIds = new Set(unlockedSelectedIds())
    if (!copyIds.size) return
    clipboardRef.current = elements
      .filter((element) => copyIds.has(element.id))
      .map((element) => ({ ...element }))
    pasteSerialRef.current = 1
    setStatus(`${t.copied}: ${clipboardRef.current.length}`)
  }, [elements, t.copied, unlockedSelectedIds])

  const pasteSelection = useCallback(() => {
    if (!clipboardRef.current.length) return
    const offset = DUPLICATE_OFFSET * pasteSerialRef.current
    pasteSerialRef.current += 1
    const pasted = cloneSelectionWithOffset(
      clipboardRef.current,
      clipboardRef.current.map((element) => element.id),
      offset,
      offset,
      createId,
    )
    if (!pasted.length) return
    duplicateSeriesRef.current = null
    commitElements([...elements, ...pasted])
    setSelectedIds(pasted.map((element) => element.id))
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setStatus(`${t.pasted}: ${pasted.length}`)
  }, [commitElements, elements, t.pasted])

  const duplicateSelection = useCallback(() => {
    const selected = new Set(unlockedSelectedIds())
    if (!selected.size) return

    const series = duplicateSeriesRef.current
    const repeatSeries = Boolean(
      series &&
      selected.size === series.currentIds.length &&
      series.currentIds.every((id) => selected.has(id)),
    )
    let duplicated: StitchElement[] = []
    let previousForNext: StitchElement[] = []

    if (series && repeatSeries) {
      const current = series.currentIds
        .map((id) => elements.find((element) => element.id === id))
        .filter((element): element is StitchElement => Boolean(element))
      if (current.length === series.previous.length) {
        duplicated = cloneWithRepeatedDelta(series.previous, current, createId)
        previousForNext = current.map((element) => ({ ...element }))
      }
    }

    if (!duplicated.length) {
      const duplicateIds = selected
      if (!duplicateIds.size) return
      const current = elements.filter((element) => duplicateIds.has(element.id))
      if (!current.length) return
      previousForNext = current.map((element) => ({ ...element }))
      duplicated = cloneSelectionWithOffset(
        elements,
        [...duplicateIds],
        DUPLICATE_OFFSET,
        DUPLICATE_OFFSET,
        createId,
      )
    }
    if (!duplicated.length) return

    duplicateSeriesRef.current = {
      previous: previousForNext,
      currentIds: duplicated.map((element) => element.id),
    }
    commitElements([...elements, ...duplicated])
    setSelectedIds(duplicated.map((element) => element.id))
    setSelectedGuideId(null)
    setStatus(`${t.duplicated}: ${duplicated.length}`)
  }, [commitElements, elements, t.duplicated, unlockedSelectedIds])

  const groupSelection = useCallback(() => {
    const ids = productivitySelectionIds()
    if (ids.length < 2) return
    duplicateSeriesRef.current = null
    commitElements(groupElements(elements, ids, createId()))
    setSelectedIds(ids)
    setStatus(locale === 'ru' ? `Группа создана: ${ids.length}` : `Group created: ${ids.length}`)
  }, [commitElements, elements, locale, productivitySelectionIds])

  const ungroupSelection = useCallback(() => {
    const ids = productivitySelectionIds()
    if (!ids.length) return
    duplicateSeriesRef.current = null
    commitElements(ungroupElements(elements, ids))
    setSelectedIds(ids)
    setStatus(locale === 'ru' ? 'Группа снята' : 'Group removed')
  }, [commitElements, elements, locale, productivitySelectionIds])

  const mirrorSelection = useCallback((axis: MirrorAxis) => {
    const ids = productivitySelectionIds()
    if (!ids.length) return
    duplicateSeriesRef.current = null
    commitElements(mirrorElements(elements, ids, axis))
    setSelectedIds(ids)
    setStatus(locale === 'ru' ? `Отражено относительно центра: ${ids.length}` : `Flipped around selection center: ${ids.length}`)
  }, [commitElements, elements, locale, productivitySelectionIds])

  const mirrorCopySelection = useCallback((axis: MirrorAxis) => {
    const ids = productivitySelectionIds()
    if (!ids.length) return
    const created = createMirroredCopy(elements, ids, axis, DUPLICATE_OFFSET, createId)
    if (!created.length) return
    duplicateSeriesRef.current = null
    commitElements([...elements, ...created])
    setSelectedIds(created.map((element) => element.id))
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setStatus(locale === 'ru' ? `Создана зеркальная копия: ${created.length}` : `Mirrored copy created: ${created.length}`)
  }, [commitElements, elements, locale, productivitySelectionIds])

  const directionalMirrorSelection = useCallback((direction: MirrorDirection, copy: boolean) => {
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

  const repeatProductivitySelection = useCallback((options: RepeatOptions) => {
    const ids = productivitySelectionIds()
    if (!ids.length) return
    const created = repeatSelection(elements, ids, options, createId)
    if (!created.length) {
      setStatus(locale === 'ru' ? 'Не хватило места на направляющей' : 'No room left on the guide')
      return
    }
    duplicateSeriesRef.current = null
    commitElements([...elements, ...created])
    setSelectedIds(created.map((element) => element.id))
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setStatus(locale === 'ru' ? `Создано элементов: ${created.length}` : `Created elements: ${created.length}`)
  }, [commitElements, elements, locale, productivitySelectionIds])

  const selectAll = useCallback(() => {
    const selectable = elements.filter((element) => isElementVisible(element))
    const ids = semanticSelectionIds(elements, selectable.map((element) => element.id), { visibleSeedsOnly: true })
    if (!ids.length) return
    setSelectedIds(ids)
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setStatus(`${t.selectedCount}: ${ids.length}`)
  }, [elements, t.selectedCount])

  const handleLayerSelect = useCallback((id: string, additive: boolean) => {
    const element = elements.find((item) => item.id === id)
    if (!element) return
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setSelectedIds((current) => {
      const targetIds = semanticSelectionIds(elements, [id])
      if (!additive) return targetIds
      const targetSet = new Set(targetIds)
      const allSelected = targetIds.every((item) => current.includes(item))
      return allSelected
        ? current.filter((item) => !targetSet.has(item))
        : uniqueIds([...current, ...targetIds])
    })
    if (isElementLocked(element)) setStatus(locale === 'ru' ? 'Заблокированный элемент выбран' : 'Locked stitch selected')
  }, [elements, locale])

  const toggleElementVisible = useCallback((id: string) => {
    const element = elements.find((item) => item.id === id)
    if (!element) return
    commitElements(
      elements.map((item) =>
        item.id === id ? { ...item, visible: !isElementVisible(item) } : item,
      ),
    )
    setStatus(t.visibilityChanged)
  }, [commitElements, elements, t.visibilityChanged])

  const toggleElementLocked = useCallback((id: string) => {
    const element = elements.find((item) => item.id === id)
    if (!element) return
    const lockIds = new Set(semanticLockIds(elements, id))
    const nextLocked = !isElementLocked(element)
    commitElements(elements.map((item) => lockIds.has(item.id) ? { ...item, locked: nextLocked } : item))
    setStatus(t.lockChanged)
  }, [commitElements, elements, t.lockChanged])

  const reorderSelection = useCallback((
    operation: (items: StitchElement[], ids: string[]) => StitchElement[],
  ) => {
    const ids = unlockedSelectedIds()
    if (!ids.length) return
    const next = operation(elements, ids)
    if (sameOrder(elements, next)) return
    commitElements(next)
    setStatus(t.layerChanged)
  }, [commitElements, elements, t.layerChanged, unlockedSelectedIds])

  const bringSelectionForward = useCallback(
    () => reorderSelection(bringElementsForward),
    [reorderSelection],
  )
  const sendSelectionBackward = useCallback(
    () => reorderSelection(sendElementsBackward),
    [reorderSelection],
  )
  const bringSelectionToFront = useCallback(
    () => reorderSelection(bringElementsToFront),
    [reorderSelection],
  )
  const sendSelectionToBack = useCallback(
    () => reorderSelection(sendElementsToBack),
    [reorderSelection],
  )

  const nudgeSelection = useCallback((dx: number, dy: number) => {
    if (selectedRowMarkerId) {
      const marker = rowMarkers.find((item) => item.id === selectedRowMarkerId)
      if (!marker || isRowMarkerLocked(marker)) return
      commitRowMarkers(rowMarkers.map((item) => item.id === marker.id ? { ...item, x: item.x + dx, y: item.y + dy } : item))
      setStatus(locale === 'ru' ? `Номер ряда сдвинут: ${dx}, ${dy}` : `Row number nudged: ${dx}, ${dy}`)
      return
    }
    const selected = new Set(unlockedSelectedIds())
    if (!selected.size) return
    const movable = elements.some(
      (element) => selected.has(element.id) && !element.parametricRow && !isElementLocked(element),
    )
    if (!movable) return
    duplicateSeriesRef.current = null
    commitElements(elements.map((element) => {
      if (!selected.has(element.id) || element.parametricRow || isElementLocked(element)) return element
      const attachment = element.guideAttachment
      const guide = attachment ? guides.find((item) => item.id === attachment.guideId) : undefined
      if (attachment && guide && isPathGuide(guide)) {
        return moveAttachedElement(element, guide, { x: element.x + dx, y: element.y + dy })
      }
      return { ...element, x: element.x + dx, y: element.y + dy }
    }))
    setStatus(locale === 'ru' ? `Сдвиг: ${dx}, ${dy}` : `Nudged: ${dx}, ${dy}`)
  }, [commitElements, commitRowMarkers, elements, guides, locale, rowMarkers, selectedRowMarkerId, unlockedSelectedIds])

  const zoomCanvas = useCallback((factor: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const screen = { x: rect.width / 2, y: rect.height / 2 }
    setViewport((current) => {
      const docBefore = screenToDocument(screen, current)
      const zoom = clamp(current.zoom * factor, 0.1, 5)
      return {
        zoom,
        panX: screen.x - docBefore.x * zoom,
        panY: screen.y - docBefore.y * zoom,
      }
    })
  }, [])

  const setCanvasZoom = useCallback((targetZoom: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const screen = { x: rect.width / 2, y: rect.height / 2 }
    setViewport((current) => {
      const docBefore = screenToDocument(screen, current)
      const zoom = clamp(targetZoom, 0.1, 5)
      return {
        zoom,
        panX: screen.x - docBefore.x * zoom,
        panY: screen.y - docBefore.y * zoom,
      }
    })
  }, [])

  const fitAll = useCallback(() => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const next = viewportForElements(visibleElements, SYMBOL_SIZES, rect.width, rect.height)
    if (next) setViewport(next)
  }, [visibleElements])

  const fitSelection = useCallback(() => {
    if (!selectedIds.length) return
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const next = viewportForElements(visibleElements, SYMBOL_SIZES, rect.width, rect.height, selectedIds)
    if (next) setViewport(next)
  }, [selectedIds, visibleElements])

  const addGaugeProfile = useCallback(() => {
    const id = createId()
    const profile: GaugeProfile = {
      id,
      name: locale === 'ru' ? `Образец ${gauge.profiles.length + 1}` : `Swatch ${gauge.profiles.length + 1}`,
      symbolId: 'single',
      stitchCount: 20,
      rowCount: 20,
      widthCm: 10,
      heightCm: 10,
    }
    commitGauge({ profiles: [...gauge.profiles, profile], activeProfileId: id })
  }, [commitGauge, gauge.profiles, locale])

  const updateGaugeProfile = useCallback((id: string, patch: Partial<GaugeProfile>) => {
    commitGauge({
      ...gauge,
      profiles: gauge.profiles.map((profile) => profile.id === id ? { ...profile, ...patch } : profile),
    })
  }, [commitGauge, gauge])

  const setActiveGaugeProfile = useCallback((id: string) => {
    if (!gauge.profiles.some((profile) => profile.id === id)) return
    commitGauge({ ...gauge, activeProfileId: id })
  }, [commitGauge, gauge])

  const deleteGaugeProfile = useCallback((id: string) => {
    const nextProfiles = gauge.profiles.filter((profile) => profile.id !== id)
    const nextActive = gauge.activeProfileId === id ? nextProfiles[0]?.id : gauge.activeProfileId
    recordSnapshot(currentSnapshot())
    setGauge({ profiles: nextProfiles, activeProfileId: nextActive })
    setRulers(rulers.map((ruler) => ruler.profileId === id ? { ...ruler, profileId: undefined } : ruler))
  }, [currentSnapshot, gauge.activeProfileId, gauge.profiles, recordSnapshot, rulers])

  const updateRuler = useCallback((id: string, patch: Partial<MeasurementRuler>) => {
    commitRulers(rulers.map((ruler) => ruler.id === id ? { ...ruler, ...patch } : ruler))
  }, [commitRulers, rulers])

  const deleteRuler = useCallback((id: string) => {
    commitRulers(rulers.filter((ruler) => ruler.id !== id))
    if (selectedRulerId === id) setSelectedRulerId(null)
  }, [commitRulers, rulers, selectedRulerId])

  const selectRuler = useCallback((id: string) => {
    if (!rulers.some((ruler) => ruler.id === id)) return
    setSelectedRulerId(id)
    clearElementSelection()
    setSelectedGuideId(null)
    setSelectedRowMarkerId(null)
    setTool({ type: 'select' })
    setRulerDraft(null)
  }, [clearElementSelection, rulers])

  const toggleRulerTool = useCallback(() => {
    const active = tool.type === 'ruler'
    setTool(active ? { type: 'select' } : { type: 'ruler' })
    setRulerDraft(null)
    setRulerDrag(null)
    setPreview(null)
    setSnapTarget(null)
    if (!active) {
      clearElementSelection()
      setSelectedGuideId(null)
      setSelectedRowMarkerId(null)
      setSelectedRulerId(null)
      setStatus(locale === 'ru' ? 'Укажите начало линейки' : 'Pick ruler start')
    }
  }, [clearElementSelection, locale, tool.type])

  const handleRulerHandlePointerDown = useCallback((
    event: ReactPointerEvent<SVGCircleElement>,
    ruler: MeasurementRuler,
    endpoint: 'start' | 'end',
  ) => {
    if (event.button !== 0 || spacePressedRef.current) return
    event.preventDefault()
    event.stopPropagation()
    setSelectedRulerId(ruler.id)
    clearElementSelection()
    setSelectedGuideId(null)
    setSelectedRowMarkerId(null)
    setTool({ type: 'select' })
    setRulerDraft(null)
    setRulerDrag({
      pointerId: event.pointerId,
      rulerId: ruler.id,
      endpoint,
      startSnapshot: currentSnapshot(),
    })
    interactionMovedRef.current = false
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [clearElementSelection, currentSnapshot])

  const toggleSnapping = useCallback(() => {
    const enabled = !snapping.enabled
    commitSnapping({ ...snapping, enabled })
    setSnapTarget(null)
    snapLockRef.current = null
    setStatus(locale === 'ru'
      ? enabled ? 'Привязка включена' : 'Свободное размещение: привязка выключена'
      : enabled ? 'Snapping enabled' : 'Free placement: snapping disabled')
  }, [commitSnapping, locale, snapping])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const editing = isEditingTarget(event.target)

      if (!editing && event.code === 'Space') {
        spacePressedRef.current = true
        svgRef.current?.classList.add('space-pan')
        event.preventDefault()
      }

      if (!editing && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault()
        deleteSelected()
      }

      if (!editing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        const nudge = event.shiftKey ? 10 : 1
        if (event.key === 'ArrowLeft') {
          event.preventDefault()
          nudgeSelection(-nudge, 0)
        } else if (event.key === 'ArrowRight') {
          event.preventDefault()
          nudgeSelection(nudge, 0)
        } else if (event.key === 'ArrowUp') {
          event.preventDefault()
          nudgeSelection(0, -nudge)
        } else if (event.key === 'ArrowDown') {
          event.preventDefault()
          nudgeSelection(0, nudge)
        } else if (event.key === '+' || event.key === '=') {
          event.preventDefault()
          zoomCanvas(1.2)
        } else if (event.key === '-') {
          event.preventDefault()
          zoomCanvas(1 / 1.2)
        } else if (event.key === '0') {
          event.preventDefault()
          setCanvasZoom(1)
        } else if (event.key.toLowerCase() === 'f') {
          event.preventDefault()
          if (event.shiftKey) fitSelection()
          else fitAll()
        } else if (event.key.toLowerCase() === 's') {
          event.preventDefault()
          toggleSnapping()
        } else if (event.key.toLowerCase() === 'r') {
          event.preventDefault()
          toggleRulerTool()
        } else if (event.key.toLowerCase() === 'l') {
          event.preventDefault()
          setTool((current) => current.type === 'lasso' ? { type: 'select' } : { type: 'lasso' })
          setLasso(null)
          setPreview(null)
          setSnapTarget(null)
          setSelectedGuideId(null)
          setSelectedRowMarkerId(null)
        } else if (event.key.toLowerCase() === 'h') {
          event.preventDefault()
          setTool((current) => current.type === 'pan' ? { type: 'select' } : { type: 'pan' })
          setLasso(null)
          setPreview(null)
          setSnapTarget(null)
          setRulerDraft(null)
        }
      }

      if (!editing && (event.metaKey || event.ctrlKey)) {
        const key = event.key.toLowerCase()
        if (key === 'z') {
          event.preventDefault()
          if (event.shiftKey) redo()
          else undo()
        } else if (key === 'c') {
          event.preventDefault()
          copySelection()
        } else if (key === 'v') {
          event.preventDefault()
          pasteSelection()
        } else if (key === 'd') {
          event.preventDefault()
          if (!event.repeat && !duplicateKeyDownRef.current) {
            duplicateKeyDownRef.current = true
            duplicateSelection()
          }
        } else if (key === 'a') {
          event.preventDefault()
          selectAll()
        }
      }

      if (event.key === 'Escape') {
        if (drag) setElements(drag.startSnapshot.elements)
        if (rotate) setElements(rotate.startSnapshot.elements)
        if (rulerDrag) setRulers(rulerDrag.startSnapshot.rulers)
        setTool({ type: 'select' })
        setPreview(null)
        setSnapTarget(null)
        setDrag(null)
        setRotate(null)
        setMarquee(null)
        setLasso(null)
        setRulerDraft(null)
        setRulerDrag(null)
        snapLockRef.current = null
        interactionMovedRef.current = false
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        spacePressedRef.current = false
        svgRef.current?.classList.remove('space-pan')
      }
      if (event.key.toLowerCase() === 'd' || event.key === 'Control' || event.key === 'Meta') {
        duplicateKeyDownRef.current = false
      }
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [
    copySelection,
    deleteSelected,
    drag,
    duplicateSelection,
    fitAll,
    fitSelection,
    nudgeSelection,
    pasteSelection,
    redo,
    rotate,
    rulerDrag,
    selectAll,
    setCanvasZoom,
    toggleRulerTool,
    toggleSnapping,
    undo,
    zoomCanvas,
  ])

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const screen = localPoint(event.clientX, event.clientY)
    const docBefore = toDocumentPoint(screen)
    const factor = Math.exp(-event.deltaY * 0.001)
    const zoom = clamp(viewport.zoom * factor, 0.1, 5)
    setViewport({
      zoom,
      panX: screen.x - docBefore.x * zoom,
      panY: screen.y - docBefore.y * zoom,
    })
  }

  const beginPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    const screen = localPoint(event.clientX, event.clientY)
    event.currentTarget.setPointerCapture(event.pointerId)
    setPan({ pointerId: event.pointerId, startPointer: screen, startViewport: viewport })
    setPreview(null)
    setSnapTarget(null)
  }

  const updatePreview = (documentPoint: Point) => {
    if (tool.type !== 'place' && tool.type !== 'place-chain-bundle') return
    const symbolId = tool.type === 'place' ? tool.symbolId : 'chain'
    const proposed: StitchElement = {
      id: '__preview__',
      symbolId,
      x: documentPoint.x,
      y: documentPoint.y,
      rotation: 0,
      visible: true,
      locked: false,
    }
    const solved = solveSnap(
      proposed,
      visibleElements,
      guides,
      snapping,
      viewport,
      snapLockRef.current,
    )
    snapLockRef.current = solved.candidate?.key ?? null
    setSnapTarget(solved.candidate)
    setPreview({ ...proposed, x: solved.x, y: solved.y, rotation: solved.rotation })
  }

  const handleCanvasPointerDownCapture = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (tool.type !== 'pan' || event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    beginPan(event)
  }

  const handleCanvasPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button === 1 || spacePressedRef.current) {
      event.preventDefault()
      beginPan(event)
      return
    }
    if (event.button !== 0) return
    setBackgroundSelected(false)

    const point = toDocumentPoint(localPoint(event.clientX, event.clientY))
    if (tool.type === 'ruler') {
      const snapped = snapRulerPoint(point, visibleElements, viewport.zoom)
      if (!rulerDraft) {
        setRulerDraft({
          start: snapped.point,
          current: snapped.point,
          startElementId: snapped.elementId,
          currentElementId: snapped.elementId,
        })
        setStatus(locale === 'ru' ? 'Укажите конец линейки' : 'Pick ruler end')
        return
      }
      const ruler: MeasurementRuler = {
        id: createId(),
        start: rulerDraft.start,
        end: snapped.point,
        startElementId: rulerDraft.startElementId,
        endElementId: snapped.elementId,
      }
      commitRulers([...rulers, ruler])
      setSelectedRulerId(ruler.id)
      setRulerDraft(null)
      setTool({ type: 'select' })
      setStatus(locale === 'ru' ? 'Линейка добавлена' : 'Ruler added')
      return
    }
    if (tool.type === 'lasso') {
      event.currentTarget.setPointerCapture(event.pointerId)
      setSelectedGuideId(null)
      setSelectedRowMarkerId(null)
      setLasso({
        pointerId: event.pointerId,
        points: [point],
        baseIds: [...selectedIds],
        mode: event.altKey ? 'subtract' : event.shiftKey ? 'add' : 'replace',
      })
      return
    }
    if (tool.type === 'row-marker') {
      const marker: RowMarker = {
        id: createId(), number: nextRowNumber, x: point.x, y: point.y, visible: true, locked: false,
      }
      commitRowMarkers([...rowMarkers, marker])
      setSelectedRowMarkerId(marker.id)
      clearElementSelection()
      setSelectedGuideId(null)
      setStatus(locale === 'ru' ? `Добавлен номер ряда ${marker.number}` : `Added row number ${marker.number}`)
      return
    }
    if (tool.type === 'place' || tool.type === 'place-chain-bundle') {
      const symbolId = tool.type === 'place' ? tool.symbolId : 'chain'
      const proposed: StitchElement = {
        id: createId(),
        symbolId,
        x: point.x,
        y: point.y,
        rotation: 0,
        visible: true,
        locked: false,
      }
      const solved = solveSnap(
        proposed,
        visibleElements,
        guides,
        snapping,
        viewport,
        snapLockRef.current,
      )
      if (tool.type === 'place-chain-bundle') {
        const placedBundle = createChainBundle(
          { x: solved.x, y: solved.y },
          tool.count,
          solved.rotation,
          createId,
        )
        commitElements([...elements, ...placedBundle])
        setSelectedIds(placedBundle.map((element) => element.id))
        setSelectedGuideId(null)
        setSelectedRowMarkerId(null)
        setStatus(locale === 'ru'
          ? `Добавлено воздушных петель: ${tool.count}`
          : `Placed chain stitches: ${tool.count}`)
        return
      }
      const placed: StitchElement = {
        ...proposed,
        x: solved.x,
        y: solved.y,
        rotation: solved.rotation,
      }
      commitElements([...elements, placed])
      setSelectedIds([placed.id])
      setSelectedGuideId(null)
      setSelectedRowMarkerId(null)
      const definition = SYMBOL_BY_ID.get(placed.symbolId)
      setStatus(`${t.placed}: ${symbolName(placed.symbolId, definition?.name ?? placed.symbolId, locale)}`)
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    setSelectedGuideId(null)
    setSelectedRowMarkerId(null)
    setMarquee({
      pointerId: event.pointerId,
      start: point,
      current: point,
      baseIds: event.shiftKey ? selectedIds : [],
    })
  }

  const handleCanvasPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const screen = localPoint(event.clientX, event.clientY)
    const activePan = pan
    if (activePan?.pointerId === event.pointerId) {
      setViewport({
        ...activePan.startViewport,
        panX: activePan.startViewport.panX + screen.x - activePan.startPointer.x,
        panY: activePan.startViewport.panY + screen.y - activePan.startPointer.y,
      })
      return
    }

    const documentPoint = toDocumentPoint(screen)
    if (rulerDrag?.pointerId === event.pointerId) {
      const snapped = snapRulerPoint(documentPoint, visibleElements, viewport.zoom)
      const original = rulerDrag.startSnapshot.rulers.find((ruler) => ruler.id === rulerDrag.rulerId)
      const originalPoint = original?.[rulerDrag.endpoint]
      if (originalPoint) {
        interactionMovedRef.current = Math.hypot(snapped.point.x - originalPoint.x, snapped.point.y - originalPoint.y) > 0.5
      }
      setRulers((current) => current.map((ruler) => {
        if (ruler.id !== rulerDrag.rulerId) return ruler
        return rulerDrag.endpoint === 'start'
          ? { ...ruler, start: snapped.point, startElementId: snapped.elementId }
          : { ...ruler, end: snapped.point, endElementId: snapped.elementId }
      }))
      return
    }
    if (rotate?.pointerId === event.pointerId) {
      const original = rotate.startSnapshot.elements.find((element) => element.id === rotate.elementId)
      if (!original) return
      const angle = rotationFromPointer(
        rotate.startRotation,
        rotate.startPointerAngle,
        pointerAngle({ x: original.x, y: original.y }, documentPoint),
        event.shiftKey,
      )
      interactionMovedRef.current = Math.abs(angle - rotate.startRotation) > 0.1
      setElements(
        rotate.startSnapshot.elements.map((element) =>
          element.id === rotate.elementId ? { ...element, rotation: angle } : element,
        ),
      )
      return
    }

    if (drag?.pointerId === event.pointerId) {
      const selectedSet = new Set(drag.selectedIds)
      const reference = drag.startSnapshot.elements.find(
        (element) => element.id === drag.referenceId,
      )
      if (!reference) return

      const rawDelta = {
        x: documentPoint.x - drag.startPointer.x,
        y: documentPoint.y - drag.startPointer.y,
      }

      if (drag.selectedIds.length === 1 && reference.guideAttachment) {
        const attachedGuide = guides.find((guide) => guide.id === reference.guideAttachment?.guideId)
        if (attachedGuide && isPathGuide(attachedGuide)) {
          const moved = moveAttachedElement(reference, attachedGuide, {
            x: reference.x + rawDelta.x,
            y: reference.y + rawDelta.y,
          })
          interactionMovedRef.current = Math.hypot(moved.x - reference.x, moved.y - reference.y) > 0.5
          setSnapTarget(null)
          setElements(drag.startSnapshot.elements.map((element) =>
            element.id === reference.id ? moved : element,
          ))
          return
        }
      }

      const proposedReference: StitchElement = {
        ...reference,
        x: reference.x + rawDelta.x,
        y: reference.y + rawDelta.y,
      }
      const snapElements = drag.startSnapshot.elements.filter(
        (element) => !selectedSet.has(element.id) && isElementVisible(element),
      )
      const solved = solveSnap(
        proposedReference,
        snapElements,
        guides,
        snapping,
        viewport,
        snapLockRef.current,
      )
      snapLockRef.current = solved.candidate?.key ?? null
      setSnapTarget(solved.candidate)

      const delta = { x: solved.x - reference.x, y: solved.y - reference.y }
      interactionMovedRef.current = Math.hypot(delta.x, delta.y) > 0.5
      setElements(
        drag.startSnapshot.elements.map((element) => {
          if (!selectedSet.has(element.id) || isElementLocked(element) || element.parametricRow) return element
          const moved = { ...element, x: element.x + delta.x, y: element.y + delta.y }
          return drag.selectedIds.length === 1 && element.id === reference.id
            ? { ...moved, rotation: solved.rotation }
            : moved
        }),
      )
      return
    }

    if (lasso?.pointerId === event.pointerId) {
      const last = lasso.points.at(-1)
      if (!last || Math.hypot(documentPoint.x - last.x, documentPoint.y - last.y) >= 3 / viewport.zoom) {
        setLasso({ ...lasso, points: [...lasso.points, documentPoint] })
      }
      return
    }

    if (marquee?.pointerId === event.pointerId) {
      setMarquee({ ...marquee, current: documentPoint })
      return
    }

    if (tool.type === 'ruler' && rulerDraft) {
      const snapped = snapRulerPoint(documentPoint, visibleElements, viewport.zoom)
      setRulerDraft({ ...rulerDraft, current: snapped.point, currentElementId: snapped.elementId })
      return
    }

    updatePreview(documentPoint)
  }

  const finishPointerInteraction = (event: ReactPointerEvent<SVGSVGElement>, cancelled = false) => {
    if (pan?.pointerId === event.pointerId) {
      setPan(null)
      return
    }

    if (rotate?.pointerId === event.pointerId) {
      if (cancelled) setElements(rotate.startSnapshot.elements)
      else if (interactionMovedRef.current) {
        recordSnapshot(rotate.startSnapshot)
        setStatus(t.elementRotated)
      }
      setRotate(null)
      interactionMovedRef.current = false
      return
    }

    if (drag?.pointerId === event.pointerId) {
      if (cancelled) setElements(drag.startSnapshot.elements)
      else if (interactionMovedRef.current) {
        recordSnapshot(drag.startSnapshot)
        setStatus(drag.selectedIds.length > 1 ? t.elementsMoved : t.elementMoved)
      }
      setDrag(null)
      setSnapTarget(null)
      snapLockRef.current = null
      interactionMovedRef.current = false
      return
    }

    if (rulerDrag?.pointerId === event.pointerId) {
      if (cancelled) setRulers(rulerDrag.startSnapshot.rulers)
      else if (interactionMovedRef.current) {
        recordSnapshot(rulerDrag.startSnapshot)
        setStatus(locale === 'ru' ? 'Линейка изменена' : 'Ruler changed')
      }
      setRulerDrag(null)
      interactionMovedRef.current = false
      return
    }

    if (lasso?.pointerId === event.pointerId) {
      if (!cancelled && lasso.points.length >= 3) {
        const selectable = elements.filter((element) => isElementVisible(element))
        const hits = idsInLasso(selectable, lasso.points)
        const expandedHits = semanticSelectionIds(elements, hits, { visibleSeedsOnly: true })
        const hitSet = new Set(expandedHits)
        const next = lasso.mode === 'subtract'
          ? lasso.baseIds.filter((id) => !hitSet.has(id))
          : lasso.mode === 'add'
            ? uniqueIds([...lasso.baseIds, ...expandedHits])
            : expandedHits
        setSelectedIds(next)
        setStatus(next.length
          ? `${locale === 'ru' ? 'Выбрано лассо' : 'Lasso selected'}: ${next.length}`
          : locale === 'ru' ? 'Лассо: ничего не выбрано' : 'Lasso: nothing selected')
      }
      setLasso(null)
      return
    }

    if (marquee?.pointerId === event.pointerId) {
      if (!cancelled) {
        const rect = normalizeRect(marquee.start, marquee.current)
        const moved = Math.hypot(
          marquee.current.x - marquee.start.x,
          marquee.current.y - marquee.start.y,
        ) > 2 / viewport.zoom
        const selectable = elements.filter((element) => isElementVisible(element))
        const hits = moved ? idsInMarquee(selectable, rect, SYMBOL_SIZES) : []
        const next = semanticSelectionIds(elements, uniqueIds([...marquee.baseIds, ...hits]), { visibleSeedsOnly: false })
        setSelectedIds(next)
        if (next.length) setStatus(`${t.selectedCount}: ${next.length}`)
      }
      setMarquee(null)
    }
  }

  const handleTopologyMarkerPointerDown = (
    event: ReactPointerEvent<SVGGElement>,
    marker: TopologyChangeMarker,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    setSelectedTopologyParentId(marker.parentId)
    setStatus(locale === 'ru' ? 'Выбрана позиция изменения' : 'Topology change selected')
  }

  const handleElementPointerDown = (
    event: ReactPointerEvent<SVGGElement>,
    element: StitchElement,
  ) => {
    if (event.button !== 0 || spacePressedRef.current) return
    if (tool.type === 'ruler') return
    event.stopPropagation()
    setSelectedRulerId(null)

    if (tool.type === 'place' || tool.type === 'place-chain-bundle') {
      setTool({ type: 'select' })
      setPreview(null)
      setSnapTarget(null)
    }

    if (element.parametricRow) {
      const rowIds = semanticSelectionIds(elements, [element.id], { expandGroups: false, expandRows: true })
      if (!rowIds.length) return
      const rowSet = new Set(rowIds)
      const rowAlreadySelected = rowIds.every((id) => selectedIds.includes(id))
      setSelectedIds(
        event.shiftKey
          ? rowAlreadySelected
            ? selectedIds.filter((id) => !rowSet.has(id))
            : uniqueIds([...selectedIds, ...rowIds])
          : rowIds,
      )
      setSelectedGuideId(null)
      setTool({ type: 'select' })
      setStatus((locale === 'ru' ? 'Выбран параметрический ряд' : 'Parametric row selected') + ': ' + rowIds.length)
      return
    }

    const targetIds = event.altKey
      ? [element.id]
      : semanticSelectionIds(elements, [element.id], { expandGroups: true, expandRows: false })
    if (!targetIds.length) return
    const targetSet = new Set(targetIds)
    const alreadySelected = targetIds.every((id) => selectedIds.includes(id))
    if (event.shiftKey && alreadySelected) {
      setSelectedIds(selectedIds.filter((id) => !targetSet.has(id)))
      return
    }

    const nextSelection = event.shiftKey
      ? uniqueIds([...selectedIds, ...targetIds])
      : alreadySelected
        ? selectedIds
        : targetIds

    setSelectedIds(nextSelection)
    setSelectedGuideId(null)
    if (isElementLocked(element)) {
      setStatus(locale === 'ru' ? 'Заблокированный элемент выбран' : 'Locked stitch selected')
      return
    }
    setDrag({
      pointerId: event.pointerId,
      referenceId: element.id,
      selectedIds: nextSelection,
      startPointer: clientToDocument(event.clientX, event.clientY),
      startSnapshot: currentSnapshot(),
    })
    interactionMovedRef.current = false
    svgRef.current?.setPointerCapture(event.pointerId)
    snapLockRef.current = null
  }

  const handleRotatePointerDown = (
    event: ReactPointerEvent<SVGCircleElement>,
    element: StitchElement,
  ) => {
    if (event.button !== 0 || spacePressedRef.current || isElementLocked(element) || element.parametricRow) return
    event.preventDefault()
    event.stopPropagation()
    const point = clientToDocument(event.clientX, event.clientY)
    setSelectedIds([element.id])
    setSelectedGuideId(null)
    setRotate({
      pointerId: event.pointerId,
      elementId: element.id,
      startRotation: element.rotation,
      startPointerAngle: pointerAngle({ x: element.x, y: element.y }, point),
      startSnapshot: currentSnapshot(),
    })
    interactionMovedRef.current = false
    svgRef.current?.setPointerCapture(event.pointerId)
  }

  const handleGuidePointerDown = (
    event: ReactPointerEvent<SVGGElement>,
    guide: Guide,
  ) => {
    if (tool.type !== 'select' || event.button !== 0 || spacePressedRef.current) return
    event.stopPropagation()
    setSelectedGuideId(guide.id)
    setSelectedRowMarkerId(null)
    setSelectedRulerId(null)
    clearElementSelection()
    setStatus(`${guideLabel(guide, locale)} ${t.selected}`)
  }

  const handleSelectRowMarker = useCallback((id: string) => {
    setSelectedRowMarkerId(id)
    setSelectedRulerId(null)
    clearElementSelection()
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setPreview(null)
    setSnapTarget(null)
  }, [clearElementSelection])

  const handleRowMarkerMoveStart = useCallback(() => {
    rowMarkerManipulationSnapshotRef.current = currentSnapshot()
  }, [currentSnapshot])

  const handleRowMarkerMovePreview = useCallback((marker: RowMarker) => {
    setRowMarkers((current) => current.map((item) => item.id === marker.id ? marker : item))
  }, [])

  const handleRowMarkerMoveEnd = useCallback((moved: boolean, cancelled: boolean) => {
    const before = rowMarkerManipulationSnapshotRef.current
    rowMarkerManipulationSnapshotRef.current = null
    if (moved && !cancelled && before) {
      recordSnapshot(before)
      setStatus(locale === 'ru' ? 'Номер ряда перемещён' : 'Row number moved')
    }
  }, [locale, recordSnapshot])

  const updateRowMarker = useCallback((id: string, patch: Partial<RowMarker>) => {
    const current = rowMarkers.find((marker) => marker.id === id)
    if (!current) return
    const nextNumber = patch.number === undefined ? current.number : normalizedRowMarkerNumber(patch.number)
    if (rowMarkers.some((marker) => marker.id !== id && marker.number === nextNumber)) {
      setStatus(locale === 'ru' ? `Ряд №${nextNumber} уже существует` : `Row #${nextNumber} already exists`)
      return
    }
    commitRowMarkers(rowMarkers.map((marker) => marker.id === id ? { ...marker, ...patch, number: nextNumber } : marker))
  }, [commitRowMarkers, locale, rowMarkers])

  const deleteRowMarker = useCallback((id: string) => {
    const marker = rowMarkers.find((item) => item.id === id)
    if (!marker || isRowMarkerLocked(marker)) return
    commitRowMarkers(deleteRowMarkerAndRenumber(rowMarkers, id))
    if (selectedRowMarkerId === id) setSelectedRowMarkerId(null)
    setStatus(locale === 'ru' ? 'Номер ряда удалён' : 'Row number deleted')
  }, [commitRowMarkers, locale, rowMarkers, selectedRowMarkerId])

  const handleGuideManipulationStart = useCallback(() => {
    guideManipulationSnapshotRef.current = currentSnapshot()
    setPreview(null)
    setSnapTarget(null)
  }, [currentSnapshot])

  const handleGuideManipulationPreview = useCallback((nextGuide: Guide) => {
    setGuides((current) =>
      current.map((guide) => (guide.id === nextGuide.id ? nextGuide : guide)),
    )
  }, [])

  const handleGuideManipulationEnd = useCallback(
    (mode: GuideManipulationMode, moved: boolean, cancelled: boolean) => {
      const before = guideManipulationSnapshotRef.current
      guideManipulationSnapshotRef.current = null
      if (cancelled || !moved || !before) return
      recordSnapshot(before)
      if (mode === 'move') setStatus(t.guideMoved)
      else if (mode === 'resize' || mode === 'start' || mode === 'end' || mode === 'control1' || mode === 'control2' || mode === 'control') setStatus(t.guideResized)
      else setStatus(t.guideRotated)
    },
    [recordSnapshot, t.guideMoved, t.guideResized, t.guideRotated],
  )

  const rotateSelected = (delta: number) => {
    const selected = new Set(unlockedSelectedIds())
    if (!selected.size) return
    commitElements(elements.map((element) => {
      if (!selected.has(element.id) || element.parametricRow) return element
      const attachment = element.guideAttachment
      const guide = attachment ? guides.find((item) => item.id === attachment.guideId) : undefined
      if (attachment && attachment.orientation !== 'keep' && guide && isPathGuide(guide)) {
        return elementFromAttachment(element, guide, {
          ...attachment,
          rotationOffset: attachment.rotationOffset + delta,
        })
      }
      return { ...element, rotation: element.rotation + delta }
    }))
  }

  const applySelectionColor = (color?: string) => {
    const selected = new Set(unlockedSelectedIds())
    if (!selected.size) return
    commitElements(
      elements.map((element) =>
        selected.has(element.id) ? { ...element, color } : element,
      ),
    )
    setStatus(locale === 'ru' ? 'Цвет выделения изменён' : 'Selection color changed')
  }

  const attachSelectedToGuide = (guideId: string, orientation: GuideAttachmentOrientation) => {
    if (!selectedElement || selectedElement.parametricRow || isElementLocked(selectedElement)) return
    const guide = guides.find((item) => item.id === guideId)
    if (!guide || !isPathGuide(guide)) return
    const attached = attachElementToGuide(selectedElement, guide, orientation)
    commitElements(elements.map((element) => element.id === selectedElement.id ? attached : element))
    setSelectedIds([selectedElement.id])
    setStatus(locale === 'ru' ? 'Элемент закреплён на направляющей' : 'Stitch attached to guide')
  }

  const updateSelectedGuideAttachment = (attachment: GuideAttachment) => {
    if (!selectedElement || selectedElement.parametricRow || isElementLocked(selectedElement)) return
    const guide = guides.find((item) => item.id === attachment.guideId)
    if (!guide || !isPathGuide(guide)) return
    const attached = elementFromAttachment(selectedElement, guide, attachment)
    commitElements(elements.map((element) => element.id === selectedElement.id ? attached : element))
    setSelectedIds([selectedElement.id])
  }

  const detachSelectedFromGuide = () => {
    if (!selectedElement?.guideAttachment || isElementLocked(selectedElement)) return
    commitElements(elements.map((element) =>
      element.id === selectedElement.id ? { ...element, guideAttachment: undefined } : element,
    ))
    setSelectedIds([selectedElement.id])
    setStatus(locale === 'ru' ? 'Связь с направляющей снята' : 'Guide attachment removed')
  }

  const addGuide = useCallback((type: Guide['type']) => {
    const rect = svgRef.current?.getBoundingClientRect()
    const center = toDocumentPoint({
      x: (rect?.width ?? 800) / 2,
      y: (rect?.height ?? 600) / 2,
    })
    const id = createId()
    let guide: Guide

    if (type === 'arc') {
      guide = {
        id,
        type,
        center,
        radius: 120,
        startAngle: 0,
        endAngle: 180,
        divisions: 12,
        visible: true,
      }
    } else if (type === 'line') {
      guide = {
        id,
        type,
        start: { x: center.x - 130, y: center.y },
        end: { x: center.x + 130, y: center.y },
        divisions: 12,
        visible: true,
      }
    } else if (type === 'curve') {
      guide = {
        id,
        type,
        start: { x: center.x - 150, y: center.y },
        control1: { x: center.x - 70, y: center.y - 90 },
        control2: { x: center.x + 70, y: center.y + 90 },
        end: { x: center.x + 150, y: center.y },
        divisions: 16,
        visible: true,
      }
    } else if (type === 'parabola') {
      guide = {
        id,
        type,
        start: { x: center.x - 150, y: center.y + 40 },
        control: { x: center.x, y: center.y - 100 },
        end: { x: center.x + 150, y: center.y + 40 },
        divisions: 16,
        visible: true,
      }
    } else if (type === 'grid') {
      guide = {
        id,
        type,
        origin: center,
        rows: 5,
        columns: 7,
        spacingX: 40,
        spacingY: 40,
        rotation: 0,
        visible: true,
      }
    } else {
      guide = {
        id,
        type,
        center,
        ringCount: 4,
        ringSpacing: 40,
        sectorCount: 12,
        startAngle: 0,
        visible: true,
      }
    }

    commitGuides([...guides, guide])
    setSelectedGuideId(id)
    clearElementSelection()
    setTool({ type: 'select' })
    setPreview(null)
    setStatus(`${guideLabel(guide, locale)} ${t.added}`)
  }, [clearElementSelection, commitGuides, guides, locale, t.added, toDocumentPoint])

  const selectWorkbenchTool = useCallback(() => {
    setTool({ type: 'select' })
    setLasso(null)
    setPreview(null)
    setSnapTarget(null)
    setRulerDraft(null)
    setRulerDrag(null)
  }, [])

  const togglePanWorkbenchTool = useCallback(() => {
    setTool((current) => current.type === 'pan' ? { type: 'select' } : { type: 'pan' })
    setLasso(null)
    setPreview(null)
    setSnapTarget(null)
    setRulerDraft(null)
  }, [])

  const toggleLassoWorkbenchTool = useCallback(() => {
    setTool((current) => current.type === 'lasso' ? { type: 'select' } : { type: 'lasso' })
    setLasso(null)
    setPreview(null)
    setSnapTarget(null)
    setSelectedGuideId(null)
    setSelectedRowMarkerId(null)
    setSelectedRulerId(null)
  }, [])

  const selectWorkbenchSymbol = useCallback((symbolId: string) => {
    if (tool.type === 'place' && tool.symbolId === symbolId) {
      setTool({ type: 'select' })
      setPreview(null)
      setSnapTarget(null)
      return
    }
    setTool({ type: 'place', symbolId })
    clearElementSelection()
    setSelectedGuideId(null)
    setSelectedRowMarkerId(null)
    setSelectedRulerId(null)
    setRulerDraft(null)
    setPreview(null)
    setSnapTarget(null)
  }, [clearElementSelection, tool])

  const selectWorkbenchChainBundle = useCallback((count: ChainBundleCount) => {
    if (tool.type === 'place-chain-bundle' && tool.count === count) {
      setTool({ type: 'select' })
      setPreview(null)
      setSnapTarget(null)
      return
    }
    setTool({ type: 'place-chain-bundle', count })
    clearElementSelection()
    setSelectedGuideId(null)
    setSelectedRowMarkerId(null)
    setSelectedRulerId(null)
    setRulerDraft(null)
    setPreview(null)
    setSnapTarget(null)
  }, [clearElementSelection, tool])

  const toggleFavorite = useCallback((key: FavoriteElementKey) => {
    setFavorites((current) => current.includes(key)
      ? current.filter((favorite) => favorite !== key)
      : [...current, key])
  }, [])

  const updateSelectedGuide = (updater: (guide: Guide) => Guide) => {
    if (!selectedGuide) return
    commitGuides(
      guides.map((guide) => (guide.id === selectedGuide.id ? updater(guide) : guide)),
    )
  }

  const reverseGuideDirection = useCallback((target: Guide) => {
    if (target.locked === true || !isPathGuide(target)) return
    const reversed = reverseGuide(target)
    if (!isPathGuide(reversed)) return
    commitGuides(guides.map((guide) => guide.id === target.id ? reversed : guide))
    setElements(remapAttachmentsForReversedGuide(elements, reversed))
    setStatus(locale === 'ru' ? 'Направление направляющей изменено' : 'Guide direction reversed')
  }, [commitGuides, elements, guides, locale])

  const fitSelectedLineToProject = useCallback(() => {
    if (!selectedGuide || selectedGuide.type !== 'line' || selectedGuide.locked === true) return
    const ids = visibleElements.map((element) => element.id)
    let bounds = selectionAabb(visibleElements, ids, SYMBOL_SIZES)
    if (backgroundImage && backgroundImage.visible !== false) {
      const imageBounds = backgroundImageBounds(backgroundImage)
      bounds = bounds ? {
        left: Math.min(bounds.left, imageBounds.left), top: Math.min(bounds.top, imageBounds.top),
        right: Math.max(bounds.right, imageBounds.right), bottom: Math.max(bounds.bottom, imageBounds.bottom),
      } : imageBounds
    }
    if (!bounds) {
      const rect = svgRef.current?.getBoundingClientRect()
      const topLeft = screenToDocument({ x: 0, y: 0 }, viewport)
      const bottomRight = screenToDocument({ x: rect?.width ?? 800, y: rect?.height ?? 600 }, viewport)
      bounds = { left: topLeft.x, top: topLeft.y, right: bottomRight.x, bottom: bottomRight.y }
    }
    updateSelectedGuide((guide) => guide.type === 'line'
      ? fitLineGuideToRect(guide, bounds!, 32 / Math.max(0.1, viewport.zoom))
      : guide)
    setStatus(locale === 'ru' ? 'Направляющая растянута по размеру проекта' : 'Guide fitted to project bounds')
  }, [backgroundImage, locale, selectedGuide, viewport, visibleElements])

  const handleGenerateGuideRow = (generated: StitchElement[]) => {
    if (!generated.length) return
    const generatedBinding = generated.find((element) => element.parametricRow)?.parametricRow
    let prepared = generated
    if (generatedBinding && generatedBinding.patternOrder == null) {
      const patternOrder = nextPatternOrder(elements)
      prepared = generated.map((element) =>
        element.parametricRow
          ? { ...element, parametricRow: { ...element.parametricRow, patternOrder } }
          : element,
      )
    }
    commitElements([...elements, ...prepared])
    setSelectedIds(prepared.map((element) => element.id))
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setPreview(null)
    setSnapTarget(null)
    setStatus((locale === 'ru' ? 'Создан ряд' : 'Row generated') + ': ' + prepared.length)
  }

  const handleSelectPatternRow = (rowId: string) => {
    const ids = rowElements(elements, rowId).map((element) => element.id)
    if (!ids.length) return
    setSelectedIds(ids)
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setPreview(null)
    setSnapTarget(null)
    setStatus((locale === 'ru' ? 'Выбран ряд' : 'Row selected') + ': ' + ids.length)
  }

  const handleCreateNextPatternRow = (rowId: string, countIncrement: number) => {
    const parent = rowElements(elements, rowId)[0]?.parametricRow
    if (!parent) return
    const created = createNextPatternRow(elements, guides, parent, countIncrement, createId)
    if (!created) {
      setStatus(locale === 'ru' ? 'Для ряда не найдена совместимая направляющая' : 'No compatible guide found for this row')
      return
    }
    commitElements([...elements, ...created.elements])
    setSelectedIds(created.elements.map((element) => element.id))
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setPreview(null)
    setSnapTarget(null)
    const order = created.binding.patternOrder ?? nextPatternOrder(elements)
    setStatus((locale === 'ru' ? 'Создан следующий ряд' : 'Next row created') + ' ' + order + ': ' + created.elements.length)
  }

  const handleCreatePatternSequence = (rowId: string) => {
    const parent = rowElements(elements, rowId)[0]?.parametricRow
    if (!parent) return
    const created = createPatternIncreaseSequence(elements, guides, parent, 6, 4, createId)
    const lastRow = created.rows.at(-1)
    if (!lastRow || !created.elements.length) {
      setStatus(locale === 'ru' ? 'Нельзя создать серию +6 для этого ряда' : 'Cannot create a +6 sequence from this row')
      return
    }
    commitElements([...elements, ...created.elements])
    setSelectedIds(lastRow.elements.map((element) => element.id))
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setPreview(null)
    setSnapTarget(null)
    const counts = created.rows.map((row) => row.elements.length).join(' → ')
    setStatus((locale === 'ru' ? 'Создана серия рядов' : 'Row sequence created') + ': ' + counts)
  }

  const handleUpdateParametricRow = (binding: ParametricRowBinding) => {
    const next = updateParametricRow(elements, guides, binding.id, binding, createId)
    commitElements(next)
    setSelectedIds(rowElements(next, binding.id).map((element) => element.id))
    setSelectedGuideId(null)
    setStatus(locale === 'ru' ? 'Параметрический ряд перестроен' : 'Parametric row rebuilt')
  }

  const handleDeleteParametricRow = (rowId: string) => {
    commitElements(deleteParametricRow(elements, rowId))
    clearElementSelection()
    setStatus(locale === 'ru' ? 'Параметрический ряд удалён' : 'Parametric row deleted')
  }

  const openLocalProjectDocument = (project: CrochetProject, id: string) => {
    cancelPendingAutosave()
    autosaveRevisionRef.current += 1
    const normalized = normalizeProject(project, DEFAULT_SNAPPING)
    persistenceBlockedRef.current = false
    persistActiveProjectId(id)
    setActiveProjectIdState(id)
    setProjectTitle(normalized.metadata.title)
    setHistory(emptyHistory<DocumentSnapshot>())
    setElements(reconcileLinkedElements(normalized.elements, normalized.guides ?? []))
    setGuides(normalized.guides ?? [])
    setRowMarkers(normalized.rowMarkers ?? [])
    setGauge(normalized.gauge ?? emptyGaugeSettings())
    setRulers(normalized.rulers ?? [])
    setBackgroundImage(normalized.backgroundImage ?? null)
    setLegendVisible(normalized.settings.legend?.visible ?? true)
    setAutosaveDelayMs(normalized.settings.autosave?.delayMs ?? DEFAULT_AUTOSAVE_DELAY_MS)
    setSnapping(normalized.settings.snapping)
    clearElementSelection()
    setSelectedGuideId(null)
    setSelectedRowMarkerId(null)
    setSelectedRulerId(null)
    setRulerDraft(null)
    setRulerDrag(null)
    setTool({ type: 'select' })
    setPreview(null)
    setSnapTarget(null)
  }

  const handleOpenLocalProject = async (id: string) => {
    if (id === activeProjectId) return
    await flushCurrentProject()
    const project = await loadLocalProject(id)
    if (project) openLocalProjectDocument(project, id)
  }

  const handleNewLocalProject = async () => {
    await flushCurrentProject()
    const existing = await listLocalProjects()
    const base = locale === 'ru' ? 'Новая схема' : 'New pattern'
    const title = base + ' ' + (existing.length + 1)
    const project = buildProject(title, [], [], DEFAULT_SNAPPING)
    const id = await createLocalProject(project)
    openLocalProjectDocument(project, id)
  }

  const handleDuplicateLocalProject = async () => {
    await flushCurrentProject()
    const title = projectTitle + (locale === 'ru' ? ' — копия' : ' — copy')
    const project = buildProject(projectTitle, elements, guides, snapping, rowMarkers, legendVisible, autosaveDelayMs, backgroundImage, gauge, rulers)
    const id = await duplicateLocalProject(project, title)
    const copy = await loadLocalProject(id)
    if (copy) openLocalProjectDocument(copy, id)
  }

  const handleDeleteLocalProject = async (id: string) => {
    if (id === activeProjectId) {
      cancelPendingAutosave()
      await autosaveQueueRef.current.catch(() => undefined)
      autosaveRevisionRef.current += 1
    }
    await deleteLocalProject(id)
    const remaining = await listLocalProjects()
    if (remaining[0]) {
      const project = await loadLocalProject(remaining[0].id)
      if (project) openLocalProjectDocument(project, remaining[0].id)
      return
    }
    const base = locale === 'ru' ? 'Новая схема' : 'New pattern'
    const project = buildProject(`${base} 1`, [], [], DEFAULT_SNAPPING)
    const nextId = await createLocalProject(project)
    openLocalProjectDocument(project, nextId)
  }

  const handleAutosaveDelayChange = (delayMs: AutosaveDelayMs) => {
    cancelPendingAutosave()
    if (persistenceBlockedRef.current) {
      setAutosaveDelayMs(delayMs)
      setAutosaveState('error')
      return
    }
    autosaveSettingsWriteRef.current = delayMs
    const revision = ++autosaveRevisionRef.current
    setAutosaveDelayMs(delayMs)
    setAutosaveState(delayMs === 0 ? 'off' : 'saving')

    const project = buildProject(projectTitle, elements, guides, snapping, rowMarkers, legendVisible, delayMs, backgroundImage, gauge, rulers)
    const task = autosaveQueueRef.current
      .catch(() => undefined)
      .then(() => saveLocalProject(activeProjectId, project))
    autosaveQueueRef.current = task
    void task
      .then(() => {
        if (autosaveRevisionRef.current === revision) {
          setAutosaveState(delayMs === 0 ? 'off' : 'saved')
        }
      })
      .catch(() => {
        if (autosaveRevisionRef.current === revision) setAutosaveState('error')
      })
  }

  const handleBackgroundUpload = async (file: File) => {
    const projectIdAtStart = activeProjectId
    try {
      const rect = svgRef.current?.getBoundingClientRect()
      const center = rect
        ? screenToDocument({ x: rect.width / 2, y: rect.height / 2 }, viewport)
        : { x: 0, y: 0 }
      const prepared = await prepareBackgroundImage(file, center)
      if (getActiveProjectId() !== projectIdAtStart) return
      commitBackgroundImage(prepared)
      setStatus(locale === 'ru' ? 'Фоновое изображение добавлено' : 'Background image added')
    } catch (error) {
      const fallback = locale === 'ru' ? 'Не удалось добавить изображение' : 'Could not add image'
      setStatus(error instanceof Error ? error.message : fallback)
    }
  }

  const updateBackgroundImage = (patch: Partial<BackgroundImage>) => {
    if (!backgroundImage) return
    commitBackgroundImage({
      ...backgroundImage,
      ...patch,
      width: patch.width === undefined ? backgroundImage.width : Math.max(1, patch.width),
      height: patch.height === undefined ? backgroundImage.height : Math.max(1, patch.height),
      rotation: patch.rotation === undefined ? backgroundImage.rotation ?? 0 : patch.rotation,
      opacity: patch.opacity === undefined ? backgroundImage.opacity : clampBackgroundOpacity(patch.opacity),
    })
  }

  const removeBackgroundImage = () => {
    if (!backgroundImage) return
    commitBackgroundImage(null)
    setBackgroundSelected(false)
    setStatus(locale === 'ru' ? 'Фоновое изображение удалено' : 'Background image removed')
  }

  const openTiledPrint = (settings: PrintSettings) => {
    const popup = window.open('', '_blank')
    if (!popup) {
      setStatus(locale === 'ru' ? 'Разрешите всплывающие окна для печати' : 'Allow pop-ups to open the print view')
      return
    }
    const html = buildTiledPrintHtml(outputSvg, outputBounds, settings, projectTitle, locale)
    popup.document.open()
    popup.document.write(html)
    popup.document.close()
    const images = Array.from(popup.document.images)
    void Promise.all(images.map(async (image) => {
      if (!image.complete) {
        await new Promise<void>((resolve) => {
          image.addEventListener('load', () => resolve(), { once: true })
          image.addEventListener('error', () => resolve(), { once: true })
        })
      }
      if ('decode' in image) await image.decode().catch(() => undefined)
    })).then(() => {
      popup.focus()
      popup.print()
    })
    setStatus(locale === 'ru' ? 'Макет печати открыт' : 'Print layout opened')
  }

  const saveProject = () => {
    const project = buildProject(projectTitle, elements, guides, snapping, rowMarkers, legendVisible, autosaveDelayMs, backgroundImage, gauge, rulers)
    const integrityIssue = projectIntegrityIssue(project)
    if (integrityIssue) {
      setStatus(locale === 'ru' ? `Нельзя экспортировать: ${integrityIssue}` : `Cannot export: ${integrityIssue}`)
      return
    }
    downloadText('crochet-scheme.json', JSON.stringify(project, null, 2), 'application/json')
    setStatus(t.projectSaved)
  }

  const loadProject = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text()) as unknown
      const project = normalizeProject(raw, DEFAULT_SNAPPING)
      persistenceBlockedRef.current = false
      setProjectTitle(project.metadata.title)
      setHistory(emptyHistory<DocumentSnapshot>())
      setElements(reconcileLinkedElements(project.elements, project.guides ?? []))
      setGuides(project.guides ?? [])
      setRowMarkers(project.rowMarkers ?? [])
      setGauge(project.gauge ?? emptyGaugeSettings())
      setRulers(project.rulers ?? [])
      setBackgroundImage(project.backgroundImage ?? null)
      setLegendVisible(project.settings.legend?.visible ?? true)
      setAutosaveDelayMs(project.settings.autosave?.delayMs ?? DEFAULT_AUTOSAVE_DELAY_MS)
      setSnapping(project.settings.snapping)
      clearElementSelection()
      setSelectedGuideId(null)
      setSelectedRowMarkerId(null)
      setSelectedRulerId(null)
      setRulerDraft(null)
      setRulerDrag(null)
      setTool({ type: 'select' })
      setPreview(null)
      setSnapTarget(null)
      setStatus(
        `${t.loaded}: ${project.elements.length} ${t.stitchCount} · ${project.guides?.length ?? 0} ${t.guideCount}`,
      )
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.couldNotLoad)
    }
  }

  const exportSvg = () => {
    downloadText(
      'crochet-scheme.svg',
      outputSvg,
      'image/svg+xml',
    )
    setStatus(t.svgExported)
  }

  const openInspectorPanel = (panel: HTMLDetailsElement | null) => {
    if (!panel) return false
    setRightCollapsed(false)
    setRightPanelTab('options')
    requestAnimationFrame(() => {
      panel.open = true
      panel.scrollIntoView({ block: 'nearest' })
      panel.querySelector<HTMLElement>('summary')?.focus()
    })
    return true
  }

  const runApplicationCommand: ApplicationCommandRunner = (command: ApplicationCommandId) => {
    switch (command) {
      case 'file.new':
        void handleNewLocalProject()
        return true
      case 'file.import':
        loadInputRef.current?.click()
        return Boolean(loadInputRef.current)
      case 'file.exportProject':
        saveProject()
        return true
      case 'file.exportSvg':
        exportSvg()
        return true
      case 'file.print':
        return openInspectorPanel(printPanelRef.current)
      case 'edit.undo':
        undo()
        return true
      case 'edit.redo':
        redo()
        return true
      case 'edit.copy':
        copySelection()
        return true
      case 'edit.paste':
        pasteSelection()
        return true
      case 'edit.duplicate':
        duplicateSelection()
        return true
      case 'edit.delete':
        deleteSelected()
        return true
      case 'edit.selectAll':
        selectAll()
        return true
      case 'view.zoom100':
        setCanvasZoom(1)
        return true
      case 'view.fitAll':
        fitAll()
        return true
      case 'view.fitSelection':
        fitSelection()
        return true
      case 'view.toggleLeft':
        setLeftCollapsed((value) => !value)
        return true
      case 'view.toggleRight':
        setRightCollapsed((value) => !value)
        return true
      case 'settings.snapping':
        return openInspectorPanel(snappingPanelRef.current)
      case 'settings.gauge':
        return openInspectorPanel(gaugePanelRef.current)
      case 'settings.patternRows':
        return openInspectorPanel(patternRowsPanelRef.current)
      case 'settings.rowNumbers':
        return openInspectorPanel(rowMarkersPanelRef.current)
      case 'settings.legend':
        return openInspectorPanel(legendPanelRef.current)
      case 'help.controls':
        return openInspectorPanel(helpPanelRef.current)
      case 'ui.commandPalette':
        return false
    }
  }

  const anchorLabels: Record<AnchorName, string> = {
    top: t.top,
    center: t.center,
    bottom: t.bottom,
  }
  const marqueeRect: Rect | null = marquee
    ? normalizeRect(marquee.start, marquee.current)
    : null
  const autosaveLabel =
    autosaveState === 'loading' ? t.autosaveLoading
      : autosaveState === 'saving' ? t.autosaveSaving
        : autosaveState === 'error' ? t.autosaveError
          : autosaveState === 'off' ? (locale === 'ru' ? 'Автосохранение выключено' : 'Autosave off')
            : t.autosaveSaved
  const editableSelectedCount = unlockedSelectedIds().length

  if (!hydrated) {
    return (
      <div className="app-loading">
        <div className="app-loading-card">
          <strong>{t.brandTitle}</strong>
          <span>{t.autosaveLoading}</span>
        </div>
      </div>
    )
  }

  return (
    <EditorShell locale={locale} runCommand={runApplicationCommand}>
      <div className={`app-shell ${leftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''}`}>
      <EditorTopbar
        locale={locale}
        autosaveState={autosaveState}
        autosaveLabel={autosaveLabel}
        autosaveDelayMs={autosaveDelayMs}
        canUndo={history.past.length > 0}
        canRedo={history.future.length > 0}
        favoriteActions={(
          <FavoriteQuickBar
            locale={locale}
            tool={tool}
            favorites={favorites}
            onSelectSymbol={selectWorkbenchSymbol}
            onSelectChainBundle={selectWorkbenchChainBundle}
            onCancelPlacement={selectWorkbenchTool}
          />
        )}
        loadInputRef={loadInputRef}
        onAutosaveDelayChange={handleAutosaveDelayChange}
        onLocaleChange={setLocale}
        onUndo={undo}
        onRedo={redo}
        onSaveProject={saveProject}
        onOpenProject={() => loadInputRef.current?.click()}
        onExportSvg={exportSvg}
        onImportFile={loadProject}
      />

      <aside className="sidebar left-sidebar">
        <LeftWorkbenchSurface
          locale={locale}
          tool={tool}
          query={workbenchQuery}
          favorites={favorites}
          onSelect={selectWorkbenchTool}
          onTogglePan={togglePanWorkbenchTool}
          onToggleLasso={toggleLassoWorkbenchTool}
          onAddGuide={addGuide}
          onToggleRuler={toggleRulerTool}
          onQueryChange={setWorkbenchQuery}
          onToggleFavorite={toggleFavorite}
          onSelectSymbol={selectWorkbenchSymbol}
          onSelectChainBundle={selectWorkbenchChainBundle}
          onCancelPlacement={selectWorkbenchTool}
        />

        <ProjectManagerPanel
          locale={locale}
          activeProjectId={activeProjectId}
          currentTitle={projectTitle}
          onRename={setProjectTitle}
          onOpen={handleOpenLocalProject}
          onNew={handleNewLocalProject}
          onDuplicate={handleDuplicateLocalProject}
          onDelete={handleDeleteLocalProject}
        />

        <GuideListPanel
          locale={locale}
          guides={guides}
          selectedGuideId={selectedGuideId}
          guideLabel={(guide) => guideLabel(guide, locale)}
          onSelectGuide={(guideId) => {
            setTool({ type: 'select' })
            setSelectedGuideId(guideId)
            clearElementSelection()
          }}
        />

      </aside>

      <main className="workspace">
        <WorkspaceSidebarControls
          locale={locale}
          leftCollapsed={leftCollapsed}
          rightCollapsed={rightCollapsed}
          onToggleLeft={() => setLeftCollapsed((value) => !value)}
          onToggleRight={() => setRightCollapsed((value) => !value)}
        />

        <CanvasToolbar
          locale={locale}
          zoom={viewport.zoom}
          tool={tool}
          snappingEnabled={snapping.enabled}
          orientationMode={snapping.orientationMode}
          zoomHint={t.zoomHint}
          canFitAll={visibleElements.length > 0}
          canFitSelection={selectedIds.length > 0}
          onZoomOut={() => zoomCanvas(1 / 1.2)}
          onZoom100={() => setCanvasZoom(1)}
          onZoomIn={() => zoomCanvas(1.2)}
          onFitAll={fitAll}
          onFitSelection={fitSelection}
          onTogglePan={togglePanWorkbenchTool}
          onToggleLasso={toggleLassoWorkbenchTool}
          onToggleRuler={toggleRulerTool}
          onToggleSnapping={toggleSnapping}
          onOrientationChange={(orientationMode) => commitSnapping({ ...snapping, orientationMode })}
        />

        <SelectionQuickToolbar
          locale={locale}
          elements={elements}
          selectedIds={productivitySelectionIds()}
          viewport={viewport}
          canGroup={productivitySelectionIds().length > 1}
          canUngroup={productivitySelectionIds().some((id) => Boolean(elements.find((element) => element.id === id)?.groupId))}
          onDuplicate={duplicateSelection}
          onGroup={groupSelection}
          onUngroup={ungroupSelection}
          onMirror={mirrorSelection}
          onMirrorCopy={mirrorCopySelection}
          onRotate={rotateSelected}
          onDelete={deleteSelected}
        />

        <svg
          ref={svgRef}
          className={`editor-canvas ${pan ? 'panning' : ''} ${tool.type === 'pan' ? 'pan-tool' : tool.type === 'place' || tool.type === 'place-chain-bundle' ? 'placing' : tool.type === 'lasso' ? 'lassoing' : tool.type === 'ruler' ? 'measuring' : 'selecting'}`}
          onWheel={handleWheel}
          onPointerDownCapture={handleCanvasPointerDownCapture}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={(event) => finishPointerInteraction(event)}
          onPointerCancel={(event) => finishPointerInteraction(event, true)}
          onContextMenu={(event) => event.preventDefault()}
        >
          <defs>
            <pattern id="smallGrid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#dedbd4" strokeWidth="0.6" />
            </pattern>
            <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
              <rect width="100" height="100" fill="url(#smallGrid)" />
              <path d="M 100 0 L 0 0 0 100" fill="none" stroke="#cbc7be" strokeWidth="1" />
            </pattern>
          </defs>

          <g transform={`translate(${viewport.panX} ${viewport.panY}) scale(${viewport.zoom})`}>
            <rect x="-6000" y="-6000" width="12000" height="12000" fill="#fbfaf7" />
            <rect x="-6000" y="-6000" width="12000" height="12000" fill="url(#grid)" />
            <line x1="-6000" y1="0" x2="6000" y2="0" className="origin-line" />
            <line x1="0" y1="-6000" x2="0" y2="6000" className="origin-line" />

            {backgroundImage && backgroundImage.visible !== false && (
              <BackgroundImageCanvas
                background={backgroundImage}
                selected={backgroundSelected && tool.type === 'select'}
                interactive={tool.type === 'select'}
                zoom={viewport.zoom}
                clientToDocument={clientToDocument}
                onSelect={selectBackground}
                onManipulationStart={handleBackgroundManipulationStart}
                onManipulationPreview={handleBackgroundManipulationPreview}
                onManipulationEnd={handleBackgroundManipulationEnd}
              />
            )}

            {guides.map((guide) => (
              <GuideRenderer
                key={guide.id}
                guide={guide}
                selected={guide.id === selectedGuideId}
                zoom={viewport.zoom}
                onPointerDown={handleGuidePointerDown}
                clientToDocument={clientToDocument}
                onManipulationStart={handleGuideManipulationStart}
                onManipulationPreview={handleGuideManipulationPreview}
                onManipulationEnd={handleGuideManipulationEnd}
                onReverse={reverseGuideDirection}
              />
            ))}

            <StitchLayer
              elements={elements}
              selectedIds={selectedIds}
              primaryId={primaryId}
              zoom={viewport.zoom}
              sourceAnchor={snapping.sourceAnchor}
              marquee={marqueeRect}
              selectedTopologyParentId={selectedTopologyParentId}
              onElementPointerDown={handleElementPointerDown}
              onRotatePointerDown={handleRotatePointerDown}
              onGeometryCommit={(elementId, geometry) => {
                const target = elements.find((element) => element.id === elementId)
                if (!target || target.parametricRow || isElementLocked(target)) return
                duplicateSeriesRef.current = null
                commitElements(elements.map((element) =>
                  element.id === elementId ? { ...element, geometry } : element,
                ))
                setSelectedIds([elementId])
                setStatus(locale === 'ru' ? 'Размер элемента изменён' : 'Stitch geometry changed')
              }}
              onTopologyMarkerPointerDown={handleTopologyMarkerPointerDown}
            />

            <RulerLayer
              rulers={rulers}
              selectedId={selectedRulerId}
              draft={rulerDraft ? { start: rulerDraft.start, end: rulerDraft.current } : null}
              elements={elements}
              gauge={gauge}
              locale={locale}
              zoom={viewport.zoom}
              onSelect={selectRuler}
              onHandlePointerDown={handleRulerHandlePointerDown}
            />

            <RowMarkerLayer
              markers={rowMarkers}
              selectedId={selectedRowMarkerId}
              zoom={viewport.zoom}
              clientToDocument={clientToDocument}
              onSelect={handleSelectRowMarker}
              onMoveStart={handleRowMarkerMoveStart}
              onMovePreview={handleRowMarkerMovePreview}
              onMoveEnd={handleRowMarkerMoveEnd}
            />

            {legendVisible && <LegendOverlay elements={elements} locale={locale} viewport={viewport} />}

            {mirrorAxis && (
              <MirrorAxisOverlay
                state={mirrorAxis}
                zoom={viewport.zoom}
                clientToDocument={clientToDocument}
                onChange={moveMirrorAxis}
              />
            )}

            {preview && tool.type === 'place-chain-bundle' ? (
              <g className="preview-stitch preview-chain-bundle">
                {chainBundleLayout({ x: preview.x, y: preview.y }, tool.count, preview.rotation).map((member, index) => (
                  <g key={index} transform={`translate(${member.x} ${member.y}) rotate(${preview.rotation})`}>
                    <g className="symbol-glyph"><SymbolGlyph symbolId="chain" /></g>
                  </g>
                ))}
              </g>
            ) : preview ? (
              <g transform={`translate(${preview.x} ${preview.y}) rotate(${preview.rotation})`} className="preview-stitch">
                <g className="symbol-glyph"><SymbolGlyph symbolId={preview.symbolId} /></g>
              </g>
            ) : null}

            {snapTarget && (
              <g className={`snap-indicator ${snapTarget.targetType === 'guide' ? 'guide-target' : ''}`} transform={`translate(${snapTarget.point.x} ${snapTarget.point.y})`}>
                <circle r={8 / viewport.zoom} vectorEffect="non-scaling-stroke" />
                <circle r={2.5 / viewport.zoom} vectorEffect="non-scaling-stroke" />
              </g>
            )}

            {tool.type === 'lasso' && (
              <LassoOverlay
                points={lasso?.points ?? []}
                zoom={viewport.zoom}
                mode={lasso?.mode ?? 'replace'}
              />
            )}
          </g>
        </svg>

        <EditorStatusbar
          locale={locale}
          status={status}
          stitchCount={elements.length}
          guideCount={guides.length}
          rowMarkerCount={rowMarkers.length}
          rulerCount={rulers.length}
          selectedCount={selectedIds.length}
        />
      </main>

      <aside className="sidebar right-sidebar">
        <div className="ui-v2-right-tabs-host">
          <RightPanelTabs locale={locale} activeTab={rightPanelTab} onChange={setRightPanelTab} />
        </div>

        <div
          id="ui-v2-right-options-panel"
          className="ui-v2-right-options-host"
          role="tabpanel"
          aria-labelledby="ui-v2-right-tab-options"
          hidden={rightPanelTab !== 'options'}
        >
        <section className="panel-section right-panel-context" data-testid="selection-context-panel">
          <div className="section-title-row">
            <h2>{t.selection}</h2>
            {lockedSelectedCount > 0 && <span className="muted-text">🔒 {lockedSelectedCount}</span>}
          </div>

          {lockedSelectedCount > 0 && (
            <p className="locked-selection-note">
              {locale === 'ru'
                ? `Заблокировано в выделении: ${lockedSelectedCount}. Их можно выбирать и просматривать, но изменения применяются только к разблокированным.`
                : `${lockedSelectedCount} selected locked stitch(es). They can be inspected, while edits only affect unlocked stitches.`}
            </p>
          )}

          {editableSelectedCount > 0 && (
            <SelectionColorControl
              locale={locale}
              colors={elements
                .filter((element) => selectedIds.includes(element.id) && !isElementLocked(element))
                .map((element) => element.color)}
              onChange={applySelectionColor}
            />
          )}

          {selectedParametricRow && selectedParametricGuide ? (
            <>
              <ParametricRowEditorPanel
                binding={selectedParametricRow}
                guide={selectedParametricGuide}
                locale={locale}
                parentStitchCount={selectedParametricParentCount}
                onChange={handleUpdateParametricRow}
                onDelete={() => handleDeleteParametricRow(selectedParametricRow.id)}
              />
              <TopologyEditorPanel
                elements={elements}
                binding={selectedParametricRow}
                locale={locale}
                selectedParentId={selectedTopologyParentId}
                onSelectParentId={setSelectedTopologyParentId}
                onChange={handleUpdateParametricRow}
              />
            </>
          ) : selectedElement ? (
            <div className="selection-card compact-selection-card">
              {!isElementLocked(selectedElement) && (
                <>
                  <div className="rotation-controls">
                    <button onClick={() => rotateSelected(-15)}>−15°</button>
                    <button onClick={() => rotateSelected(15)}>+15°</button>
                  </div>
                  <GuideAttachmentPanel
                    locale={locale}
                    element={selectedElement}
                    guides={guides}
                    onAttach={attachSelectedToGuide}
                    onChange={updateSelectedGuideAttachment}
                    onDetach={detachSelectedFromGuide}
                  />
                  <div className="selection-actions">
                    <button onClick={copySelection}>{t.copy}</button>
                    <button onClick={duplicateSelection}>{t.duplicate}</button>
                  </div>
                </>
              )}
              <div className="layer-selection-controls">
                <button onClick={() => toggleElementVisible(selectedElement.id)}>{isElementVisible(selectedElement) ? t.hideLayer : t.showLayer}</button>
                <button onClick={() => toggleElementLocked(selectedElement.id)}>{isElementLocked(selectedElement) ? t.unlockLayer : t.lockLayer}</button>
              </div>
              {!isElementLocked(selectedElement) && <button className="danger-button" onClick={deleteSelected}>{t.delete}</button>}
            </div>
          ) : selectedIds.length > 1 ? (
            <div className="multi-selection-card">
              <strong>{t.selectedCount}: {selectedIds.length}</strong>
              <small>{t.groupMoveHint}</small>
              {editableSelectedCount > 0 && (
                <>
                  <div className="rotation-controls">
                    <button onClick={() => rotateSelected(-15)}>−15°</button>
                    <button onClick={() => rotateSelected(15)}>+15°</button>
                  </div>
                  <div className="selection-actions">
                    <button onClick={copySelection}>{t.copy}</button>
                    <button onClick={duplicateSelection}>{t.duplicate}</button>
                  </div>
                  <button className="danger-button" onClick={deleteSelected}>{t.delete}</button>
                </>
              )}
            </div>
          ) : selectedGuide ? (
            <div className="guide-editor">
              <div className="guide-editor-heading"><strong>{guideLabel(selectedGuide, locale)}</strong><span>{selectedGuide.type}</span></div>
              <label className="toggle-row compact-toggle">
                <span>{t.visible}</span>
                <input type="checkbox" checked={selectedGuide.visible} onChange={(event) => updateSelectedGuide((guide) => ({ ...guide, visible: event.target.checked }))} />
              </label>
              <label className="toggle-row compact-toggle">
                <span>{locale === 'ru' ? 'Заблокировать направляющую' : 'Lock guide'}</span>
                <input type="checkbox" checked={selectedGuide.locked === true} onChange={(event) => updateSelectedGuide((guide) => ({ ...guide, locked: event.target.checked }))} />
              </label>

              <fieldset className="guide-locked-fields" disabled={selectedGuide.locked === true}>
              {selectedGuide.type === 'arc' && (
                <div className="number-field-grid">
                  <NumberField label={t.centerX} value={selectedGuide.center.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'arc' ? { ...guide, center: { ...guide.center, x: value } } : guide)} />
                  <NumberField label={t.centerY} value={selectedGuide.center.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'arc' ? { ...guide, center: { ...guide.center, y: value } } : guide)} />
                  <NumberField label={t.radius} value={selectedGuide.radius} min={10} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'arc' ? { ...guide, radius: Math.max(10, value) } : guide)} />
                  <NumberField label={t.divisions} value={selectedGuide.divisions} min={1} max={72} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'arc' ? { ...guide, divisions: Math.round(clamp(value, 1, 72)) } : guide)} />
                  <NumberField label={t.startAngle} value={selectedGuide.startAngle} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'arc' ? { ...guide, startAngle: value } : guide)} />
                  <NumberField label={t.endAngle} value={selectedGuide.endAngle} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'arc' ? { ...guide, endAngle: value } : guide)} />
                </div>
              )}

              {selectedGuide.type === 'line' && (
                <div className="number-field-grid">
                  <NumberField label={locale === 'ru' ? 'Начало X' : 'Start X'} value={selectedGuide.start.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? { ...guide, start: { ...guide.start, x: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Начало Y' : 'Start Y'} value={selectedGuide.start.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? { ...guide, start: { ...guide.start, y: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Конец X' : 'End X'} value={selectedGuide.end.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? { ...guide, end: { ...guide.end, x: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Конец Y' : 'End Y'} value={selectedGuide.end.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? { ...guide, end: { ...guide.end, y: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Длина' : 'Length'} value={Math.round(lineGuideLength(selectedGuide) * 100) / 100} min={1} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? setLineGuideLength(guide, value) : guide)} />
                  <NumberField label={locale === 'ru' ? 'Угол °' : 'Angle °'} value={Math.round(lineGuideAngle(selectedGuide) * 100) / 100} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? setLineGuideAngle(guide, value) : guide)} />
                  <NumberField label={t.divisions} value={selectedGuide.divisions} min={1} max={100} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'line' ? { ...guide, divisions: Math.round(clamp(value, 1, 100)) } : guide)} />
                  <button type="button" onClick={fitSelectedLineToProject}>{locale === 'ru' ? 'По размеру проекта' : 'Fit to project'}</button>
                </div>
              )}

              {selectedGuide.type === 'curve' && (
                <div className="number-field-grid">
                  <NumberField label={locale === 'ru' ? 'Начало X' : 'Start X'} value={selectedGuide.start.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, start: { ...guide.start, x: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Начало Y' : 'Start Y'} value={selectedGuide.start.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, start: { ...guide.start, y: value } } : guide)} />
                  <NumberField label="C1 X" value={selectedGuide.control1.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, control1: { ...guide.control1, x: value } } : guide)} />
                  <NumberField label="C1 Y" value={selectedGuide.control1.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, control1: { ...guide.control1, y: value } } : guide)} />
                  <NumberField label="C2 X" value={selectedGuide.control2.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, control2: { ...guide.control2, x: value } } : guide)} />
                  <NumberField label="C2 Y" value={selectedGuide.control2.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, control2: { ...guide.control2, y: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Конец X' : 'End X'} value={selectedGuide.end.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, end: { ...guide.end, x: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Конец Y' : 'End Y'} value={selectedGuide.end.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, end: { ...guide.end, y: value } } : guide)} />
                  <NumberField label={t.divisions} value={selectedGuide.divisions} min={1} max={100} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'curve' ? { ...guide, divisions: Math.round(clamp(value, 1, 100)) } : guide)} />
                </div>
              )}

              {selectedGuide.type === 'parabola' && (
                <div className="number-field-grid">
                  <NumberField label={locale === 'ru' ? 'Начало X' : 'Start X'} value={selectedGuide.start.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'parabola' ? { ...guide, start: { ...guide.start, x: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Начало Y' : 'Start Y'} value={selectedGuide.start.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'parabola' ? { ...guide, start: { ...guide.start, y: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Вершина X' : 'Control X'} value={selectedGuide.control.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'parabola' ? { ...guide, control: { ...guide.control, x: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Вершина Y' : 'Control Y'} value={selectedGuide.control.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'parabola' ? { ...guide, control: { ...guide.control, y: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Конец X' : 'End X'} value={selectedGuide.end.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'parabola' ? { ...guide, end: { ...guide.end, x: value } } : guide)} />
                  <NumberField label={locale === 'ru' ? 'Конец Y' : 'End Y'} value={selectedGuide.end.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'parabola' ? { ...guide, end: { ...guide.end, y: value } } : guide)} />
                  <NumberField label={t.divisions} value={selectedGuide.divisions} min={1} max={100} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'parabola' ? { ...guide, divisions: Math.round(clamp(value, 1, 100)) } : guide)} />
                </div>
              )}

              {selectedGuide.type === 'grid' && (
                <div className="number-field-grid">
                  <NumberField label={t.centerX} value={selectedGuide.origin.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'grid' ? { ...guide, origin: { ...guide.origin, x: value } } : guide)} />
                  <NumberField label={t.centerY} value={selectedGuide.origin.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'grid' ? { ...guide, origin: { ...guide.origin, y: value } } : guide)} />
                  <NumberField label={t.rows} value={selectedGuide.rows} min={1} max={50} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'grid' ? { ...guide, rows: Math.round(clamp(value, 1, 50)) } : guide)} />
                  <NumberField label={t.columns} value={selectedGuide.columns} min={1} max={50} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'grid' ? { ...guide, columns: Math.round(clamp(value, 1, 50)) } : guide)} />
                  <NumberField label={t.spacingX} value={selectedGuide.spacingX} min={5} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'grid' ? { ...guide, spacingX: Math.max(5, value) } : guide)} />
                  <NumberField label={t.spacingY} value={selectedGuide.spacingY} min={5} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'grid' ? { ...guide, spacingY: Math.max(5, value) } : guide)} />
                  <NumberField label={t.rotation} value={selectedGuide.rotation} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'grid' ? { ...guide, rotation: value } : guide)} />
                </div>
              )}

              {selectedGuide.type === 'radial-grid' && (
                <div className="number-field-grid">
                  <NumberField label={t.centerX} value={selectedGuide.center.x} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'radial-grid' ? { ...guide, center: { ...guide.center, x: value } } : guide)} />
                  <NumberField label={t.centerY} value={selectedGuide.center.y} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'radial-grid' ? { ...guide, center: { ...guide.center, y: value } } : guide)} />
                  <NumberField label={t.rings} value={selectedGuide.ringCount} min={1} max={30} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'radial-grid' ? { ...guide, ringCount: Math.round(clamp(value, 1, 30)) } : guide)} />
                  <NumberField label={t.ringSpacing} value={selectedGuide.ringSpacing} min={5} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'radial-grid' ? { ...guide, ringSpacing: Math.max(5, value) } : guide)} />
                  <NumberField label={t.sectors} value={selectedGuide.sectorCount} min={2} max={72} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'radial-grid' ? { ...guide, sectorCount: Math.round(clamp(value, 2, 72)) } : guide)} />
                  <NumberField label={t.startAngle} value={selectedGuide.startAngle} onChange={(value) => updateSelectedGuide((guide) => guide.type === 'radial-grid' ? { ...guide, startAngle: value } : guide)} />
                </div>
              )}

              </fieldset>

              {isPathGuide(selectedGuide) && (
                <div className="guide-direction-actions">
                  <button disabled={selectedGuide.locked === true} onClick={() => reverseGuideDirection(selectedGuide)}>{locale === 'ru' ? '↔ Сменить направление' : '↔ Reverse direction'}</button>
                  <small>{locale === 'ru' ? 'Также: двойной клик по направляющей' : 'Also: double-click the guide'}</small>
                </div>
              )}

              {(selectedGuide.type === 'arc' || selectedGuide.type === 'radial-grid') && (
                <GuideRowGeneratorPanel
                  guide={selectedGuide}
                  locale={locale}
                  onGenerate={handleGenerateGuideRow}
                />
              )}

              <p className="guide-note">{t.guideNote}</p>
              <button className="danger-button" disabled={selectedGuide.locked === true} onClick={deleteSelected}>{t.deleteGuide}</button>
            </div>
          ) : (
            <p className="empty-state">{t.emptySelection}</p>
          )}
        </section>

        {productivitySelectionIds().length > 0 && (
          <ProductivityPanel
            locale={locale}
            guides={guides}
            elements={elements}
            selectedIds={productivitySelectionIds()}
            selectedCount={productivitySelectionIds().length}
            canTransform
            canGroup={productivitySelectionIds().length > 1}
            canUngroup={productivitySelectionIds().some((id) => Boolean(elements.find((element) => element.id === id)?.groupId))}
            onGroup={groupSelection}
            onUngroup={ungroupSelection}
            onDirectionalMirror={directionalMirrorSelection}
            mirrorAxis={mirrorAxis}
            onConfigureMirrorAxis={configureMirrorAxis}
            onMirrorAxisChange={moveMirrorAxis}
            onCenterMirrorAxis={centerMirrorAxis}
            onHideMirrorAxis={() => setMirrorAxis(null)}
            onMirrorAtCustomAxis={mirrorSelectionAroundCustomAxis}
            onMirrorCopyAtCustomAxis={mirrorCopySelectionAroundCustomAxis}
            onRepeat={repeatProductivitySelection}
          />
        )}

        <details className="right-panel-collapsible" data-testid="background-global-panel">
          <summary>{locale === 'ru' ? 'Фоновое изображение' : 'Background image'}</summary>
          <BackgroundImagePanel
            locale={locale}
            background={backgroundImage}
            onUpload={(file) => void handleBackgroundUpload(file)}
            onChange={updateBackgroundImage}
            onRemove={removeBackgroundImage}
          />
        </details>

        <details ref={gaugePanelRef} className="right-panel-collapsible" data-testid="gauge-global-panel">
          <summary>{locale === 'ru' ? 'Плотность и размер' : 'Gauge & size'}</summary>
          <GaugeRulerPanel
            locale={locale}
            gauge={gauge}
            rulers={rulers}
            selectedRulerId={selectedRulerId}
            placingRuler={tool.type === 'ruler'}
            elements={elements}
            selectedRowId={selectedParametricRow?.id ?? null}
            selectedRowIsCircular={selectedParametricGuide?.type === 'arc' || selectedParametricGuide?.type === 'radial-grid'}
            onAddProfile={addGaugeProfile}
            onUpdateProfile={updateGaugeProfile}
            onDeleteProfile={deleteGaugeProfile}
            onActiveProfileChange={setActiveGaugeProfile}
            onToggleRulerTool={toggleRulerTool}
            onSelectRuler={selectRuler}
            onUpdateRuler={updateRuler}
            onDeleteRuler={deleteRuler}
          />
        </details>

        <details ref={printPanelRef} className="right-panel-collapsible" data-testid="print-global-panel">
          <summary>{locale === 'ru' ? 'Печать по страницам' : 'Tiled print'}</summary>
          <PrintPanel locale={locale} bounds={outputBounds} legendBounds={outputLegendBounds} onPrint={openTiledPrint} />
        </details>

        <details ref={snappingPanelRef} className="right-panel-collapsible" data-testid="snapping-global-panel">
          <summary>{t.snapping}</summary>
          <section className="panel-section">
            <label className="toggle-row">
              <span><strong>{t.allowSnapping}</strong><small>{t.snappingHint}</small></span>
              <input
                type="checkbox"
                checked={snapping.enabled}
                onChange={(event) => {
                  commitSnapping({ ...snapping, enabled: event.target.checked })
                  setSnapTarget(null)
                  snapLockRef.current = null
                }}
              />
            </label>

            <fieldset disabled={!snapping.enabled}>
              <legend>{t.snapPoint}</legend>
              <div className="segmented-control">
                {(['top', 'center', 'bottom'] as AnchorName[]).map((anchor) => (
                  <button key={anchor} className={snapping.sourceAnchor === anchor ? 'active' : ''} onClick={() => commitSnapping({ ...snapping, sourceAnchor: anchor })}>
                    {anchorLabels[anchor]}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset disabled={!snapping.enabled}>
              <legend>{t.orientation}</legend>
              <select value={snapping.orientationMode} onChange={(event) => commitSnapping({ ...snapping, orientationMode: event.target.value as OrientationMode })}>
                <option value="none">{t.keepCurrent}</option>
                <option value="along">{t.alongTarget}</option>
                <option value="perpendicular">{t.perpendicular}</option>
              </select>
            </fieldset>

            <label className="toggle-row compact-toggle">
              <span>{t.snapToVertices}</span>
              <input type="checkbox" checked={snapping.snapToVertices} disabled={!snapping.enabled} onChange={(event) => commitSnapping({ ...snapping, snapToVertices: event.target.checked })} />
            </label>
            <label className="range-row">
              <span>{t.snapRadius} <strong>{snapping.tolerancePx}px</strong></span>
              <input type="range" min="6" max="24" value={snapping.tolerancePx} disabled={!snapping.enabled} onChange={(event) => commitSnapping({ ...snapping, tolerancePx: Number(event.target.value) })} />
            </label>
          </section>
        </details>

        <details ref={patternRowsPanelRef} className="right-panel-collapsible" data-testid="pattern-rows-global-panel">
          <summary>{locale === 'ru' ? 'Ряды узора' : 'Pattern rows'}</summary>
          <section className="panel-section">
            <PatternRowsPanel
              elements={elements}
              locale={locale}
              selectedRowId={selectedParametricRow?.id ?? null}
              onSelect={handleSelectPatternRow}
              onCreateNext={handleCreateNextPatternRow}
              onCreateSequence={handleCreatePatternSequence}
            />
          </section>
        </details>

        <details ref={rowMarkersPanelRef} className="right-panel-collapsible" data-testid="row-markers-global-panel">
          <summary>{locale === 'ru' ? 'Номера рядов' : 'Row numbers'}</summary>
          <section className="panel-section">
            <RowMarkersPanel
              locale={locale}
              markers={rowMarkers}
              selectedId={selectedRowMarkerId}
              nextNumber={nextRowNumber}
              placing={tool.type === 'row-marker'}
              onStartPlacement={() => {
                setTool((current) => current.type === 'row-marker' ? { type: 'select' } : { type: 'row-marker' })
                clearElementSelection()
                setSelectedGuideId(null)
                setSelectedRowMarkerId(null)
                setSelectedRulerId(null)
                setRulerDraft(null)
                setPreview(null)
                setSnapTarget(null)
              }}
              onSelect={handleSelectRowMarker}
              onChange={updateRowMarker}
              onDelete={deleteRowMarker}
            />
          </section>
        </details>

        <details ref={legendPanelRef} className="right-panel-collapsible" data-testid="legend-global-panel">
          <summary>{locale === 'ru' ? 'Легенда и холст' : 'Legend & canvas'}</summary>
          <LegendPanel
            locale={locale}
            elements={elements}
            visible={legendVisible}
            onVisibleChange={commitLegendVisible}
          />
        </details>

        <details ref={helpPanelRef} className="right-panel-collapsible help-section" data-testid="help-global-panel">
          <summary>{t.controls}</summary>
          <section className="panel-section">
            <ul>
              <li>{t.help1}</li>
              <li>{t.help2}</li>
              <li>{t.help3}</li>
              <li>{t.help4}</li>
              <li>{t.help5}</li>
              <li>{t.help6}</li>
            </ul>
          </section>
        </details>
        </div>

        <div
          id="ui-v2-right-layers-panel"
          className="ui-v2-right-layers-host"
          role="tabpanel"
          aria-labelledby="ui-v2-right-tab-layers"
          tabIndex={0}
          hidden={rightPanelTab !== 'layers'}
        >
          <LayersPanel
            elements={elements}
            selectedIds={selectedIds}
            locale={locale}
            onSelect={handleLayerSelect}
            onToggleVisible={toggleElementVisible}
            onToggleLocked={toggleElementLocked}
            onBringForward={bringSelectionForward}
            onSendBackward={sendSelectionBackward}
            onBringToFront={bringSelectionToFront}
            onSendToBack={sendSelectionToBack}
          />
        </div>
      </aside>
      </div>
    </EditorShell>
  )
}

export default App
