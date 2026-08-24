import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { GuideRenderer } from './editor/GuideRenderer'
import { GuideRowGeneratorPanel } from './editor/GuideRowGeneratorPanel'
import { ParametricRowEditorPanel } from './editor/ParametricRowEditorPanel'
import { PatternRowsPanel } from './editor/PatternRowsPanel'
import { ProjectManagerPanel } from './editor/ProjectManagerPanel'
import { LayersPanel } from './editor/LayersPanel'
import { StitchLayer } from './editor/StitchLayer'
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
import type { GuideManipulationMode } from './editor/guideManipulation'
import { clamp, screenToDocument } from './editor/geometry'
import { emptyHistory, pushHistory, redoHistory, undoHistory } from './editor/history'
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
import {
  createNextPatternRow,
  createPatternIncreaseSequence,
  deleteParametricRow,
  expandIdsToParametricRows,
  nextPatternOrder,
  parametricRowFromSelection,
  reconcileParametricRows,
  rowElements,
  updateParametricRow,
} from './editor/parametricRows'
import {
  idsInMarquee,
  normalizeRect,
  pointerAngle,
  rotationFromPointer,
  type Rect,
} from './editor/selection'
import { solveSnap, type SnapCandidate } from './editor/snapping'
import {
  DEFAULT_LOCALE,
  UI,
  categoryName,
  symbolName,
  type Locale,
} from './i18n'
import { SYMBOLS, SYMBOL_BY_ID, SymbolGlyph, symbolSvgMarkup } from './symbols'
import type {
  AnchorName,
  CrochetProject,
  Guide,
  OrientationMode,
  ParametricRowBinding,
  Point,
  SnappingSettings,
  StitchElement,
  Viewport,
} from './types'

const DEFAULT_VIEWPORT: Viewport = { zoom: 1, panX: 460, panY: 320 }
const DEFAULT_SNAPPING: SnappingSettings = {
  enabled: true,
  sourceAnchor: 'bottom',
  orientationMode: 'none',
  snapToVertices: true,
  tolerancePx: 12,
}
const LOCALE_STORAGE_KEY = 'crochet-scheme-editor-locale'
const DUPLICATE_OFFSET = 24
const AUTOSAVE_DELAY_MS = 650
const SYMBOL_SIZES = Object.fromEntries(
  SYMBOLS.map((symbol) => [symbol.id, { width: symbol.width, height: symbol.height }]),
)

type Tool = { type: 'select' } | { type: 'place'; symbolId: string }
type DocumentSnapshot = { elements: StitchElement[]; guides: Guide[] }
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
type RotateState = {
  pointerId: number
  elementId: string
  startRotation: number
  startPointerAngle: number
  startSnapshot: DocumentSnapshot
}
type HistoryState = {
  past: DocumentSnapshot[]
  future: DocumentSnapshot[]
}
type AutosaveState = 'loading' | 'saving' | 'saved' | 'error'

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
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

function serializeSvg(elements: StitchElement[], emptyLabel: string) {
  if (!elements.length) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><text x="320" y="240" text-anchor="middle" font-family="sans-serif" fill="#888">${emptyLabel}</text></svg>`
  }

  const bounds = elements.map((element) => {
    const definition = SYMBOL_BY_ID.get(element.symbolId)
    const half = Math.max(definition?.width ?? 30, definition?.height ?? 30) / 2 + 12
    return {
      left: element.x - half,
      right: element.x + half,
      top: element.y - half,
      bottom: element.y + half,
    }
  })
  const padding = 36
  const left = Math.min(...bounds.map((item) => item.left)) - padding
  const right = Math.max(...bounds.map((item) => item.right)) + padding
  const top = Math.min(...bounds.map((item) => item.top)) - padding
  const bottom = Math.max(...bounds.map((item) => item.bottom)) + padding
  const width = Math.max(1, right - left)
  const height = Math.max(1, bottom - top)
  const content = elements
    .map(
      (element) =>
        `<g transform="translate(${element.x} ${element.y}) rotate(${element.rotation})" style="color:#1d211f">${symbolSvgMarkup(element.symbolId)}</g>`,
    )
    .join('')

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${left} ${top} ${width} ${height}" width="${width}" height="${height}"><rect x="${left}" y="${top}" width="${width}" height="${height}" fill="white"/>${content}</svg>`
}

