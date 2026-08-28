import type { ReactNode } from 'react'
import type { Locale } from '../i18n'
import { AppMenuBar } from './AppMenuBar'
import type { ApplicationCommandRunner } from './applicationCommands'
import { CommandPalette } from './CommandPalette'
import { LeftWorkbenchBridge } from './LeftWorkbenchBridge'
import { RightInspectorBridge } from './RightInspectorBridge'
import type { WorkbenchCommands, WorkbenchTool } from './workbenchTypes'
import './editor-shell.css'

export type EditorShellProps = {
  children: ReactNode
  /** Optional App-owned locale for every migrated chrome surface. */
  locale?: Locale
  /** Optional App-owned application command runner. */
  runCommand?: ApplicationCommandRunner
  /** App-owned workbench commands progressively replace the legacy adapter. */
  workbenchCommands?: Partial<WorkbenchCommands>
  /** App-owned tool state removes canvas-class state inference from the bridge. */
  workbenchTool?: WorkbenchTool
}

export function EditorShell({
  children,
  locale,
  runCommand,
  workbenchCommands,
  workbenchTool,
}: EditorShellProps) {
  return (
    <div className="editor-root-v2">
      <AppMenuBar locale={locale} runCommand={runCommand} />
      <CommandPalette locale={locale} runCommand={runCommand} />
      <div className="editor-root-v2__workbench">
        {children}
        <LeftWorkbenchBridge
          locale={locale}
          commands={workbenchCommands}
          tool={workbenchTool}
        />
        <RightInspectorBridge locale={locale} />
      </div>
    </div>
  )
}
