import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Guide, Point } from '../types'
import {
  applyGuideManipulation,
  gridRotationHandle,
  gridRotationStemPoint,
  guideCenter,
  guideResizeHandle,
  type GuideManipulationMode,
} from './guideManipulation'
import {
  arcRenderPoints,
  curveRenderPoints,
  gridLocalBounds,
  guideSnapPoints,
  lineRenderPoints,
  parabolaRenderPoints,
} from './guides'
import { guideNumericValue } from './guideValueLabel'
import { isPathGuide, pathPoseAt } from './pathGuides'

function pointsAttribute(points: { x: number; y: number }[]) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

type Props = {
  guide: Guide
  selected: boolean
  zoom: number
  onPointerDown: (event: ReactPointerEvent<SVGGElement>, guide: Guide) => void
  clientToDocument: (clientX: number, clientY: number) => Point
  onManipulationStart: () => void
  onManipulationPreview: (guide: Guide) => void
  onManipulationEnd: (
    mode: GuideManipulationMode,
    moved: boolean,
    cancelled: boolean,
  ) => void
  onReverse: (guide: Guide) => void
}

export function GuideRenderer({
  guide,
  selected,
  zoom,
  onPointerDown,
  clientToDocument,
  onManipulationStart,
  onManipulationPreview,
  onManipulationEnd,
  onReverse,
}: Props) {
  if (!guide.visible) return null

  const locked = guide.locked === true
  const snapPoints = guideSnapPoints(guide)
  const center = guideCenter(guide)
  const resizeHandle = selected ? guideResizeHandle(guide) : null
  const rotationHandle = selected ? gridRotationHandle(guide) : null
  const rotationStem = selected ? gridRotationStemPoint(guide) : null
  const directionPose = isPathGuide(guide) ? pathPoseAt(guide, 1) : null

  const startInteraction = (
    event: ReactPointerEvent<SVGElement>,
    mode: GuideManipulationMode,
  ) => {
    if (event.button !== 0) return

    onPointerDown(event as unknown as ReactPointerEvent<SVGGElement>, guide)
    if (!event.isPropagationStopped()) return
    if (locked) return

    event.preventDefault()

    const pointerId = event.pointerId
    const startClient = { x: event.clientX, y: event.clientY }
    const startPointer = clientToDocument(event.clientX, event.clientY)
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

      if (cancelled) {
        onManipulationPreview(guide)
      }
      onManipulationEnd(mode, moved, cancelled)
    }

    const handleMove = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return

      if (
        Math.hypot(
          nativeEvent.clientX - startClient.x,
          nativeEvent.clientY - startClient.y,
        ) > 1
      ) {
        moved = true
      }

      const currentPointer = clientToDocument(
        nativeEvent.clientX,
        nativeEvent.clientY,
      )
      onManipulationPreview(
        applyGuideManipulation(
          guide,
          mode,
          startPointer,
          currentPointer,
          nativeEvent.shiftKey,
        ),
      )
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

  const pointHandle = (
    key: string,
    point: Point,
    mode: GuideManipulationMode,
    className = '',
  ) => (
    <circle
      key={key}
      cx={point.x}
      cy={point.y}
      r={7 / zoom}
      className={`guide-handle ${className}`}
      vectorEffect="non-scaling-stroke"
      onPointerDown={(event) => startInteraction(event, mode)}
    />
  )

  const pathPolylines = (points: Point[]) => {
    const serialized = pointsAttribute(points)
    return (
      <>
        <polyline
          points={serialized}
          className="guide-snap-zone"
          data-testid="guide-snap-zone"
          fill="none"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
        <polyline
          points={serialized}
          className="guide-hit-area"
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        <polyline
          points={serialized}
          className="guide-stroke"
          fill="none"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      </>
    )
  }

  const gridLine = (
    key: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) => (
    <g key={key}>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className="guide-hit-area"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        className="guide-stroke"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
    </g>
  )

  const gridCircle = (key: string, radius: number) => (
    <g key={key}>
      <circle
        r={radius}
        className="guide-hit-area"
        fill="none"
        vectorEffect="non-scaling-stroke"
      />
      <circle
        r={radius}
        className="guide-stroke"
        fill="none"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
    </g>
  )

  return (
    <g
      className={`guide-layer guide-${guide.type} ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`}
      data-guide-id={guide.id}
      onPointerDown={(event) => startInteraction(event, 'move')}
      onDoubleClick={(event) => {
        if (locked || !isPathGuide(guide)) return
        event.preventDefault()
        event.stopPropagation()
        onReverse(guide)
      }}
    >
      {guide.type === 'arc' && pathPolylines(arcRenderPoints(guide))}

      {guide.type === 'line' && pathPolylines(lineRenderPoints(guide))}

      {guide.type === 'curve' && (
        <>
          {pathPolylines(curveRenderPoints(guide))}
          {selected && !locked && (
            <g className="guide-curve-controls" pointerEvents="none">
              <line
                x1={guide.start.x}
                y1={guide.start.y}
                x2={guide.control1.x}
                y2={guide.control1.y}
                className="guide-handle-link guide-control-link"
                vectorEffect="non-scaling-stroke"
              />
              <line
                x1={guide.end.x}
                y1={guide.end.y}
                x2={guide.control2.x}
                y2={guide.control2.y}
                className="guide-handle-link guide-control-link"
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
        </>
      )}

      {guide.type === 'parabola' && (
        <>
          {pathPolylines(parabolaRenderPoints(guide))}
          {selected && !locked && (
            <g className="guide-curve-controls" pointerEvents="none">
              <line x1={guide.start.x} y1={guide.start.y} x2={guide.control.x} y2={guide.control.y} className="guide-handle-link guide-control-link" vectorEffect="non-scaling-stroke" />
              <line x1={guide.end.x} y1={guide.end.y} x2={guide.control.x} y2={guide.control.y} className="guide-handle-link guide-control-link" vectorEffect="non-scaling-stroke" />
            </g>
          )}
        </>
      )}

      {guide.type === 'grid' && (() => {
        const { halfWidth, halfHeight } = gridLocalBounds(guide)
        const rows = Math.max(1, Math.round(guide.rows))
        const columns = Math.max(1, Math.round(guide.columns))
        return (
          <g transform={`translate(${guide.origin.x} ${guide.origin.y}) rotate(${guide.rotation})`}>
            {Array.from({ length: rows }, (_, row) => {
              const y = (row - (rows - 1) / 2) * guide.spacingY
              return gridLine(`row-${row}`, -halfWidth, y, halfWidth, y)
            })}
            {Array.from({ length: columns }, (_, column) => {
              const x = (column - (columns - 1) / 2) * guide.spacingX
              return gridLine(`column-${column}`, x, -halfHeight, x, halfHeight)
            })}
          </g>
        )
      })()}

      {guide.type === 'radial-grid' && (
        <g transform={`translate(${guide.center.x} ${guide.center.y})`}>
          {Array.from({ length: Math.max(1, Math.round(guide.ringCount)) }, (_, index) =>
            gridCircle(`ring-${index}`, (index + 1) * guide.ringSpacing),
          )}
          {Array.from({ length: Math.max(2, Math.round(guide.sectorCount)) }, (_, sector) => {
            const angle = guide.startAngle + (sector * 360) / Math.max(2, Math.round(guide.sectorCount))
            const radians = (angle * Math.PI) / 180
            const radius = Math.max(1, Math.round(guide.ringCount)) * guide.ringSpacing
            return gridLine(
              `sector-${sector}`,
              0,
              0,
              Math.cos(radians) * radius,
              Math.sin(radians) * radius,
            )
          })}
        </g>
      )}

      {directionPose && (
        <polygon
          points={`${-12 / zoom},${-5 / zoom} 0,0 ${-12 / zoom},${5 / zoom}`}
          transform={`translate(${directionPose.point.x} ${directionPose.point.y}) rotate(${directionPose.tangent})`}
          className="guide-direction-arrow"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
        />
      )}

      <text
        x={center.x + 12 / zoom}
        y={center.y + 20 / zoom}
        fontSize={12 / zoom}
        className="guide-value-label"
        pointerEvents="none"
        aria-hidden="true"
      >
        {guideNumericValue(guide)}
      </text>

      {selected && locked && (
        <text x={center.x + 10 / zoom} y={center.y - 10 / zoom} fontSize={12 / zoom} className="guide-lock-indicator">🔒</text>
      )}

      {snapPoints.map((snapPoint) => (
        <circle
          key={snapPoint.key}
          cx={snapPoint.point.x}
          cy={snapPoint.point.y}
          r={3 / zoom}
          className="guide-snap-point"
          data-testid="guide-snap-point"
          vectorEffect="non-scaling-stroke"
          pointerEvents="none"
          aria-hidden="true"
        />
      ))}

      {selected && !locked && (
        <g className="guide-manipulation-ui">
          {guide.type === 'line' && (
            <>
              {pointHandle('line-start', guide.start, 'start', 'guide-path-endpoint')}
              {pointHandle('line-end', guide.end, 'end', 'guide-path-endpoint')}
            </>
          )}

          {guide.type === 'curve' && (
            <>
              {pointHandle('curve-start', guide.start, 'start', 'guide-path-endpoint')}
              {pointHandle('curve-control1', guide.control1, 'control1', 'guide-control-handle')}
              {pointHandle('curve-control2', guide.control2, 'control2', 'guide-control-handle')}
              {pointHandle('curve-end', guide.end, 'end', 'guide-path-endpoint')}
            </>
          )}

          {guide.type === 'parabola' && (
            <>
              {pointHandle('parabola-start', guide.start, 'start', 'guide-path-endpoint')}
              {pointHandle('parabola-control', guide.control, 'control', 'guide-control-handle')}
              {pointHandle('parabola-end', guide.end, 'end', 'guide-path-endpoint')}
            </>
          )}

          {resizeHandle && (
            <>
              <line
                x1={center.x}
                y1={center.y}
                x2={resizeHandle.x}
                y2={resizeHandle.y}
                className="guide-handle-link"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={resizeHandle.x}
                cy={resizeHandle.y}
                r={7 / zoom}
                className="guide-handle guide-resize-handle"
                vectorEffect="non-scaling-stroke"
                onPointerDown={(event) => startInteraction(event, 'resize')}
              />
            </>
          )}

          {rotationHandle && rotationStem && (
            <>
              <line
                x1={rotationStem.x}
                y1={rotationStem.y}
                x2={rotationHandle.x}
                y2={rotationHandle.y}
                className="guide-handle-link"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={rotationHandle.x}
                cy={rotationHandle.y}
                r={7 / zoom}
                className="guide-handle guide-rotate-handle"
                vectorEffect="non-scaling-stroke"
                onPointerDown={(event) => startInteraction(event, 'rotate')}
              />
            </>
          )}

          <circle
            cx={center.x}
            cy={center.y}
            r={7 / zoom}
            className="guide-handle guide-move-handle"
            vectorEffect="non-scaling-stroke"
            onPointerDown={(event) => startInteraction(event, 'move')}
          />
        </g>
      )}
    </g>
  )
}
