import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Point, RowMarker } from '../types'
import {
  isRowMarkerLocked,
  isRowMarkerVisible,
  normalizedRowMarkerColor,
  normalizedRowMarkerLabelAngle,
  rowMarkerLabelGeometry,
} from './rowMarkers'

type Props = {
  markers: RowMarker[]
  selectedId: string | null
  zoom: number
  clientToDocument: (clientX: number, clientY: number) => Point
  onSelect: (id: string) => void
  onMoveStart: () => void
  onMovePreview: (marker: RowMarker) => void
  onMoveEnd: (moved: boolean, cancelled: boolean, marker: RowMarker) => void
}

export function RowMarkerLayer({
  markers,
  selectedId,
  zoom,
  clientToDocument,
  onSelect,
  onMoveStart,
  onMovePreview,
  onMoveEnd,
}: Props) {
  const startDrag = (event: ReactPointerEvent<SVGGElement>, marker: RowMarker) => {
    if (event.button !== 0) return
    event.stopPropagation()
    onSelect(marker.id)
    if (isRowMarkerLocked(marker)) return
    event.preventDefault()

    const pointerId = event.pointerId
    const startClient = { x: event.clientX, y: event.clientY }
    const startPointer = clientToDocument(event.clientX, event.clientY)
    let moved = false
    let finished = false
    let previewMarker = marker
    onMoveStart()

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
      if (cancelled) onMovePreview(marker)
      onMoveEnd(moved, cancelled, cancelled ? marker : previewMarker)
    }

    const handleMove = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return
      if (Math.hypot(nativeEvent.clientX - startClient.x, nativeEvent.clientY - startClient.y) > 1) moved = true
      const current = clientToDocument(nativeEvent.clientX, nativeEvent.clientY)
      previewMarker = {
        ...marker,
        x: marker.x + current.x - startPointer.x,
        y: marker.y + current.y - startPointer.y,
      }
      onMovePreview(previewMarker)
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

  const startDirectionDrag = (event: ReactPointerEvent<SVGCircleElement>, marker: RowMarker) => {
    if (event.button !== 0 || isRowMarkerLocked(marker)) return
    event.preventDefault()
    event.stopPropagation()
    onSelect(marker.id)

    const pointerId = event.pointerId
    const startClient = { x: event.clientX, y: event.clientY }
    let moved = false
    let finished = false
    let previewMarker = marker
    onMoveStart()

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
      if (cancelled) onMovePreview(marker)
      onMoveEnd(moved, cancelled, cancelled ? marker : previewMarker)
    }

    const handleMove = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return
      if (Math.hypot(nativeEvent.clientX - startClient.x, nativeEvent.clientY - startClient.y) > 1) moved = true
      const current = clientToDocument(nativeEvent.clientX, nativeEvent.clientY)
      let angle = Math.atan2(current.y - marker.y, current.x - marker.x) * 180 / Math.PI
      if (nativeEvent.shiftKey) angle = Math.round(angle / 45) * 45
      previewMarker = { ...marker, labelAngle: normalizedRowMarkerLabelAngle(angle) }
      onMovePreview(previewMarker)
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
    <g className="row-marker-layer">
      {markers.filter(isRowMarkerVisible).map((marker) => {
        const selected = marker.id === selectedId
        const locked = isRowMarkerLocked(marker)
        const label = rowMarkerLabelGeometry(marker)
        const color = normalizedRowMarkerColor(marker.color)
        const handleAngle = label.angle * Math.PI / 180
        const handleDistance = 26 * label.size
        const handleX = Math.cos(handleAngle) * handleDistance
        const handleY = Math.sin(handleAngle) * handleDistance
        const hitRadius = Math.max(18 / zoom, 22 * label.size)
        return (
          <g
            key={marker.id}
            className={`row-marker ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`}
            transform={`translate(${marker.x} ${marker.y})`}
            style={{ color }}
            onPointerDown={(event) => startDrag(event, marker)}
          >
            <circle className="row-marker-hit" r={hitRadius} />
            {selected && <circle className="row-marker-selection" r={12 * label.size} vectorEffect="non-scaling-stroke" />}
            <circle className="row-marker-dot" r={label.dotRadius} />
            <text
              className="row-marker-number"
              x={label.x}
              y={label.y}
              fontSize={label.fontSize}
              textAnchor={label.textAnchor}
            >
              {marker.number}
            </text>
            {locked && (
              <text
                className="row-marker-lock"
                x={label.x}
                y={label.y + 12 * label.size}
                fontSize={9 * label.size}
                textAnchor={label.textAnchor}
              >
                🔒
              </text>
            )}
            {selected && !locked && (
              <g className="row-marker-direction-control">
                <line
                  className="row-marker-direction-link"
                  x1={0}
                  y1={0}
                  x2={handleX}
                  y2={handleY}
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  className="row-marker-direction-handle"
                  cx={handleX}
                  cy={handleY}
                  r={5 / zoom}
                  onPointerDown={(event) => startDirectionDrag(event, marker)}
                />
              </g>
            )}
          </g>
        )
      })}
    </g>
  )
}
