import { describe, expect, it } from 'vitest'
import type { SnappingSettings } from '../types'
import { parseProject } from './projectSchema'

const snapping: SnappingSettings = {
  enabled: true,
  sourceAnchor: 'bottom',
  orientationMode: 'none',
  snapToVertices: true,
  tolerancePx: 12,
}

function projectWithConstruction(construction: Record<string, unknown>) {
  return {
    schemaVersion: 16,
    metadata: { title: 'Boundaries', updatedAt: '2026-08-26T00:00:00.000Z' },
    elements: [{
      id: 'stitch-1',
      symbolId: 'single',
      x: 0,
      y: 0,
      rotation: 0,
      parametricRow: {
        id: 'row-1',
        guideId: 'guide-1',
        symbolId: 'single',
        options: {
          distributionMode: 'count',
          count: 12,
          spacing: 30,
          orientation: 'radial',
          rotationOffset: 0,
          radialOffset: 0,
          ringIndex: 1,
        },
        construction,
      },
    }],
    guides: [{
      id: 'guide-1',
      type: 'radial-grid',
      center: { x: 0, y: 0 },
      ringCount: 3,
      ringSpacing: 40,
      sectorCount: 12,
      startAngle: 0,
      visible: true,
    }],
    settings: { snapping, legend: { visible: true } },
  }
}

describe('schema v16 row boundaries', () => {
  it('preserves counted starting chains, skipped stitches and exact joined target', () => {
    const construction = {
      mode: 'joined',
      direction: 'along',
      startChainCount: 3,
      startChainCountsAsStitch: true,
      skipFirstStitches: 1,
      joinWithSlipStitch: true,
      joinTarget: 'start-chain-top',
    }
    const parsed = parseProject(projectWithConstruction(construction), snapping)
    expect(parsed.schemaVersion).toBe(16)
    expect(parsed.elements[0].parametricRow?.construction).toEqual(construction)
  })

  it('keeps legacy construction fields loadable while migrating to v16', () => {
    const raw = projectWithConstruction({
      mode: 'turning',
      direction: 'reverse',
      startChainCount: 1,
      joinWithSlipStitch: false,
    })
    raw.schemaVersion = 15
    const parsed = parseProject(raw, snapping)
    expect(parsed.schemaVersion).toBe(16)
    expect(parsed.elements[0].parametricRow?.construction).toEqual({
      mode: 'turning',
      direction: 'reverse',
      startChainCount: 1,
      joinWithSlipStitch: false,
    })
  })

  it('rejects a counted starting chain when there are no starting chains', () => {
    expect(() => parseProject(projectWithConstruction({
      mode: 'turning',
      direction: 'along',
      startChainCount: 0,
      startChainCountsAsStitch: true,
      skipFirstStitches: 0,
      joinWithSlipStitch: false,
      joinTarget: 'first-stitch',
    }), snapping)).toThrow('Counted starting chain requires starting chains')
  })

  it('rejects an impossible starting-chain closure target', () => {
    expect(() => parseProject(projectWithConstruction({
      mode: 'joined',
      direction: 'along',
      startChainCount: 0,
      startChainCountsAsStitch: false,
      skipFirstStitches: 0,
      joinWithSlipStitch: true,
      joinTarget: 'start-chain-top',
    }), snapping)).toThrow('Starting-chain join target requires a joined row with starting chains')
  })

  it('rejects boundary metadata on a spiral row', () => {
    expect(() => parseProject(projectWithConstruction({
      mode: 'spiral',
      direction: 'along',
      startChainCount: 0,
      startChainCountsAsStitch: false,
      skipFirstStitches: 1,
      joinWithSlipStitch: false,
      joinTarget: 'first-stitch',
    }), snapping)).toThrow('Invalid spiral construction')
  })
})
