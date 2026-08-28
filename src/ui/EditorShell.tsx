import type { ReactNode } from 'react'
import type { Locale } from '../i18n'
import { AppMenuBar } from './AppMenuBar'
import type { ApplicationCommandRunner } from './applicationCommands'
import { CommandPalette } from './CommandPalette'
import { LeftWorkbenchBridge } from './LeftWorkbenchBridge'
import { RightInspectorBridge } from './RightInspectorBridge'
import './editor-shell.css'

export type EditorShellProps = {
  children: ReactNode
  /** Optional root-owned locale for the migrated chrome. */
  locale?: Locale
  /** Optional root-owned application command runner. */
  runCommand?: ApplicationCommandRunner
}

export function EditorShell({ children, locale, runCommand }: EditorShellProps) {
  return (
    <div className="editor-root-v2">
      <AppMenuBar locale={locale} runCommand={runCommand} />
      <CommandPalette locale={locale} runCommand={runCommand} />
      <div className="editor-root-v2__workbench">
        {children}
        <LeftWorkbenchBridge locale={locale} />
        <RightInspectorBridge locale={locale} />
      </div>
    </div>
  )
}
