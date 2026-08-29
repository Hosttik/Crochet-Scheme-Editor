import { useEffect, useRef } from 'react'
import type { ApplicationCommandId, ApplicationCommandRegistry } from './applicationCommands'

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

function commandForKeyboardEvent(event: KeyboardEvent): ApplicationCommandId | null {
  const key = event.key.toLowerCase()
  const commandModifier = event.metaKey || event.ctrlKey

  if (event.altKey) return null

  if (commandModifier) {
    if (key === 'z') return event.shiftKey ? 'edit.redo' : 'edit.undo'
    if (key === 'c') return 'edit.copy'
    if (key === 'v') return 'edit.paste'
    if (key === 'd') return 'edit.duplicate'
    if (key === 'a') return 'edit.selectAll'
    return null
  }

  if (event.key === 'Delete' || event.key === 'Backspace') return 'edit.delete'
  if (key === 'f') return event.shiftKey ? 'view.fitSelection' : 'view.fitAll'
  if (event.key === '0' && !event.shiftKey) return 'view.zoom100'
  return null
}

export function ApplicationCommandShortcuts({
  commandRegistry,
}: {
  commandRegistry: ApplicationCommandRegistry
}) {
  const registryRef = useRef(commandRegistry)
  registryRef.current = commandRegistry

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return
      const command = commandForKeyboardEvent(event)
      if (!command) return

      // Keep normal text editing/browser behavior, but do not let the legacy
      // App-level window listener execute an editor command behind that UI.
      if (isEditingTarget(event.target) || isUiOwnedShortcutScope(event.target)) {
        event.stopPropagation()
        return
      }

      // Duplicate is intentionally edge-triggered. The legacy implementation
      // also guarded against key repeat; keep that contract at the command edge.
      if (command === 'edit.duplicate' && event.repeat) {
        event.preventDefault()
        event.stopPropagation()
        return
      }

      event.preventDefault()
      event.stopPropagation()
      void registryRef.current.execute(command)
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return null
}
