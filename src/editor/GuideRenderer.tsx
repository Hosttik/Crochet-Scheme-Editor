import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Guide } from '../types'
import { arcRenderPoints, gridLocalBounds, guideSnapPoints } from './guides'

function pointsAttribute(points: { x: number; y: number }[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

export function GuideRenderer({
  guide,
  selected,
  zoom,
  onPointerDown,
}: {
  guide: Guide
  selected: boolean
  zoom: number
  onPointerDown: (event: ReactPointerEvent<SVGGElement>, guide: Guide) => void
}) {
  if (!guide.visible) return null

  const snapPoints = selected ? guideSnapPoints(guide) : []

  return (
    <g
      className={`guide-layer guide-${guide.type} ${selected ? 'selected' : ''}`}
      onPointerDown={(event) => onPointerDown(event, guide)}
    >
      {guide.type === 'arc' && (
        <polyline
          points={pointsAttribute(arcRenderPoints(guide))}
          className="guide-stroke guide-hit-target"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
      )}

      {guide.type === 'grid' && (() => {
        const { halfWidth, halfHeight } = gridLocalBounds(guide)
        const rows = Math.max(1, Math.round(guide.rows))
        const columns = Math.max(1, Math.round(guide.columns))
        return (
          <g transform={`translate(${guide.origin.x} ${guide.origin.y}) rotate(${guide.rotation})`}>
            {Array.from({ length: rows }, (_, row) => {
              const y = (row - (rows - 1) / 2) * guide.spacingY
              return (
                <line
                  key={`row-${row}`}
                  x1={-halfWidth}
                  y1={y}
                  x2={halfWidth}
                  y2={y}
                  className="guide-stroke guide-hit-target"
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
            {Array.from({ length: columns }, (_, column) => {
              const x = (column - (columns - 1) / 2) * guide.spacingX
              return (
                <line
                  key={`column-${column}`}
                  x1={x}
                  y1={-halfHeight}
                  x2={x}
                  y2={halfHeight}
                  className="guide-stroke guide-hit-target"
                  vectorEffect="non-scaling-stroke"
                />
              )
            })}
          </g>
        )
      })()}

      {guide.type === 'radial-grid' && (
        <g transform={`translate(${guide.center.x} ${guide.center.y})`}>
          {Array.from({ length: Math.max(1, Math.round(guide.ringCount)) }, (_, index) => (
            <circle
              key={`ring-${index}`}
              r={(index + 1) * guide.ringSpacing}
              className="guide-stroke guide-hit-target"
              fill="none"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {Array.from({ length: Math.max(2, Math.round(guide.sectorCount)) }, (_, sector) => {
            const angle = guide.startAngle + (sector * 360) / Math.max(2, Math.round(guide.sectorCount))
            const radians = (angle * Math.PI) / 180
            const radius = Math.max(1, Math.round(guide.ringCount)) * guide.ringSpacing
            return (
              <line
                key={`sector-${sector}`}
                x1="0"
                y1="0"
                x2={Math.cos(radians) * radius}
                y2={Math.sin(radians) * radius}
                className="guide-stroke guide-hit-target"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
        </g>
      )}

      {snapPoints.map((snapPoint) => (
        <circle
          key={snapPoint.key}
          cx={snapPoint.point.x}
          cy={snapPoint.point.y}
          r={3 / zoom}
          className="guide-snap-point"
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </g>
  )
}
