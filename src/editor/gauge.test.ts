import { describe, expect, it } from 'vitest'
import type { GaugeProfile, GaugeSettings, MeasurementRuler, StitchElement } from '../types'
import {
  patternHeightEstimateCm,
  reconcileRulerElementReferences,
  rowHeightCm,
  rowLengthEstimateCm,
  rulerCorridorHits,
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
    expect(rowHeightCm(profile)).toBeCloseTo(10 / 24, 8)
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

  it('counts inclusive semantic rows automatically between two parametric rows', () => {
    const ruler: MeasurementRuler = {
      id: 'rows-1',
      start: { x: 0, y: 40 },
      end: { x: 0, y: 80 },
      startElementId: 'a',
      endElementId: 'e',
      mode: 'rows',
    }
    expect(rulerEstimate(ruler, elements, gauge)).toMatchObject({
      mode: 'rows',
      rowCount: 2,
      lengthCm: 20 / 24,
      source: 'automatic',
      startRowId: 'row-1',
      endRowId: 'row-2',
    })
  })

  it('uses an explicit manual row count for a free vertical ruler', () => {
    const ruler: MeasurementRuler = {
      id: 'rows-2',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 100 },
      mode: 'rows',
      manualRowCount: 6,
    }
    expect(rulerEstimate(ruler, elements, gauge)).toMatchObject({
      mode: 'rows',
      rowCount: 6,
      lengthCm: 2.5,
      source: 'manual',
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
  it('uses the written row total when a starting chain counts as a stitch', () => {
    const counted = elements.map((element) => element.parametricRow?.id === 'row-1'
      ? {
          ...element,
          parametricRow: {
            ...element.parametricRow,
            construction: {
              mode: 'turning' as const,
              direction: 'along' as const,
              startChainCount: 1,
              startChainCountsAsStitch: true,
              skipFirstStitches: 0,
              joinWithSlipStitch: false,
              joinTarget: 'first-stitch' as const,
            },
          },
        }
      : element)
    expect(rowLengthEstimateCm(counted, 'row-1', profile)).toBe(2.5)
  })

  it('uses the same mixed legacy/explicit row ordering as patternRows', () => {
    const first = rowElement('legacy-1', 'legacy-row-1', 0, 1)
    const second = rowElement('legacy-2', 'legacy-row-2', 0, 2)
    first.parametricRow = { ...first.parametricRow!, patternOrder: undefined }
    second.parametricRow = { ...second.parametricRow!, patternOrder: undefined }
    const third = rowElement('explicit-3', 'explicit-row-3', 0, 3)
    const mixed = [first, second, third]
    expect(rulerEstimate({
      id: 'mixed-order',
      start: { x: 0, y: 0 },
      end: { x: 0, y: 0 },
      startElementId: first.id,
      endElementId: third.id,
      mode: 'rows',
    }, mixed, gauge).rowCount).toBe(3)
  })

  it('clears ruler stitch references when their target stitches disappear', () => {
    const rulers: MeasurementRuler[] = [{
      id: 'dead-anchor',
      start: { x: 0, y: 0 },
      end: { x: 20, y: 0 },
      startElementId: 'a',
      endElementId: 'missing',
    }]
    const reconciled = reconcileRulerElementReferences(rulers, elements)
    expect(reconciled[0].startElementId).toBe('a')
    expect(reconciled[0].endElementId).toBeUndefined()
    expect(reconcileRulerElementReferences(reconciled, elements)).toBe(reconciled)
  })


  it('counts free stitches geometrically through the finite ruler corridor', () => {
    const free: StitchElement[] = [0, 22, 44, 66].map((x, index) => ({
      id: `chain-${index}`,
      symbolId: 'chain',
      x,
      y: 0,
      rotation: 0,
    }))
    const ruler: MeasurementRuler = { id: 'corridor-free', start: { x: -10, y: 0 }, end: { x: 76, y: 0 } }
    const estimate = rulerEstimate(ruler, free, gauge)
    expect(estimate).toMatchObject({ stitchCount: 4, source: 'automatic', strategy: 'corridor' })
    expect(estimate.elementIds).toEqual(free.map((element) => element.id))
  })

  it('counts unique semantic rows crossed by a free corridor without endpoint attachments', () => {
    const ruler: MeasurementRuler = { id: 'corridor-rows', start: { x: 0, y: 28 }, end: { x: 0, y: 92 }, mode: 'rows' }
    expect(rulerEstimate(ruler, elements, gauge)).toMatchObject({
      rowCount: 2,
      source: 'automatic',
      strategy: 'corridor',
      rowIds: ['row-1', 'row-2'],
    })
  })

  it('ignores hidden stitches and marker symbols in corridor hit testing', () => {
    const sample: StitchElement[] = [
      { id: 'visible', symbolId: 'chain', x: 0, y: 0, rotation: 0 },
      { id: 'hidden', symbolId: 'chain', x: 22, y: 0, rotation: 0, visible: false },
      { id: 'marker', symbolId: 'start-marker', x: 44, y: 0, rotation: 0 },
    ]
    const hits = rulerCorridorHits({ id: 'filter', start: { x: -20, y: 0 }, end: { x: 60, y: 0 } }, sample)
    expect(hits.elementIds).toEqual(['visible'])
  })


  it('does not snap ruler endpoints to Start/End marker-role symbols', () => {
    const sample: StitchElement[] = [
      { id: 'marker', symbolId: 'start-marker', x: 0, y: 0, rotation: 0 },
      { id: 'stitch', symbolId: 'chain', x: 5, y: 0, rotation: 0 },
    ]
    const snapped = snapRulerPoint({ x: 0, y: 0 }, sample, 1)
    expect(snapped.elementId).toBe('stitch')
    expect(snapped.point).toEqual({ x: 5, y: 0 })
  })

  it('uses full oriented-rectangle SAT so a rotated stitch near a corridor corner is not a false positive', () => {
    const sample: StitchElement[] = [
      { id: 'corner-miss', symbolId: 'single', x: -12, y: -24, rotation: 5 },
      { id: 'real-hit', symbolId: 'single', x: 20, y: 0, rotation: 5 },
    ]
    const hits = rulerCorridorHits({ id: 'sat', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }, sample)
    expect(hits.elementIds).toEqual(['real-hit'])
  })

  it('highlights only semantic stitch hits when row corridor count ignores free stitches', () => {
    const semantic = [
      rowElement('row-a', 'semantic-a', 0, 1),
      rowElement('row-b', 'semantic-b', 0, 2),
    ]
    const free: StitchElement = { id: 'free-between', symbolId: 'chain', x: 0, y: 60, rotation: 0 }
    const estimate = rulerEstimate({
      id: 'row-highlight', start: { x: 0, y: 28 }, end: { x: 0, y: 92 }, mode: 'rows',
    }, [...semantic, free], gauge)
    expect(estimate).toMatchObject({ rowCount: 2, source: 'automatic', strategy: 'corridor' })
    expect(estimate.elementIds).toEqual(['row-a', 'row-b'])
    expect(estimate.elementIds).not.toContain('free-between')
  })

})
