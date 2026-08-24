import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { clamp, screenToDocument } from './editor/geometry'
import { solveSnap, type SnapCandidate } from './editor/snapping'
import { SYMBOLS, SYMBOL_BY_ID, SymbolGlyph, symbolSvgMarkup } from './symbols'
import type {
  AnchorName,
  CrochetProject,
  OrientationMode,
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

type Tool = { type: 'select' } | { type: 'place'; symbolId: string }

type DragState = {
  pointerId: number
  elementId: string
  pointerOffset: Point
  startElements: StitchElement[]
}

type PanState = {
  pointerId: number
  startPointer: Point
  startViewport: Viewport
}

type HistoryState = {
  past: StitchElement[][]
  future: StitchElement[][]
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

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

function serializeSvg(elements: StitchElement[]) {
  if (!elements.length) {
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><text x="320" y="240" text-anchor="middle" font-family="sans-serif" fill="#888">Empty crochet scheme</text></svg>'
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

function App() {
  const svgRef = useRef<SVGSVGElement>(null)
  const loadInputRef = useRef<HTMLInputElement>(null)
  const snapLockRef = useRef<string | null>(null)
  const spacePressedRef = useRef(false)
  const didDragRef = useRef(false)

  const [elements, setElements] = useState<StitchElement[]>([])
  const [history, setHistory] = useState<HistoryState>({ past: [], future: [] })
  const [tool, setTool] = useState<Tool>({ type: 'select' })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT)
  const [snapping, setSnapping] = useState<SnappingSettings>(DEFAULT_SNAPPING)
  const [preview, setPreview] = useState<StitchElement | null>(null)
  const [snapTarget, setSnapTarget] = useState<SnapCandidate | null>(null)
  const [drag, setDrag] = useState<DragState | null>(null)
  const [pan, setPan] = useState<PanState | null>(null)
  const [status, setStatus] = useState('Ready')

  const selectedElement = useMemo(
    () => elements.find((element) => element.id === selectedId) ?? null,
    [elements, selectedId],
  )

  const groupedSymbols = useMemo(() => {
    const groups = new Map<string, typeof SYMBOLS>()
    for (const symbol of SYMBOLS) {
      groups.set(symbol.category, [...(groups.get(symbol.category) ?? []), symbol])
    }
    return [...groups.entries()]
  }, [])

  const localPoint = useCallback((clientX: number, clientY: number): Point => {
    const rect = svgRef.current?.getBoundingClientRect()
    return {
      x: clientX - (rect?.left ?? 0),
      y: clientY - (rect?.top ?? 0),
    }
  }, [])

  const toDocumentPoint = useCallback(
    (screen: Point) => screenToDocument(screen, viewport),
    [viewport],
  )

  const recordSnapshot = useCallback((before: StitchElement[]) => {
    setHistory((current) => ({
      past: [...current.past.slice(-99), before],
      future: [],
    }))
  }, [])

  const commitElements = useCallback(
    (next: StitchElement[]) => {
      recordSnapshot(elements)
      setElements(next)
    },
    [elements, recordSnapshot],
  )

  const undo = useCallback(() => {
    const previous = history.past.at(-1)
    if (!previous) return

    setHistory({
      past: history.past.slice(0, -1),
      future: [elements, ...history.future].slice(0, 100),
    })
    setElements(previous)
    setSelectedId(null)
    setStatus('Undo')
  }, [elements, history])

  const redo = useCallback(() => {
    const next = history.future[0]
    if (!next) return

    setHistory({
      past: [...history.past, elements].slice(-100),
      future: history.future.slice(1),
    })
    setElements(next)
    setSelectedId(null)
    setStatus('Redo')
  }, [elements, history])

  const deleteSelected = useCallback(() => {
    if (!selectedId) return

    commitElements(elements.filter((element) => element.id !== selectedId))
    setSelectedId(null)
    setStatus('Element deleted')
  }, [commitElements, elements, selectedId])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        spacePressedRef.current = true
        if (event.target === document.body) event.preventDefault()
      }

      if (
        (event.key === 'Delete' || event.key === 'Backspace') &&
        !(event.target instanceof HTMLInputElement)
      ) {
        event.preventDefault()
        deleteSelected()
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault()
        if (event.shiftKey) redo()
        else undo()
      }

      if (event.key === 'Escape') {
        setTool({ type: 'select' })
        setPreview(null)
        setSnapTarget(null)
        setDrag(null)
        snapLockRef.current = null
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
  }, [deleteSelected, redo, undo])

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
    setPan({
      pointerId: event.pointerId,
      startPointer: screen,
      startViewport: viewport,
    })
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
    }

    const solved = solveSnap(
      proposed,
      elements,
      snapping,
      viewport,
      snapLockRef.current,
    )

    snapLockRef.current = solved.candidate?.key ?? null
    setSnapTarget(solved.candidate)
    setPreview({
      ...proposed,
      x: solved.x,
      y: solved.y,
      rotation: solved.rotation,
    })
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
      }

      const solved = solveSnap(
        proposed,
        elements,
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
      setSelectedId(placed.id)
      setStatus(`Placed ${SYMBOL_BY_ID.get(placed.symbolId)?.name ?? 'stitch'}`)
      return
    }

    setSelectedId(null)
  }

  const handleCanvasPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const screen = localPoint(event.clientX, event.clientY)
    const activePan = pan

    if (activePan && activePan.pointerId === event.pointerId) {
      setViewport({
        ...activePan.startViewport,
        panX:
          activePan.startViewport.panX + screen.x - activePan.startPointer.x,
        panY:
          activePan.startViewport.panY + screen.y - activePan.startPointer.y,
      })
      return
    }

    const documentPoint = toDocumentPoint(screen)
    const activeDrag = drag

    if (activeDrag && activeDrag.pointerId === event.pointerId) {
      const original = elements.find(
        (element) => element.id === activeDrag.elementId,
      )
      if (!original) return

      didDragRef.current = true

      const proposed: StitchElement = {
        ...original,
        x: documentPoint.x - activeDrag.pointerOffset.x,
        y: documentPoint.y - activeDrag.pointerOffset.y,
      }

      const solved = solveSnap(
        proposed,
        elements,
        snapping,
        viewport,
        snapLockRef.current,
      )

      snapLockRef.current = solved.candidate?.key ?? null
      setSnapTarget(solved.candidate)
      setElements((current) =>
        current.map((element) =>
          element.id === activeDrag.elementId
            ? {
                ...element,
                x: solved.x,
                y: solved.y,
                rotation: solved.rotation,
              }
            : element,
        ),
      )
      return
    }

    updatePreview(documentPoint)
  }

  const handleCanvasPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    const activePan = pan
    if (activePan && activePan.pointerId === event.pointerId) {
      setPan(null)
      return
    }

    const activeDrag = drag
    if (activeDrag && activeDrag.pointerId === event.pointerId) {
      if (didDragRef.current) {
        recordSnapshot(activeDrag.startElements)
        setStatus('Element moved')
      }

      didDragRef.current = false
      setDrag(null)
      setSnapTarget(null)
      snapLockRef.current = null
    }
  }

  const handleElementPointerDown = (
    event: ReactPointerEvent<SVGGElement>,
    element: StitchElement,
  ) => {
    if (
      tool.type !== 'select' ||
      event.button !== 0 ||
      spacePressedRef.current
    ) {
      return
    }

    event.stopPropagation()

    const documentPoint = toDocumentPoint(
      localPoint(event.clientX, event.clientY),
    )

    setSelectedId(element.id)
    setDrag({
      pointerId: event.pointerId,
      elementId: element.id,
      pointerOffset: {
        x: documentPoint.x - element.x,
        y: documentPoint.y - element.y,
      },
      startElements: elements,
    })
    didDragRef.current = false
    svgRef.current?.setPointerCapture(event.pointerId)
    snapLockRef.current = null
  }

  const rotateSelected = (delta: number) => {
    if (!selectedElement) return

    commitElements(
      elements.map((element) =>
        element.id === selectedElement.id
          ? { ...element, rotation: element.rotation + delta }
          : element,
      ),
    )
  }

  const saveProject = () => {
    const project: CrochetProject = {
      schemaVersion: 1,
      metadata: {
        title: 'Crochet scheme',
        updatedAt: new Date().toISOString(),
      },
      elements,
      settings: { snapping },
    }

    downloadText(
      'crochet-scheme.json',
      JSON.stringify(project, null, 2),
      'application/json',
    )
    setStatus('Project saved')
  }

  const loadProject = async (file: File) => {
    try {
      const project = JSON.parse(await file.text()) as CrochetProject
      if (project.schemaVersion !== 1 || !Array.isArray(project.elements)) {
        throw new Error('Unsupported project file')
      }

      setHistory({ past: [elements], future: [] })
      setElements(project.elements)
      setSnapping(project.settings?.snapping ?? DEFAULT_SNAPPING)
      setSelectedId(null)
      setTool({ type: 'select' })
      setPreview(null)
      setSnapTarget(null)
      setStatus(`Loaded ${project.elements.length} elements`)
    } catch (error) {
      setStatus(
        error instanceof Error ? error.message : 'Could not load project',
      )
    }
  }

  const exportSvg = () => {
    downloadText('crochet-scheme.svg', serializeSvg(elements), 'image/svg+xml')
    setStatus('SVG exported')
  }

  const resetView = () => setViewport(DEFAULT_VIEWPORT)

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">C</div>
          <div>
            <strong>Crochet Scheme Editor</strong>
            <span>Vector pattern workspace · MVP 0.2</span>
          </div>
        </div>

        <div className="topbar-actions">
          <button
            className="ghost-button"
            onClick={undo}
            disabled={!history.past.length}
          >
            Undo
          </button>
          <button
            className="ghost-button"
            onClick={redo}
            disabled={!history.future.length}
          >
            Redo
          </button>
          <span className="toolbar-separator" />
          <button className="ghost-button" onClick={saveProject}>
            Save JSON
          </button>
          <button
            className="ghost-button"
            onClick={() => loadInputRef.current?.click()}
          >
            Load
          </button>
          <button className="primary-button" onClick={exportSvg}>
            Export SVG
          </button>
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
          <div className="section-title-row">
            <h2>Tools</h2>
            <span className="badge">P0</span>
          </div>
          <button
            className={`tool-button ${tool.type === 'select' ? 'active' : ''}`}
            onClick={() => {
              setTool({ type: 'select' })
              setPreview(null)
              setSnapTarget(null)
            }}
          >
            <span>↖</span>
            Select & move
            <kbd>Esc</kbd>
          </button>
        </section>

        <section className="panel-section symbols-section">
          <div className="section-title-row">
            <h2>Stitches</h2>
            <span className="muted-text">{SYMBOLS.length}</span>
          </div>

          {groupedSymbols.map(([category, symbols]) => (
            <div className="symbol-group" key={category}>
              <h3>{category}</h3>
              <div className="symbol-grid">
                {symbols.map((symbol) => {
                  const active =
                    tool.type === 'place' && tool.symbolId === symbol.id

                  return (
                    <button
                      className={`symbol-button ${active ? 'active' : ''}`}
                      key={symbol.id}
                      title={symbol.name}
                      onClick={() => {
                        setTool({ type: 'place', symbolId: symbol.id })
                        setSelectedId(null)
                      }}
                    >
                      <svg viewBox="-24 -38 48 76" aria-hidden="true">
                        <g className="symbol-glyph">
                          <SymbolGlyph symbolId={symbol.id} />
                        </g>
                      </svg>
                      <span>{symbol.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </section>
      </aside>

      <main className="workspace">
        <div className="canvas-toolbar">
          <button
            onClick={() =>
              setViewport((value) => ({
                ...value,
                zoom: clamp(value.zoom / 1.2, 0.1, 5),
              }))
            }
          >
            −
          </button>
          <button className="zoom-readout" onClick={resetView}>
            {Math.round(viewport.zoom * 100)}%
          </button>
          <button
            onClick={() =>
              setViewport((value) => ({
                ...value,
                zoom: clamp(value.zoom * 1.2, 0.1, 5),
              }))
            }
          >
            +
          </button>
          <span className="canvas-hint">
            Wheel to zoom · Space + drag to pan
          </span>
        </div>

        <svg
          ref={svgRef}
          className={`editor-canvas ${pan ? 'panning' : ''}`}
          onWheel={handleWheel}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handleCanvasPointerMove}
          onPointerUp={handleCanvasPointerUp}
          onPointerCancel={handleCanvasPointerUp}
          onContextMenu={(event) => event.preventDefault()}
        >
          <defs>
            <pattern
              id="smallGrid"
              width="20"
              height="20"
              patternUnits="userSpaceOnUse"
            >
              <path
                d="M 20 0 L 0 0 0 20"
                fill="none"
                stroke="#dedbd4"
                strokeWidth="0.6"
              />
            </pattern>
            <pattern
              id="grid"
              width="100"
              height="100"
              patternUnits="userSpaceOnUse"
            >
              <rect width="100" height="100" fill="url(#smallGrid)" />
              <path
                d="M 100 0 L 0 0 0 100"
                fill="none"
                stroke="#cbc7be"
                strokeWidth="1"
              />
            </pattern>
          </defs>

          <g
            transform={`translate(${viewport.panX} ${viewport.panY}) scale(${viewport.zoom})`}
          >
            <rect
              x="-6000"
              y="-6000"
              width="12000"
              height="12000"
              fill="#fbfaf7"
            />
            <rect
              x="-6000"
              y="-6000"
              width="12000"
              height="12000"
              fill="url(#grid)"
            />
            <line
              x1="-6000"
              y1="0"
              x2="6000"
              y2="0"
              className="origin-line"
            />
            <line
              x1="0"
              y1="-6000"
              x2="0"
              y2="6000"
              className="origin-line"
            />

            {elements.map((element) => {
              const selected = element.id === selectedId
              const definition = SYMBOL_BY_ID.get(element.symbolId)

              return (
                <g
                  key={element.id}
                  transform={`translate(${element.x} ${element.y}) rotate(${element.rotation})`}
                  className={`stitch-element ${selected ? 'selected' : ''}`}
                  onPointerDown={(event) =>
                    handleElementPointerDown(event, element)
                  }
                >
                  {selected && (
                    <rect
                      x={-(definition?.width ?? 30) / 2 - 8}
                      y={-(definition?.height ?? 30) / 2 - 8}
                      width={(definition?.width ?? 30) + 16}
                      height={(definition?.height ?? 30) + 16}
                      rx="5"
                      className="selection-box"
                    />
                  )}

                  <g className="symbol-glyph">
                    <SymbolGlyph symbolId={element.symbolId} />
                  </g>

                  {selected &&
                    definition &&
                    (['top', 'center', 'bottom'] as AnchorName[]).map(
                      (anchor) => (
                        <circle
                          key={anchor}
                          cx={definition.anchors[anchor].x}
                          cy={definition.anchors[anchor].y}
                          r={4 / viewport.zoom}
                          className={`anchor-dot ${
                            snapping.sourceAnchor === anchor
                              ? 'source-anchor'
                              : ''
                          }`}
                          vectorEffect="non-scaling-stroke"
                        />
                      ),
                    )}
                </g>
              )
            })}

            {preview && (
              <g
                transform={`translate(${preview.x} ${preview.y}) rotate(${preview.rotation})`}
                className="preview-stitch"
              >
                <g className="symbol-glyph">
                  <SymbolGlyph symbolId={preview.symbolId} />
                </g>
              </g>
            )}

            {snapTarget && (
              <g
                className="snap-indicator"
                transform={`translate(${snapTarget.point.x} ${snapTarget.point.y})`}
              >
                <circle
                  r={8 / viewport.zoom}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  r={2.5 / viewport.zoom}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )}
          </g>
        </svg>

        <div className="statusbar">
          <span>{status}</span>
          <span>
            {elements.length} stitch{elements.length === 1 ? '' : 'es'}
          </span>
        </div>
      </main>

      <aside className="sidebar right-sidebar">
        <section className="panel-section">
          <div className="section-title-row">
            <h2>Snapping</h2>
          </div>

          <label className="toggle-row">
            <span>
              <strong>Allow snapping</strong>
              <small>Magnetize source anchor to nearby points</small>
            </span>
            <input
              type="checkbox"
              checked={snapping.enabled}
              onChange={(event) =>
                setSnapping((value) => ({
                  ...value,
                  enabled: event.target.checked,
                }))
              }
            />
          </label>

          <fieldset disabled={!snapping.enabled}>
            <legend>Snap point</legend>
            <div className="segmented-control">
              {(['top', 'center', 'bottom'] as AnchorName[]).map((anchor) => (
                <button
                  key={anchor}
                  className={
                    snapping.sourceAnchor === anchor ? 'active' : ''
                  }
                  onClick={() =>
                    setSnapping((value) => ({
                      ...value,
                      sourceAnchor: anchor,
                    }))
                  }
                >
                  {anchor[0].toUpperCase() + anchor.slice(1)}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset disabled={!snapping.enabled}>
            <legend>Orientation</legend>
            <select
              value={snapping.orientationMode}
              onChange={(event) =>
                setSnapping((value) => ({
                  ...value,
                  orientationMode: event.target.value as OrientationMode,
                }))
              }
            >
              <option value="none">Keep current</option>
              <option value="along">Along target</option>
              <option value="perpendicular">Perpendicular</option>
            </select>
          </fieldset>

          <label className="toggle-row compact-toggle">
            <span>Snap to vertices</span>
            <input
              type="checkbox"
              checked={snapping.snapToVertices}
              disabled={!snapping.enabled}
              onChange={(event) =>
                setSnapping((value) => ({
                  ...value,
                  snapToVertices: event.target.checked,
                }))
              }
            />
          </label>

          <label className="range-row">
            <span>
              Snap radius <strong>{snapping.tolerancePx}px</strong>
            </span>
            <input
              type="range"
              min="6"
              max="24"
              value={snapping.tolerancePx}
              disabled={!snapping.enabled}
              onChange={(event) =>
                setSnapping((value) => ({
                  ...value,
                  tolerancePx: Number(event.target.value),
                }))
              }
            />
          </label>
        </section>

        <section className="panel-section">
          <div className="section-title-row">
            <h2>Selection</h2>
          </div>

          {selectedElement ? (
            <div className="selection-card">
              <div className="selection-preview">
                <svg viewBox="-30 -42 60 84">
                  <g className="symbol-glyph">
                    <SymbolGlyph symbolId={selectedElement.symbolId} />
                  </g>
                </svg>
              </div>
              <div>
                <strong>
                  {SYMBOL_BY_ID.get(selectedElement.symbolId)?.name}
                </strong>
                <small>
                  x {Math.round(selectedElement.x)} · y{' '}
                  {Math.round(selectedElement.y)}
                </small>
                <small>{Math.round(selectedElement.rotation)}°</small>
              </div>
              <div className="rotation-controls">
                <button onClick={() => rotateSelected(-15)}>−15°</button>
                <button onClick={() => rotateSelected(15)}>+15°</button>
              </div>
              <button className="danger-button" onClick={deleteSelected}>
                Delete
              </button>
            </div>
          ) : (
            <p className="empty-state">
              Switch to Select and click a stitch to edit it.
            </p>
          )}
        </section>

        <section className="panel-section help-section">
          <div className="section-title-row">
            <h2>MVP controls</h2>
          </div>
          <ul>
            <li>Choose a stitch, then click the canvas.</li>
            <li>Use Select to drag existing stitches.</li>
            <li>Snapping uses Top / Center / Bottom anchors.</li>
            <li>Mouse wheel zooms around the pointer.</li>
            <li>Hold Space and drag to pan.</li>
            <li>Delete/Backspace removes selection.</li>
          </ul>
        </section>
      </aside>
    </div>
  )
}

export default App
