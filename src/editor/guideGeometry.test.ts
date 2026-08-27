import { describe, expect, it } from 'vitest'
import type { CurveGuide, LineGuide, ParabolaGuide } from '../types'
import {
  fitLineGuideToRect,
  lineGuideAngle,
  lineGuideLength,
  reverseGuide,
  setLineGuideAngle,
  setLineGuideLength,
} from './guideGeometry'

const line: LineGuide = {
  id: 'line', type: 'line', start: { x: 10, y: 20 }, end: { x: 110, y: 20 },
  divisions: 10, visible: true,
}

const curve: CurveGuide = {
  id: 'curve', type: 'curve', start: { x: 0, y: 0 }, control1: { x: 20, y: -40 },
  control2: { x: 80, y: 40 }, end: { x: 100, y: 0 }, divisions: 10, visible: true,
}

const parabola: ParabolaGuide = {
  id: 'parabola', type: 'parabola', start: { x: -100, y: 0 }, control: { x: 0, y: -80 },
  end: { x: 100, y: 0 }, divisions: 12, visible: true,
}

describe('guide geometry helpers', () => {
  it('edits a line by semantic length and angle', () => {
    expect(lineGuideLength(line)).toBeCloseTo(100)
    expect(lineGuideAngle(line)).toBeCloseTo(0)
    const resized = setLineGuideLength(line, 250)
    expect(lineGuideLength(resized)).toBeCloseTo(250)
    const rotated = setLineGuideAngle(resized, 30)
    expect(lineGuideLength(rotated)).toBeCloseTo(250)
    expect(lineGuideAngle(rotated)).toBeCloseTo(30)
    expect(rotated.start).toEqual(line.start)
  })

  it('fits a line to the project rectangle along its current direction', () => {
    const fitted = fitLineGuideToRect(line, { left: -200, top: -100, right: 400, bottom: 300 }, 20)
    expect(fitted.start.x).toBeCloseTo(-220)
    expect(fitted.end.x).toBeCloseTo(420)
    expect(fitted.start.y).toBeCloseTo(20)
    expect(fitted.end.y).toBeCloseTo(20)
  })

  it('reverses line, cubic and parabola without changing their geometry', () => {
    const reversedLine = reverseGuide(line)
    expect(reversedLine.type).toBe('line')
    if (reversedLine.type === 'line') {
      expect(reversedLine.start).toEqual(line.end)
      expect(reversedLine.end).toEqual(line.start)
    }

    const reversedCurve = reverseGuide(curve)
    expect(reversedCurve.type).toBe('curve')
    if (reversedCurve.type === 'curve') {
      expect(reversedCurve.start).toEqual(curve.end)
      expect(reversedCurve.control1).toEqual(curve.control2)
      expect(reversedCurve.control2).toEqual(curve.control1)
      expect(reversedCurve.end).toEqual(curve.start)
    }

    const reversedParabola = reverseGuide(parabola)
    expect(reversedParabola.type).toBe('parabola')
    if (reversedParabola.type === 'parabola') {
      expect(reversedParabola.start).toEqual(parabola.end)
      expect(reversedParabola.control).toEqual(parabola.control)
      expect(reversedParabola.end).toEqual(parabola.start)
    }
  })
})
