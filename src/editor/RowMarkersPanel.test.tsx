import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Guide, RowMarker } from '../types'
import { RowMarkersPanel } from './RowMarkersPanel'

const noop = () => undefined

describe('RowMarkersPanel guide options', () => {
  it('uses the same guide order, numbering and labels as the main guide list', () => {
    const marker: RowMarker = {
      id: 'marker-1',
      number: 1,
      x: 0,
      y: 0,
      visible: true,
      locked: false,
    }
    const guides: Guide[] = [
      {
        id: 'old-line',
        type: 'line',
        start: { x: 0, y: 0 },
        end: { x: 100, y: 0 },
        divisions: 8,
        visible: true,
      },
      {
        id: 'new-grid',
        type: 'grid',
        origin: { x: 0, y: 0 },
        rows: 3,
        columns: 3,
        spacingX: 20,
        spacingY: 20,
        rotation: 0,
        visible: true,
      },
    ]

    const markup = renderToStaticMarkup(
      <RowMarkersPanel
        locale="ru"
        markers={[marker]}
        guides={guides}
        selectedId={marker.id}
        nextNumber={2}
        placing={false}
        onStartPlacement={noop}
        onSelect={noop}
        onChange={noop}
        onAttachGuide={noop}
        onDetachGuide={noop}
        onDelete={noop}
        guideLabel={(guide) => guide.type === 'line' ? 'Линия' : 'Прямоугольная сетка'}
      />,
    )

    expect(markup).toContain('<option value="old-line">1. Линия</option>')
    expect(markup).toContain('<option value="new-grid">2. Прямоугольная сетка</option>')
    expect(markup.indexOf('value="old-line"')).toBeLessThan(markup.indexOf('value="new-grid"'))
  })
})
