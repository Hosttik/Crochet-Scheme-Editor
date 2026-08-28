import type { Locale } from '../i18n'
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
    >
      <EditorIcon name={icon} />
      <span className="tool-rail__text">{label}</span>
    </button>
  )
}

export function ToolRail({
  locale,
  tool,
  onSelect,
  onTogglePan,
  onToggleLasso,
  onToggleRuler,
}: {
  locale: Locale
  tool: WorkbenchTool
  onSelect: () => void
  onTogglePan: () => void
  onToggleLasso: () => void
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
    <nav className="tool-rail" aria-label={copy.label}>
      <RailButton icon="select" label={copy.select} shortcut="Esc" active={tool.type === 'select'} onClick={onSelect} />
      <RailButton icon="hand" label={copy.pan} shortcut="H" active={tool.type === 'pan'} onClick={onTogglePan} />
      <RailButton icon="lasso" label={copy.lasso} shortcut="L" active={tool.type === 'lasso'} onClick={onToggleLasso} />
      <div className="tool-rail__separator" aria-hidden="true" />
      <RailButton icon="ruler" label={copy.ruler} shortcut="R" active={tool.type === 'ruler'} onClick={onToggleRuler} />
    </nav>
  )
}
