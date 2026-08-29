import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EditorIcon } from './icons'
import { Button, IconButton, SearchField, ToolButton } from './primitives'

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

  it('renders text buttons with semantic variants and hidden decorative icons', () => {
    const markup = renderToStaticMarkup(
      <Button icon="trash" variant="danger">Удалить</Button>,
    )
    expect(markup).toContain('ui-button--danger')
    expect(markup).toContain('aria-hidden="true"')
    expect(markup).toContain('<span class="ui-button__label">Удалить</span>')
  })

  it('renders an accessible search field with a decorative shared search icon', () => {
    const markup = renderToStaticMarkup(
      <SearchField label="Поиск элементов" placeholder="Поиск…" data-testid="search" />,
    )
    expect(markup).toContain('class="ui-search-field"')
    expect(markup).toContain('type="search"')
    expect(markup).toContain('aria-label="Поиск элементов"')
    expect(markup).toContain('data-testid="search"')
    expect(markup).toContain('aria-hidden="true"')
  })

  it('exposes the active state on tool buttons', () => {
    const markup = renderToStaticMarkup(
      <ToolButton icon="hand" label="Ладонь" shortcut="H" active />,
    )
    expect(markup).toContain('aria-pressed="true"')
    expect(markup).toContain('>H</kbd>')
  })
})
