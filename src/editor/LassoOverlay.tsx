import type { Point } from '../types'
import './lasso.css'

export type LassoMode = 'replace' | 'add' | 'subtract'

export function LassoOverlay({
  points,
  zoom,
  mode,
}: {
  points: Point[]
  zoom: number
  mode: LassoMode
}) {
  const path = points.length
    ? `M ${points.map((point) => `${point.x} ${point.y}`).join(' L ')}${points.length > 2 ? ' Z' : ''}`
    : ''

  return (
    <g className={`lasso-overlay ${mode}`} data-testid="lasso-overlay">
      <rect
        className="lasso-capture"
        x={-100000}
        y={-100000}
        width={200000}
        height={200000}
      />
      {path && (
        <path
          className="lasso-path"
          d={path}
          strokeWidth={1.5 / Math.max(zoom, 0.01)}
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}
    </g>
  )
}
