import type { PointerEvent as ReactPointerEvent } from 'react'
import { SYMBOL_BY_ID } from '../symbols'
import type { GaugeSettings, MeasurementRuler, Point, StitchElement } from '../types'
import { rulerCorridorPolygon, rulerDisplayLabel, rulerEstimate } from './gauge'

function midpoint(start: Point, end: Point) {
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
}

export function RulerLayer({ rulers, selectedId, draft, elements, gauge, locale, zoom, onSelect, onHandlePointerDown }: {
  rulers: MeasurementRuler[]
  selectedId: string | null
  draft: { start: Point; end: Point } | null
  elements: StitchElement[]
  gauge: GaugeSettings
  locale: 'ru' | 'en'
  zoom: number
  onSelect: (id: string) => void
  onHandlePointerDown: (event: ReactPointerEvent<SVGCircleElement>, ruler: MeasurementRuler, endpoint: 'start' | 'end') => void
}) {
  const byId = new Map(elements.map((element) => [element.id, element]))
  return (
    <g className="measurement-rulers">
      {rulers.map((ruler) => {
        const selected = ruler.id === selectedId
        const center = midpoint(ruler.start, ruler.end)
        const label = rulerDisplayLabel(ruler, elements, gauge, locale)
        const estimate = rulerEstimate(ruler, elements, gauge)
        const corridor = selected ? rulerCorridorPolygon(ruler) : []
        const counted = selected && estimate.source === 'automatic' ? (estimate.elementIds ?? []) : []
        return (
          <g key={ruler.id} className={`measurement-ruler ${selected ? 'selected' : ''}`} data-ruler-id={ruler.id}>
            {corridor.length === 4 && (
              <polygon
                points={corridor.map((point) => `${point.x},${point.y}`).join(' ')}
                className="ruler-corridor"
                data-testid="ruler-corridor"
                vectorEffect="non-scaling-stroke"
                pointerEvents="none"
              />
            )}
            {counted.map((id) => {
              const element = byId.get(id)
              if (!element) return null
              const definition = SYMBOL_BY_ID.get(element.symbolId)
              const width = (definition?.width ?? 30) + 8 / zoom
              const height = (definition?.height ?? 30) + 8 / zoom
              return (
                <rect
                  key={`counted:${id}`}
                  x={-width / 2}
                  y={-height / 2}
                  width={width}
                  height={height}
                  rx={5 / zoom}
                  transform={`translate(${element.x} ${element.y}) rotate(${element.rotation})`}
                  className="ruler-counted-element"
                  data-counted-element-id={id}
                  vectorEffect="non-scaling-stroke"
                  pointerEvents="none"
                />
              )
            })}
            <line x1={ruler.start.x} y1={ruler.start.y} x2={ruler.end.x} y2={ruler.end.y} className="ruler-hit-line" strokeWidth={16 / zoom} pointerEvents="none" />
            <line x1={ruler.start.x} y1={ruler.start.y} x2={ruler.end.x} y2={ruler.end.y} className="ruler-line" vectorEffect="non-scaling-stroke" pointerEvents="none" />
            <line x1={ruler.start.x} y1={ruler.start.y - 7 / zoom} x2={ruler.start.x} y2={ruler.start.y + 7 / zoom} className="ruler-tick" vectorEffect="non-scaling-stroke" pointerEvents="none" />
            <line x1={ruler.end.x} y1={ruler.end.y - 7 / zoom} x2={ruler.end.x} y2={ruler.end.y + 7 / zoom} className="ruler-tick" vectorEffect="non-scaling-stroke" pointerEvents="none" />
            <text
              x={center.x}
              y={center.y - 10 / zoom}
              className="ruler-label"
              fontSize={12 / zoom}
              strokeWidth={4 / zoom}
              textAnchor="middle"
              pointerEvents="auto"
              onPointerDown={(event) => {
                if (event.button !== 0) return
                event.stopPropagation()
                onSelect(ruler.id)
              }}
            >{label}</text>
            {selected && (
              <>
                <circle cx={ruler.start.x} cy={ruler.start.y} r={7 / zoom} className="ruler-handle" vectorEffect="non-scaling-stroke" onPointerDown={(event) => onHandlePointerDown(event, ruler, 'start')} />
                <circle cx={ruler.end.x} cy={ruler.end.y} r={7 / zoom} className="ruler-handle" vectorEffect="non-scaling-stroke" onPointerDown={(event) => onHandlePointerDown(event, ruler, 'end')} />
              </>
            )}
          </g>
        )
      })}
      {draft && (
        <g className="measurement-ruler draft" pointerEvents="none">
          <line x1={draft.start.x} y1={draft.start.y} x2={draft.end.x} y2={draft.end.y} className="ruler-line" vectorEffect="non-scaling-stroke" />
          <circle cx={draft.start.x} cy={draft.start.y} r={5 / zoom} className="ruler-draft-point" vectorEffect="non-scaling-stroke" />
          <circle cx={draft.end.x} cy={draft.end.y} r={5 / zoom} className="ruler-draft-point" vectorEffect="non-scaling-stroke" />
        </g>
      )}
    </g>
  )
}
