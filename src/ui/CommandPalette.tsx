import { useEffect, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Locale } from '../i18n'
import type { ApplicationCommandId, ApplicationCommandRunner } from './applicationCommands'
import { EditorIcon } from './icons'
import './commandPalette.css'

export const OPEN_COMMAND_PALETTE_EVENT = 'crochet-ui-v2:open-command-palette'

export function openCommandPalette() {
  window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT))
}

type PaletteCommand = {
  id: ApplicationCommandId
  group: string
  label: string
  shortcut?: string
  keywords?: string
}

const COMMANDS: Record<Locale, PaletteCommand[]> = {
  ru: [
    { id: 'file.new', group: 'Файл', label: 'Новая схема', keywords: 'создать новый документ' },
    { id: 'file.import', group: 'Файл', label: 'Импорт проекта', keywords: 'открыть json загрузить' },
    { id: 'file.exportProject', group: 'Файл', label: 'Экспорт проекта', keywords: 'сохранить json' },
    { id: 'file.exportSvg', group: 'Файл', label: 'Экспорт SVG', keywords: 'вектор изображение' },
    { id: 'file.print', group: 'Файл', label: 'Печать', keywords: 'страницы принтер' },
    { id: 'edit.undo', group: 'Правка', label: 'Отменить', shortcut: 'Ctrl/⌘ Z', keywords: 'undo назад' },
    { id: 'edit.redo', group: 'Правка', label: 'Повторить', shortcut: 'Ctrl/⌘ ⇧ Z', keywords: 'redo вперед' },
    { id: 'edit.copy', group: 'Правка', label: 'Копировать', shortcut: 'Ctrl/⌘ C' },
    { id: 'edit.paste', group: 'Правка', label: 'Вставить', shortcut: 'Ctrl/⌘ V' },
    { id: 'edit.duplicate', group: 'Правка', label: 'Дублировать', shortcut: 'Ctrl/⌘ D', keywords: 'копия' },
    { id: 'edit.delete', group: 'Правка', label: 'Удалить', shortcut: 'Delete' },
    { id: 'edit.selectAll', group: 'Правка', label: 'Выбрать всё', shortcut: 'Ctrl/⌘ A' },
    { id: 'view.zoom100', group: 'Вид', label: 'Масштаб 100%', shortcut: '0', keywords: 'zoom' },
    { id: 'view.fitAll', group: 'Вид', label: 'Вместить всю схему', shortcut: 'F', keywords: 'масштаб проект' },
    { id: 'view.fitSelection', group: 'Вид', label: 'Вместить выделение', shortcut: 'Shift F', keywords: 'масштаб выбор' },
    { id: 'view.toggleLeft', group: 'Вид', label: 'Показать / скрыть элементы', keywords: 'левая панель библиотека' },
    { id: 'view.toggleRight', group: 'Вид', label: 'Показать / скрыть свойства', keywords: 'правая панель инспектор' },
    { id: 'settings.snapping', group: 'Параметры', label: 'Привязка', shortcut: 'S', keywords: 'snap примагничивание' },
    { id: 'settings.gauge', group: 'Параметры', label: 'Плотность и размер', keywords: 'образец сантиметры' },
    { id: 'settings.patternRows', group: 'Параметры', label: 'Ряды узора', keywords: 'pattern rows' },
    { id: 'settings.rowNumbers', group: 'Параметры', label: 'Номера рядов', keywords: 'маркеры' },
    { id: 'settings.legend', group: 'Параметры', label: 'Легенда и холст', keywords: 'условные обозначения canvas' },
    { id: 'help.controls', group: 'Справка', label: 'Горячие клавиши и управление', keywords: 'help shortcuts' },
  ],
  en: [
    { id: 'file.new', group: 'File', label: 'New pattern', keywords: 'create document' },
    { id: 'file.import', group: 'File', label: 'Import project', keywords: 'open json load' },
    { id: 'file.exportProject', group: 'File', label: 'Export project', keywords: 'save json' },
    { id: 'file.exportSvg', group: 'File', label: 'Export SVG', keywords: 'vector image' },
    { id: 'file.print', group: 'File', label: 'Print', keywords: 'pages printer' },
    { id: 'edit.undo', group: 'Edit', label: 'Undo', shortcut: 'Ctrl/⌘ Z' },
    { id: 'edit.redo', group: 'Edit', label: 'Redo', shortcut: 'Ctrl/⌘ ⇧ Z' },
    { id: 'edit.copy', group: 'Edit', label: 'Copy', shortcut: 'Ctrl/⌘ C' },
    { id: 'edit.paste', group: 'Edit', label: 'Paste', shortcut: 'Ctrl/⌘ V' },
    { id: 'edit.duplicate', group: 'Edit', label: 'Duplicate', shortcut: 'Ctrl/⌘ D', keywords: 'copy' },
    { id: 'edit.delete', group: 'Edit', label: 'Delete', shortcut: 'Delete' },
    { id: 'edit.selectAll', group: 'Edit', label: 'Select all', shortcut: 'Ctrl/⌘ A' },
    { id: 'view.zoom100', group: 'View', label: 'Zoom 100%', shortcut: '0' },
    { id: 'view.fitAll', group: 'View', label: 'Fit all', shortcut: 'F', keywords: 'zoom pattern' },
    { id: 'view.fitSelection', group: 'View', label: 'Fit selection', shortcut: 'Shift F', keywords: 'zoom selection' },
    { id: 'view.toggleLeft', group: 'View', label: 'Show / hide elements', keywords: 'left panel library' },
    { id: 'view.toggleRight', group: 'View', label: 'Show / hide properties', keywords: 'right panel inspector' },
    { id: 'settings.snapping', group: 'Settings', label: 'Snapping', shortcut: 'S', keywords: 'magnet snap' },
    { id: 'settings.gauge', group: 'Settings', label: 'Gauge & size', keywords: 'sample centimeters' },
    { id: 'settings.patternRows', group: 'Settings', label: 'Pattern rows' },
    { id: 'settings.rowNumbers', group: 'Settings', label: 'Row numbers', keywords: 'markers' },
    { id: 'settings.legend', group: 'Settings', label: 'Legend & canvas', keywords: 'symbols' },
    { id: 'help.controls', group: 'Help', label: 'Shortcuts & controls' },
  ],
}

