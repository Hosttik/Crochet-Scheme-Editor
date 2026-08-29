import { useEffect } from 'react'

function isEditingTarget(target: EventTarget | null) {
  return target instanceof Element
    && Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
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
        || isEditingTarget(event.target)
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

      // App owns the state transition; this layer only routes the same keyboard
      // commands used by expert workflows into the semantic callbacks already
      // shared by ToolRail and CanvasToolbar. Stopping at document prevents the
      // legacy App-level fallback listener on window from executing a second,
      // divergent transition.
      event.preventDefault()
      event.stopPropagation()
      action()
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [onToggleLasso, onTogglePan, onToggleRuler])

  return null
}
