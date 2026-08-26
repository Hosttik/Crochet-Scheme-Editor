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
  it('migrates legacy projects to schema v16 and normalizes element flags', () => {
    const project = parseProject(legacyProject(), fallback)
    expect(project.schemaVersion).toBe(16)
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

  it('preserves a valid mixed row sequence', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 9
    raw.elements[0].parametricRow = {
      ...shapedBinding(),
      sequence: { items: [
        { symbolId: 'single', count: 3 },
        { symbolId: 'chain', count: 1 },
        { symbolId: 'double', count: 1 },
      ] },
    }
    const project = parseProject(raw, fallback)
    expect(project.elements[0].parametricRow?.sequence?.items).toHaveLength(3)
  })

  it('preserves a valid schema v10 rich row program', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 10
    raw.elements[0].parametricRow = {
      ...shapedBinding(),
      shaping: undefined,
      program: {
        repeat: 2,
        items: [
          { kind: 'stitch', symbolId: 'single', count: 2 },
          {
            kind: 'group',
            repeat: 3,
            items: [
              { kind: 'increase', symbolId: 'double', count: 1 },
              { kind: 'stitch', symbolId: 'chain', count: 1 },
            ],
          },
        ],
      },
    }
    const project = parseProject(raw, fallback)
    expect(project.elements[0].parametricRow?.program?.items).toHaveLength(2)
  })

  it('preserves valid schema v11 row construction semantics', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 11
    raw.elements[0].parametricRow = {
      ...shapedBinding(),
      construction: {
        mode: 'joined', direction: 'reverse', startChainCount: 2, joinWithSlipStitch: true,
      },
    }
    const project = parseProject(raw, fallback)
    expect(project.elements[0].parametricRow?.construction).toEqual({
      mode: 'joined', direction: 'reverse', startChainCount: 2, joinWithSlipStitch: true,
    })
  })

  it('rejects malformed row construction semantics', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 11
    raw.elements[0].parametricRow = {
      ...shapedBinding(),
      construction: {
        mode: 'spiral', direction: 'along', startChainCount: 2, joinWithSlipStitch: true,
      },
    }
    expect(() => parseProject(raw, fallback)).toThrow('Invalid spiral construction')

    raw.elements[0].parametricRow.construction = {
      mode: 'turning', direction: 'sideways', startChainCount: 1, joinWithSlipStitch: false,
    }
    expect(() => parseProject(raw, fallback)).toThrow('Invalid row construction')
  })

  it('rejects malformed mixed row sequences', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 9
    raw.elements[0].parametricRow = {
      ...shapedBinding(),
      sequence: { items: [{ symbolId: 'single', count: 0 }] },
    }
    expect(() => parseProject(raw, fallback)).toThrow('Invalid row sequence item')
  })

  it('rejects nested groups and invalid rich program counts', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 10
    raw.elements[0].parametricRow = {
      ...shapedBinding(),
      shaping: undefined,
      program: {
        repeat: 1,
        items: [{
          kind: 'group',
          repeat: 1,
          items: [{ kind: 'group', repeat: 2, items: [] }],
        }],
      },
    }
    expect(() => parseProject(raw, fallback)).toThrow('Invalid row program leaf')
  })

  it('rejects a row that contains both rich program and legacy shaping/sequence semantics', () => {
    const sequenceConflict = legacyProject() as any
    sequenceConflict.schemaVersion = 10
    sequenceConflict.elements[0].parametricRow = {
      ...shapedBinding(),
      shaping: undefined,
      sequence: { items: [{ symbolId: 'single', count: 2 }] },
      program: { repeat: 1, items: [{ kind: 'stitch', symbolId: 'single', count: 2 }] },
    }
    expect(() => parseProject(sequenceConflict, fallback)).toThrow(
      'Row cannot contain both sequence and rich program',
    )

    const shapingConflict = legacyProject() as any
    shapingConflict.schemaVersion = 10
    shapingConflict.elements[0].parametricRow = {
      ...shapedBinding(),
      program: { repeat: 1, items: [{ kind: 'stitch', symbolId: 'single', count: 2 }] },
    }
    expect(() => parseProject(shapingConflict, fallback)).toThrow(
      'Rich row program owns shaping and topology',
    )
  })

  it('rejects malformed topology parent ids', () => {
    const raw = legacyProject()
    ;(raw.elements[0] as any).parentStitchIds = ['parent-1', '']
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

  it('preserves and validates schema v12 group ids', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 12
    raw.elements[0].groupId = 'motif-a'
    expect(parseProject(raw, fallback).elements[0].groupId).toBe('motif-a')
    raw.elements[0].groupId = ''
    expect(() => parseProject(raw, fallback)).toThrow(ProjectValidationError)
  })

  it('preserves and validates schema v13 stitch colors while migrating to v16', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 13
    raw.elements[0].color = '#C2413B'
    const parsed = parseProject(raw, fallback)
    expect(parsed.elements[0].color).toBe('#c2413b')
    expect(parsed.schemaVersion).toBe(16)

    raw.elements[0].color = 'red'
    expect(() => parseProject(raw, fallback)).toThrow(ProjectValidationError)
    raw.elements[0].color = '#123'
    expect(() => parseProject(raw, fallback)).toThrow(ProjectValidationError)
  })

  it('preserves schema v14 line and curve guides with manual path attachment', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 14
    raw.guides = [
      {
        id: 'line-1', type: 'line', start: { x: 0, y: 0 }, end: { x: 200, y: 0 },
        divisions: 12, visible: true,
      },
      {
        id: 'curve-1', type: 'curve', start: { x: 0, y: 0 }, control1: { x: 50, y: -80 },
        control2: { x: 150, y: 80 }, end: { x: 200, y: 0 }, divisions: 16, visible: true,
      },
    ]
    raw.elements[0].guideAttachment = {
      guideId: 'line-1', t: 0.4, orientation: 'tangent', rotationOffset: 5, normalOffset: 3,
    }

    const parsed = parseProject(raw, fallback)
    expect(parsed.schemaVersion).toBe(16)
    expect(parsed.guides?.map((guide) => guide.type)).toEqual(['line', 'curve'])
    expect(parsed.elements[0].guideAttachment).toEqual({
      guideId: 'line-1', t: 0.4, orientation: 'tangent', rotationOffset: 5, normalOffset: 3,
    })
  })

  it('rejects malformed schema v14 attachments and line/curve geometry', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 14
    raw.elements[0].guideAttachment = {
      guideId: 'line-1', t: 1.5, orientation: 'tangent', rotationOffset: 0, normalOffset: 0,
    }
    expect(() => parseProject(raw, fallback)).toThrow('Invalid guide attachment')

    raw.elements[0].guideAttachment = undefined
    raw.guides = [{ id: 'line-1', type: 'line', start: { x: 0, y: 0 }, end: { x: 'bad', y: 0 }, divisions: 8, visible: true }]
    expect(() => parseProject(raw, fallback)).toThrow('Invalid line guide')

    raw.guides = [{ id: 'curve-1', type: 'curve', start: { x: 0, y: 0 }, control1: { x: 10, y: 10 }, control2: null, end: { x: 20, y: 0 }, divisions: 8, visible: true }]
    expect(() => parseProject(raw, fallback)).toThrow('Invalid curve guide')
  })

  it('rejects a stitch that mixes parametric-row and manual attachment semantics', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 14
    raw.elements[0].parametricRow = shapedBinding()
    raw.elements[0].guideAttachment = {
      guideId: 'g', t: 0.5, orientation: 'keep', rotationOffset: 0, normalOffset: 0,
    }
    expect(() => parseProject(raw, fallback)).toThrow(
      'Parametric rows cannot also use manual guide attachments',
    )
  })

  it('preserves schema v15 guide locks, row numbers and legend settings', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 15
    raw.guides = [{ id: 'line-1', type: 'line', start: { x: 0, y: 0 }, end: { x: 100, y: 0 }, divisions: 8, visible: true, locked: true }]
    raw.rowMarkers = [{ id: 'row-number-1', number: 1, x: -20, y: 15, visible: true, locked: false }]
    raw.settings.legend = { visible: false }
    const parsed = parseProject(raw, fallback)
    expect(parsed.schemaVersion).toBe(16)
    expect(parsed.guides?.[0].locked).toBe(true)
    expect(parsed.rowMarkers).toEqual([{ id: 'row-number-1', number: 1, x: -20, y: 15, visible: true, locked: false }])
    expect(parsed.settings.legend).toEqual({ visible: false })
  })

  it('rejects malformed schema v15 row numbers and legend settings', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 15
    raw.rowMarkers = [{ id: 'bad', number: 0, x: 0, y: 0 }]
    expect(() => parseProject(raw, fallback)).toThrow('Invalid row marker')
    raw.rowMarkers = []
    raw.settings.legend = { visible: 'yes' }
    expect(() => parseProject(raw, fallback)).toThrow('Invalid legend settings')
  })

  it('rejects malformed stitch coordinates', () => {
    const raw = legacyProject()
    raw.elements[0].x = Number.NaN
    expect(() => parseProject(raw, fallback)).toThrow(ProjectValidationError)
  })

  it('rejects unknown guide types', () => {
    const raw = { ...legacyProject(), schemaVersion: 11, guides: [{ id: 'x', type: 'mystery', visible: true }] }
    expect(() => parseProject(raw, fallback)).toThrow('Unknown guide type')
  })

  it('rejects malformed parametric row shaping', () => {
    const raw = legacyProject() as any
    raw.schemaVersion = 11
    raw.elements[0].parametricRow = {
      ...shapedBinding(),
      shaping: { kind: 'magic', count: 6, baseCount: 6 },
    }
    expect(() => parseProject(raw, fallback)).toThrow('Invalid row shaping')
  })
})
