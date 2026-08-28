import { useEffect, useRef, useState } from 'react'
import type { Locale } from '../i18n'
import { runLegacyCommand } from './legacyCommandBridge'

const LOCALE_STORAGE_KEY = 'crochet-scheme-editor-locale'

type MenuKey = 'file' | 'edit' | 'view' | 'settings' | 'help'
type MenuItem = { label: string; command?: string; shortcut?: string; separator?: boolean }

const COPY: Record<Locale, {
  menus: Record<MenuKey, string>
  items: Record<MenuKey, MenuItem[]>
}> = {
  ru: {
    menus: { file: 'Файл', edit: 'Правка', view: 'Вид', settings: 'Параметры', help: 'Справка' },
    items: {
      file: [
        { label: 'Новая схема', command: 'file.new' },
        { label: 'Импорт проекта…', command: 'file.import' },
        { separator: true, label: '' },
        { label: 'Экспорт проекта…', command: 'file.exportProject' },
        { label: 'Экспорт SVG…', command: 'file.exportSvg' },
        { separator: true, label: '' },
        { label: 'Печать…', command: 'file.print' },
      ],
      edit: [
        { label: 'Отменить', command: 'edit.undo', shortcut: 'Ctrl/⌘ Z' },
        { label: 'Повторить', command: 'edit.redo', shortcut: 'Ctrl/⌘ ⇧ Z' },
        { separator: true, label: '' },
        { label: 'Копировать', command: 'edit.copy', shortcut: 'Ctrl/⌘ C' },
        { label: 'Вставить', command: 'edit.paste', shortcut: 'Ctrl/⌘ V' },
        { label: 'Дублировать', command: 'edit.duplicate', shortcut: 'Ctrl/⌘ D' },
        { label: 'Удалить', command: 'edit.delete', shortcut: 'Delete' },
        { separator: true, label: '' },
        { label: 'Выбрать всё', command: 'edit.selectAll', shortcut: 'Ctrl/⌘ A' },
      ],
      view: [
        { label: 'Масштаб 100%', command: 'view.zoom100', shortcut: '0' },
        { label: 'Вместить всю схему', command: 'view.fitAll', shortcut: 'F' },
        { label: 'Вместить выделение', command: 'view.fitSelection', shortcut: 'Shift F' },
        { separator: true, label: '' },
        { label: 'Показать / скрыть элементы', command: 'view.toggleLeft' },
        { label: 'Показать / скрыть свойства', command: 'view.toggleRight' },
      ],
      settings: [
        { label: 'Привязка', command: 'settings.snapping', shortcut: 'S' },
        { label: 'Плотность и размер', command: 'settings.gauge' },
        { label: 'Ряды узора', command: 'settings.patternRows' },
        { label: 'Номера рядов', command: 'settings.rowNumbers' },
        { label: 'Легенда и холст', command: 'settings.legend' },
      ],
      help: [
        { label: 'Горячие клавиши и управление', command: 'help.controls' },
      ],
    },
  },
  en: {
    menus: { file: 'File', edit: 'Edit', view: 'View', settings: 'Settings', help: 'Help' },
    items: {
      file: [
        { label: 'New pattern', command: 'file.new' },
        { label: 'Import project…', command: 'file.import' },
        { separator: true, label: '' },
        { label: 'Export project…', command: 'file.exportProject' },
        { label: 'Export SVG…', command: 'file.exportSvg' },
        { separator: true, label: '' },
        { label: 'Print…', command: 'file.print' },
      ],
      edit: [
        { label: 'Undo', command: 'edit.undo', shortcut: 'Ctrl/⌘ Z' },
        { label: 'Redo', command: 'edit.redo', shortcut: 'Ctrl/⌘ ⇧ Z' },
        { separator: true, label: '' },
        { label: 'Copy', command: 'edit.copy', shortcut: 'Ctrl/⌘ C' },
        { label: 'Paste', command: 'edit.paste', shortcut: 'Ctrl/⌘ V' },
        { label: 'Duplicate', command: 'edit.duplicate', shortcut: 'Ctrl/⌘ D' },
        { label: 'Delete', command: 'edit.delete', shortcut: 'Delete' },
        { separator: true, label: '' },
        { label: 'Select all', command: 'edit.selectAll', shortcut: 'Ctrl/⌘ A' },
      ],
      view: [
        { label: 'Zoom 100%', command: 'view.zoom100', shortcut: '0' },
        { label: 'Fit all', command: 'view.fitAll', shortcut: 'F' },
        { label: 'Fit selection', command: 'view.fitSelection', shortcut: 'Shift F' },
        { separator: true, label: '' },
        { label: 'Show / hide elements', command: 'view.toggleLeft' },
        { label: 'Show / hide properties', command: 'view.toggleRight' },
      ],
      settings: [
        { label: 'Snapping', command: 'settings.snapping', shortcut: 'S' },
        { label: 'Gauge & size', command: 'settings.gauge' },
        { label: 'Pattern rows', command: 'settings.patternRows' },
        { label: 'Row numbers', command: 'settings.rowNumbers' },
        { label: 'Legend & canvas', command: 'settings.legend' },
      ],
      help: [
        { label: 'Shortcuts & controls', command: 'help.controls' },
      ],
    },
  },
}

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru'
  return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'ru'
}

export function AppMenuBar() {
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null)
  const rootRef = useRef<HTMLElement>(null)
  const copy = COPY[locale]

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null)
    }
    const onClick = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>('.language-switch button')
      if (!button) return
      if (button.textContent?.trim() === 'EN') setLocale('en')
      if (button.textContent?.trim() === 'RU') setLocale('ru')
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onClick, true)
    }
  }, [])

  const activate = (command?: string) => {
    if (command) runLegacyCommand(command)
    setOpenMenu(null)
  }

  return (
    <nav className="app-menu-bar" ref={rootRef} aria-label={locale === 'ru' ? 'Меню приложения' : 'Application menu'}>
      {(Object.keys(copy.menus) as MenuKey[]).map((key) => {
        const open = openMenu === key
        return (
          <div className="app-menu" key={key}>
            <button
              type="button"
              className={`app-menu__trigger ${open ? 'is-open' : ''}`}
              aria-haspopup="menu"
              aria-expanded={open}
              onClick={() => setOpenMenu((current) => current === key ? null : key)}
              onPointerEnter={() => {
                if (openMenu) setOpenMenu(key)
              }}
            >
              {copy.menus[key]}
            </button>
            {open ? (
              <div className="app-menu__popover" role="menu">
                {copy.items[key].map((item, index) => item.separator ? (
                  <div className="app-menu__separator" role="separator" key={`separator-${index}`} />
                ) : (
                  <button
                    type="button"
                    role="menuitem"
                    className="app-menu__item"
                    key={`${item.command}-${item.label}`}
                    onClick={() => activate(item.command)}
                  >
                    <span>{item.label}</span>
                    {item.shortcut ? <kbd>{item.shortcut}</kbd> : null}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}
