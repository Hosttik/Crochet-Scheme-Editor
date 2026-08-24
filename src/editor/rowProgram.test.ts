import { describe, expect, it } from 'vitest'
import type { RowProgram, StitchElement } from '../types'
import {
  applyCompiledProgram,
  compileRowProgram,
  normalizeRowProgram,
  rowProgramMetrics,
} from './rowProgram'

function parents(count: number): StitchElement[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `p${index + 1}`,
    symbolId: 'single',
    x: index,
    y: 0,
    rotation: 0,
  }))
}

const program: RowProgram = {
  repeat: 2,
  items: [
    {
      kind: 'group',
      repeat: 2,
      items: [
        { kind: 'stitch', symbolId: 'single', count: 2 },
        { kind: 'increase', symbolId: 'single', count: 1 },
      ],
    },
    { kind: 'stitch', symbolId: 'chain', count: 1 },
    { kind: 'decrease', symbolId: 'double', count: 1 },
  ],
}

describe('rich row program', () => {
  it('computes parent consumption and child production through groups and root repeat', () => {
    expect(rowProgramMetrics(program)).toEqual({ consumedParents: 18, producedChildren: 20 })
  })

  it('compiles stitch, increase and decrease operations into exact parent groups', () => {
    const compiled = compileRowProgram(program, parents(18))
    expect(compiled.valid).toBe(true)
    expect(compiled.symbolIds).toHaveLength(20)
    expect(compiled.parentGroups).toHaveLength(20)
    expect(compiled.parentGroups.slice(0, 4)).toEqual([
      ['p1'], ['p2'], ['p3'], ['p3'],
    ])
    expect(compiled.parentGroups[8]).toEqual(['p7'])
    expect(compiled.parentGroups[9]).toEqual(['p8', 'p9'])
    expect(compiled.symbolIds[8]).toBe('chain')
    expect(compiled.symbolIds[9]).toBe('double')
  })

  it('rejects topology programs when parent consumption does not match the parent row', () => {
    const compiled = compileRowProgram(program, parents(17))
    expect(compiled.valid).toBe(false)
    expect(compiled.reason).toBe('parent-count-mismatch')
  })

  it('rejects programs that would materialize more than 500 children', () => {
    const compiled = compileRowProgram({
      repeat: 100,
      items: [{ kind: 'increase', symbolId: 'single', count: 500 }],
    })
    expect(compiled.valid).toBe(false)
    expect(compiled.reason).toBe('too-many-children')
    expect(compiled.symbolIds).toEqual([])
  })

  it('allows stitch-only programs without a parent row', () => {
    const compiled = compileRowProgram({
      repeat: 2,
      items: [{ kind: 'stitch', symbolId: 'chain', count: 3 }],
    })
    expect(compiled.valid).toBe(true)
    expect(compiled.producedChildren).toBe(6)
    expect(compiled.symbolIds).toEqual(Array(6).fill('chain'))
  })

  it('normalizes empty symbols and unsafe counts', () => {
    expect(normalizeRowProgram({
      repeat: 0,
      items: [
        { kind: 'stitch', symbolId: ' ', count: 2 },
        { kind: 'stitch', symbolId: 'single', count: 0 },
      ],
    })).toEqual({
      repeat: 1,
      items: [{ kind: 'stitch', symbolId: 'single', count: 1 }],
    })
  })

  it('applies compiled symbols and topology to existing child ids', () => {
    const compiled = compileRowProgram({
      repeat: 1,
      items: [{ kind: 'increase', symbolId: 'double', count: 1 }],
    }, parents(1))
    const children = [1, 2].map((index) => ({
      id: `c${index}`,
      symbolId: 'single',
      x: index,
      y: 0,
      rotation: 0,
    }))
    const result = applyCompiledProgram(children, compiled)
    expect(result.map((item) => item.symbolId)).toEqual(['double', 'double'])
    expect(result.map((item) => item.parentStitchIds)).toEqual([['p1'], ['p1']])
  })
})
