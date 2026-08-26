import { describe, expect, it } from 'vitest'
import type { ParametricRowBinding, RadialGridGuide, StitchElement } from '../types'
import { createNextPatternRow } from './parametricRows'

const guide: RadialGridGuide = {
  id: 'g',
  type: 'radial-grid',
  center: { x: 0, y: 0 },
  ringCount: 6,
  ringSpacing: 40,
  sectorCount: 12,
  startAngle: 0,
  visible: true,
}

function binding(mode: 'joined' | 'turning'): ParametricRowBinding {
  return {
    id: 'row-1',
    guideId: guide.id,
    symbolId: 'single',
    construction: {
      mode,
      direction: 'along',
      startChainCount: 1,
      joinWithSlipStitch: mode === 'joined',
    },
    options: {
      distributionMode: 'count', count: 12, spacing: 40,
      orientation: 'radial', rotationOffset: 0, radialOffset: 0, ringIndex: 1,
    },
  }
}

function elements(rowBinding: ParametricRowBinding): StitchElement[] {
  return Array.from({ length: 12 }, (_, index) => ({
    id: `p-${index}`,
    symbolId: 'single',
    x: index,
    y: 0,
    rotation: 0,
    parametricRow: rowBinding,
  }))
}

describe('row construction inheritance', () => {
  it('keeps joined-round direction and normalizes boundary defaults in the next row', () => {
    const parent = binding('joined')
    let serial = 0
    const created = createNextPatternRow(elements(parent), [guide], parent, 0, () => `id-${++serial}`)
    expect(created?.binding.construction).toEqual({
      mode: 'joined',
      direction: 'along',
      startChainCount: 1,
      startChainCountsAsStitch: false,
      skipFirstStitches: 0,
      joinWithSlipStitch: true,
      joinTarget: 'first-stitch',
    })
  })

  it('alternates turning-row direction and normalizes boundary defaults', () => {
    const parent = binding('turning')
    let serial = 0
    const created = createNextPatternRow(elements(parent), [guide], parent, 0, () => `id-${++serial}`)
    expect(created?.binding.construction).toEqual({
      mode: 'turning',
      direction: 'reverse',
      startChainCount: 1,
      startChainCountsAsStitch: false,
      skipFirstStitches: 0,
      joinWithSlipStitch: false,
      joinTarget: 'first-stitch',
    })
  })
})
