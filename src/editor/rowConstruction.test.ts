import { describe, expect, it } from 'vitest'
import {
  defaultRowConstruction,
  nextRowConstruction,
  normalizeRowConstruction,
  rowConstructionDirectionSymbol,
  rowConstructionInstructionParts,
} from './rowConstruction'

describe('row construction semantics', () => {
  it('normalizes mode-specific fields without changing stitch counts', () => {
    expect(normalizeRowConstruction({
      mode: 'spiral', direction: 'reverse', startChainCount: 4, joinWithSlipStitch: true,
    })).toEqual({
      mode: 'spiral', direction: 'reverse', startChainCount: 0, joinWithSlipStitch: false,
    })

    expect(defaultRowConstruction('joined')).toEqual({
      mode: 'joined', direction: 'along', startChainCount: 1, joinWithSlipStitch: true,
    })
  })

  it('alternates direction only for turning rows', () => {
    expect(nextRowConstruction(defaultRowConstruction('turning'))?.direction).toBe('reverse')
    expect(nextRowConstruction(defaultRowConstruction('turning', 'reverse'))?.direction).toBe('along')
    expect(nextRowConstruction(defaultRowConstruction('joined'))?.direction).toBe('along')
  })

  it('uses geometry-neutral direction symbols', () => {
    expect(rowConstructionDirectionSymbol(defaultRowConstruction('spiral'))).toBe('↻')
    expect(rowConstructionDirectionSymbol(defaultRowConstruction('spiral', 'reverse'))).toBe('↺')
    expect(rowConstructionDirectionSymbol(defaultRowConstruction('turning'))).toBe('→')
    expect(rowConstructionDirectionSymbol(defaultRowConstruction('turning', 'reverse'))).toBe('←')
  })

  it('formats joined construction with auxiliary start chains and a join', () => {
    expect(rowConstructionInstructionParts({
      mode: 'joined', direction: 'along', startChainCount: 2, joinWithSlipStitch: true,
    }, 'ru')).toEqual({
      prefix: ['2 ВП подъёма (вне счёта ряда)'],
      suffix: ['замкнутый круг ↻', 'замкнуть СС'],
    })
  })

  it('formats turning and spiral rows without inventing joins', () => {
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
