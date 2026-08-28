import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { EditorIcon, type EditorIconName } from './icons'

export function IconButton({
  icon,
  label,
  active = false,
  className = '',
  ...props
}: {
  icon: EditorIconName
  label: string
  active?: boolean
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'>) {
  return (
    <button
      type="button"
      className={`ui-icon-button ${active ? 'is-active' : ''} ${className}`.trim()}
      aria-label={label}
      title={props.title ?? label}
      {...props}
    >
      <EditorIcon name={icon} />
    </button>
  )
}

export function Button({
  children,
  icon,
  variant = 'default',
  className = '',
  ...props
}: {
  children: ReactNode
  icon?: EditorIconName
  variant?: 'default' | 'subtle' | 'danger'
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <button
      type="button"
      className={`ui-button ui-button--${variant} ${className}`.trim()}
      {...props}
    >
      {icon ? <EditorIcon name={icon} size={16} /> : null}
      <span className="ui-button__label">{children}</span>
    </button>
  )
}

export function ToolButton({
  icon,
  label,
  shortcut,
  active = false,
  ...props
}: {
  icon: EditorIconName
  label: string
  shortcut?: string
  active?: boolean
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>) {
  return (
    <button
      type="button"
      className={`ui-tool-button ${active ? 'is-active' : ''}`}
      aria-pressed={active}
      {...props}
    >
      <EditorIcon name={icon} />
      <span className="ui-tool-button__label">{label}</span>
      {shortcut ? <kbd>{shortcut}</kbd> : null}
    </button>
  )
}

export function PanelHeader({
  title,
  actions,
  className = '',
  ...props
}: {
  title: ReactNode
  actions?: ReactNode
} & HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`ui-panel-header ${className}`.trim()} {...props}>
      <strong>{title}</strong>
      {actions ? <div className="ui-panel-header__actions">{actions}</div> : null}
    </div>
  )
}

export function SegmentedControl({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`ui-segmented ${className}`.trim()}>{children}</div>
}

export function Divider({ className = '' }: { className?: string }) {
  return <span className={`ui-divider ${className}`.trim()} aria-hidden="true" />
}
