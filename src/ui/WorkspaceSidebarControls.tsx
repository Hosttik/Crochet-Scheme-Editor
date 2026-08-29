import type { Locale } from '../i18n'
import { SidebarCollapseControl } from './SidebarCollapseControl'

export function WorkspaceSidebarControls({
  locale,
  leftCollapsed,
  rightCollapsed,
  onToggleLeft,
  onToggleRight,
}: {
  locale: Locale
  leftCollapsed: boolean
  rightCollapsed: boolean
  onToggleLeft: () => void
  onToggleRight: () => void
}) {
  return (
    <>
      <SidebarCollapseControl
        side="left"
        collapsed={leftCollapsed}
        locale={locale}
        onToggle={onToggleLeft}
      />
      <SidebarCollapseControl
        side="right"
        collapsed={rightCollapsed}
        locale={locale}
        onToggle={onToggleRight}
      />
    </>
  )
}
