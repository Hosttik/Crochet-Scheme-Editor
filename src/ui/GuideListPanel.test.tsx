import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { GuideListPanel } from './GuideListPanel'
import type { Guide } from '../types'

const guides: Guide[] = [
  {
    id: 'line-1',
    type: 'line',
    start: { x: 0, y: 0 },
    end: { x: 120, y: 0 },
    divisions: 6,
    visible: true,
    locked: true,
  },
  {
    id: 'arc-1',
    type: 'arc',
    center: { x: 0, y: 0 },
    radius: 80,
    startAngle: 0,
    endAngle: 180,
    divisions: 8,
    visible: false,
  },
]

describe('guide list panel', () => {
  it('preserves guide count, selection, visibility and lock presentation', () => {
    const markup = renderToStaticMarkup(
      <GuideListPanel
        locale="ru"
        guides={guides}
        selectedGuideId="line-1"
        guideLabel={(guide) => guide.type === 'line' ? 'Линия' : 'Дуга'}
        onSelectGuide={() => undefined}
      />,
    )

    expect(markup).toContain('class="panel-section guide-section"')
    expect(markup).toContain('<h2>Направляющие</h2>')
    expect(markup).toContain('class="active"')
    expect(markup).toContain('1. Линия')
    expect(markup).toContain('visibility-dot hidden')
    expect(markup).toContain('aria-label="Заблокирована"')
    expect(markup).toContain('lock-indicator-icon')
    expect(markup).not.toContain('🔒')
  })
})
