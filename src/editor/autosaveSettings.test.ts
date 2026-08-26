import { describe, expect, it } from 'vitest'
import type { SnappingSettings } from '../types'
import { parseProject } from './projectSchema'

const snapping: SnappingSettings = {
  enabled: true,
  sourceAnchor: 'bottom',
  orientationMode: 'none',
  snapToVertices: true,
  tolerancePx: 12,
}

function project(autosave?: unknown, schemaVersion = 16) {
  return {
    schemaVersion,
    metadata: { title: 'Autosave', updatedAt: '2026-08-26T00:00:00.000Z' },
    elements: [],
    guides: [],
    settings: { snapping, ...(autosave === undefined ? {} : { autosave }) },
  }
}

describe('autosave settings', () => {
  it('keeps the legacy fast delay for older projects', () => {
    expect(parseProject(project(undefined, 15), snapping).settings.autosave).toEqual({ delayMs: 650 })
  })

  it('persists off and supported delays', () => {
    for (const delayMs of [0, 650, 5000, 15000, 30000, 60000]) {
      expect(parseProject(project({ delayMs }), snapping).settings.autosave).toEqual({ delayMs })
    }
  })

  it('rejects arbitrary delays', () => {
    expect(() => parseProject(project({ delayMs: 1234 }), snapping)).toThrow('Invalid autosave settings')
  })
})
