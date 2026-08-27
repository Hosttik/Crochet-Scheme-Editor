import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Point } from '../types'
import './mirrorAxis.css'

export type MirrorAxisState = {
  point: Point
  angle: number
}

function radians(value: number) {
  return value * Math.PI / 180
}

function normalizedAngle(value: number) {
  let result = value % 180
  if (result > 90) result -= 180
  if (result <= -90) result += 180
  return result
}

export function MirrorAxisOverlay({
  state,
  zoom,
  clientToDocument,
  onChange,
}: {
  state: MirrorAxisState
  zoom: number
  clientToDocument: (clientX: number, clientY: number) => Point
  onChange: (state: MirrorAxisState) => void
}) {
  const safeZoom = Math.max(0.1, zoom)
  const angle = radians(state.angle)
  const axis = { x: Math.cos(angle), y: Math.sin(angle) }
  const halfLength = 900 / safeZoom
  const x1 = state.point.x - axis.x * halfLength
  const y1 = state.point.y - axis.y * halfLength
  const x2 = state.point.x + axis.x * halfLength
  const y2 = state.point.y + axis.y * halfLength
  const rotateDistance = 150 / safeZoom
  const rotatePoint = {
    x: state.point.x + axis.x * rotateDistance,
    y: state.point.y + axis.y * rotateDistance,
  }

  const startMove = (event: ReactPointerEvent<SVGElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const pointerId = event.pointerId
    const start = clientToDocument(event.clientX, event.clientY)
    const original = state.point
    const handleMove = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return
      const current = clientToDocument(nativeEvent.clientX, nativeEvent.clientY)
      onChange({ ...state, point: { x: original.x + current.x - start.x, y: original.y + current.y - start.y } })
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

  const startRotate = (event: ReactPointerEvent<SVGCircleElement>) => {
    if (event.button !== 0) return
    event.preventDefault()
    event.stopPropagation()
    const pointerId = event.pointerId
    const handleMove = (nativeEvent: PointerEvent) => {
      if (nativeEvent.pointerId !== pointerId) return
      const current = clientToDocument(nativeEvent.clientX, nativeEvent.clientY)
      const angleDegrees = Math.atan2(current.y - state.point.y, current.x - state.point.x) * 180 / Math.PI
      onChange({ ...state, angle: normalizedAngle(angleDegrees) })
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
    <g className="mirror-axis-overlay" data-mirror-angle={state.angle}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="mirror-axis-hit" vectorEffect="non-scaling-stroke" onPointerDown={startMove} />
      <line x1={x1} y1={y1} x2={x2} y2={y2} className="mirror-axis-line" vectorEffect="non-scaling-stroke" pointerEvents="none" />
      <circle cx={state.point.x} cy={state.point.y} r={6 / safeZoom} className="mirror-axis-handle" vectorEffect="non-scaling-stroke" onPointerDown={startMove} />
      <line x1={state.point.x} y1={state.point.y} x2={rotatePoint.x} y2={rotatePoint.y} className="mirror-axis-rotate-stem" vectorEffect="non-scaling-stroke" pointerEvents="none" />
      <circle cx={rotatePoint.x} cy={rotatePoint.y} r={7 / safeZoom} className="mirror-axis-rotate-handle" vectorEffect="non-scaling-stroke" onPointerDown={startRotate} />
    </g>
  )
}
