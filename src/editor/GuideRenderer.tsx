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
import { arcRenderPoints, gridLocalBounds, guideSnapPoints } from './guides'

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
}: Props) {
  if (!guide.visible) return null

  const snapPoints = selected ? guideSnapPoints(guide) : []
  const center = guideCenter(guide)
  const resizeHandle = selected ? guideResizeHandle(guide) : null
  const rotationHandle = selected ? gridRotationHandle(guide) : null
  const rotationStem = selected ? gridRotationStemPoint(guide) : null

  const startInteraction = (
    event: ReactPointerEvent<SVGElement>,
    mode: GuideManipulationMode,
  ) => {
    if (event.button !== 0) return

    onPointerDown(event as unknown as ReactPointerEvent<SVGGElement>, guide)
    if (!event.isPropagationStopped()) return

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
          mode === 'rotate' && nativeEvent.shiftKey,
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

  return (
    <g
      className={`guide-layer guide-${guide.type} ${selected ? 'selected' : ''}`}
      onPointerDown={(event) => startInteraction(event, 'move')}
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

      {selected && (
        <g className="guide-manipulation-ui">
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
