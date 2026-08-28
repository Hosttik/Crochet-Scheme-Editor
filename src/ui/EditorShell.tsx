import type { ReactNode } from 'react'
import { AppMenuBar } from './AppMenuBar'
import './editor-shell.css'

export function EditorShell({ children }: { children: ReactNode }) {
  return (
    <div className="editor-root-v2">
      <AppMenuBar />
      <div className="editor-root-v2__workbench">{children}</div>
    </div>
  )
}
