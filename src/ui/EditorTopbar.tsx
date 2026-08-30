import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { AutosaveDelayMs } from '../types'
import type { Locale } from '../i18n'
import { dispatchApplicationCommand } from './applicationCommands'
import { openCommandPalette } from './CommandPalette'
import { EditorIcon } from './icons'
import { EXPAND_ELEMENT_LIBRARY_EVENT } from './workbenchEvents'

export type TopbarAutosaveState = 'loading' | 'saving' | 'saved' | 'error' | 'off'

const OPEN_GUIDES_FLYOUT_EVENT = 'crochet-ui-v2:open-guides-flyout'

function visibleZoomPercent() {
  const content = document.querySelector<SVGGElement>('svg.editor-canvas > g[transform*="scale("]')
  const match = content?.getAttribute('transform')?.match(/scale\(([-+\d.]+)\)/)
  const zoom = Number(match?.[1])
  return Number.isFinite(zoom) && zoom > 0 ? Math.round(zoom * 100) : 100
}

function CommandButton({
  icon,
  label,
  disabled = false,
  onClick,
}: {
  icon: 'newFile' | 'open' | 'save' | 'undo' | 'redo'
  label: string
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      className="topbar-command-button"
      disabled={disabled}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <EditorIcon name={icon} size={21} />
      <span>{label}</span>
    </button>
  )
}

