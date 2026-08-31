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

  const activateAndFocus = (tab: RightPanelTab) => {
    // Both tab buttons stay mounted when the active panel changes, so focus can
    // move synchronously. This avoids a requestAnimationFrame race in release
    // builds and keeps keyboard navigation tied to the actual focused tab.
    document.getElementById(`ui-v2-right-tab-${tab}`)?.focus()
    onChange(tab)
  }

  const moveFocus = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: RightPanelTab,
    direction: -1 | 1,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    const index = tabs.findIndex((tab) => tab.id === currentTab)
    const next = tabs[(index + direction + tabs.length) % tabs.length]
    activateAndFocus(next.id)
  }

  return (
    <>
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
                if (event.key === 'ArrowRight') moveFocus(event, tab.id, 1)
                if (event.key === 'ArrowLeft') moveFocus(event, tab.id, -1)
                if (event.key === 'Home') {
                  event.preventDefault()
                  event.stopPropagation()
                  activateAndFocus('options')
                }
                if (event.key === 'End') {
                  event.preventDefault()
                  event.stopPropagation()
                  activateAndFocus('layers')
                }
              }}
            >
              <EditorIcon name={tab.icon} size={14} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>
      <div className="right-panel-contexts" data-testid="right-panel-contexts">
        <div id="ui-v2-right-context-selection" className="ui-v2-right-context-slot" data-context-slot="selection" />
        <div id="ui-v2-right-context-productivity" className="ui-v2-right-context-slot" data-context-slot="productivity" />
      </div>
    </>
  )
}
