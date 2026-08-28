import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Locale } from '../i18n'
import './rightInspectorBridge.css'

const LOCALE_STORAGE_KEY = 'crochet-scheme-editor-locale'

type InspectorTab = 'options' | 'layers'

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru'
  return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'ru'
}

export function RightInspectorBridge() {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const [locale, setLocale] = useState<Locale>(initialLocale)
  const [activeTab, setActiveTab] = useState<InspectorTab>('options')

  useEffect(() => {
    let bridgeHost: HTMLElement | null = null
    let tabsHost: HTMLElement | null = null
    let layersHost: HTMLElement | null = null
    let layersPanel: HTMLDetailsElement | null = null
    let originalParent: Node | null = null
    let originalNextSibling: Node | null = null
    let originalOpen = false
    let mountObserver: MutationObserver | null = null

    const install = () => {
      if (bridgeHost) return true

      const rightSidebar = document.querySelector<HTMLElement>('.right-sidebar')
      const legacyLayers = document.querySelector<HTMLDetailsElement>('.left-sidebar > .layers-section')
      if (!rightSidebar || !legacyLayers) return false

      originalParent = legacyLayers.parentNode
      originalNextSibling = legacyLayers.nextSibling
      originalOpen = legacyLayers.open
      layersPanel = legacyLayers

      bridgeHost = document.createElement('div')
      bridgeHost.className = 'ui-v2-right-bridge-host'
      bridgeHost.dataset.uiV2Bridge = 'right-inspector'

      tabsHost = document.createElement('div')
      tabsHost.className = 'ui-v2-right-tabs-host'
      layersHost = document.createElement('div')
      layersHost.className = 'ui-v2-right-layers-host'
      layersHost.id = 'ui-v2-right-layers-panel'

      bridgeHost.append(tabsHost, layersHost)
      rightSidebar.prepend(bridgeHost)

      legacyLayers.classList.add('ui-v2-moved-layers')
      legacyLayers.open = true
      layersHost.append(legacyLayers)

      setPortalTarget(tabsHost)
      return true
    }

    if (!install()) {
      const root = document.querySelector('.editor-root-v2__workbench') ?? document.body
      mountObserver = new MutationObserver(() => {
        if (install()) {
          mountObserver?.disconnect()
          mountObserver = null
        }
      })
      mountObserver.observe(root, { childList: true, subtree: true })
    }

    const onLanguageClick = (event: MouseEvent) => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>('.language-switch button')
      if (button?.textContent?.trim() === 'EN') setLocale('en')
      if (button?.textContent?.trim() === 'RU') setLocale('ru')
    }
    document.addEventListener('click', onLanguageClick, true)

    return () => {
      mountObserver?.disconnect()
      document.removeEventListener('click', onLanguageClick, true)

      const rightSidebar = document.querySelector<HTMLElement>('.right-sidebar')
      rightSidebar?.classList.remove('ui-v2-tab-layers')

      if (layersPanel && originalParent) {
        layersPanel.classList.remove('ui-v2-moved-layers')
        layersPanel.open = originalOpen
        const sibling = originalNextSibling && originalNextSibling.parentNode === originalParent
          ? originalNextSibling
          : null
        originalParent.insertBefore(layersPanel, sibling)
      }

      bridgeHost?.remove()
      setPortalTarget(null)
    }
  }, [])

  useEffect(() => {
    const rightSidebar = document.querySelector<HTMLElement>('.right-sidebar')
    if (!rightSidebar) return
    rightSidebar.classList.toggle('ui-v2-tab-layers', activeTab === 'layers')
  }, [activeTab, portalTarget])

  if (!portalTarget) return null

  const copy = locale === 'ru'
    ? { label: 'Правая панель', options: 'Опции', layers: 'Слои' }
    : { label: 'Right panel', options: 'Options', layers: 'Layers' }

  return createPortal(
    <div className="right-panel-tabs" role="tablist" aria-label={copy.label}>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'options'}
        className={activeTab === 'options' ? 'is-active' : ''}
        onClick={() => setActiveTab('options')}
      >
        {copy.options}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'layers'}
        aria-controls="ui-v2-right-layers-panel"
        className={activeTab === 'layers' ? 'is-active' : ''}
        onClick={() => setActiveTab('layers')}
      >
        {copy.layers}
      </button>
    </div>,
    portalTarget,
  )
}
