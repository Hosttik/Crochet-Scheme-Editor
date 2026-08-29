import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EditorShell } from './EditorShell'


describe('UI v2 editor shell', () => {
  it('renders the application menu above the workbench', () => {
    const markup = renderToStaticMarkup(
      <EditorShell runCommand={() => true}>
        <main data-testid="workbench-child">Canvas</main>
      </EditorShell>,
    )

    expect(markup).toContain('class="editor-root-v2"')
    expect(markup).toContain('Меню приложения')
    expect(markup).toContain('>Файл</button>')
    expect(markup).toContain('>Правка</button>')
    expect(markup).toContain('>Вид</button>')
    expect(markup).toContain('>Параметры</button>')
    expect(markup).toContain('>Справка</button>')
    expect(markup).toContain('data-testid="workbench-child"')
  })

  it('replaces legacy workspace collapse buttons with state-aware shell controls', () => {
    const expanded = renderToStaticMarkup(
      <EditorShell locale="ru" runCommand={() => true}>
        <div className="app-shell">
          <main className="workspace">
            <button className="sidebar-toggle left" aria-label="legacy-left">‹</button>
            <button className="sidebar-toggle right" aria-label="legacy-right">›</button>
            <div>Canvas</div>
          </main>
        </div>
      </EditorShell>,
    )

    expect(expanded).not.toContain('legacy-left')
    expect(expanded).not.toContain('legacy-right')
    expect(expanded).toContain('aria-label="Свернуть левую панель" aria-expanded="true"')
    expect(expanded).toContain('aria-label="Свернуть правую панель" aria-expanded="true"')

    const collapsed = renderToStaticMarkup(
      <EditorShell locale="ru" runCommand={() => true}>
        <div className="app-shell left-collapsed right-collapsed">
          <main className="workspace">
            <button className="sidebar-toggle left" aria-label="legacy-left">‹</button>
            <button className="sidebar-toggle right" aria-label="legacy-right">›</button>
            <div>Canvas</div>
          </main>
        </div>
      </EditorShell>,
    )

    expect(collapsed).toContain('aria-label="Развернуть левую панель" aria-expanded="false"')
    expect(collapsed).toContain('aria-label="Развернуть правую панель" aria-expanded="false"')
  })
})
