import { createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { EditorTopbar } from './EditorTopbar'

const noop = () => undefined

describe('editor topbar', () => {
  it('renders the reference command-bar hierarchy while preserving real settings/actions', () => {
    const markup = renderToStaticMarkup(
      <EditorTopbar
        locale="ru"
        autosaveState="saved"
        autosaveLabel="Автосохранено"
        autosaveDelayMs={650}
        canUndo
        canRedo={false}
        favoriteActions={<button className="favorite-quick-button">Favorite stitch</button>}
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

    expect(markup).toContain('class="topbar topbar-v2"')
    expect(markup).not.toContain('class="brand"')
    expect(markup).toContain('aria-label="Новый"')
    expect(markup).toContain('aria-label="Открыть"')
    expect(markup).toContain('aria-label="Сохранить"')
    expect(markup).toContain('aria-label="Отменить"')
    expect(markup).toContain('aria-label="Повторить"')
    expect(markup).toContain('aria-label="Масштаб"')
    expect(markup).toContain('aria-label="Сетка"')
    expect(markup).toContain('aria-label="Направляющие"')
    expect(markup).toContain('aria-label="Поиск по функциям"')
    expect(markup).toContain('Ctrl + F')
    expect(markup).toContain('class="ui-v2-favorites-host"')
    expect(markup).toContain('Favorite stitch')
    expect(markup).toContain('class="autosave-indicator saved"')
    expect(markup).toContain('Автосохранено')
    expect(markup).toContain('aria-label="Автосохранение"')
    expect(markup).toContain('value="650" selected=""')
    expect(markup).toContain('>RU</button>')
    expect(markup).toContain('>EN</button>')
    expect(markup).toContain('Экспорт SVG')
    expect(markup).toContain('type="file"')
    expect(markup).toContain('accept="application/json,.json"')
    expect(markup).toContain('disabled=""')
  })
})
