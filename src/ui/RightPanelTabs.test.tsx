import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RightPanelTabs } from './RightPanelTabs'

const noop = () => undefined

describe('right panel tabs', () => {
  it('exposes Properties, Layers and Document while preserving the internal options contract', () => {
    const markup = renderToStaticMarkup(
      <RightPanelTabs locale="en" activeTab="options" onChange={noop} />,
    )

    expect(markup).toContain('aria-label="Right panel"')
    expect(markup).toContain('>Properties<')
    expect(markup).toContain('>Layers<')
    expect(markup).toContain('>Document<')
    expect(markup).toContain('id="ui-v2-right-tab-options"')
    expect(markup).toContain('id="ui-v2-right-tab-layers"')
    expect(markup).toContain('id="ui-v2-right-tab-document"')
    expect(markup).toContain('aria-controls="ui-v2-right-options-panel"')
    expect(markup).toContain('data-right-mode="properties"')
    expect(markup).toContain('data-right-mode="document"')
  })

  it('localizes the workspace modes in Russian', () => {
    const markup = renderToStaticMarkup(
      <RightPanelTabs locale="ru" activeTab="options" onChange={noop} />,
    )

    expect(markup).toContain('>Свойства<')
    expect(markup).toContain('>Слои<')
    expect(markup).toContain('>Документ<')
  })
})
