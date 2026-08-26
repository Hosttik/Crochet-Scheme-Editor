import { describe, expect, it } from 'vitest'
import type { GaugeProfile, GaugeSettings, MeasurementRuler, StitchElement } from '../types'
import {
  patternHeightEstimateCm,
  rowLengthEstimateCm,
  rulerEstimate,
  snapRulerPoint,
  stitchWidthCm,
} from './gauge'

const profile: GaugeProfile = {
  id: 'gauge-1',
  name: 'SC swatch',
  symbolId: 'single',
  stitchCount: 20,
  rowCount: 24,
  widthCm: 10,
  heightCm: 10,
}

const gauge: GaugeSettings = { profiles: [profile], activeProfileId: profile.id }

function rowElement(id: string, rowId: string, x: number, order: number): StitchElement {
  return {
    id,
    symbolId: 'single',
    x,
    y: order * 40,
    rotation: 0,
    parametricRow: {
      id: rowId,
      guideId: `guide-${rowId}`,
      symbolId: 'single',
      patternOrder: order,
      options: {
        distributionMode: 'count',
        count: 4,
        spacing: 20,
        orientation: 'tangent',
        rotationOffset: 0,
        radialOffset: 20,
        ringIndex: 1,
      },
    },
  }
}

const elements = [
  rowElement('a', 'row-1', 0, 1),
  rowElement('b', 'row-1', 20, 1),
  rowElement('c', 'row-1', 40, 1),
  rowElement('d', 'row-1', 60, 1),
  rowElement('e', 'row-2', 0, 2),
]

describe('gauge calculations', () => {
  it('derives stitch width and row estimates from a measured swatch', () => {
    expect(stitchWidthCm(profile)).toBe(0.5)
    expect(rowLengthEstimateCm(elements, 'row-1', profile)).toBe(2)
    expect(patternHeightEstimateCm(elements, profile)).toBeCloseTo(20 / 24, 6)
  })

  it('counts inclusive stitches automatically between two points on one parametric row', () => {
    const ruler: MeasurementRuler = {
      id: 'r1',
      start: { x: 0, y: 40 },
      end: { x: 40, y: 40 },
      startElementId: 'a',
      endElementId: 'c',
    }
    expect(rulerEstimate(ruler, elements, gauge)).toMatchObject({
      stitchCount: 3,
      lengthCm: 1.5,
      source: 'automatic',
      rowId: 'row-1',
    })
  })

  it('uses an explicit manual stitch count for a free ruler', () => {
    const ruler: MeasurementRuler = {
      id: 'r2',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 100 },
      manualStitchCount: 50,
    }
    expect(rulerEstimate(ruler, elements, gauge)).toMatchObject({
      stitchCount: 50,
      lengthCm: 25,
      source: 'manual',
    })
  })

  it('snaps a ruler endpoint to the nearest visible stitch in screen-space tolerance', () => {
    const snapped = snapRulerPoint({ x: 38, y: 41 }, elements, 1)
    expect(snapped.elementId).toBe('c')
    expect(snapped.point).toEqual({ x: 40, y: 40 })
    expect(snapRulerPoint({ x: 90, y: 90 }, elements, 2).elementId).toBeUndefined()
  })
})