const LOCALE_STORAGE_KEY = 'crochet-scheme-editor-locale'
const RESULTS_ID = 'command-palette-results'

function commandOptionId(id: ApplicationCommandId) {
  return `command-palette-option-${id.replace(/\./g, '-')}`
}

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru'
  return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'ru'
}

export function CommandPalette({
  runCommand,
  locale: controlledLocale,
}: {
  runCommand: ApplicationCommandRunner
  locale?: Locale
}) {
  const [legacyLocale, setLegacyLocale] = useState<Locale>(initialLocale)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)
  const previousFocus = useRef<HTMLElement | null>(null)
  const locale = controlledLocale ?? legacyLocale
  const localeControlled = controlledLocale !== undefined

  const copy = locale === 'ru'
    ? {
        dialog: 'Поиск по функциям',
        placeholder: 'Найдите команду…',
        empty: 'Команды не найдены',
        hint: 'Enter — выполнить · Esc — закрыть',
      }
    : {
        dialog: 'Command search',
        placeholder: 'Find a command…',
        empty: 'No commands found',
        hint: 'Enter to run · Esc to close',
      }

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase(locale === 'ru' ? 'ru-RU' : 'en-US')
    if (!normalized) return COMMANDS[locale]
    return COMMANDS[locale].filter((command) =>
      `${command.group} ${command.label} ${command.keywords ?? ''}`
        .toLocaleLowerCase(locale === 'ru' ? 'ru-RU' : 'en-US')
        .includes(normalized),
    )
  }, [locale, query])

  const close = () => {
    setOpen(false)
    setQuery('')
    setActiveIndex(0)
    requestAnimationFrame(() => previousFocus.current?.focus())
  }

  const show = () => {
    const active = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const stableMenuTrigger = active
      ?.closest<HTMLElement>('.app-menu')
      ?.querySelector<HTMLButtonElement>('.app-menu__trigger') ?? null
    previousFocus.current = stableMenuTrigger ?? active
    setOpen(true)
    setQuery('')
    setActiveIndex(0)
    requestAnimationFrame(() => inputRef.current?.focus())
  }

  useEffect(() => {
    const onOpen = () => show()
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        if (open) close()
        else show()
      } else if (open && event.key === 'Escape') {
        event.preventDefault()
        close()
      }
    }
    const onLanguageClick = (event: MouseEvent) => {
      if (localeControlled) return
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>('.language-switch button')
      if (button?.textContent?.trim() === 'EN') setLegacyLocale('en')
      if (button?.textContent?.trim() === 'RU') setLegacyLocale('ru')
    }
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen)
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('click', onLanguageClick, true)
    return () => {
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, onOpen)
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onLanguageClick, true)
    }
  }, [localeControlled, open])

  useEffect(() => {
    if (activeIndex >= filtered.length) setActiveIndex(Math.max(0, filtered.length - 1))
  }, [activeIndex, filtered.length])

  useEffect(() => {
    if (!open || !filtered.length) return
    requestAnimationFrame(() => {
      resultsRef.current
        ?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')
        ?.scrollIntoView({ block: 'nearest' })
    })
  }, [activeIndex, filtered.length, open, query])

  if (!open) return null

  const activeCommand = filtered[activeIndex]
  const activeOptionId = activeCommand ? commandOptionId(activeCommand.id) : undefined

  const run = (command: PaletteCommand) => {
    const didRun = runCommand(command.id)
    if (didRun !== false) close()
  }

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (filtered.length) setActiveIndex((value) => (value + 1) % filtered.length)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      if (filtered.length) setActiveIndex((value) => (value - 1 + filtered.length) % filtered.length)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const command = filtered[activeIndex]
      if (command) run(command)
    }
  }

  return (
    <div
      className="command-palette-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close()
      }}
    >
      <section
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label={copy.dialog}
      >
        <div className="command-palette__search">
          <EditorIcon name="search" size={17} />
          <input
            ref={inputRef}
            type="search"
            value={query}
            aria-label={copy.dialog}
            aria-autocomplete="list"
            aria-controls={RESULTS_ID}
            aria-expanded="true"
            aria-activedescendant={activeOptionId}
            placeholder={copy.placeholder}
            onChange={(event) => {
              setQuery(event.target.value)
              setActiveIndex(0)
            }}
            onKeyDown={onInputKeyDown}
          />
          <kbd aria-hidden="true">⌘/Ctrl K</kbd>
        </div>

        <div
          ref={resultsRef}
          id={RESULTS_ID}
          className="command-palette__results"
          role="listbox"
          aria-label={copy.dialog}
        >
          {filtered.length ? filtered.map((command, index) => (
            <button
              id={commandOptionId(command.id)}
              key={command.id}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={index === activeIndex}
              className={`command-palette__item ${index === activeIndex ? 'is-active' : ''}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => run(command)}
            >
              <span className="command-palette__group">{command.group}</span>
              <span className="command-palette__label">{command.label}</span>
              {command.shortcut ? <kbd aria-hidden="true">{command.shortcut}</kbd> : null}
            </button>
          )) : (
            <p className="command-palette__empty">{copy.empty}</p>
          )}
        </div>
        <footer className="command-palette__footer">{copy.hint}</footer>
      </section>
    </div>
  )
}
