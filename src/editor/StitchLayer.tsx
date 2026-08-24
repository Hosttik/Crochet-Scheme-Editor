import type { PointerEvent as ReactPointerEvent } from 'react'
import { SYMBOLS, SYMBOL_BY_ID, SymbolGlyph } from '../symbols'
import type { AnchorName, StitchElement } from '../types'
import { isElementLocked, isElementVisible } from './document'
import { rowShapingMarkers } from './rowShaping'
import { selectionAabb, type Rect } from './selection'
import './rowShaping.css'

const SYMBOL_SIZES = Object.fromEntries(
  SYMBOLS.map((symbol) => [symbol.id, { width: symbol.width, height: symbol.height }]),
)

export function StitchLayer({
  elements,
  selectedIds,
  primaryId,
  zoom,
  sourceAnchor,
  marquee,
  onElementPointerDown,
  onRotatePointerDown,
}: {
  elements: StitchElement[]
  selectedIds: string[]
  primaryId: string | null
  zoom: number
  sourceAnchor: AnchorName
  marquee: Rect | null
  onElementPointerDown: (
    event: ReactPointerEvent<SVGGElement>,
    element: StitchElement,
  ) => void
  onRotatePointerDown: (
    event: ReactPointerEvent<SVGCircleElement>,
    element: StitchElement,
  ) => void
}) {
  const visibleElements = elements.filter(isElementVisible)
  const selectedSet = new Set(selectedIds)
  const shapingMarkers = rowShapingMarkers(elements)
  const groupBounds =
    selectedIds.length > 1
      ? selectionAabb(visibleElements, selectedIds, SYMBOL_SIZES)
      : null

  return (
    <>
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
        const locked = isElementLocked(element)
        const selected = selectedSet.has(element.id)
        const primary = selected && element.id === primaryId
        const definition = SYMBOL_BY_ID.get(element.symbolId)
        const width = definition?.width ?? 30
        const height = definition?.height ?? 30
        const handleY = -height / 2 - 30

        return (
          <g
            key={element.id}
            transform={`translate(${element.x} ${element.y}) rotate(${element.rotation})`}
            className={`stitch-element ${selected ? 'selected' : ''} ${locked ? 'locked' : ''} ${element.parametricRow ? 'parametric' : ''}`}
            pointerEvents={locked ? 'none' : undefined}
            onPointerDown={locked ? undefined : (event) => onElementPointerDown(event, element)}
          >
            {selected && (
              <rect
                x={-width / 2 - 8}
                y={-height / 2 - 8}
                width={width + 16}
                height={height + 16}
                rx="5"
                className="selection-box"
              />
            )}

            <g className="symbol-glyph">
              <SymbolGlyph symbolId={element.symbolId} />
            </g>

            {primary && selectedIds.length === 1 && definition && !locked && !element.parametricRow && (
              <>
                {(['top', 'center', 'bottom'] as AnchorName[]).map((anchor) => (
                  <circle
                    key={anchor}
                    cx={definition.anchors[anchor].x}
                    cy={definition.anchors[anchor].y}
                    r={4 / zoom}
                    className={`anchor-dot ${sourceAnchor === anchor ? 'source-anchor' : ''}`}
                    vectorEffect="non-scaling-stroke"
                    pointerEvents="none"
                  />
                ))}

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
          </g>
        )
      })}

      {visibleElements.map((element) => {
        const shaping = shapingMarkers.get(element.id)
        if (!shaping) return null
        const selected = selectedSet.has(element.id)
        const markerX = element.x + 13 / zoom
        const markerY = element.y - 13 / zoom
        return (
          <g
            key={`shaping:${element.id}`}
            transform={`translate(${markerX} ${markerY})`}
            className={`row-shaping-marker ${shaping} ${selected ? 'selected' : ''}`}
            pointerEvents="none"
            aria-hidden="true"
          >
            <circle r={7 / zoom} vectorEffect="non-scaling-stroke" />
            <text
              x="0"
              y={0.5 / zoom}
              fontSize={10 / zoom}
              textAnchor="middle"
              dominantBaseline="central"
            >
              {shaping === 'increase' ? '+' : '−'}
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
