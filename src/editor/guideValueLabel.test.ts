import { describe, expect, it } from 'vitest'
import type { Guide } from '../types'
import { guideNumericValue } from './guideValueLabel'

describe('guideNumericValue', () => {
  it('shows length and angle for a straight guide', () => {
    const guide: Guide = {
      id: 'line', type: 'line', start: { x: 0, y: 0 }, end: { x: 300, y: 0 }, divisions: 12, visible: true,
    }
    expect(guideNumericValue(guide)).toBe('300 px · 0°')
  })

  it('shows radius and sweep for an arc', () => {
    const guide: Guide = {
      id: 'arc', type: 'arc', center: { x: 0, y: 0 }, radius: 120, startAngle: 15, endAngle: 195, divisions: 12, visible: true,
    }
    expect(guideNumericValue(guide)).toBe('R 120 · 180°')
  })

  it('shows grid dimensions and spacing', () => {
    const guide: Guide = {
      id: 'grid', type: 'grid', origin: { x: 0, y: 0 }, rows: 5, columns: 7, spacingX: 40, spacingY: 50, rotation: 0, visible: true,
    }
    expect(guideNumericValue(guide)).toBe('7×5 · 40×50')
  })
})
