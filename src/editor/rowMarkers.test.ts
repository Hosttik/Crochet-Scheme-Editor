import { describe, expect, it } from 'vitest'
import type { GridGuide, LineGuide, RadialGridGuide, RowMarker } from '../types'
import {
  attachRowMarkerToDefaultGuide,
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

    const below = rowMarkerLabelGeometry({ ...marker(1), size: 2, labelAngle: 90 })
    expect(below.dotRadius).toBe(10)
    expect(below.fontSize).toBe(26)
    expect(below.textAnchor).toBe('middle')
    expect(below.y - below.fontSize * 0.8).toBeCloseTo(below.dotRadius + 8, 6)

    const above = rowMarkerLabelGeometry({ ...marker(12), size: 2, labelAngle: 270 })
    expect(above.y + above.fontSize * 0.25).toBeCloseTo(-above.dotRadius - 8, 6)
  })

  it('reuses the selected guide id for subsequently placed markers', () => {
    const guide: LineGuide = {
      id: 'sticky-line',
      type: 'line',
      start: { x: 0, y: 20 },
      end: { x: 200, y: 20 },
      divisions: 10,
      visible: true,
    }
    const placed = attachRowMarkerToDefaultGuide(
      { ...marker(2), x: 80, y: 75 },
      [guide],
      guide.id,
    )
    expect(placed.guideAttachment?.guideId).toBe('sticky-line')
    expect(placed.y).toBeCloseTo(20, 6)

    const withoutGuide = attachRowMarkerToDefaultGuide(
      { ...marker(3), x: 80, y: 75 },
      [guide],
      null,
    )
    expect(withoutGuide.guideAttachment).toBeUndefined()
    expect(withoutGuide.y).toBe(75)
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
    expect(attached.x).toBeCloseTo(40, 2)
    expect(attached.guideAttachment?.guideId).toBe('line')

    const moved = moveAttachedRowMarker(attached, guide, { x: 150, y: 90 })
    expect(moved.x).toBeCloseTo(150, 2)
    expect(moved.y).toBeCloseTo(20, 6)
    expect(moved.guideAttachment?.t).toBeCloseTo(0.75, 2)
  })

  it('attaches to the nearest rectangular grid line and stays on that line while moving', () => {
    const guide: GridGuide = {
      id: 'grid',
      type: 'grid',
      origin: { x: 100, y: 100 },
      rows: 3,
      columns: 5,
      spacingX: 20,
      spacingY: 30,
      rotation: 0,
      visible: true,
    }
    const attached = attachRowMarkerToGuide({ ...marker(1), x: 118, y: 132 }, guide)
    expect(attached.guideAttachment?.track).toBe('row')
    expect(attached.guideAttachment?.trackIndex).toBe(2)
    expect(attached.y).toBeCloseTo(130, 6)

    const moved = moveAttachedRowMarker(attached, guide, { x: 155, y: 180 })
    expect(moved.y).toBeCloseTo(130, 6)
    expect(moved.x).toBeCloseTo(140, 6)
  })

  it('attaches to radial-grid tracks and follows radial-grid edits', () => {
    const guide: RadialGridGuide = {
      id: 'radial',
      type: 'radial-grid',
      center: { x: 0, y: 0 },
      ringCount: 3,
      ringSpacing: 20,
      sectorCount: 8,
      startAngle: 0,
      visible: true,
    }
    const attached = attachRowMarkerToGuide({ ...marker(1), x: 42, y: 5 }, guide)
    expect(['ring', 'sector']).toContain(attached.guideAttachment?.track)

    const shifted: RadialGridGuide = { ...guide, center: { x: 50, y: 25 } }
    const [followed] = reconcileRowMarkerAttachments([attached], [shifted])
    expect(followed.x - shifted.center.x).toBeCloseTo(attached.x - guide.center.x, 5)
    expect(followed.y - shifted.center.y).toBeCloseTo(attached.y - guide.center.y, 5)
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
    expect(followed.x).toBeCloseTo(25, 2)
    expect(followed.y).toBeCloseTo(30, 6)

    const reversed: LineGuide = { ...guide, start: guide.end, end: guide.start }
    const [remapped] = remapRowMarkerAttachmentsForReversedGuide([attached], reversed)
    expect(remapped.x).toBeCloseTo(attached.x, 2)
    expect(remapped.y).toBeCloseTo(attached.y, 3)
  })
})
