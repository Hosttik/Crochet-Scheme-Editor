import type { KeyboardEvent } from 'react'
import type { Locale } from '../i18n'
import { EditorIcon } from './icons'
import './rightInspector.css'

export type RightPanelTab = 'options' | 'layers'

export function RightPanelTabs({
  locale,
  activeTab,
  onChange,
}: {
  locale: Locale
  activeTab: RightPanelTab
  onChange: (tab: RightPanelTab) => void
}) {
  const copy = locale === 'ru'
    ? { label: 'Правая панель', options: 'Опции', layers: 'Слои' }
    : { label: 'Right panel', options: 'Options', layers: 'Layers' }

  const tabs: Array<{ id: RightPanelTab; label: string; icon: 'settings' | 'layers' }> = [
    { id: 'options', label: copy.options, icon: 'settings' },
    { id: 'layers', label: copy.layers, icon: 'layers' },
  ]

  const moveFocus = (event: KeyboardEvent<HTMLButtonElement>, direction: -1 | 1) => {
    event.preventDefault()
    const index = tabs.findIndex((tab) => tab.id === activeTab)
    const next = tabs[(index + direction + tabs.length) % tabs.length]
    onChange(next.id)
    requestAnimationFrame(() => {
      document.getElementById(`ui-v2-right-tab-${next.id}`)?.focus()
    })
  }

  return (
    <div className="right-panel-tabs" role="tablist" aria-label={copy.label} aria-orientation="horizontal">
      {tabs.map((tab) => {
        const selected = activeTab === tab.id
        return (
          <button
            key={tab.id}
            id={`ui-v2-right-tab-${tab.id}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`ui-v2-right-${tab.id}-panel`}
            tabIndex={selected ? 0 : -1}
            className={selected ? 'is-active' : ''}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') moveFocus(event, 1)
              if (event.key === 'ArrowLeft') moveFocus(event, -1)
              if (event.key === 'Home') {
                event.preventDefault()
                onChange('options')
                requestAnimationFrame(() => document.getElementById('ui-v2-right-tab-options')?.focus())
              }
              if (event.key === 'End') {
                event.preventDefault()
                onChange('layers')
                requestAnimationFrame(() => document.getElementById('ui-v2-right-tab-layers')?.focus())
              }
            }}
          >
            <EditorIcon name={tab.icon} size={14} />
            <span>{tab.label}</span>
          </button>
        )
      })}
    </div>
  )
}
