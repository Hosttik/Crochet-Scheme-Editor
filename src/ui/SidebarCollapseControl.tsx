import type { Locale } from '../i18n'

export type SidebarSide = 'left' | 'right'

function sidebarActionLabel(side: SidebarSide, collapsed: boolean, locale: Locale) {
  if (locale === 'ru') {
    if (side === 'left') return collapsed ? 'Развернуть левую панель' : 'Свернуть левую панель'
    return collapsed ? 'Развернуть правую панель' : 'Свернуть правую панель'
  }
  if (side === 'left') return collapsed ? 'Expand left panel' : 'Collapse left panel'
  return collapsed ? 'Expand right panel' : 'Collapse right panel'
}

export function SidebarCollapseControl({
  side,
  collapsed,
  locale,
  onToggle,
}: {
  side: SidebarSide
  collapsed: boolean
  locale: Locale
  onToggle: () => void
}) {
  const label = sidebarActionLabel(side, collapsed, locale)
  return (
    <button
      type="button"
      className={`sidebar-toggle ${side}`}
      aria-label={label}
      aria-expanded={!collapsed}
      title={label}
      onClick={onToggle}
    />
  )
}
