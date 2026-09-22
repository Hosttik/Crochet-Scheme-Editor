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
        onAssignGroup={noop}
        onCreateGroup={noop}
        onGroupStartAtZeroChange={noop}
        onDelete={noop}
        guideLabel={(guide) => guide.type === 'line' ? 'Линия' : 'Прямоугольная сетка'}
      />,
    )

    expect(markup).toContain('<option value="old-line">1. Линия</option>')
    expect(markup).toContain('<option value="new-grid">2. Прямоугольная сетка</option>')
    expect(markup.indexOf('value="old-line"')).toBeLessThan(markup.indexOf('value="new-grid"'))
  })
  it('renders every supplied guide without filtering', () => {
    const marker: RowMarker = {
      id: 'marker-1',
      number: 1,
      x: 0,
      y: 0,
      visible: true,
      locked: false,
    }
    const guides: Guide[] = [
      { id: 'arc', type: 'arc', center: { x: 0, y: 0 }, radius: 100, startAngle: 0, endAngle: 180, divisions: 8, visible: true },
      { id: 'line', type: 'line', start: { x: 0, y: 0 }, end: { x: 100, y: 0 }, divisions: 8, visible: true },
      { id: 'curve', type: 'curve', start: { x: 0, y: 0 }, control1: { x: 25, y: -20 }, control2: { x: 75, y: 20 }, end: { x: 100, y: 0 }, divisions: 8, visible: true },
      { id: 'parabola', type: 'parabola', start: { x: 0, y: 20 }, control: { x: 50, y: -20 }, end: { x: 100, y: 20 }, divisions: 8, visible: true },
      { id: 'grid', type: 'grid', origin: { x: 0, y: 0 }, rows: 3, columns: 3, spacingX: 20, spacingY: 20, rotation: 0, visible: true },
      { id: 'radial', type: 'radial-grid', center: { x: 0, y: 0 }, ringCount: 3, ringSpacing: 20, sectorCount: 8, startAngle: 0, visible: true },
    ]

    const labels: Record<Guide['type'], string> = {
      arc: 'Дуга',
      line: 'Линия',
      curve: 'Кривая',
      parabola: 'Парабола',
      grid: 'Прямоугольная сетка',
      'radial-grid': 'Радиальная сетка',
    }
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
        onAssignGroup={noop}
        onCreateGroup={noop}
        onGroupStartAtZeroChange={noop}
        onDelete={noop}
        guideLabel={(guide) => labels[guide.type]}
      />,
    )

    guides.forEach((guide, index) => {
      expect(markup).toContain(`<option value="${guide.id}">${index + 1}. ${labels[guide.type]}</option>`)
    })
  })
  it('shows numbering group controls and zero-based mode', () => {
    const markers: RowMarker[] = [
      { id: 'a-0', number: 0, x: 0, y: 0, groupId: 'group-a', startAtZero: true, visible: true },
      { id: 'b-1', number: 1, x: 20, y: 0, groupId: 'group-b', visible: true },
    ]
    const markup = renderToStaticMarkup(
      <RowMarkersPanel
        locale="ru"
        markers={markers}
        guides={[]}
        selectedId="a-0"
        nextNumber={1}
        placing={false}
        onStartPlacement={noop}
        onSelect={noop}
        onChange={noop}
        onAttachGuide={noop}
        onDetachGuide={noop}
        onAssignGroup={noop}
        onCreateGroup={noop}
        onGroupStartAtZeroChange={noop}
        onDelete={noop}
        guideLabel={() => 'Направляющая'}
      />,
    )

    expect(markup).toContain('Группа нумерации')
    expect(markup).toContain('<option value="group-a" selected="">Группа 1</option>')
    expect(markup).toContain('<option value="group-b">Группа 2</option>')
    expect(markup).toContain('Начинать отсчёт с 0')
    expect(markup).toContain('type="checkbox" checked=""')
    expect(markup).toContain('Создать новую группу')
  })
})
