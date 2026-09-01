import { useEffect, useState, type KeyboardEvent } from 'react'
import type { Locale } from '../i18n'
import { EditorIcon, type EditorIconName } from './icons'
import './rightInspector.css'
import './rightPanelWorkspacePass.css'

export type RightPanelTab = 'options' | 'layers'
export type RightPanelMode = 'properties' | 'document'

export const RIGHT_PANEL_MODE_EVENT = 'crochet-editor:right-panel-mode'

export function setRightPanelMode(mode: RightPanelMode) {
  if (typeof document !== 'undefined') {
    const sidebar = document.querySelector<HTMLElement>('.sidebar.right-sidebar')
    const currentMode = sidebar?.getAttribute('data-right-panel-mode')
    if (currentMode && currentMode !== mode) {
      const hiddenScope = mode === 'properties' ? '.right-document-global' : '.right-properties-global'
      sidebar?.querySelectorAll<HTMLDetailsElement>(`${hiddenScope} details[open]`).forEach((details) => {
        details.open = false
      })
    }
    sidebar?.setAttribute('data-right-panel-mode', mode)
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent<RightPanelMode>(RIGHT_PANEL_MODE_EVENT, { detail: mode }))
  }
}

export function RightPanelTabs({
  locale,
  activeTab,
  onChange,
}: {
  locale: Locale
  activeTab: RightPanelTab
  onChange: (tab: RightPanelTab) => void
}) {
  const [mode, setMode] = useState<RightPanelMode>('properties')
  const copy = locale === 'ru'
    ? { label: 'Правая панель', properties: 'Свойства', layers: 'Слои', document: 'Документ' }
    : { label: 'Right panel', properties: 'Properties', layers: 'Layers', document: 'Document' }

  const tabs: Array<{
    id: 'properties' | 'layers' | 'document'
    label: string
    icon: EditorIconName
  }> = [
    { id: 'properties', label: copy.properties, icon: 'settings' },
    { id: 'layers', label: copy.layers, icon: 'layers' },
    { id: 'document', label: copy.document, icon: 'newFile' },
  ]

  useEffect(() => {
    const handleModeChange = (event: Event) => {
      const nextMode = (event as CustomEvent<RightPanelMode>).detail
      if (nextMode === 'properties' || nextMode === 'document') setMode(nextMode)
    }
    window.addEventListener(RIGHT_PANEL_MODE_EVENT, handleModeChange)
    return () => window.removeEventListener(RIGHT_PANEL_MODE_EVENT, handleModeChange)
  }, [])

  useEffect(() => {
    if (activeTab === 'options') setRightPanelMode(mode)
  }, [activeTab, mode])

  const activate = (id: 'properties' | 'layers' | 'document', focus = false) => {
    if (id === 'layers') {
      onChange('layers')
    } else {
      setMode(id)
      setRightPanelMode(id)
      onChange('options')
    }
    if (focus) document.getElementById(`ui-v2-right-tab-${id === 'properties' ? 'options' : id}`)?.focus()
  }

  const moveFocus = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentTab: 'properties' | 'layers' | 'document',
    direction: -1 | 1,
  ) => {
    event.preventDefault()
    event.stopPropagation()
    const index = tabs.findIndex((tab) => tab.id === currentTab)
    const next = tabs[(index + direction + tabs.length) % tabs.length]
    activate(next.id, true)
  }

  return (
    <div className="right-panel-tabs" role="tablist" aria-label={copy.label} aria-orientation="horizontal">
      {tabs.map((tab) => {
        const selected = tab.id === 'layers'
          ? activeTab === 'layers'
          : activeTab === 'options' && mode === tab.id
        const tabDomId = tab.id === 'properties' ? 'options' : tab.id
        return (
          <button
            key={tab.id}
            id={`ui-v2-right-tab-${tabDomId}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={tab.id === 'layers' ? 'ui-v2-right-layers-panel' : 'ui-v2-right-options-panel'}
            tabIndex={selected ? 0 : -1}
            className={selected ? 'is-active' : ''}
            data-right-mode={tab.id}
            onClick={() => activate(tab.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowRight') moveFocus(event, tab.id, 1)
              if (event.key === 'ArrowLeft') moveFocus(event, tab.id, -1)
              if (event.key === 'Home') {
                event.preventDefault()
                event.stopPropagation()
                activate('properties', true)
              }
              if (event.key === 'End') {
                event.preventDefault()
                event.stopPropagation()
                activate('document', true)
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
