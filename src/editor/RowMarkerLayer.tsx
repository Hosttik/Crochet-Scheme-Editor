import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Point, RowMarker } from '../types'
import { isRowMarkerLocked, isRowMarkerVisible } from './rowMarkers'

type Props = {
  markers: RowMarker[]
  selectedId: string | null
  zoom: number
  clientToDocument: (clientX: number, clientY: number) => Point
  onSelect: (id: string) => void
  onMoveStart: () => void
  onMovePreview: (marker: RowMarker) => void
  onMoveEnd: (moved: boolean, cancelled: boolean) => void
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
      onMoveEnd(moved, cancelled)
    }

    const handleMove = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return
      if (Math.hypot(nativeEvent.clientX - startClient.x, nativeEvent.clientY - startClient.y) > 1) moved = true
      const current = clientToDocument(nativeEvent.clientX, nativeEvent.clientY)
      onMovePreview({
        ...marker,
        x: marker.x + current.x - startPointer.x,
        y: marker.y + current.y - startPointer.y,
      })
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
        return (
          <g
            key={marker.id}
            className={`row-marker ${selected ? 'selected' : ''} ${isRowMarkerLocked(marker) ? 'locked' : ''}`}
            transform={`translate(${marker.x} ${marker.y})`}
            onPointerDown={(event) => startDrag(event, marker)}
          >
            <circle className="row-marker-hit" r={18 / zoom} />
            {selected && <circle className="row-marker-selection" r={12 / zoom} vectorEffect="non-scaling-stroke" />}
            <circle className="row-marker-dot" r={5 / zoom} />
            <text className="row-marker-number" x={10 / zoom} y={4 / zoom} fontSize={13 / zoom}>{marker.number}</text>
            {isRowMarkerLocked(marker) && <text className="row-marker-lock" x={10 / zoom} y={17 / zoom} fontSize={9 / zoom}>🔒</text>}
          </g>
        )
      })}
    </g>
  )
}