function buildProject(
  title: string,
  elements: StitchElement[],
  guides: Guide[],
  snapping: SnappingSettings,
): CrochetProject {
  return {
    schemaVersion: 7,
    metadata: { title, updatedAt: new Date().toISOString() },
    elements: normalizeElements(elements),
    guides,
    settings: { snapping },
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
  const snapLockRef = useRef<string | null>(null)
  const spacePressedRef = useRef(false)
  const interactionMovedRef = useRef(false)
  const guideManipulationSnapshotRef = useRef<DocumentSnapshot | null>(null)
  const clipboardRef = useRef<StitchElement[]>([])
  const pasteSerialRef = useRef(1)
  const autosaveQueueRef = useRef<Promise<void>>(Promise.resolve())
  const autosaveRevisionRef = useRef(0)

  const [locale, setLocale] = useState<Locale>(initialLocale)
  const t = UI[locale]
  const [activeProjectId, setActiveProjectIdState] = useState(getActiveProjectId)
  const [projectTitle, setProjectTitle] = useState(UI[DEFAULT_LOCALE].projectTitle)
  const [leftCollapsed, setLeftCollapsed] = useState(false)
  const [rightCollapsed, setRightCollapsed] = useState(false)
  const [elements, setElements] = useState<StitchElement[]>([])
  const [guides, setGuides] = useState<Guide[]>([])
  const [history, setHistory] = useState<HistoryState>(emptyHistory<DocumentSnapshot>())
  const [tool, setTool] = useState<Tool>({ type: 'select' })
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedGuideId, setSelectedGuideId] = useState<string | null>(null)
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT)
  const [snapping, setSnapping] = useState<SnappingSettings>(DEFAULT_SNAPPING)
  const [preview, setPreview] = useState<StitchElement | null>(null)
  const [snapTarget, setSnapTarget] = useState<SnapCandidate | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [marquee, setMarquee] = useState<MarqueeState | null>(null)
  const [rotate, setRotate] = useState<RotateState | null>(null)
  const [pan, setPan] = useState<PanState | null>(null)
  const [status, setStatus] = useState<string>(UI[DEFAULT_LOCALE].ready)
  const [hydrated, setHydrated] = useState(false)
  const [autosaveState, setAutosaveState] = useState<AutosaveState>('loading')

  useEffect(() => {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    document.documentElement.lang = locale
    if (hydrated) setStatus(UI[locale].ready)
  }, [hydrated, locale])

  useEffect(() => {
    let cancelled = false

    const restore = async () => {
      try {
        const saved = await loadAutosave()
        if (cancelled) return
        if (saved) {
          const project = normalizeProject(saved, DEFAULT_SNAPPING)
          setProjectTitle(project.metadata.title)
          setElements(reconcileParametricRows(project.elements, project.guides ?? [], createId))
          setGuides(project.guides ?? [])
          setSnapping(project.settings.snapping)
          setStatus(UI[locale].autosaveRestored)
        } else {
          const initial = buildProject(UI[locale].projectTitle, [], [], DEFAULT_SNAPPING)
          await saveAutosave(initial)
          setProjectTitle(initial.metadata.title)
        }
        setAutosaveState('saved')
      } catch {
        if (!cancelled) setAutosaveState('error')
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

    const revision = ++autosaveRevisionRef.current
    setAutosaveState('saving')
    const timeout = window.setTimeout(() => {
      const project = buildProject(projectTitle, elements, guides, snapping)
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
    }, AUTOSAVE_DELAY_MS)

    return () => window.clearTimeout(timeout)
  }, [activeProjectId, elements, guides, hydrated, projectTitle, snapping])

  useEffect(() => {
    if (!hydrated) return
    setElements((current) => reconcileParametricRows(current, guides, createId))
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
  const selectedParametricRow = useMemo(
    () => parametricRowFromSelection(elements, selectedIds),
    [elements, selectedIds],
  )
  const selectedParametricGuide = useMemo(
    () => selectedParametricRow
      ? guides.find((guide) => guide.id === selectedParametricRow.guideId) ?? null
      : null,
    [guides, selectedParametricRow],
  )
  const selectedParametricParentCount = useMemo(() => {
    const parentRowId = selectedParametricRow?.parentRowId
    if (!parentRowId) return undefined
    const count = rowElements(elements, parentRowId).length
    return count || undefined
  }, [elements, selectedParametricRow])
  const visibleElements = useMemo(() => elements.filter(isElementVisible), [elements])
  const groupedSymbols = useMemo(() => {
    const groups = new Map<string, typeof SYMBOLS>()
    for (const symbol of SYMBOLS) {
      groups.set(symbol.category, [...(groups.get(symbol.category) ?? []), symbol])
    }
    return [...groups.entries()]
  }, [])

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
    (): DocumentSnapshot => ({ elements, guides }),
    [elements, guides],
  )
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

  const clearElementSelection = useCallback(() => setSelectedIds([]), [])

  const undo = useCallback(() => {
    const step = undoHistory(history, currentSnapshot())
    if (!step) return
    setHistory(step.history)
    setElements(step.value.elements)
    setGuides(step.value.guides)
    clearElementSelection()
    setSelectedGuideId(null)
    setStatus(t.statusUndo)
  }, [clearElementSelection, currentSnapshot, history, t.statusUndo])

  const redo = useCallback(() => {
    const step = redoHistory(history, currentSnapshot())
    if (!step) return
    setHistory(step.history)
    setElements(step.value.elements)
    setGuides(step.value.guides)
    clearElementSelection()
    setSelectedGuideId(null)
    setStatus(t.statusRedo)
  }, [clearElementSelection, currentSnapshot, history, t.statusRedo])

  const unlockedSelectedIds = useCallback(() => {
    const selected = new Set(selectedIds)
    return elements
      .filter((element) => selected.has(element.id) && !isElementLocked(element))
      .map((element) => element.id)
  }, [elements, selectedIds])

  const deleteSelected = useCallback(() => {
    if (selectedIds.length) {
      const deletable = new Set(expandIdsToParametricRows(elements, unlockedSelectedIds()))
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
    if (selectedGuideId) {
      commitGuides(guides.filter((guide) => guide.id !== selectedGuideId))
      setSelectedGuideId(null)
      setStatus(t.guideDeleted)
    }
  }, [
    commitElements,
    commitGuides,
    elements,
    guides,
    selectedGuideId,
    selectedIds.length,
    t.elementDeleted,
    t.elementsDeleted,
    t.guideDeleted,
    unlockedSelectedIds,
  ])

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
    const pasted = clipboardRef.current.map((element) => ({
      ...element,
      id: createId(),
      x: element.x + offset,
      y: element.y + offset,
      locked: false,
      parametricRow: undefined,
      parentStitchIds: undefined,
    }))
    commitElements([...elements, ...pasted])
    setSelectedIds(pasted.map((element) => element.id))
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setStatus(`${t.pasted}: ${pasted.length}`)
  }, [commitElements, elements, t.pasted])

  const duplicateSelection = useCallback(() => {
    const duplicateIds = new Set(unlockedSelectedIds())
    if (!duplicateIds.size) return
    const duplicated = elements
      .filter((element) => duplicateIds.has(element.id))
      .map((element) => ({
        ...element,
        id: createId(),
        x: element.x + DUPLICATE_OFFSET,
        y: element.y + DUPLICATE_OFFSET,
        locked: false,
        parametricRow: undefined,
        parentStitchIds: undefined,
      }))
    commitElements([...elements, ...duplicated])
    setSelectedIds(duplicated.map((element) => element.id))
    setSelectedGuideId(null)
    setStatus(`${t.duplicated}: ${duplicated.length}`)
  }, [commitElements, elements, t.duplicated, unlockedSelectedIds])

  const selectAll = useCallback(() => {
    const selectable = elements.filter(
      (element) => isElementVisible(element) && !isElementLocked(element),
    )
    if (!selectable.length) return
    setSelectedIds(selectable.map((element) => element.id))
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setStatus(`${t.selectedCount}: ${selectable.length}`)
  }, [elements, t.selectedCount])

  const handleLayerSelect = useCallback((id: string, additive: boolean) => {
    const element = elements.find((item) => item.id === id)
    if (!element || isElementLocked(element)) return
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setSelectedIds((current) => {
      const targetIds = expandIdsToParametricRows(elements, [id])
      if (!additive) return targetIds
      const targetSet = new Set(targetIds)
      const allSelected = targetIds.every((item) => current.includes(item))
      return allSelected
        ? current.filter((item) => !targetSet.has(item))
        : uniqueIds([...current, ...targetIds])
    })
  }, [elements])

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
    const nextLocked = !isElementLocked(element)
    commitElements(
      elements.map((item) => item.id === id ? { ...item, locked: nextLocked } : item),
    )
    if (nextLocked) setSelectedIds((current) => current.filter((item) => item !== id))
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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        spacePressedRef.current = true
        if (event.target === document.body) event.preventDefault()
      }

      const editing = isEditingTarget(event.target)
      if (!editing && (event.key === 'Delete' || event.key === 'Backspace')) {
        event.preventDefault()
        deleteSelected()
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
          duplicateSelection()
        } else if (key === 'a') {
          event.preventDefault()
          selectAll()
        }
      }

      if (event.key === 'Escape') {
        if (drag) setElements(drag.startSnapshot.elements)
        if (rotate) setElements(rotate.startSnapshot.elements)
        setTool({ type: 'select' })
        setPreview(null)
        setSnapTarget(null)
        setDrag(null)
        setRotate(null)
        setMarquee(null)
        snapLockRef.current = null
        interactionMovedRef.current = false
      }
    }

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') spacePressedRef.current = false
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
    pasteSelection,
    redo,
    rotate,
    selectAll,
    undo,
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
    if (tool.type !== 'place') return
    const proposed: StitchElement = {
      id: '__preview__',
      symbolId: tool.symbolId,
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

  const handleCanvasPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button === 1 || spacePressedRef.current) {
      event.preventDefault()
      beginPan(event)
      return
    }
    if (event.button !== 0) return

    const point = toDocumentPoint(localPoint(event.clientX, event.clientY))
    if (tool.type === 'place') {
      const proposed: StitchElement = {
        id: createId(),
        symbolId: tool.symbolId,
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
      const placed: StitchElement = {
        ...proposed,
        x: solved.x,
        y: solved.y,
        rotation: solved.rotation,
      }
      commitElements([...elements, placed])
      setSelectedIds([placed.id])
      setSelectedGuideId(null)
      const definition = SYMBOL_BY_ID.get(placed.symbolId)
      setStatus(`${t.placed}: ${symbolName(placed.symbolId, definition?.name ?? placed.symbolId, locale)}`)
      return
    }

    event.currentTarget.setPointerCapture(event.pointerId)
    setSelectedGuideId(null)
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

    if (marquee?.pointerId === event.pointerId) {
      setMarquee({ ...marquee, current: documentPoint })
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

    if (marquee?.pointerId === event.pointerId) {
      if (!cancelled) {
        const rect = normalizeRect(marquee.start, marquee.current)
        const moved = Math.hypot(
          marquee.current.x - marquee.start.x,
          marquee.current.y - marquee.start.y,
        ) > 2 / viewport.zoom
        const selectable = elements.filter(
          (element) => isElementVisible(element) && !isElementLocked(element),
        )
        const hits = moved ? idsInMarquee(selectable, rect, SYMBOL_SIZES) : []
        const next = expandIdsToParametricRows(elements, uniqueIds([...marquee.baseIds, ...hits]))
        setSelectedIds(next)
        if (next.length) setStatus(`${t.selectedCount}: ${next.length}`)
      }
      setMarquee(null)
    }
  }

  const handleElementPointerDown = (
    event: ReactPointerEvent<SVGGElement>,
    element: StitchElement,
  ) => {
    if (
      tool.type !== 'select' ||
      event.button !== 0 ||
      spacePressedRef.current ||
      isElementLocked(element)
    ) return
    event.stopPropagation()

    if (element.parametricRow) {
      const rowIds = rowElements(elements, element.parametricRow.id).map((item) => item.id)
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

    const alreadySelected = selectedIds.includes(element.id)
    if (event.shiftKey && alreadySelected) {
      setSelectedIds(selectedIds.filter((id) => id !== element.id))
      return
    }

    const nextSelection = event.shiftKey
      ? uniqueIds([...selectedIds, element.id])
      : alreadySelected
        ? selectedIds
        : [element.id]

    setSelectedIds(nextSelection)
    setSelectedGuideId(null)
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
    clearElementSelection()
    setStatus(`${guideLabel(guide, locale)} ${t.selected}`)
  }

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
      else if (mode === 'resize') setStatus(t.guideResized)
      else setStatus(t.guideRotated)
    },
    [recordSnapshot, t.guideMoved, t.guideResized, t.guideRotated],
  )

  const rotateSelected = (delta: number) => {
    const selected = new Set(unlockedSelectedIds())
    if (!selected.size) return
    commitElements(
      elements.map((element) =>
        selected.has(element.id) && !element.parametricRow
          ? { ...element, rotation: element.rotation + delta }
          : element,
      ),
    )
  }

  const addGuide = (type: Guide['type']) => {
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
  }

  const updateSelectedGuide = (updater: (guide: Guide) => Guide) => {
    if (!selectedGuide) return
    commitGuides(
      guides.map((guide) => (guide.id === selectedGuide.id ? updater(guide) : guide)),
    )
  }

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
    const normalized = normalizeProject(project, DEFAULT_SNAPPING)
    persistActiveProjectId(id)
    setActiveProjectIdState(id)
    setProjectTitle(normalized.metadata.title)
    setHistory(emptyHistory<DocumentSnapshot>())
    setElements(reconcileParametricRows(normalized.elements, normalized.guides ?? [], createId))
    setGuides(normalized.guides ?? [])
    setSnapping(normalized.settings.snapping)
    clearElementSelection()
    setSelectedGuideId(null)
    setTool({ type: 'select' })
    setPreview(null)
    setSnapTarget(null)
  }

  const handleOpenLocalProject = async (id: string) => {
    const project = await loadLocalProject(id)
    if (project) openLocalProjectDocument(project, id)
  }

  const handleNewLocalProject = async () => {
    const existing = await listLocalProjects()
    const base = locale === 'ru' ? 'Новая схема' : 'New pattern'
    const title = base + ' ' + (existing.length + 1)
    const project = buildProject(title, [], [], DEFAULT_SNAPPING)
    const id = await createLocalProject(project)
    openLocalProjectDocument(project, id)
  }

  const handleDuplicateLocalProject = async () => {
    const title = projectTitle + (locale === 'ru' ? ' — копия' : ' — copy')
    const project = buildProject(projectTitle, elements, guides, snapping)
    const id = await duplicateLocalProject(project, title)
    const copy = await loadLocalProject(id)
    if (copy) openLocalProjectDocument(copy, id)
  }

  const handleDeleteLocalProject = async (id: string) => {
    await deleteLocalProject(id)
    const remaining = await listLocalProjects()
    if (remaining[0]) {
      await handleOpenLocalProject(remaining[0].id)
    } else {
      await handleNewLocalProject()
    }
  }

  const saveProject = () => {
    const project = buildProject(projectTitle, elements, guides, snapping)
    downloadText('crochet-scheme.json', JSON.stringify(project, null, 2), 'application/json')
    setStatus(t.projectSaved)
  }

  const loadProject = async (file: File) => {
    try {
      const raw = JSON.parse(await file.text()) as CrochetProject
      if (
        ![1, 2, 3, 4, 5, 6, 7].includes(raw.schemaVersion) ||
        !Array.isArray(raw.elements)
      ) {
        throw new Error(t.unsupportedProject)
      }
      const project = normalizeProject(raw, DEFAULT_SNAPPING)
      setProjectTitle(project.metadata.title)
      setHistory({ past: [currentSnapshot()], future: [] })
      setElements(reconcileParametricRows(project.elements, project.guides ?? [], createId))
      setGuides(project.guides ?? [])
      setSnapping(project.settings.snapping)
      clearElementSelection()
      setSelectedGuideId(null)
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
      serializeSvg(visibleElements, t.emptySvg),
      'image/svg+xml',
    )
    setStatus(t.svgExported)
  }

  const resetView = () => setViewport(DEFAULT_VIEWPORT)
  const fitAll = () => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const next = viewportForElements(visibleElements, SYMBOL_SIZES, rect.width, rect.height)
    if (next) setViewport(next)
  }
  const fitSelection = () => {
    if (!selectedIds.length) return
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return
    const next = viewportForElements(visibleElements, SYMBOL_SIZES, rect.width, rect.height, selectedIds)
    if (next) setViewport(next)
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
          : t.autosaveSaved

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
    <div className={`app-shell ${leftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>
            <strong>{t.brandTitle}</strong>
            <span>{t.brandSubtitle}</span>
          </div>
        </div>

        <div className="topbar-actions">
          <span className={`autosave-indicator ${autosaveState}`}>{autosaveLabel}</span>
          <div className="language-switch" aria-label={t.language}>
            <button className={`ghost-button ${locale === 'ru' ? 'active-lang' : ''}`} onClick={() => setLocale('ru')}>RU</button>
            <button className={`ghost-button ${locale === 'en' ? 'active-lang' : ''}`} onClick={() => setLocale('en')}>EN</button>
          </div>
          <span className="toolbar-separator" />
          <button className="ghost-button" onClick={undo} disabled={!history.past.length}>{t.undo}</button>
          <button className="ghost-button" onClick={redo} disabled={!history.future.length}>{t.redo}</button>
          <span className="toolbar-separator" />
          <button className="ghost-button" onClick={saveProject}>{t.saveJson}</button>
          <button className="ghost-button" onClick={() => loadInputRef.current?.click()}>{t.load}</button>
          <button className="primary-button" onClick={exportSvg}>{t.exportSvg}</button>
          <input
            ref={loadInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) void loadProject(file)
              event.currentTarget.value = ''
            }}
          />
        </div>
      </header>

      <aside className="sidebar left-sidebar">
        <section className="panel-section compact-section">
          <div className="section-title-row"><h2>{t.tools}</h2><span className="badge">P0</span></div>
          <button
            className={`tool-button ${tool.type === 'select' ? 'active' : ''}`}
            onClick={() => {
              setTool({ type: 'select' })
              setPreview(null)
              setSnapTarget(null)
            }}
          >
            <span>↖</span>{t.selectMove}<kbd>Esc</kbd>
          </button>
        </section>

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

        <section className="panel-section guide-section">
          <div className="section-title-row"><h2>{t.guides}</h2><span className="muted-text">{guides.length}</span></div>
          <div className="guide-add-grid">
            <button onClick={() => addGuide('arc')}><strong>⌒</strong><span>{t.arc}</span></button>
            <button onClick={() => addGuide('grid')}><strong>▦</strong><span>{t.grid}</span></button>
            <button onClick={() => addGuide('radial-grid')}><strong>◎</strong><span>{t.radial}</span></button>
          </div>
          {guides.length > 0 && (
            <div className="guide-list">
              {guides.map((guide, index) => (
                <button
                  key={guide.id}
                  className={selectedGuideId === guide.id ? 'active' : ''}
                  onClick={() => {
                    setTool({ type: 'select' })
                    setSelectedGuideId(guide.id)
                    clearElementSelection()
                  }}
                >
                  <span className={`visibility-dot ${guide.visible ? '' : 'hidden'}`} />
                  <span>{index + 1}. {guideLabel(guide, locale)}</span>
                </button>
              ))}
            </div>
          )}
        </section>

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

        <section className="panel-section symbols-section">
          <div className="section-title-row"><h2>{t.stitches}</h2><span className="muted-text">{SYMBOLS.length}</span></div>
          {groupedSymbols.map(([category, symbols]) => (
            <div className="symbol-group" key={category}>
              <h3>{categoryName(category, locale)}</h3>
              <div className="symbol-grid">
                {symbols.map((symbol) => {
                  const active = tool.type === 'place' && tool.symbolId === symbol.id
                  const label = symbolName(symbol.id, symbol.name, locale)
                  return (
                    <button
                      className={`symbol-button ${active ? 'active' : ''}`}
                      key={symbol.id}
                      title={label}
                      onClick={() => {
                        setTool({ type: 'place', symbolId: symbol.id })
                        clearElementSelection()
                        setSelectedGuideId(null)
                      }}
                    >
                      <svg viewBox="-24 -38 48 76" aria-hidden="true"><g className="symbol-glyph"><SymbolGlyph symbolId={symbol.id} /></g></svg>
                      <span>{label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      </aside>

      <main className="workspace">
        <button
          className="sidebar-toggle left"
          aria-label={locale === 'ru' ? 'Свернуть левую панель' : 'Toggle left sidebar'}
          onClick={() => setLeftCollapsed((value) => !value)}
        >{leftCollapsed ? '›' : '‹'}</button>
        <button
          className="sidebar-toggle right"
          aria-label={locale === 'ru' ? 'Свернуть правую панель' : 'Toggle right sidebar'}
          onClick={() => setRightCollapsed((value) => !value)}
        >{rightCollapsed ? '‹' : '›'}</button>

        <div className="canvas-toolbar">
          <button onClick={() => setViewport((value) => ({ ...value, zoom: clamp(value.zoom / 1.2, 0.1, 5) }))}>−</button>
          <button className="zoom-readout" onClick={resetView}>{Math.round(viewport.zoom * 100)}%</button>
          <button onClick={() => setViewport((value) => ({ ...value, zoom: clamp(value.zoom * 1.2, 0.1, 5) }))}>+</button>
          <button
            className="fit-button"
            aria-label={locale === 'ru' ? 'Вместить всю схему' : 'Fit all'}
            onClick={fitAll}
            disabled={!visibleElements.length}
          >{locale === 'ru' ? 'Всё' : 'All'}</button>
          <button
            className="fit-button"
            aria-label={locale === 'ru' ? 'Вместить выделение' : 'Fit selection'}
            onClick={fitSelection}
            disabled={!selectedIds.length}
          >{locale === 'ru' ? 'Выбор' : 'Sel'}</button>
          <span className="canvas-hint">{t.zoomHint}</span>
        </div>

        <svg
          ref={svgRef}
          className={`editor-canvas ${pan ? 'panning' : ''}`}
          onWheel={handleWheel}
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
              />
            ))}

            <StitchLayer
              elements={elements}
              selectedIds={selectedIds}
              primaryId={primaryId}
              zoom={viewport.zoom}
              sourceAnchor={snapping.sourceAnchor}
              marquee={marqueeRect}
              onElementPointerDown={handleElementPointerDown}
              onRotatePointerDown={handleRotatePointerDown}
            />

            {preview && (
              <g transform={`translate(${preview.x} ${preview.y}) rotate(${preview.rotation})`} className="preview-stitch">
                <g className="symbol-glyph"><SymbolGlyph symbolId={preview.symbolId} /></g>
              </g>
            )}

            {snapTarget && (
              <g className={`snap-indicator ${snapTarget.targetType === 'guide' ? 'guide-target' : ''}`} transform={`translate(${snapTarget.point.x} ${snapTarget.point.y})`}>
                <circle r={8 / viewport.zoom} vectorEffect="non-scaling-stroke" />
                <circle r={2.5 / viewport.zoom} vectorEffect="non-scaling-stroke" />
              </g>
            )}
          </g>
        </svg>

        <div className="statusbar">
          <span>{status}</span>
          <span>{elements.length} {t.stitchCount} · {guides.length} {t.guideCount}{selectedIds.length ? ` · ${selectedIds.length} ${t.selectedShort}` : ''}</span>
        </div>
      </main>

      <aside className="sidebar right-sidebar">
        <section className="panel-section">
          <div className="section-title-row"><h2>{t.snapping}</h2></div>
          <label className="toggle-row">
            <span><strong>{t.allowSnapping}</strong><small>{t.snappingHint}</small></span>
            <input type="checkbox" checked={snapping.enabled} onChange={(event) => setSnapping((value) => ({ ...value, enabled: event.target.checked }))} />
          </label>

          <fieldset disabled={!snapping.enabled}>
            <legend>{t.snapPoint}</legend>
            <div className="segmented-control">
              {(['top', 'center', 'bottom'] as AnchorName[]).map((anchor) => (
                <button key={anchor} className={snapping.sourceAnchor === anchor ? 'active' : ''} onClick={() => setSnapping((value) => ({ ...value, sourceAnchor: anchor }))}>
                  {anchorLabels[anchor]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={!snapping.enabled}>
            <legend>{t.orientation}</legend>
            <select value={snapping.orientationMode} onChange={(event) => setSnapping((value) => ({ ...value, orientationMode: event.target.value as OrientationMode }))}>
              <option value="none">{t.keepCurrent}</option>
              <option value="along">{t.alongTarget}</option>
              <option value="perpendicular">{t.perpendicular}</option>
            </select>
          </fieldset>

          <label className="toggle-row compact-toggle">
            <span>{t.snapToVertices}</span>
            <input type="checkbox" checked={snapping.snapToVertices} disabled={!snapping.enabled} onChange={(event) => setSnapping((value) => ({ ...value, snapToVertices: event.target.checked }))} />
          </label>
          <label className="range-row">
            <span>{t.snapRadius} <strong>{snapping.tolerancePx}px</strong></span>
            <input type="range" min="6" max="24" value={snapping.tolerancePx} disabled={!snapping.enabled} onChange={(event) => setSnapping((value) => ({ ...value, tolerancePx: Number(event.target.value) }))} />
          </label>
        </section>

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

        <section className="panel-section">
          <div className="section-title-row"><h2>{t.selection}</h2></div>

          {selectedParametricRow && selectedParametricGuide ? (
            <ParametricRowEditorPanel
              binding={selectedParametricRow}
              guide={selectedParametricGuide}
              locale={locale}
              parentStitchCount={selectedParametricParentCount}
              onChange={handleUpdateParametricRow}
              onDelete={() => handleDeleteParametricRow(selectedParametricRow.id)}
            />
          ) : selectedElement ? (
            <div className="selection-card">
              <div className="selection-preview">
                <svg viewBox="-30 -42 60 84"><g className="symbol-glyph"><SymbolGlyph symbolId={selectedElement.symbolId} /></g></svg>
              </div>
              <div>
                <strong>{symbolName(selectedElement.symbolId, SYMBOL_BY_ID.get(selectedElement.symbolId)?.name ?? selectedElement.symbolId, locale)}</strong>
                <small>x {Math.round(selectedElement.x)} · y {Math.round(selectedElement.y)}</small>
                <small>{Math.round(selectedElement.rotation)}°</small>
              </div>
              <div className="rotation-controls">
                <button onClick={() => rotateSelected(-15)}>−15°</button>
                <button onClick={() => rotateSelected(15)}>+15°</button>
              </div>
              <div className="selection-actions">
                <button onClick={copySelection}>{t.copy}</button>
                <button onClick={duplicateSelection}>{t.duplicate}</button>
              </div>
              <div className="layer-selection-controls">
                <button onClick={() => toggleElementVisible(selectedElement.id)}>{isElementVisible(selectedElement) ? t.hideLayer : t.showLayer}</button>
                <button onClick={() => toggleElementLocked(selectedElement.id)}>{t.lockLayer}</button>
              </div>
              <button className="danger-button" onClick={deleteSelected}>{t.delete}</button>
            </div>
          ) : selectedIds.length > 1 ? (
            <div className="multi-selection-card">
              <strong>{t.selectedCount}: {selectedIds.length}</strong>
              <small>{t.groupMoveHint}</small>
              <div className="rotation-controls">
                <button onClick={() => rotateSelected(-15)}>−15°</button>
                <button onClick={() => rotateSelected(15)}>+15°</button>
              </div>
              <div className="selection-actions">
                <button onClick={copySelection}>{t.copy}</button>
                <button onClick={duplicateSelection}>{t.duplicate}</button>
              </div>
              <button className="danger-button" onClick={deleteSelected}>{t.delete}</button>
            </div>
          ) : selectedGuide ? (
            <div className="guide-editor">
              <div className="guide-editor-heading"><strong>{guideLabel(selectedGuide, locale)}</strong><span>{selectedGuide.type}</span></div>
              <label className="toggle-row compact-toggle">
                <span>{t.visible}</span>
                <input type="checkbox" checked={selectedGuide.visible} onChange={(event) => updateSelectedGuide((guide) => ({ ...guide, visible: event.target.checked }))} />
              </label>

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

              <GuideRowGeneratorPanel
                guide={selectedGuide}
                locale={locale}
                onGenerate={handleGenerateGuideRow}
              />

              <p className="guide-note">{t.guideNote}</p>
              <button className="danger-button" onClick={deleteSelected}>{t.deleteGuide}</button>
            </div>
          ) : (
            <p className="empty-state">{t.emptySelection}</p>
          )}
        </section>

        <section className="panel-section help-section">
          <div className="section-title-row"><h2>{t.controls}</h2></div>
          <ul>
            <li>{t.help1}</li>
            <li>{t.help2}</li>
            <li>{t.help3}</li>
            <li>{t.help4}</li>
            <li>{t.help5}</li>
            <li>{t.help6}</li>
          </ul>
        </section>
      </aside>
    </div>
  )
}

export default App
