import { useEffect } from 'react'

function elementTarget(target: EventTarget | null) {
  return target instanceof Element ? target : null
}

function isEditingTarget(target: EventTarget | null) {
  return Boolean(elementTarget(target)?.closest('input, textarea, select, [contenteditable="true"]'))
}

function isUiOwnedShortcutScope(target: EventTarget | null) {
  return Boolean(elementTarget(target)?.closest(
    '[role="menubar"], [role="menu"], [role="dialog"][aria-modal="true"]',
  ))
}

export function WorkbenchToolShortcuts({
  onTogglePan,
  onToggleLasso,
  onToggleRuler,
}: {
  onTogglePan: () => void
  onToggleLasso: () => void
  onToggleRuler: () => void
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented
        || event.metaKey
        || event.ctrlKey
        || event.altKey
      ) return

      const key = event.key.toLowerCase()
      const action = key === 'h'
        ? onTogglePan
        : key === 'l'
          ? onToggleLasso
          : key === 'r'
            ? onToggleRuler
            : null

      if (!action) return

      // App already suppresses tool shortcuts for editing targets. Leave those
      // events untouched so text input keeps its normal behavior.
      if (isEditingTarget(event.target)) return

      // Menus/dialogs own plain-letter keyboard input while focused. Keep
      // canvas tool shortcuts isolated from those UI surfaces.
      if (isUiOwnedShortcutScope(event.target)) {
        event.stopPropagation()
        return
      }

      // App owns the state transition; this layer routes expert-workflow
      // shortcuts into the semantic callbacks shared by ToolRail and CanvasToolbar.
      event.preventDefault()
      event.stopPropagation()
      action()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onToggleLasso, onTogglePan, onToggleRuler])

  return null
}
