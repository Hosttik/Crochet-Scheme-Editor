import { describe, expect, it } from 'vitest'
import type { LineGuide, RowMarker } from '../types'
import {
  attachRowMarkerToGuide,
  deleteRowMarkerAndRenumber,
  moveAttachedRowMarker,
  nextRowMarkerNumber,
  normalizedRowMarkerColor,
  normalizedRowMarkerLabelAngle,
  normalizedRowMarkerNumber,
  normalizedRowMarkerSize,
  reconcileRowMarkerAttachments,
  remapRowMarkerAttachmentsForReversedGuide,
  rowMarkerLabelGeometry,
} from './rowMarkers'

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


describe('row marker appearance and guide attachment', () => {
  it('normalizes persistent marker appearance values', () => {
    expect(normalizedRowMarkerSize(0.1)).toBe(0.5)
    expect(normalizedRowMarkerSize(1.6)).toBe(1.6)
    expect(normalizedRowMarkerSize(8)).toBe(3)
    expect(normalizedRowMarkerLabelAngle(-90)).toBe(270)
    expect(normalizedRowMarkerColor('#AABBCC')).toBe('#aabbcc')
    expect(normalizedRowMarkerColor('red')).toBe('#c2413b')

    const layout = rowMarkerLabelGeometry({ ...marker(1), size: 2, labelAngle: 90 })
    expect(layout.dotRadius).toBe(10)
    expect(layout.fontSize).toBe(26)
    expect(layout.textAnchor).toBe('middle')
    expect(layout.y).toBeCloseTo(28, 6)
  })

  it('attaches a marker to a line and slides it along that line', () => {
    const guide: LineGuide = {
      id: 'line',
      type: 'line',
      start: { x: 0, y: 20 },
      end: { x: 200, y: 20 },
      divisions: 10,
      visible: true,
    }
    const attached = attachRowMarkerToGuide({ ...marker(1), x: 40, y: 80 }, guide)
    expect(attached.y).toBeCloseTo(20, 6)
    expect(attached.x).toBeCloseTo(40, 3)
    expect(attached.guideAttachment?.guideId).toBe('line')

    const moved = moveAttachedRowMarker(attached, guide, { x: 150, y: 90 })
    expect(moved.x).toBeCloseTo(150, 3)
    expect(moved.y).toBeCloseTo(20, 6)
    expect(moved.guideAttachment?.t).toBeCloseTo(0.75, 2)
  })

  it('follows guide edits and preserves world position when guide direction is reversed', () => {
    const guide: LineGuide = {
      id: 'line',
      type: 'line',
      start: { x: 0, y: 0 },
      end: { x: 100, y: 0 },
      divisions: 10,
      visible: true,
    }
    const attached = attachRowMarkerToGuide({ ...marker(1), x: 25, y: 5 }, guide)
    const shifted: LineGuide = { ...guide, start: { x: 0, y: 30 }, end: { x: 100, y: 30 } }
    const [followed] = reconcileRowMarkerAttachments([attached], [shifted])
    expect(followed.x).toBeCloseTo(25, 3)
    expect(followed.y).toBeCloseTo(30, 6)

    const reversed: LineGuide = { ...guide, start: guide.end, end: guide.start }
    const [remapped] = remapRowMarkerAttachmentsForReversedGuide([attached], reversed)
    expect(remapped.x).toBeCloseTo(attached.x, 3)
    expect(remapped.y).toBeCloseTo(attached.y, 3)
  })
})
