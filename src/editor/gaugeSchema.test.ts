import { describe, expect, it } from 'vitest'
import { parseProject, ProjectValidationError } from './projectSchema'

const snapping = {
  enabled: true,
  sourceAnchor: 'bottom' as const,
  orientationMode: 'none' as const,
  snapToVertices: true,
  tolerancePx: 12,
}

function base(schemaVersion: number) {
  return {
    schemaVersion,
    metadata: { title: 'Gauge', updatedAt: '2026-08-26T00:00:00Z' },
    elements: [],
    guides: [],
    rowMarkers: [],
    settings: { snapping },
  }
}

describe('gauge schema v19', () => {
  it('persists gauge profiles and measurement rulers', () => {
    const parsed = parseProject({
      ...base(19),
      gauge: {
        activeProfileId: 'g1',
        profiles: [{ id: 'g1', name: 'SC', symbolId: 'single', stitchCount: 20, rowCount: 24, widthCm: 10, heightCm: 10 }],
      },
      rulers: [
        { id: 'r1', start: { x: 1, y: 2 }, end: { x: 30, y: 2 }, profileId: 'g1', manualStitchCount: 10 },
        { id: 'r2', start: { x: 1, y: 2 }, end: { x: 1, y: 30 }, profileId: 'g1', mode: 'rows', manualRowCount: 4 },
      ],
    }, snapping)
    expect(parsed.schemaVersion).toBe(20)
    expect(parsed.gauge?.profiles[0]).toMatchObject({ symbolId: 'single', stitchCount: 20, widthCm: 10 })
    expect(parsed.rulers?.[0]).toMatchObject({ id: 'r1', manualStitchCount: 10 })
    expect(parsed.rulers?.[1]).toMatchObject({ id: 'r2', mode: 'rows', manualRowCount: 4 })
  })

  it('migrates legacy v18 projects to empty gauge/ruler collections', () => {
    const parsed = parseProject(base(18), snapping)
    expect(parsed.schemaVersion).toBe(20)
    expect(parsed.gauge).toEqual({ profiles: [] })
    expect(parsed.rulers).toEqual([])
  })

  it('rejects an invalid ruler measurement mode', () => {
    expect(() => parseProject({
      ...base(19),
      rulers: [{ id: 'r1', start: { x: 0, y: 0 }, end: { x: 0, y: 10 }, mode: 'pixels' }],
    }, snapping)).toThrow(ProjectValidationError)
  })

  it('rejects invalid gauge values in current schema', () => {
    expect(() => parseProject({
      ...base(19),
      gauge: {
        profiles: [{ id: 'g1', name: 'Bad', symbolId: 'single', stitchCount: 0, rowCount: 10, widthCm: 10, heightCm: 10 }],
      },
    }, snapping)).toThrow(ProjectValidationError)
  })
})
