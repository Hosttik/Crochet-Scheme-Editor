import { describe, expect, it } from 'vitest'
import type { CrochetProject, SnappingSettings } from '../types'
import { assertProjectIntegrity, projectIntegrityIssue } from './projectIntegrity'
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
  it('provides a persistence assertion for documents above hard limits', () => {
    const project = base() as any
    project.gauge = {
      profiles: Array.from({ length: 51 }, (_, index) => ({
        id: `g-${index}`,
        name: `Gauge ${index}`,
        symbolId: 'single',
        stitchCount: 20,
        rowCount: 20,
        widthCm: 10,
        heightCm: 10,
      })),
    }
    expect(projectIntegrityIssue(project)).toBe('Project contains too many gauge profiles')
    expect(() => assertProjectIntegrity(project)).toThrow('Project contains too many gauge profiles')
  })

  it('rejects a rich row program that does not consume the effective parent row', () => {
    const project = base() as any
    project.guides = [{
      id: 'guide', type: 'arc', center: { x: 0, y: 0 }, radius: 100,
      startAngle: 0, endAngle: 180, divisions: 4, visible: true,
    }]
    const options = {
      distributionMode: 'count', count: 3, spacing: 40, orientation: 'radial',
      rotationOffset: 0, radialOffset: 0, ringIndex: 1,
    }
    const parent = { id: 'parent', guideId: 'guide', symbolId: 'single', patternOrder: 1, options }
    const child = {
      id: 'child', guideId: 'guide', symbolId: 'single', patternOrder: 2, parentRowId: 'parent',
      program: { repeat: 1, items: [{ kind: 'stitch', symbolId: 'single', count: 2 }] },
      options: { ...options, count: 2 },
    }
    project.elements = [
      ...Array.from({ length: 3 }, (_, index) => ({
        id: `p-${index}`, symbolId: 'single', x: index, y: 0, rotation: 0, parametricRow: parent,
      })),
      ...Array.from({ length: 2 }, (_, index) => ({
        id: `c-${index}`, symbolId: 'single', x: index, y: 40, rotation: 0, parametricRow: child,
      })),
    ]
    expect(projectIntegrityIssue(project)).toBe(
      'Rich row program does not consume exactly the available parent stitches',
    )
  })

})
