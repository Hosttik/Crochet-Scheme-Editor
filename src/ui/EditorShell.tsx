import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react'
import { DEFAULT_LOCALE, type Locale } from '../i18n'
import { AppMenuBar } from './AppMenuBar'
import type { ApplicationCommandRunner } from './applicationCommands'
import { CommandPalette } from './CommandPalette'
import './editor-shell.css'

export type EditorShellProps = {
  children: ReactNode
  locale?: Locale
  runCommand: ApplicationCommandRunner
}

function containUiKeyboardEvent(event: ReactKeyboardEvent<HTMLDivElement>) {
  const target = event.target instanceof Element ? event.target : null
  if (!target) return

  const editingTarget = target.closest('input, textarea, select, [contenteditable="true"]')
  if (event.defaultPrevented || (editingTarget && event.key === 'Escape')) event.stopPropagation()
}

export function EditorShell({ children, locale, runCommand }: EditorShellProps) {
  const resolvedLocale = locale ?? DEFAULT_LOCALE

  return (
    <div className="editor-root-v2" onKeyDown={containUiKeyboardEvent}>
      <AppMenuBar locale={resolvedLocale} runCommand={runCommand} />
      <CommandPalette locale={resolvedLocale} runCommand={runCommand} />
      <div className="editor-root-v2__workbench">
        {children}
      </div>
    </div>
  )
}
