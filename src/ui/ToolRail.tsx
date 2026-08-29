import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import type { Locale } from '../i18n'
import type { Guide } from '../types'
import { EditorIcon, type EditorIconName } from './icons'
import type { WorkbenchTool } from './workbenchTypes'
import './toolRail.css'

function RailButton({
  icon,
  label,
  shortcut,
  active,
  onClick,
}: {
  icon: EditorIconName
  label: string
  shortcut: string
  active: boolean
  onClick: () => void
}) {
  const accessibleLabel = `${label} · ${shortcut}`
  return (
    <button
      type="button"
      className={`ui-icon-button tool-button ui-v2-tool-rail-button ${active ? 'active is-active' : ''}`}
      aria-label={accessibleLabel}
      title={accessibleLabel}
      aria-pressed={active}
      onClick={onClick}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <EditorIcon name={icon} />
      <span className="tool-rail__text">{label}</span>
    </button>
  )
}

function GuidePreviewIcon({ type }: { type: Guide['type'] }) {
  return (
    <svg className="guide-flyout__preview" viewBox="0 0 24 24" aria-hidden="true">
      {type === 'line' && <path d="M5 18L19 6" />}
      {type === 'arc' && <path d="M4 17C7 7 17 7 20 17" />}
      {type === 'curve' && <path d="M3 16C8 4 14 20 21 8" />}
      {type === 'parabola' && <path d="M4 18C8 5 16 5 20 18" />}
      {type === 'grid' && (
        <>
          <rect x="5" y="5" width="14" height="14" rx="1" />}
          <path d="M12 5V19M5 12H19" />
        </>
      )}
      {type === 'radial-grid' && (
        <>
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="3.5" />
          <path d="M12 5V19M5 12H19" />
        </>
      )}
    </svg>
  )
}

function GuideFlyout({
  locale,
  onAddGuide,
}: {
  locale: Locale
  onAddGuide: (type: Guide['type']) => void
}) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([])
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const focusTimer = window.setTimeout(() => itemRefs.current[0]?.focus(), 0)
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.clearTimeout(focusTimer)
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [open])

  const copy = locale === 'ru'
    ? {
        guides: 'Направляющие',
        line: 'Линия',
        arc: 'Дуга',
        curve: 'Кривая',
        parabola: 'Парабола',
        grid: 'Прямоугольная сетка',
        radial: 'Радиальная сетка',
      }
    : {
        guides: 'Guides',
        line: 'Line',
        arc: 'Arc',
        curve: 'Curve',
        parabola: 'Parabola',
        grid: 'Rectangular grid',
        radial: 'Radial grid',
      }

  const items: Array<{ type: Guide['type']; label: string }> = [
    { type: 'line', label: copy.line },
    { type: 'arc', label: copy.arc },
    { type: 'curve', label: copy.curve },
    { type: 'parabola', label: copy.parabola },
    { type: 'grid', label: copy.grid },
    { type: 'radial-grid', label: copy.radial },
  ]

  const focusItem = (index: number) => {
    const normalized = (index + items.length) % items.length
    itemRefs.current[normalized]?.focus()
  }

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation()
    const currentIndex = itemRefs.current.findIndex((item) => item === document.activeElement)
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      focusItem(currentIndex < 0 ? 0 : currentIndex + 1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      focusItem(currentIndex < 0 ? items.length - 1 : currentIndex - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusItem(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusItem(items.length - 1)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
    } else if (event.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div className="tool-rail__flyout-root" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className={`ui-icon-button tool-button ui-v2-tool-rail-button ${open ? 'active is-active' : ''}`}
        aria-label={copy.guides}
        title={copy.guides}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key === 'ArrowDown' && !open) {
            event.preventDefault()
            setOpen(true)
          } else if (event.key === 'Escape' && open) {
            event.preventDefault()
            setOpen(false)
          }
        }}
      >
        <EditorIcon name="guide" />
        <span className="tool-rail__text">{copy.guides}</span>
        <span className="tool-rail__flyout-caret" aria-hidden="true" />
      </button>

      {open && (
        <div
          id={menuId}
          className="guide-flyout"
          role="menu"
          aria-label={copy.guides}
          onKeyDown={handleMenuKeyDown}
        >
          {items.map((item, index) => (
            <button
              key={item.type}
              ref={(node) => { itemRefs.current[index] = node }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              className="guide-flyout__item"
              data-guide-type={item.type}
              onClick={() => {
                onAddGuide(item.type)
                setOpen(false)
                triggerRef.current?.focus()
              }}
            >
              <GuidePreviewIcon type={item.type} />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export function ToolRail({
  locale,
  tool,
  onSelect,
  onTogglePan,
  onToggleLasso,
  onAddGuide,
  onToggleRuler,
}: {
  locale: Locale
  tool: WorkbenchTool
  onSelect: () => void
  onTogglePan: () => void
  onToggleLasso: () => void
  onAddGuide: (type: Guide['type']) => void
  onToggleRuler: () => void
}) {
  const copy = locale === 'ru'
    ? {
        label: 'Инструменты',
        select: 'Выбор / перемещение',
        pan: 'Ладонь / перемещение поля',
        lasso: 'Лассо',
        ruler: 'Линейка',
      }
    : {
        label: 'Tools',
        select: 'Select / move',
        pan: 'Hand / pan canvas',
        lasso: 'Lasso',
        ruler: 'Ruler',
      }

  return (
    <nav className="tool-rail" aria-label={copy.label} onKeyDown={(event) => event.stopPropagation()}>
      <RailButton icon="select" label={copy.select} shortcut="Esc" active={tool.type === 'select'} onClick={onSelect} />
      <RailButton icon="hand" label={copy.pan} shortcut="H" active={tool.type === 'pan'} onClick={onTogglePan} />
      <RailButton icon="lasso" label={copy.lasso} shortcut="L" active={tool.type === 'lasso'} onClick={onToggleLasso} />
      <div className="tool-rail__separator" aria-hidden="true" />
      <GuideFlyout locale={locale} onAddGuide={onAddGuide} />
      <RailButton icon="ruler" label={copy.ruler} shortcut="R" active={tool.type === 'ruler'} onClick={onToggleRuler} />
    </nav>
  )
}
