import { describe, expect, it } from 'vitest'
import type { RowMarker } from '../types'
import { deleteRowMarkerAndRenumber, nextRowMarkerNumber, normalizedRowMarkerNumber } from './rowMarkers'

function marker(number: number): RowMarker {
  return { id: `row-${number}`, number, x: 0, y: 0, visible: true, locked: false }
}

describe('row marker numbering', () => {
  it('uses the first missing positive number', () => {
    expect(nextRowMarkerNumber([marker(1), marker(2), marker(4)])).toBe(3)
    expect(nextRowMarkerNumber([marker(2), marker(3)])).toBe(1)
    expect(nextRowMarkerNumber([marker(1), marker(2), marker(3)])).toBe(4)
  })

  it('renumbers following rows after deletion', () => {
    const rows = [marker(1), marker(2), marker(3), marker(4)]
    const next = deleteRowMarkerAndRenumber(rows, 'row-2')
    expect(next.map((item) => item.number)).toEqual([1, 2, 3])
    expect(next.map((item) => item.id)).toEqual(['row-1', 'row-3', 'row-4'])
  })

  it('normalizes manual row numbers to positive integers', () => {
    expect(normalizedRowMarkerNumber(2.6)).toBe(3)
    expect(normalizedRowMarkerNumber(-4)).toBe(1)
  })
})
