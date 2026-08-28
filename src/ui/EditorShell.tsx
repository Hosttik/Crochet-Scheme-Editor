import type { ReactNode } from 'react'
import { AppMenuBar } from './AppMenuBar'
import { CommandPalette } from './CommandPalette'
import { LeftWorkbenchBridge } from './LeftWorkbenchBridge'
import { RightInspectorBridge } from './RightInspectorBridge'
import './editor-shell.css'

export function EditorShell({ children }: { children: ReactNode }) {
  return (
    <div className="editor-root-v2">
      <AppMenuBar />
      <CommandPalette />
      <div className="editor-root-v2__workbench">
        {children}
        <LeftWorkbenchBridge />
        <RightInspectorBridge />
      </div>
    </div>
  )
}
