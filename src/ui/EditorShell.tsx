import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react'
import { DEFAULT_LOCALE, type Locale } from '../i18n'
import { AppMenuBar } from './AppMenuBar'
import type { ApplicationCommandRunner } from './applicationCommands'
import { CommandPalette } from './CommandPalette'
import { SidebarCollapseControl } from './SidebarCollapseControl'
import './editor-shell.css'

export type EditorShellProps = {
  children: ReactNode
  locale?: Locale
  runCommand: ApplicationCommandRunner
}

type ClassedElementProps = {
  className?: string
  children?: ReactNode
}

function hasClass(element: ReactElement<ClassedElementProps>, className: string) {
  return element.props.className?.split(/\s+/).includes(className) === true
}

function composeWorkbenchChrome(
  children: ReactNode,
  locale: Locale,
  runCommand: ApplicationCommandRunner,
) {
  if (!isValidElement<ClassedElementProps>(children) || !hasClass(children, 'app-shell')) return children

  const leftCollapsed = hasClass(children, 'left-collapsed')
  const rightCollapsed = hasClass(children, 'right-collapsed')
  const shellChildren = Children.map(children.props.children, (child) => {
    if (!isValidElement<ClassedElementProps>(child) || !hasClass(child, 'workspace')) return child

    // App.tsx still contains the old collapse buttons while it remains the main
    // state owner. The shell owns the rendered chrome now: remove those two
    // legacy elements from the React tree and replace them with state-aware
    // controls without DOM mutation, portals, or synthetic events.
    const workspaceChildren = Children.toArray(child.props.children).filter((workspaceChild) => {
      if (!isValidElement<ClassedElementProps>(workspaceChild)) return true
      return !hasClass(workspaceChild, 'sidebar-toggle')
    })

    return cloneElement(
      child,
      undefined,
      <SidebarCollapseControl
        side="left"
        collapsed={leftCollapsed}
        locale={locale}
        onToggle={() => { void runCommand('view.toggleLeft') }}
      />,
      <SidebarCollapseControl
        side="right"
        collapsed={rightCollapsed}
        locale={locale}
        onToggle={() => { void runCommand('view.toggleRight') }}
      />,
      ...workspaceChildren,
    )
  })

  return cloneElement(children, undefined, shellChildren)
}

export function EditorShell({ children, locale, runCommand }: EditorShellProps) {
  const resolvedLocale = locale ?? DEFAULT_LOCALE
  const workbench = composeWorkbenchChrome(children, resolvedLocale, runCommand)

  return (
    <div className="editor-root-v2">
      <AppMenuBar locale={locale} runCommand={runCommand} />
      <CommandPalette locale={locale} runCommand={runCommand} />
      <div className="editor-root-v2__workbench">
        {workbench}
      </div>
    </div>
  )
}
