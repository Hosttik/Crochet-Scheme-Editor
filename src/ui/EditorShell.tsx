import type { ReactNode } from 'react'
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

export function EditorShell({ children, locale, runCommand }: EditorShellProps) {
  const resolvedLocale = locale ?? DEFAULT_LOCALE

  return (
    <div className="editor-root-v2">
      <AppMenuBar locale={resolvedLocale} runCommand={runCommand} />
      <CommandPalette locale={resolvedLocale} runCommand={runCommand} />
      <div className="editor-root-v2__workbench">
        {children}
      </div>
    </div>
  )
}
