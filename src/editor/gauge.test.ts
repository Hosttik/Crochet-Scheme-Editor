import { describe, expect, it } from 'vitest'
import type { GaugeProfile, GaugeSettings, MeasurementRuler, StitchElement } from '../types'
import {
  patternHeightEstimateCm,
  reconcileRulerElementReferences,
  rowHeightCm,
  rowLengthEstimateCm,
  rulerCorridorHits,
  rulerDisplayLabel,
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

  it('counts only stitch anchors inside the finite measurement region', () => {
    const free: StitchElement[] = [0, 22, 44, 66, 88].map((x, index) => ({
      id: `chain-${index}`,
      symbolId: 'chain',
      x,
      y: index === 4 ? 9 : 0,
      rotation: 0,
    }))
    const ruler: MeasurementRuler = { id: 'region', start: { x: -1, y: 0 }, end: { x: 70, y: 0 } }
    const estimate = rulerEstimate(ruler, free, gauge)
    expect(estimate).toMatchObject({
      stitchCount: 4,
      lengthCm: 2,
      source: 'automatic',
      strategy: 'anchor-region',
    })
    expect(estimate.elementIds).toEqual(['chain-0', 'chain-1', 'chain-2', 'chain-3'])
  })

  it('does not count a glyph whose visual body touches the strip while its anchor stays outside', () => {
    const sample: StitchElement[] = [
      { id: 'body-only', symbolId: 'treble', x: 40, y: 18, rotation: 90 },
      { id: 'anchor-hit', symbolId: 'single', x: 60, y: 6, rotation: 0 },
    ]
    const hits = rulerCorridorHits({ id: 'anchor-only', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } }, sample)
    expect(hits.elementIds).toEqual(['anchor-hit'])
  })

  it('endpoint attachments never expand the count outside the actual region', () => {
    const ruler: MeasurementRuler = {
      id: 'endpoint-no-magic',
      start: { x: 0, y: 40 },
      end: { x: 20, y: 40 },
      startElementId: 'a',
      endElementId: 'd',
    }
    const estimate = rulerEstimate(ruler, elements, gauge)
    expect(estimate.stitchCount).toBe(2)
    expect(estimate.elementIds).toEqual(['a', 'b'])
  })

  it('counts rows from anchors in the region, deduplicating semantic row ids', () => {
    const sample: StitchElement[] = [
      rowElement('r1-a', 'row-a', 0, 1),
      rowElement('r1-b', 'row-a', 6, 1),
      rowElement('r2', 'row-b', 0, 2),
      { id: 'free-row', symbolId: 'chain', x: 0, y: 120, rotation: 0 },
    ]
    const ruler: MeasurementRuler = {
      id: 'rows', start: { x: 0, y: 30 }, end: { x: 0, y: 125 }, mode: 'rows',
    }
    const estimate = rulerEstimate(ruler, sample, gauge)
    expect(estimate).toMatchObject({
      rowCount: 3,
      source: 'automatic',
      strategy: 'anchor-region',
      rowIds: ['row-a', 'row-b'],
    })
    expect(estimate.elementIds).toEqual(['r1-a', 'r1-b', 'r2', 'free-row'])
    expect(estimate.lengthCm).toBeCloseTo(30 / 24, 6)
  })

  it('ignores legacy manual overrides and always reports the live anchors', () => {
    const ruler: MeasurementRuler = {
      id: 'legacy-manual',
      start: { x: 0, y: 40 },
      end: { x: 40, y: 40 },
      manualStitchCount: 99,
      manualRowCount: 99,
    }
    expect(rulerEstimate(ruler, elements, gauge).stitchCount).toBe(3)
    expect(rulerEstimate({ ...ruler, mode: 'rows' }, elements, gauge).rowCount).toBe(1)
  })

  it('keeps the automatic count visible even before a gauge swatch exists', () => {
    const ruler: MeasurementRuler = { id: 'no-gauge', start: { x: 0, y: 40 }, end: { x: 40, y: 40 } }
    expect(rulerDisplayLabel(ruler, elements, { profiles: [] }, 'ru')).toBe('3 п./ст. · нет плотности')
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

  it('ignores hidden stitches and marker symbols in anchor hit testing', () => {
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
})
