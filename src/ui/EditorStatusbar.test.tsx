import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EditorStatusbar } from './EditorStatusbar'

describe('editor status bar', () => {
  it('renders App-owned status, document counts and explicit selection state', () => {
    const markup = renderToStaticMarkup(
      <EditorStatusbar
        locale="ru"
        status="Готово"
        stitchCount={12}
        guideCount={3}
        rowMarkerCount={4}
        rulerCount={2}
        selectedCount={5}
      />,
    )

    expect(markup).toContain('data-testid="canvas-statusbar"')
    expect(markup).toContain('<strong>Готово</strong>')
    expect(markup).toContain('12 ')
    expect(markup).toContain('3 ')
    expect(markup).toContain('4 номеров рядов')
    expect(markup).toContain('2 линеек')
    expect(markup).toContain('statusbar-selection has-selection')
    expect(markup).toContain('Выбрано: <strong>5</strong>')
  })
})
