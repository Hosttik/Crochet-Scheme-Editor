import { describe, expect, it } from 'vitest'
import type { CrochetProject, SnappingSettings } from '../types'
import { parseProject } from './projectSchema'

const snapping: SnappingSettings = { enabled: true, sourceAnchor: 'bottom', orientationMode: 'none', snapToVertices: true, tolerancePx: 12 }
const base = (): CrochetProject => ({
  schemaVersion: 18,
  metadata: { title: 'Test', updatedAt: '2026-08-26T00:00:00Z' },
  elements: [{ id: 'a', symbolId: 'single', x: 0, y: 0, rotation: 0 }],
  guides: [], rowMarkers: [], settings: { snapping },
})

describe('project integrity validation', () => {
  it('rejects duplicate ids and unknown symbols', () => {
    const duplicate = base() as any
    duplicate.elements.push({ ...duplicate.elements[0] })
    expect(() => parseProject(duplicate, snapping)).toThrow('Duplicate stitch element id')
    const unknown = base() as any
    unknown.elements[0].symbolId = 'mystery-stitch'
    expect(() => parseProject(unknown, snapping)).toThrow('Unknown stitch symbol')
  })

  it('rejects guide resource bombs before rendering', () => {
    const project = base() as any
    project.guides = [{ id: 'grid', type: 'grid', origin: { x: 0, y: 0 }, rows: 100000000, columns: 2, spacingX: 20, spacingY: 20, rotation: 0, visible: true }]
    expect(() => parseProject(project, snapping)).toThrow('Grid guide dimensions are out of bounds')
  })

  it('rejects broken cross references', () => {
    const project = base() as any
    project.elements[0].parentStitchIds = ['missing']
    expect(() => parseProject(project, snapping)).toThrow('missing parent')
  })
})
