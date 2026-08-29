import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { DEFAULT_LOCALE, type Locale } from '../i18n'
import { AppMenuBar } from './AppMenuBar'
import { ApplicationCommandShortcuts } from './ApplicationCommandShortcuts'
import type { ApplicationCommandRegistry } from './applicationCommands'
import { CommandPalette } from './CommandPalette'
import './editor-shell.css'

export type EditorShellProps = {
  children: ReactNode
  locale?: Locale
  commandRegistry: ApplicationCommandRegistry
}

function containUiKeyboardEvent(event: ReactKeyboardEvent<HTMLDivElement>) {
  const target = event.target instanceof Element ? event.target : null
  if (!target) return

  const editingTarget = target.closest('input, textarea, select, [contenteditable="true"]')
  if (event.defaultPrevented || (editingTarget && event.key === 'Escape')) event.stopPropagation()
}

export function EditorShell({ children, locale, commandRegistry }: EditorShellProps) {
  const resolvedLocale = locale ?? DEFAULT_LOCALE

  return (
    <div className="editor-root-v2" onKeyDown={containUiKeyboardEvent}>
      <AppMenuBar locale={resolvedLocale} commandRegistry={commandRegistry} />
      <CommandPalette locale={resolvedLocale} commandRegistry={commandRegistry} />
      <ApplicationCommandShortcuts commandRegistry={commandRegistry} />
      <div className="editor-root-v2__workbench">
        {children}
      </div>
    </div>
  )
}
