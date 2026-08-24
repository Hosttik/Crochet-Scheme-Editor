import type { StitchElement } from '../types'
import {
  normalizeRowConstruction,
  rowConstructionDirectionSymbol,
} from './rowConstruction'
import './rowConstruction.css'

export function RowConstructionOverlay({
  elements,
  selectedIds,
  zoom,
}: {
  elements: StitchElement[]
  selectedIds: string[]
  zoom: number
}) {
  if (!selectedIds.length) return null
  const selected = new Set(selectedIds)
  const selectedElements = elements.filter((element) => selected.has(element.id))
  if (selectedElements.length !== selectedIds.length || !selectedElements.length) return null
  const rowIds = new Set(
    selectedElements
      .map((element) => element.parametricRow?.id)
      .filter((id): id is string => Boolean(id)),
  )
  if (rowIds.size !== 1) return null

  const rowId = [...rowIds][0]
  const binding = selectedElements[0]?.parametricRow
  const construction = normalizeRowConstruction(binding?.construction)
  if (!binding || !construction) return null

  const row = elements.filter((element) => element.parametricRow?.id === rowId)
  if (!row.length) return null
  const ordered = construction.direction === 'reverse' ? [...row].reverse() : row
  const start = ordered[0]
  const end = ordered.at(-1) ?? start
  const next = ordered[1] ?? end
  const directionX = (start.x + next.x) / 2
  const directionY = (start.y + next.y) / 2
  const joinX = (start.x + end.x) / 2
  const joinY = (start.y + end.y) / 2
  const markerRadius = 9 / zoom
  const fontSize = 10 / zoom

  return (
    <g className="row-construction-overlay" aria-hidden="true">
      {construction.mode === 'joined' && start.id !== end.id && (
        <>
          <line
            x1={end.x}
            y1={end.y}
            x2={start.x}
            y2={start.y}
            className="row-construction-path"
            vectorEffect="non-scaling-stroke"
          />
          {construction.joinWithSlipStitch && (
            <text
              x={joinX}
              y={joinY - 9 / zoom}
              fontSize={fontSize}
              textAnchor="middle"
              className="row-construction-join-label"
            >
              SL
            </text>
          )}
        </>
      )}

      <g className="row-construction-marker" transform={`translate(${start.x} ${start.y})`}>
        <circle r={markerRadius} vectorEffect="non-scaling-stroke" />
        <text x="0" y={0.5 / zoom} fontSize={fontSize} textAnchor="middle" dominantBaseline="central">S</text>
      </g>

      <g className="row-construction-marker" transform={`translate(${end.x} ${end.y})`}>
        <circle r={markerRadius} vectorEffect="non-scaling-stroke" />
        <text x="0" y={0.5 / zoom} fontSize={fontSize} textAnchor="middle" dominantBaseline="central">E</text>
      </g>

      <g className="row-construction-direction">
        <text x={directionX} y={directionY - 12 / zoom} fontSize={14 / zoom} textAnchor="middle">
          {rowConstructionDirectionSymbol(construction)}
        </text>
        {construction.startChainCount > 0 && (
          <text x={start.x} y={start.y + 20 / zoom} fontSize={fontSize} textAnchor="middle">
            CH×{construction.startChainCount}
          </text>
        )}
        {construction.mode === 'turning' && (
          <text x={end.x} y={end.y + 20 / zoom} fontSize={14 / zoom} textAnchor="middle">↩</text>
        )}
      </g>
    </g>
  )
}
