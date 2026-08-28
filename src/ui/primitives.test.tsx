import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EditorIcon } from './icons'
import { IconButton, ToolButton } from './primitives'

describe('UI v2 primitives', () => {
  it('renders outline editor icons without text glyph fallbacks', () => {
    const markup = renderToStaticMarkup(<EditorIcon name="duplicate" />)
    expect(markup).toContain('<svg')
    expect(markup).toContain('viewBox="0 0 24 24"')
    expect(markup).toContain('aria-hidden="true"')
  })

  it('keeps icon-only buttons accessible by label', () => {
    const markup = renderToStaticMarkup(<IconButton icon="trash" label="Удалить" />)
    expect(markup).toContain('aria-label="Удалить"')
    expect(markup).toContain('title="Удалить"')
  })

  it('exposes the active state on tool buttons', () => {
    const markup = renderToStaticMarkup(
      <ToolButton icon="hand" label="Ладонь" shortcut="H" active />,
    )
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain('>H</kbd>')
  })
})
