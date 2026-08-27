import type { PointerEvent as ReactPointerEvent } from 'react'
import type { BackgroundImage, Point } from '../types'
import {
  backgroundCenter,
  backgroundRotation,
  moveBackground,
  resizeBackgroundFromCorner,
  rotateBackgroundFromPointer,
  type BackgroundResizeHandle,
} from './backgroundGeometry'

type Props = {
  background: BackgroundImage
  selected: boolean
  zoom: number
  clientToDocument: (clientX: number, clientY: number) => Point
  onSelect: () => void
  onManipulationStart: () => void
  onManipulationPreview: (background: BackgroundImage) => void
  onManipulationEnd: (moved: boolean, cancelled: boolean) => void
}

type Mode = { type: 'move' } | { type: 'rotate' } | { type: 'resize'; handle: BackgroundResizeHandle }

export function BackgroundImageCanvas({
  background,
  selected,
  zoom,
  clientToDocument,
  onSelect,
  onManipulationStart,
  onManipulationPreview,
  onManipulationEnd,
}: Props) {
  if (background.visible === false) return null
  const locked = background.locked === true
  const center = backgroundCenter(background)
  const rotation = backgroundRotation(background)
  const handleRadius = 7 / zoom
  const rotationOffset = 32 / zoom

  const startInteraction = (event: ReactPointerEvent<SVGElement>, mode: Mode) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    onSelect()
    if (locked) return

    const pointerId = event.pointerId
    const startClient = { x: event.clientX, y: event.clientY }
    const startPointer = clientToDocument(event.clientX, event.clientY)
    const initial = background
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
      onManipulationEnd(moved, cancelled)
    }
    const handleMove = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return
      if (Math.hypot(nativeEvent.clientX - startClient.x, nativeEvent.clientY - startClient.y) > 1) moved = true
      const current = clientToDocument(nativeEvent.clientX, nativeEvent.clientY)
      if (mode.type === 'move') {
        onManipulationPreview(moveBackground(initial, current.x - startPointer.x, current.y - startPointer.y))
      } else if (mode.type === 'resize') {
        onManipulationPreview(resizeBackgroundFromCorner(initial, mode.handle, current, nativeEvent.shiftKey))
      } else {
        onManipulationPreview(rotateBackgroundFromPointer(initial, startPointer, current, nativeEvent.shiftKey))
      }
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

  const cornerHandle = (handle: BackgroundResizeHandle, x: number, y: number) => (
    <circle
      key={handle}
      data-handle={handle}
      cx={x}
      cy={y}
      r={handleRadius}
      className="background-resize-handle"
      vectorEffect="non-scaling-stroke"
      onPointerDown={(event) => startInteraction(event, { type: 'resize', handle })}
    />
  )

  return (
    <g className={`background-canvas-layer ${selected ? 'selected' : ''} ${locked ? 'locked' : ''}`}>
      <g transform={`rotate(${rotation} ${center.x} ${center.y})`}>
        <image
          data-testid="background-image"
          className="background-canvas-image"
          href={background.dataUrl}
          x={background.x}
          y={background.y}
          width={background.width}
          height={background.height}
          opacity={background.opacity}
          preserveAspectRatio="none"
          onPointerDown={(event) => startInteraction(event, { type: 'move' })}
        />
        {selected && (
          <rect
            data-testid="background-selection-box"
            className="background-selection-box"
            x={background.x}
            y={background.y}
            width={background.width}
            height={background.height}
            vectorEffect="non-scaling-stroke"
            pointerEvents="none"
          />
        )}
        {selected && !locked && (
          <g className="background-manipulation-ui">
            {cornerHandle('nw', background.x, background.y)}
            {cornerHandle('ne', background.x + background.width, background.y)}
            {cornerHandle('se', background.x + background.width, background.y + background.height)}
            {cornerHandle('sw', background.x, background.y + background.height)}
            <line
              x1={center.x}
              y1={background.y}
              x2={center.x}
              y2={background.y - rotationOffset}
              className="background-rotation-stem"
              vectorEffect="non-scaling-stroke"
              pointerEvents="none"
            />
            <circle
              data-testid="background-rotate-handle"
              cx={center.x}
              cy={background.y - rotationOffset}
              r={handleRadius}
              className="background-rotate-handle"
              vectorEffect="non-scaling-stroke"
              onPointerDown={(event) => startInteraction(event, { type: 'rotate' })}
            />
          </g>
        )}
        {selected && locked && (
          <text x={background.x + 8 / zoom} y={background.y + 18 / zoom} fontSize={13 / zoom} className="background-lock-indicator">🔒</text>
        )}
      </g>
    </g>
  )
}
