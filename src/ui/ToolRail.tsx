import type { Locale } from '../i18n'
import { IconButton } from './primitives'
import type { WorkbenchTool } from './workbenchTypes'
import './toolRail.css'

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
      <IconButton
        icon="select"
        label={`${copy.select} · Esc`}
        active={tool.type === 'select'}
        aria-pressed={tool.type === 'select'}
        onClick={onSelect}
      />
      <IconButton
        icon="hand"
        label={`${copy.pan} · H`}
        active={tool.type === 'pan'}
        aria-pressed={tool.type === 'pan'}
        onClick={onTogglePan}
      />
      <IconButton
        icon="lasso"
        label={`${copy.lasso} · L`}
        active={tool.type === 'lasso'}
        aria-pressed={tool.type === 'lasso'}
        onClick={onToggleLasso}
      />
      <div className="tool-rail__separator" aria-hidden="true" />
      <IconButton
        icon="ruler"
        label={`${copy.ruler} · R`}
        active={tool.type === 'ruler'}
        aria-pressed={tool.type === 'ruler'}
        onClick={onToggleRuler}
      />
    </nav>
  )
}
