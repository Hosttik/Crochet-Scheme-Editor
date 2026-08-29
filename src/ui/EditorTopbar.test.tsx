import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EditorTopbar } from './EditorTopbar'

const noop = () => undefined

describe('editor topbar', () => {
  it('keeps autosave, locale, history and document actions in one typed surface', () => {
    const markup = renderToStaticMarkup(
      <EditorTopbar
        locale="ru"
        autosaveState="saved"
        autosaveLabel="Сохранено"
        autosaveDelayMs={650}
        canUndo
        canRedo={false}
        favoriteActions={<button>Favorite stitch</button>}
        loadInputRef={createRef<HTMLInputElement>()}
        onAutosaveDelayChange={noop}
        onLocaleChange={noop}
        onUndo={noop}
        onRedo={noop}
        onSaveProject={noop}
        onOpenProject={noop}
        onExportSvg={noop}
        onImportFile={noop}
      />,
    )

    expect(markup).toContain('class="topbar"')
    expect(markup).toContain('class="ui-v2-favorites-host"')
    expect(markup).toContain('Favorite stitch')
    expect(markup).toContain('class="autosave-indicator saved"')
    expect(markup).toContain('aria-label="Автосохранение"')
    expect(markup).toContain('value="650" selected=""')
    expect(markup).toContain('>RU</button>')
    expect(markup).toContain('>EN</button>')
    expect(markup).toContain('type="file"')
    expect(markup).toContain('accept="application/json,.json"')
    expect(markup).toContain('disabled=""')
  })
})
