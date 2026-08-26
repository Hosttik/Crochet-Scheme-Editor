import type { PointerEvent as ReactPointerEvent } from 'react'
import { SYMBOLS } from '../symbols'
import type { Point, StitchElement } from '../types'
import { selectionAabb } from './selection'
import type { MirrorAxis } from './productivity'
import './mirrorAxis.css'

const SYMBOL_SIZES = Object.fromEntries(
  SYMBOLS.map((symbol) => [symbol.id, { width: symbol.width, height: symbol.height }]),
)

export type MirrorAxisState = {
  axis: MirrorAxis
  coordinate: number
}

export function MirrorAxisOverlay({
  state,
  elements,
  selectedIds,
  zoom,
  clientToDocument,
  onChange,
}: {
  state: MirrorAxisState
  elements: StitchElement[]
  selectedIds: string[]
  zoom: number
  clientToDocument: (clientX: number, clientY: number) => Point
  onChange: (coordinate: number) => void
}) {
  const bounds = selectionAabb(elements, selectedIds, SYMBOL_SIZES)
  if (!bounds) return null

  const padding = 70 / Math.max(0.1, zoom)
  const centerX = (bounds.left + bounds.right) / 2
  const centerY = (bounds.top + bounds.bottom) / 2
  const vertical = state.axis === 'left-right'
  const x1 = vertical ? state.coordinate : bounds.left - padding
  const x2 = vertical ? state.coordinate : bounds.right + padding
  const y1 = vertical ? bounds.top - padding : state.coordinate
  const y2 = vertical ? bounds.bottom + padding : state.coordinate
  const handleX = vertical ? state.coordinate : centerX
  const handleY = vertical ? centerY : state.coordinate

  const startDrag = (event: ReactPointerEvent<SVGGElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const pointerId = event.pointerId
    event.currentTarget.setPointerCapture(pointerId)

    const handleMove = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return
      const point = clientToDocument(nativeEvent.clientX, nativeEvent.clientY)
      onChange(vertical ? point.x : point.y)
    }
    const finish = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', finish)
      window.removeEventListener('pointercancel', finish)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', finish)
    window.addEventListener('pointercancel', finish)
  }

  return (
    <g
      className={`mirror-axis-overlay ${vertical ? 'vertical' : 'horizontal'}`}
      data-mirror-axis={vertical ? 'vertical' : 'horizontal'}
      onPointerDown={startDrag}
    >
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="mirror-axis-hit" vectorEffect="non-scaling-stroke" />
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="mirror-axis-line" vectorEffect="non-scaling-stroke" pointerEvents="none" />
      <circle
        cx={handleX}
        cy={handleY}
        r={7 / Math.max(0.1, zoom)}
        className="mirror-axis-handle"
        vectorEffect="non-scaling-stroke"
        pointerEvents="none"
      />
    </g>
  )
}
