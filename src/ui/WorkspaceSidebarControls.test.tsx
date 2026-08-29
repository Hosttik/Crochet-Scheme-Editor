import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { WorkspaceSidebarControls } from './WorkspaceSidebarControls'

describe('workspace sidebar controls', () => {
  it('renders App-owned collapse actions from explicit state', () => {
    const expanded = renderToStaticMarkup(
      <WorkspaceSidebarControls
        locale="ru"
        leftCollapsed={false}
        rightCollapsed={false}
        onToggleLeft={() => undefined}
        onToggleRight={() => undefined}
      />,
    )

    expect(expanded).toContain('aria-label="Свернуть левую панель" aria-expanded="true"')
    expect(expanded).toContain('aria-label="Свернуть правую панель" aria-expanded="true"')

    const collapsed = renderToStaticMarkup(
      <WorkspaceSidebarControls
        locale="en"
        leftCollapsed
        rightCollapsed
        onToggleLeft={() => undefined}
        onToggleRight={() => undefined}
      />,
    )

    expect(collapsed).toContain('aria-label="Expand left panel" aria-expanded="false"')
    expect(collapsed).toContain('aria-label="Expand right panel" aria-expanded="false"')
  })
})
