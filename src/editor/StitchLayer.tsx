import { useEffect, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { SYMBOLS, SYMBOL_BY_ID, SymbolGlyph } from '../symbols'
import type { AnchorName, Point, StitchElement, StitchGeometry } from '../types'
import { isElementLocked, isElementVisible } from './document'
import { RowConstructionOverlay } from './RowConstructionOverlay'
import { selectionAabb, type Rect } from './selection'
import {
  documentPointToElementLocal,
  geometryFromHandleDrag,
  normalizedStitchGeometry,
  resolvedStitchGeometry,
  stitchLocalAnchor,
  stitchVisualSize,
  supportsSemanticSpread,
  type StitchGeometryHandle,
} from './stitchGeometry'
import { topologyChangeMarkers, type TopologyChangeMarker } from './topology'
import './rowShaping.css'
import './topology.css'

const SYMBOL_SIZES = Object.fromEntries(
  SYMBOLS.map((symbol) => [symbol.id, { width: symbol.width, height: symbol.height }]),
)

type GeometryDragState = {
  pointerId: number
  elementId: string
  handle: StitchGeometryHandle
  startElement: StitchElement
  startLocal: Point
  geometry: StitchGeometry
}

function sameGeometry(left?: StitchGeometry, right?: StitchGeometry) {
  return (
    (left?.scaleX ?? 1) === (right?.scaleX ?? 1) &&
    (left?.scaleY ?? 1) === (right?.scaleY ?? 1) &&
    (left?.spread ?? 1) === (right?.spread ?? 1)
  )
}

export function StitchLayer({
  elements,
  selectedIds,
  primaryId,
  zoom,
  sourceAnchor,
  marquee,
  selectedTopologyParentId,
  clientToDocument,
  onElementPointerDown,
  onRotatePointerDown,
  onGeometryCommit,
  onTopologyMarkerPointerDown,
}: {
  elements: StitchElement[]
  selectedIds: string[]
  primaryId: string | null
  zoom: number
  sourceAnchor: AnchorName
  marquee: Rect | null
  selectedTopologyParentId?: string | null
  clientToDocument: (clientX: number, clientY: number) => Point
  onElementPointerDown: (
    event: ReactPointerEvent<SVGGElement>,
    element: StitchElement,
  ) => void
  onRotatePointerDown: (
    event: ReactPointerEvent<SVGCircleElement>,
    element: StitchElement,
  ) => void
  onGeometryCommit: (elementId: string, geometry?: StitchGeometry) => void
  onTopologyMarkerPointerDown?: (
    event: ReactPointerEvent<SVGGElement>,
    marker: TopologyChangeMarker,
  ) => void
}) {
  const [geometryDrag, setGeometryDrag] = useState<GeometryDragState | null>(null)
  const visibleElements = elements.filter(isElementVisible)
  const selectedSet = new Set(selectedIds)
  const changeMarkers = topologyChangeMarkers(elements)
  const markerByChildId = new Map(changeMarkers.map((marker) => [marker.childId, marker]))
  const elementById = new Map(visibleElements.map((element) => [element.id, element]))
  const selectedElements = elements.filter((element) => selectedSet.has(element.id))
  const selectedRowIds = new Set(
    selectedElements.map((element) => element.parametricRow?.id).filter((id): id is string => Boolean(id)),
  )
  const topologyRowId =
    selectedElements.length === selectedIds.length && selectedRowIds.size === 1
      ? [...selectedRowIds][0]
      : null
  const topologyEdges = topologyRowId
    ? visibleElements.flatMap((child) => {
        if (child.parametricRow?.id !== topologyRowId) return []
        return (child.parentStitchIds ?? []).flatMap((parentId) => {
          const parent = elementById.get(parentId)
          return parent ? [{ parent, child }] : []
        })
      })
    : []
  const previewElements = geometryDrag
    ? visibleElements.map((element) => element.id === geometryDrag.elementId
      ? { ...element, geometry: geometryDrag.geometry }
      : element)
    : visibleElements
  const groupBounds =
    selectedIds.length > 1
      ? selectionAabb(previewElements, selectedIds, SYMBOL_SIZES)
      : null

  useEffect(() => {
    if (!geometryDrag) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setGeometryDrag(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [geometryDrag])

  const startGeometryDrag = (
    event: ReactPointerEvent<SVGCircleElement>,
    element: StitchElement,
    handle: StitchGeometryHandle,
  ) => {
    if (event.button !== 0 || isElementLocked(element) || element.parametricRow) return
    event.preventDefault()
    event.stopPropagation()
    const point = clientToDocument(event.clientX, event.clientY)
    const geometry = normalizedStitchGeometry(element.symbolId, resolvedStitchGeometry(element)) ?? {}
    setGeometryDrag({
      pointerId: event.pointerId,
      elementId: element.id,
      handle,
      startElement: { ...element, geometry },
      startLocal: documentPointToElementLocal(element, point),
      geometry,
    })
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const moveGeometryDrag = (event: ReactPointerEvent<SVGCircleElement>) => {
    const active = geometryDrag
    if (!active || active.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    const point = clientToDocument(event.clientX, event.clientY)
    const currentLocal = documentPointToElementLocal(active.startElement, point)
    const geometry = normalizedStitchGeometry(
      active.startElement.symbolId,
      geometryFromHandleDrag(active.startElement, active.handle, active.startLocal, currentLocal),
    ) ?? {}
    setGeometryDrag({ ...active, geometry })
  }

  const finishGeometryDrag = (event: ReactPointerEvent<SVGCircleElement>, cancelled = false) => {
    const active = geometryDrag
    if (!active || active.pointerId !== event.pointerId) return
    event.preventDefault()
    event.stopPropagation()
    setGeometryDrag(null)
    if (cancelled) return
    const before = normalizedStitchGeometry(active.startElement.symbolId, active.startElement.geometry ?? {})
    const after = normalizedStitchGeometry(active.startElement.symbolId, active.geometry)
    if (!sameGeometry(before, after)) onGeometryCommit(active.elementId, after)
  }

  return (
    <>
      {topologyEdges.length > 0 && (
        <g className="stitch-topology" pointerEvents="none" aria-hidden="true">
          {topologyEdges.map(({ parent, child }, index) => (
            <line
              key={`${parent.id}:${child.id}:${index}`}
              x1={parent.x}
              y1={parent.y}
              x2={child.x}
              y2={child.y}
              className="stitch-topology-link"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </g>
      )}

      <RowConstructionOverlay elements={previewElements} selectedIds={selectedIds} zoom={zoom} />

      {groupBounds && (
        <rect
          x={groupBounds.left}
          y={groupBounds.top}
          width={groupBounds.right - groupBounds.left}
          height={groupBounds.bottom - groupBounds.top}
          className="group-selection-box"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}

      {visibleElements.map((element) => {
        const renderElement = geometryDrag?.elementId === element.id
          ? { ...element, geometry: geometryDrag.geometry }
          : element
        const locked = isElementLocked(element)
        const selected = selectedSet.has(element.id)
        const primary = selected && element.id === primaryId
        const definition = SYMBOL_BY_ID.get(element.symbolId)
        const { width, height } = stitchVisualSize(renderElement)
        const geometry = resolvedStitchGeometry(renderElement)
        const hitWidth = Math.max(38, width + 18)
        const hitHeight = Math.max(38, height + 18)
        const handleY = -height / 2 - 30
        const attached = Boolean(element.guideAttachment)
        const canDirectRotate = !element.parametricRow && (
          !element.guideAttachment || element.guideAttachment.orientation === 'keep'
        )
        const geometryEditable = primary && selectedIds.length === 1 && !locked && !element.parametricRow
        const glyphScaleX = element.mirrored ? -geometry.scaleX : geometry.scaleX

        return (
          <g
            key={element.id}
            transform={`translate(${element.x} ${element.y}) rotate(${element.rotation})`}
            className={`stitch-element ${selected ? 'selected' : ''} ${locked ? 'locked' : ''} ${element.parametricRow ? 'parametric' : ''} ${attached ? 'attached' : ''}`}
            data-guide-attached={attached ? 'true' : undefined}
            data-scale-x={geometry.scaleX}
            data-scale-y={geometry.scaleY}
            data-spread={geometry.spread}
            pointerEvents={locked ? 'none' : undefined}
            onPointerDown={locked ? undefined : (event) => onElementPointerDown(event, element)}
          >
            <rect
              x={-hitWidth / 2}
              y={-hitHeight / 2}
              width={hitWidth}
              height={hitHeight}
              rx="7"
              className="stitch-hit-target"
              aria-hidden="true"
            />

            {selected && !groupBounds && (
              <rect
                x={-width / 2 - 8}
                y={-height / 2 - 8}
                width={width + 16}
                height={height + 16}
                rx="5"
                className="selection-box"
              />
            )}

            <g
              className="symbol-glyph"
              transform={`scale(${glyphScaleX} ${geometry.scaleY})`}
              style={element.color ? { color: element.color } : undefined}
            >
              <SymbolGlyph symbolId={element.symbolId} spread={geometry.spread} />
            </g>

            {attached && (
              <circle
                cx={width / 2 + 7}
                cy={-height / 2 - 7}
                r={4.5 / zoom}
                className="stitch-guide-attachment-badge"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            )}

            {geometryEditable && definition && (
              <>
                {(['top', 'center', 'bottom'] as AnchorName[]).map((anchor) => {
                  const position = stitchLocalAnchor(renderElement, anchor)
                  return (
                    <circle
                      key={anchor}
                      cx={position.x}
                      cy={position.y}
                      r={4 / zoom}
                      className={`anchor-dot ${sourceAnchor === anchor ? 'source-anchor' : ''}`}
                      vectorEffect="non-scaling-stroke"
                      pointerEvents="none"
                    />
                  )
                })}

                <circle
                  cx={width / 2 + 8 / zoom}
                  cy={height / 2 + 8 / zoom}
                  r={7 / zoom}
                  className="stitch-geometry-handle uniform"
                  data-testid="stitch-resize-uniform"
                  aria-label="Resize stitch"
                  vectorEffect="non-scaling-stroke"
                  onPointerDown={(event) => startGeometryDrag(event, renderElement, 'uniform')}
                  onPointerMove={moveGeometryDrag}
                  onPointerUp={finishGeometryDrag}
                  onPointerCancel={(event) => finishGeometryDrag(event, true)}
                />
                <circle
                  cx="0"
                  cy={height / 2 + 8 / zoom}
                  r={6.5 / zoom}
                  className="stitch-geometry-handle height"
                  data-testid="stitch-resize-height"
                  aria-label="Resize stitch height"
                  vectorEffect="non-scaling-stroke"
                  onPointerDown={(event) => startGeometryDrag(event, renderElement, 'height')}
                  onPointerMove={moveGeometryDrag}
                  onPointerUp={finishGeometryDrag}
                  onPointerCancel={(event) => finishGeometryDrag(event, true)}
                />
                {supportsSemanticSpread(element.symbolId) && (
                  <circle
                    cx={width / 2 + 8 / zoom}
                    cy="0"
                    r={6.5 / zoom}
                    className="stitch-geometry-handle spread"
                    data-testid="stitch-spread-handle"
                    aria-label="Adjust stitch spread"
                    vectorEffect="non-scaling-stroke"
                    onPointerDown={(event) => startGeometryDrag(event, renderElement, 'spread')}
                    onPointerMove={moveGeometryDrag}
                    onPointerUp={finishGeometryDrag}
                    onPointerCancel={(event) => finishGeometryDrag(event, true)}
                  />
                )}

                {canDirectRotate && (
                  <>
                    <line
                      x1="0"
                      y1={-height / 2 - 8}
                      x2="0"
                      y2={handleY}
                      className="stitch-rotation-link"
                      vectorEffect="non-scaling-stroke"
                      pointerEvents="none"
                    />
                    <circle
                      cx="0"
                      cy={handleY}
                      r={7 / zoom}
                      className="stitch-rotation-handle"
                      vectorEffect="non-scaling-stroke"
                      onPointerDown={(event) => onRotatePointerDown(event, element)}
                    />
                  </>
                )}
              </>
            )}
          </g>
        )
      })}

      {visibleElements.map((element) => {
        const marker = markerByChildId.get(element.id)
        if (!marker) return null
        const selected = selectedSet.has(element.id)
        const editable = Boolean(topologyRowId && element.parametricRow?.id === topologyRowId)
        const active = editable && marker.parentId === selectedTopologyParentId
        const markerX = element.x + 13 / zoom
        const markerY = element.y - 13 / zoom
        return (
          <g
            key={`shaping:${element.id}`}
            transform={`translate(${markerX} ${markerY})`}
            className={`row-shaping-marker ${marker.kind} ${selected ? 'selected' : ''} ${editable ? 'editable' : ''} ${active ? 'topology-active' : ''}`}
            pointerEvents={editable ? 'all' : 'none'}
            aria-hidden={editable ? undefined : true}
            role={editable ? 'button' : undefined}
            onPointerDown={editable && onTopologyMarkerPointerDown
              ? (event) => onTopologyMarkerPointerDown(event, marker)
              : undefined}
          >
            <circle r={(active ? 9 : 7) / zoom} vectorEffect="non-scaling-stroke" />
            <text
              x="0"
              y={0.5 / zoom}
              fontSize={10 / zoom}
              textAnchor="middle"
              dominantBaseline="central"
              pointerEvents="none"
            >
              {marker.kind === 'increase' ? '+' : '−'}
            </text>
          </g>
        )
      })}

      {marquee && (
        <rect
          x={marquee.left}
          y={marquee.top}
          width={marquee.right - marquee.left}
          height={marquee.bottom - marquee.top}
          className="marquee-selection"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}
    </>
  )
}
