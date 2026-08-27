import type { Guide } from '../types'

function round(value: number) {
  return Math.round(value * 100) / 100
}

export function guideNumericValue(guide: Guide) {
  if (guide.type === 'arc') {
    return `R ${round(Math.abs(guide.radius))} · ${round(Math.abs(guide.endAngle - guide.startAngle))}°`
  }
  if (guide.type === 'line') {
    const dx = guide.end.x - guide.start.x
    const dy = guide.end.y - guide.start.y
    const length = Math.hypot(dx, dy)
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI
    return `${round(length)} px · ${round(angle)}°`
  }
  if (guide.type === 'curve' || guide.type === 'parabola') {
    return `N ${Math.max(1, Math.round(guide.divisions))}`
  }
  if (guide.type === 'grid') {
    return `${Math.max(1, Math.round(guide.columns))}×${Math.max(1, Math.round(guide.rows))} · ${round(Math.abs(guide.spacingX))}×${round(Math.abs(guide.spacingY))}`
  }
  const outerRadius = Math.max(1, Math.round(guide.ringCount)) * Math.abs(guide.ringSpacing)
  return `R ${round(outerRadius)} · ${Math.max(2, Math.round(guide.sectorCount))}`
}
