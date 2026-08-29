import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Locale } from '../i18n'
import type { ApplicationCommandId, ApplicationCommandRunner } from './applicationCommands'
import { openCommandPalette } from './CommandPalette'

const LOCALE_STORAGE_KEY = 'crochet-scheme-editor-locale'

type MenuKey = 'file' | 'edit' | 'view' | 'settings' | 'help'
type MenuItem = { label: string; command?: ApplicationCommandId; shortcut?: string; separator?: boolean }

const MENU_KEYS: MenuKey[] = ['file', 'edit', 'view', 'settings', 'help']

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
        { label: 'Поиск по функциям…', command: 'ui.commandPalette', shortcut: 'Ctrl/⌘ K' },
        { separator: true, label: '' },
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
        { label: 'Command search…', command: 'ui.commandPalette', shortcut: 'Ctrl/⌘ K' },
        { separator: true, label: '' },
        { label: 'Shortcuts & controls', command: 'help.controls' },
      ],
    },
  },
}

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru'
  return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'ru'
}

function ariaKeyShortcuts(command?: ApplicationCommandId) {
  switch (command) {
    case 'edit.undo': return 'Control+Z Meta+Z'
    case 'edit.redo': return 'Control+Shift+Z Meta+Shift+Z'
    case 'edit.copy': return 'Control+C Meta+C'
    case 'edit.paste': return 'Control+V Meta+V'
    case 'edit.duplicate': return 'Control+D Meta+D'
    case 'edit.delete': return 'Delete'
    case 'edit.selectAll': return 'Control+A Meta+A'
    case 'view.zoom100': return '0'
    case 'view.fitAll': return 'F'
    case 'view.fitSelection': return 'Shift+F'
    case 'settings.snapping': return 'S'
    case 'ui.commandPalette': return 'Control+K Meta+K'
    default: return undefined
  }
}

export function AppMenuBar({
  runCommand,
  locale: controlledLocale,
}: {
  runCommand: ApplicationCommandRunner
  locale?: Locale
}) {
  const [legacyLocale, setLegacyLocale] = useState<Locale>(initialLocale)
  const [openMenu, setOpenMenu] = useState<MenuKey | null>(null)
  const [focusedMenu, setFocusedMenu] = useState<MenuKey>('file')
  const rootRef = useRef<HTMLElement>(null)
  const triggerRefs = useRef<Partial<Record<MenuKey, HTMLButtonElement | null>>>({})
  const locale = controlledLocale ?? legacyLocale
  const localeControlled = controlledLocale !== undefined
  const copy = COPY[locale]

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenMenu(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpenMenu(null)
    }
    const onClick = (event: MouseEvent) => {
      if (localeControlled) return
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>('.language-switch button')
      if (!button) return
      if (button.textContent?.trim() === 'EN') setLegacyLocale('en')
      if (button.textContent?.trim() === 'RU') setLegacyLocale('ru')
    }
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('click', onClick, true)
    }
  }, [localeControlled])

  const activate = (command?: ApplicationCommandId) => {
    if (command === 'ui.commandPalette') openCommandPalette()
    else if (command) runCommand(command)
    setOpenMenu(null)
  }

  const focusTrigger = (key: MenuKey) => {
    setFocusedMenu(key)
    requestAnimationFrame(() => triggerRefs.current[key]?.focus())
  }

  const focusMenuItem = (key: MenuKey, index: number) => {
    requestAnimationFrame(() => {
      const items = Array.from(
        rootRef.current?.querySelectorAll<HTMLButtonElement>(`.app-menu[data-menu="${key}"] .app-menu__item`) ?? [],
      )
      if (!items.length) return
      const normalized = (index + items.length) % items.length
      items[normalized]?.focus()
    })
  }

  const moveMenu = (key: MenuKey, direction: -1 | 1, open: boolean) => {
    const index = MENU_KEYS.indexOf(key)
    const next = MENU_KEYS[(index + direction + MENU_KEYS.length) % MENU_KEYS.length]
    setFocusedMenu(next)
    setOpenMenu(open ? next : null)
    if (open) focusMenuItem(next, 0)
    else focusTrigger(next)
  }

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>, key: MenuKey) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveMenu(key, 1, Boolean(openMenu))
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveMenu(key, -1, Boolean(openMenu))
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusTrigger(MENU_KEYS[0])
    } else if (event.key === 'End') {
      event.preventDefault()
      focusTrigger(MENU_KEYS[MENU_KEYS.length - 1])
    } else if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      setFocusedMenu(key)
      setOpenMenu(key)
      focusMenuItem(key, 0)
    } else if (event.key === 'Escape') {
      setOpenMenu(null)
    }
  }

  const onItemKeyDown = (
    event: ReactKeyboardEvent<HTMLButtonElement>,
    key: MenuKey,
    itemIndex: number,
    itemCount: number,
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusMenuItem(key, (itemIndex + 1) % itemCount)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusMenuItem(key, (itemIndex - 1 + itemCount) % itemCount)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusMenuItem(key, 0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusMenuItem(key, itemCount - 1)
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveMenu(key, 1, true)
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveMenu(key, -1, true)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpenMenu(null)
      focusTrigger(key)
    }
  }

  return (
    <nav
      className="app-menu-bar"
      ref={rootRef}
      role="menubar"
      aria-label={locale === 'ru' ? 'Меню приложения' : 'Application menu'}
    >
      {MENU_KEYS.map((key) => {
        const open = openMenu === key
        const actionableItems = copy.items[key].filter((item) => !item.separator)
        let actionableIndex = -1
        return (
          <div className="app-menu" data-menu={key} role="none" key={key}>
            <button
              ref={(node) => { triggerRefs.current[key] = node }}
              type="button"
              role="menuitem"
              tabIndex={focusedMenu === key ? 0 : -1}
              className={`app-menu__trigger ${open ? 'is-open' : ''}`}
              aria-haspopup="menu"
              aria-expanded={open}
              onFocus={() => setFocusedMenu(key)}
              onClick={() => {
                setFocusedMenu(key)
                setOpenMenu((current) => current === key ? null : key)
              }}
              onKeyDown={(event) => onTriggerKeyDown(event, key)}
              onPointerEnter={() => {
                if (!openMenu || openMenu === key) return
                setFocusedMenu(key)
                setOpenMenu(key)
                focusMenuItem(key, 0)
              }}
            >
              {copy.menus[key]}
            </button>
            {open ? (
              <div className="app-menu__popover" role="menu" aria-label={copy.menus[key]}>
                {copy.items[key].map((item, index) => {
                  if (item.separator) {
                    return <div className="app-menu__separator" role="separator" key={`separator-${index}`} />
                  }
                  actionableIndex += 1
                  const currentIndex = actionableIndex
                  return (
                    <button
                      type="button"
                      role="menuitem"
                      tabIndex={-1}
                      className="app-menu__item"
                      aria-keyshortcuts={ariaKeyShortcuts(item.command)}
                      key={`${item.command}-${item.label}`}
                      onClick={() => activate(item.command)}
                      onKeyDown={(event) => onItemKeyDown(event, key, currentIndex, actionableItems.length)}
                    >
                      <span>{item.label}</span>
                      {item.shortcut ? <kbd aria-hidden="true">{item.shortcut}</kbd> : null}
                    </button>
                  )
                })}
              </div>
            ) : null}
          </div>
        )
      })}
    </nav>
  )
}
