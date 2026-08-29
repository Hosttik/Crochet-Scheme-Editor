import type { ReactNode } from 'react'
import type { Locale } from '../i18n'
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
  return (
    <div className="editor-root-v2">
      <AppMenuBar locale={locale} runCommand={runCommand} />
      <CommandPalette locale={locale} runCommand={runCommand} />
      <div className="editor-root-v2__workbench">
        {children}
      </div>
    </div>
  )
}
