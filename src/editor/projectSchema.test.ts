import { describe, expect, it } from 'vitest'
import type { SnappingSettings } from '../types'
import { parseProject, ProjectValidationError } from './projectSchema'

const fallback: SnappingSettings = {
  enabled: true,
  sourceAnchor: 'bottom',
  orientationMode: 'none',
  snapToVertices: true,
  tolerancePx: 12,
}

function legacyProject() {
  return {
    schemaVersion: 1,
    metadata: { title: 'Legacy', updatedAt: '2026-01-01T00:00:00Z' },
    elements: [{ id: 'a', symbolId: 'single', x: 10, y: 20, rotation: 0 }],
    settings: { snapping: fallback },
  }
}

describe('parseProject', () => {
  it('migrates legacy projects to schema v6 and normalizes element flags', () => {
    const project = parseProject(legacyProject(), fallback)
    expect(project.schemaVersion).toBe(6)
    expect(project.elements[0]).toMatchObject({ visible: true, locked: false })
    expect(project.guides).toEqual([])
  })

  it('rejects malformed stitch coordinates', () => {
    const raw = legacyProject()
    raw.elements[0].x = Number.NaN
    expect(() => parseProject(raw, fallback)).toThrow(ProjectValidationError)
  })

  it('rejects unknown guide types', () => {
    const raw = { ...legacyProject(), schemaVersion: 6, guides: [{ id: 'x', type: 'mystery', visible: true }] }
    expect(() => parseProject(raw, fallback)).toThrow('Unknown guide type')
  })

  it('rejects malformed parametric row shaping', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 6
    raw.elements[0].parametricRow = {
      id: 'row-1',
      guideId: 'g',
      symbolId: 'single',
      options: {
        distributionMode: 'count', count: 12, spacing: 20,
        orientation: 'radial', rotationOffset: 0, radialOffset: 0, ringIndex: 1,
      },
      shaping: { kind: 'magic', count: 6, baseCount: 6 },
    }
    expect(() => parseProject(raw, fallback)).toThrow('Invalid row shaping')
  })
})
