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

function shapedBinding() {
  return {
    id: 'row-1',
    guideId: 'g',
    symbolId: 'single',
    parentRowId: 'row-0',
    options: {
      distributionMode: 'count', count: 12, spacing: 20,
      orientation: 'radial', rotationOffset: 0, radialOffset: 0, ringIndex: 1,
    },
    shaping: { kind: 'increase', count: 2, baseCount: 10 },
  }
}

describe('parseProject', () => {
  it('migrates legacy projects to schema v8 and normalizes element flags', () => {
    const project = parseProject(legacyProject(), fallback)
    expect(project.schemaVersion).toBe(8)
    expect(project.elements[0]).toMatchObject({ visible: true, locked: false })
    expect(project.guides).toEqual([])
  })

  it('preserves valid topology parent ids', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 7
    raw.elements[0].parentStitchIds = ['parent-1', 'parent-2']
    const project = parseProject(raw, fallback)
    expect(project.elements[0].parentStitchIds).toEqual(['parent-1', 'parent-2'])
  })

  it('preserves a valid manual topology override', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 8
    raw.elements[0].parametricRow = {
      ...shapedBinding(),
      topologyOverride: { changeParentIds: ['p3', 'p8'] },
    }
    const project = parseProject(raw, fallback)
    expect(project.elements[0].parametricRow?.topologyOverride).toEqual({
      changeParentIds: ['p3', 'p8'],
    })
  })

  it('rejects malformed topology parent ids', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 7
    raw.elements[0].parentStitchIds = ['parent-1', '']
    expect(() => parseProject(raw, fallback)).toThrow(ProjectValidationError)
  })

  it('rejects duplicate or shaping-less topology overrides', () => {
    const duplicate = legacyProject() as any
    duplicate.schemaVersion = 8
    duplicate.elements[0].parametricRow = {
      ...shapedBinding(),
      topologyOverride: { changeParentIds: ['p3', 'p3'] },
    }
    expect(() => parseProject(duplicate, fallback)).toThrow('Invalid topology override')

    const noShaping = legacyProject() as any
    noShaping.schemaVersion = 8
    noShaping.elements[0].parametricRow = {
      ...shapedBinding(),
      shaping: undefined,
      topologyOverride: { changeParentIds: ['p3'] },
    }
    expect(() => parseProject(noShaping, fallback)).toThrow('Invalid topology override')
  })

  it('rejects malformed stitch coordinates', () => {
    const raw = legacyProject()
    raw.elements[0].x = Number.NaN
    expect(() => parseProject(raw, fallback)).toThrow(ProjectValidationError)
  })

  it('rejects unknown guide types', () => {
    const raw = { ...legacyProject(), schemaVersion: 8, guides: [{ id: 'x', type: 'mystery', visible: true }] }
    expect(() => parseProject(raw, fallback)).toThrow('Unknown guide type')
  })

  it('rejects malformed parametric row shaping', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 8
    raw.elements[0].parametricRow = {
      ...shapedBinding(),
      shaping: { kind: 'magic', count: 6, baseCount: 6 },
    }
    expect(() => parseProject(raw, fallback)).toThrow('Invalid row shaping')
  })
})
