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

const INTERACTIVE_NAVIGATION_KEYS = new Set([
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'Home',
  'End',
  'Enter',
  ' ',
  'Escape',
  'Delete',
  'Backspace',
])

function containUiKeyboardEvent(event: ReactKeyboardEvent<HTMLDivElement>) {
  const target = event.target instanceof Element ? event.target : null
  if (!target) return

  const editingTarget = target.closest('input, textarea, select, [contenteditable="true"]')
  const interactiveTarget = target.closest('button, summary, [role="menuitem"], [role="tab"], [role="option"]')

  if (
    event.defaultPrevented
    || editingTarget
    || (interactiveTarget && INTERACTIVE_NAVIGATION_KEYS.has(event.key))
  ) {
    event.stopPropagation()
  }
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
