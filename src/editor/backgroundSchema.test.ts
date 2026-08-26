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

function rawProject() {
  return {
    schemaVersion: 17,
    metadata: { title: 'Background', updatedAt: '2026-08-26T00:00:00Z' },
    elements: [],
    guides: [],
    rowMarkers: [],
    backgroundImage: {
      dataUrl: 'data:image/png;base64,abc',
      sourceName: 'reference.png',
      x: -100,
      y: -50,
      width: 800,
      height: 400,
      opacity: 0.35,
      visible: true,
      locked: true,
      includeInExport: false,
    },
    settings: { snapping },
  }
}

describe('schema v17 background image', () => {
  it('preserves valid editor underlay metadata', () => {
    const parsed = parseProject(rawProject(), snapping)
    expect(parsed.schemaVersion).toBe(17)
    expect(parsed.backgroundImage).toEqual(rawProject().backgroundImage)
  })

  it('rejects non-image data urls and invalid geometry', () => {
    const badUrl = rawProject() as any
    badUrl.backgroundImage.dataUrl = 'https://example.com/photo.png'
    expect(() => parseProject(badUrl, snapping)).toThrow('Invalid background image')

    const badOpacity = rawProject() as any
    badOpacity.backgroundImage.opacity = 2
    expect(() => parseProject(badOpacity, snapping)).toThrow('Invalid background image')

    const badSize = rawProject() as any
    badSize.backgroundImage.width = 0
    expect(() => parseProject(badSize, snapping)).toThrow('Invalid background image')
  })

  it('keeps legacy projects background-free', () => {
    const legacy = rawProject() as any
    legacy.schemaVersion = 16
    delete legacy.backgroundImage
    const parsed = parseProject(legacy, snapping)
    expect(parsed.schemaVersion).toBe(17)
    expect(parsed.backgroundImage).toBeUndefined()
  })
})