export function EditorTopbar({
  locale,
  autosaveState,
  autosaveLabel,
  autosaveDelayMs,
  canUndo,
  canRedo,
  favoriteActions,
  loadInputRef,
  onAutosaveDelayChange,
  onLocaleChange,
  onUndo,
  onRedo,
  onSaveProject,
  onOpenProject,
  onExportSvg,
  onImportFile,
}: {
  locale: Locale
  autosaveState: TopbarAutosaveState
  autosaveLabel: string
  autosaveDelayMs: AutosaveDelayMs
  canUndo: boolean
  canRedo: boolean
  favoriteActions?: ReactNode
  loadInputRef: RefObject<HTMLInputElement | null>
  onAutosaveDelayChange: (delayMs: AutosaveDelayMs) => void
  onLocaleChange: (locale: Locale) => void
  onUndo: () => void
  onRedo: () => void
  onSaveProject: () => void
  onOpenProject: () => void
  onExportSvg: () => void
  onImportFile: (file: File) => void | Promise<void>
}) {
  const copy = locale === 'ru'
    ? {
        new: 'Новый',
        open: 'Открыть',
        save: 'Сохранить',
        undo: 'Отменить',
        redo: 'Повторить',
        zoom: 'Масштаб',
        grid: 'Сетка',
        guides: 'Направляющие',
        search: 'Поиск по функциям',
        autosave: 'Автосохранение',
        favorites: 'Избранное',
        addFavorite: 'Добавить элемент из библиотеки',
        autosaveSettings: 'Параметры автосохранения',
        language: 'Язык интерфейса',
        exportSvg: 'Экспорт SVG',
      }
    : {
        new: 'New',
        open: 'Open',
        save: 'Save',
        undo: 'Undo',
        redo: 'Redo',
        zoom: 'Zoom',
        grid: 'Grid',
        guides: 'Guides',
        search: 'Command search',
        autosave: 'Autosave',
        favorites: 'Favorites',
        addFavorite: 'Add an element from the library',
        autosaveSettings: 'Autosave settings',
        language: 'Interface language',
        exportSvg: 'Export SVG',
      }

  const [gridVisible, setGridVisible] = useState(() => (
    typeof document === 'undefined' || document.documentElement.dataset.canvasGrid !== 'off'
  ))
  const [zoomPercent, setZoomPercent] = useState(() => (
    typeof document === 'undefined' ? 100 : visibleZoomPercent()
  ))
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [favoriteCount, setFavoriteCount] = useState(0)
  const favoritesHostRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autosaveState === 'saved') setSavedAt(new Date())
  }, [autosaveState])

  useEffect(() => {
    const onCommandSearchShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'f') return
      event.preventDefault()
      openCommandPalette()
    }
    window.addEventListener('keydown', onCommandSearchShortcut)
    return () => window.removeEventListener('keydown', onCommandSearchShortcut)
  }, [])

  useEffect(() => {
    const canvasContent = document.querySelector<SVGGElement>('svg.editor-canvas > g[transform*="scale("]')
    if (!canvasContent) return
    const update = () => setZoomPercent(visibleZoomPercent())
    update()
    const observer = new MutationObserver(update)
    observer.observe(canvasContent, { attributes: true, attributeFilter: ['transform'] })
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const host = favoritesHostRef.current
    if (!host) return
    const update = () => {
      const buttons = host.querySelectorAll('.favorite-quick-button').length
      const overflowText = host.querySelector('.favorite-quick-overflow')?.textContent ?? ''
      const overflow = Number(overflowText.replace(/\D/g, '')) || 0
      setFavoriteCount(buttons + overflow)
    }
    update()
    const observer = new MutationObserver(update)
    observer.observe(host, { childList: true, subtree: true, characterData: true })
    return () => observer.disconnect()
  }, [favoriteActions])

  const zoomOptions = useMemo(() => {
    const values = new Set([100, zoomPercent])
    return [...values].sort((a, b) => a - b)
  }, [zoomPercent])

  const savedTime = savedAt?.toLocaleTimeString(locale === 'ru' ? 'ru-RU' : 'en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
  const visibleAutosaveLabel = autosaveState === 'saved'
    ? `${copy.autosave}${savedTime ? ` ${savedTime}` : ''}`
    : autosaveLabel

  const toggleGrid = () => {
    const next = !gridVisible
    setGridVisible(next)
    document.documentElement.dataset.canvasGrid = next ? 'on' : 'off'
  }

  const expandLibrary = () => {
    window.dispatchEvent(new CustomEvent(EXPAND_ELEMENT_LIBRARY_EVENT))
  }

  const focusLibrary = () => {
    const shell = document.querySelector('.app-shell')
    if (shell?.classList.contains('left-collapsed')) dispatchApplicationCommand('view.toggleLeft')
    expandLibrary()
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelector<HTMLInputElement>('.element-library input[type="search"]')?.focus()
      })
    })
  }

  return (
    <header className="topbar topbar-v2" data-testid="editor-topbar">
      <div className="topbar-command-group topbar-file-group" aria-label={locale === 'ru' ? 'Файл' : 'File'}>
        <CommandButton icon="newFile" label={copy.new} onClick={() => dispatchApplicationCommand('file.new')} />
        <CommandButton icon="open" label={copy.open} onClick={onOpenProject} />
        <CommandButton icon="save" label={copy.save} onClick={onSaveProject} />
      </div>

      <span className="topbar-divider" aria-hidden="true" />

      <div className="topbar-command-group topbar-history-group" aria-label={locale === 'ru' ? 'История' : 'History'}>
        <CommandButton icon="undo" label={copy.undo} disabled={!canUndo} onClick={onUndo} />
        <CommandButton icon="redo" label={copy.redo} disabled={!canRedo} onClick={onRedo} />
      </div>

      <span className="topbar-divider" aria-hidden="true" />

      <label className="topbar-zoom-control" title={copy.zoom}>
        <span className="topbar-sr-only">{copy.zoom}</span>
        <select
          aria-label={copy.zoom}
          value={zoomPercent}
          onChange={(event) => {
            const target = Number(event.target.value)
            if (target === 100) dispatchApplicationCommand('view.zoom100')
          }}
        >
          {zoomOptions.map((value) => <option key={value} value={value}>{value}%</option>)}
        </select>
      </label>

      <button
        type="button"
        className={`topbar-inline-command ${gridVisible ? 'is-active' : ''}`}
        aria-label={copy.grid}
        aria-pressed={gridVisible}
        title={copy.grid}
        onClick={toggleGrid}
      >
        <EditorIcon name="grid" size={17} />
        <span className="topbar-inline-command__label">{copy.grid}</span>
      </button>

      <span className="topbar-divider topbar-divider--compact" aria-hidden="true" />

      <button
        type="button"
        className="topbar-inline-command"
        aria-label={copy.guides}
        title={copy.guides}
        onClick={() => window.dispatchEvent(new CustomEvent(OPEN_GUIDES_FLYOUT_EVENT))}
      >
        <EditorIcon name="guide" size={17} />
        <span className="topbar-inline-command__label">{copy.guides}</span>
      </button>

      <span className="topbar-divider topbar-divider--compact" aria-hidden="true" />

      <button
        type="button"
        className="topbar-search-trigger"
        aria-label={copy.search}
        title={copy.search}
        onClick={openCommandPalette}
      >
        <EditorIcon name="search" size={15} />
        <span>{copy.search}</span>
        <kbd>Ctrl + F</kbd>
      </button>

      <span className="topbar-flex-spacer" />

      <details className={`topbar-autosave-menu ${autosaveState}`}>
        <summary aria-label={visibleAutosaveLabel} title={visibleAutosaveLabel}>
          <span className="topbar-status-dot" aria-hidden="true" />
          <span className={`autosave-indicator ${autosaveState}`}>
            <span aria-hidden="true">{visibleAutosaveLabel}</span>
            <span className="topbar-sr-only">{autosaveLabel}</span>
          </span>
        </summary>
        <div className="topbar-autosave-popover">
          <label className="autosave-control">
            <span>{copy.autosaveSettings}</span>
            <select
              aria-label={copy.autosave}
              value={autosaveDelayMs}
              onChange={(event) => onAutosaveDelayChange(Number(event.target.value) as AutosaveDelayMs)}
            >
              <option value={0}>{locale === 'ru' ? 'Выкл' : 'Off'}</option>
              <option value={650}>{locale === 'ru' ? 'Быстро · 0,65 с' : 'Fast · 0.65 s'}</option>
              <option value={5000}>5 s</option>
              <option value={15000}>15 s</option>
              <option value={30000}>30 s</option>
              <option value={60000}>60 s</option>
            </select>
          </label>
          <div className="topbar-popover-row">
            <span>{copy.language}</span>
            <div className="language-switch" aria-label={copy.language}>
              <button type="button" className={`ghost-button ${locale === 'ru' ? 'active-lang' : ''}`} onClick={() => onLocaleChange('ru')}>RU</button>
              <button type="button" className={`ghost-button ${locale === 'en' ? 'active-lang' : ''}`} onClick={() => onLocaleChange('en')}>EN</button>
            </div>
          </div>
          <button type="button" className="topbar-popover-action" onClick={onExportSvg}>
            <EditorIcon name="export" size={15} />
            <span>{copy.exportSvg}</span>
          </button>
        </div>
      </details>

      <button
        type="button"
        className="topbar-favorites-trigger"
        aria-label={`${copy.favorites}: ${favoriteCount}`}
        title={copy.favorites}
        onClick={() => {
          const shell = document.querySelector('.app-shell')
          if (shell?.classList.contains('left-collapsed')) dispatchApplicationCommand('view.toggleLeft')
          expandLibrary()
          requestAnimationFrame(() => {
            requestAnimationFrame(() => document.querySelector('.favorites-group')?.scrollIntoView({ block: 'nearest' }))
          })
        }}
      >
        <EditorIcon name="star" size={14} fill="currentColor" />
        <span>{copy.favorites} ({favoriteCount})</span>
        <EditorIcon name="chevronDown" size={12} />
      </button>

      <div ref={favoritesHostRef} className="ui-v2-favorites-host">{favoriteActions}</div>

      <button
        type="button"
        className="topbar-add-favorite"
        aria-label={copy.addFavorite}
        title={copy.addFavorite}
        onClick={focusLibrary}
      >
        <EditorIcon name="plus" size={17} />
      </button>

      <input
        ref={loadInputRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void onImportFile(file)
          event.currentTarget.value = ''
        }}
      />
    </header>
  )
}
