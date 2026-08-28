import type { RightPanelTab } from './RightPanelTabs'

export type LegacyRightInspectorMount = {
  tabsHost: HTMLElement
  setActiveTab: (tab: RightPanelTab) => void
  destroy: () => void
}

/**
 * Temporary DOM adapter for the one remaining structural move that React does
 * not own yet: placing the existing LayersPanel inside the right inspector.
 * Keeping this in one module prevents the semantic tabs component and future
 * React layout from depending on legacy DOM selectors/reparenting details.
 */
export function installLegacyRightInspector(): LegacyRightInspectorMount | null {
  const rightSidebar = document.querySelector<HTMLElement>('.right-sidebar')
  const legacyLayers = document.querySelector<HTMLDetailsElement>('.left-sidebar > .layers-section')
  if (!rightSidebar || !legacyLayers) return null

  const originalParent = legacyLayers.parentNode
  if (!originalParent) return null
  const originalNextSibling = legacyLayers.nextSibling
  const originalOpen = legacyLayers.open

  const bridgeHost = document.createElement('div')
  bridgeHost.className = 'ui-v2-right-bridge-host'
  bridgeHost.dataset.uiV2Bridge = 'right-inspector'

  const tabsHost = document.createElement('div')
  tabsHost.className = 'ui-v2-right-tabs-host'

  const layersHost = document.createElement('div')
  layersHost.className = 'ui-v2-right-layers-host'
  layersHost.id = 'ui-v2-right-layers-panel'
  layersHost.setAttribute('role', 'tabpanel')
  layersHost.setAttribute('aria-labelledby', 'ui-v2-right-tab-layers')
  layersHost.tabIndex = 0

  bridgeHost.append(tabsHost, layersHost)
  rightSidebar.prepend(bridgeHost)

  legacyLayers.classList.add('ui-v2-moved-layers')
  layersHost.append(legacyLayers)

  let destroyed = false

  return {
    tabsHost,
    setActiveTab(tab) {
      if (destroyed) return
      const showingLayers = tab === 'layers'
      rightSidebar.classList.toggle('ui-v2-tab-layers', showingLayers)
      legacyLayers.open = showingLayers
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      rightSidebar.classList.remove('ui-v2-tab-layers')
      legacyLayers.classList.remove('ui-v2-moved-layers')
      legacyLayers.open = originalOpen
      const sibling = originalNextSibling && originalNextSibling.parentNode === originalParent
        ? originalNextSibling
        : null
      originalParent.insertBefore(legacyLayers, sibling)
      bridgeHost.remove()
    },
  }
}
