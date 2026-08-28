import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EditorShell } from './EditorShell'


describe('UI v2 editor shell', () => {
  it('renders the application menu above the workbench', () => {
    const markup = renderToStaticMarkup(
      <EditorShell><main data-testid="workbench-child">Canvas</main></EditorShell>,
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
})
