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

  it('preserves the App-owned workbench tree without rewriting workspace chrome', () => {
    const markup = renderToStaticMarkup(
      <EditorShell locale="ru" runCommand={() => true}>
        <div className="app-shell">
          <main className="workspace">
            <button type="button" aria-label="App-owned workspace control">Control</button>
            <div>Canvas</div>
          </main>
        </div>
      </EditorShell>,
    )

    expect(markup).toContain('aria-label="App-owned workspace control"')
    expect(markup).toContain('class="workspace"')
    expect(markup).not.toContain('sidebar-toggle')
  })
})
