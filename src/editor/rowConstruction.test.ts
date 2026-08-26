import { describe, expect, it } from 'vitest'
import {
  defaultRowConstruction,
  nextRowConstruction,
  normalizeRowConstruction,
  rowConstructionBoundaryCount,
  rowConstructionDirectionSymbol,
  rowConstructionInstructionParts,
  rowConstructionRowTotal,
} from './rowConstruction'

describe('row construction semantics', () => {
  it('normalizes mode-specific boundary fields', () => {
    expect(normalizeRowConstruction({
      mode: 'spiral',
      direction: 'reverse',
      startChainCount: 4,
      startChainCountsAsStitch: true,
      skipFirstStitches: 3,
      joinWithSlipStitch: true,
      joinTarget: 'start-chain-top',
    })).toEqual({
      mode: 'spiral',
      direction: 'reverse',
      startChainCount: 0,
      startChainCountsAsStitch: false,
      skipFirstStitches: 0,
      joinWithSlipStitch: false,
      joinTarget: 'first-stitch',
    })

    expect(defaultRowConstruction('joined')).toEqual({
      mode: 'joined',
      direction: 'along',
      startChainCount: 1,
      startChainCountsAsStitch: false,
      skipFirstStitches: 0,
      joinWithSlipStitch: true,
      joinTarget: 'first-stitch',
    })
  })

  it('alternates direction only for turning rows and preserves boundaries', () => {
    const turning = {
      ...defaultRowConstruction('turning'),
      startChainCount: 3,
      startChainCountsAsStitch: true,
      skipFirstStitches: 1,
    }
    expect(nextRowConstruction(turning)).toMatchObject({
      direction: 'reverse',
      startChainCount: 3,
      startChainCountsAsStitch: true,
      skipFirstStitches: 1,
    })
    expect(nextRowConstruction(defaultRowConstruction('turning', 'reverse'))?.direction).toBe('along')
    expect(nextRowConstruction(defaultRowConstruction('joined'))?.direction).toBe('along')
  })

  it('uses geometry-neutral direction symbols', () => {
    expect(rowConstructionDirectionSymbol(defaultRowConstruction('spiral'))).toBe('↻')
    expect(rowConstructionDirectionSymbol(defaultRowConstruction('spiral', 'reverse'))).toBe('↺')
    expect(rowConstructionDirectionSymbol(defaultRowConstruction('turning'))).toBe('→')
    expect(rowConstructionDirectionSymbol(defaultRowConstruction('turning', 'reverse'))).toBe('←')
  })

  it('keeps worked stitches separate from a counted starting-chain boundary', () => {
    const counted = {
      ...defaultRowConstruction('turning'),
      startChainCount: 3,
      startChainCountsAsStitch: true,
    }
    expect(rowConstructionBoundaryCount(counted)).toBe(1)
    expect(rowConstructionRowTotal(12, counted)).toBe(13)
    expect(rowConstructionRowTotal(12, defaultRowConstruction('turning'))).toBe(12)
    expect(rowConstructionBoundaryCount(defaultRowConstruction('spiral'))).toBe(0)
  })

  it('formats counted chains, skipped base stitches and an exact joined closure', () => {
    expect(rowConstructionInstructionParts({
      mode: 'joined',
      direction: 'along',
      startChainCount: 3,
      startChainCountsAsStitch: true,
      skipFirstStitches: 1,
      joinWithSlipStitch: true,
      joinTarget: 'start-chain-top',
    }, 'ru')).toEqual({
      prefix: [
        '3 ВП подъёма (считаются первой петлёй ряда)',
        'пропустить 1 петлю основания',
      ],
      suffix: ['замкнутый круг ↻', 'замкнуть СС в верхнюю ВП подъёма'],
    })
  })

  it('formats legacy-compatible uncounted construction without inventing joins', () => {
    expect(rowConstructionInstructionParts({
      mode: 'joined', direction: 'along', startChainCount: 2, joinWithSlipStitch: true,
    }, 'ru')).toEqual({
      prefix: ['2 ВП подъёма (вне счёта ряда)'],
      suffix: ['замкнутый круг ↻', 'замкнуть СС в первую провязанную петлю'],
    })
    expect(rowConstructionInstructionParts(defaultRowConstruction('turning', 'reverse'), 'en')).toEqual({
      prefix: ['1 starting CH (not counted in row total)'],
      suffix: ['turning row ←', 'turn work'],
    })
    expect(rowConstructionInstructionParts(defaultRowConstruction('spiral'), 'ru')).toEqual({
      prefix: [],
      suffix: ['по спирали ↻'],
    })
  })
})
