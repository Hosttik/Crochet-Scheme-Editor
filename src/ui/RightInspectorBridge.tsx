import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { Locale } from '../i18n'
import {
  installLegacyRightInspector,
  type LegacyRightInspectorMount,
} from './legacyRightInspectorAdapter'
import { RightPanelTabs, type RightPanelTab } from './RightPanelTabs'
import './rightInspectorBridge.css'

const LOCALE_STORAGE_KEY = 'crochet-scheme-editor-locale'

function initialLocale(): Locale {
  if (typeof window === 'undefined') return 'ru'
  return window.localStorage.getItem(LOCALE_STORAGE_KEY) === 'en' ? 'en' : 'ru'
}

export type RightInspectorBridgeProps = {
  /** App-owned locale can replace the temporary language-switch observer. */
  locale?: Locale
  /** App-owned tab state can replace the bridge's temporary local state. */
  activeTab?: RightPanelTab
  onTabChange?: (tab: RightPanelTab) => void
}

/**
 * Temporary controller around the legacy Layers reparenting adapter. The tab
 * UI is already semantic React; only the structural Layers move remains in the
 * adapter and can be deleted once App.tsx renders Layers in the right column.
 */
export function RightInspectorBridge({
  locale: controlledLocale,
  activeTab: controlledTab,
  onTabChange,
}: RightInspectorBridgeProps = {}) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null)
  const [legacyLocale, setLegacyLocale] = useState<Locale>(initialLocale)
  const [legacyTab, setLegacyTab] = useState<RightPanelTab>('options')
  const mountRef = useRef<LegacyRightInspectorMount | null>(null)

  const locale = controlledLocale ?? legacyLocale
  const activeTab = controlledTab ?? legacyTab
  const changeTab = (tab: RightPanelTab) => {
    if (controlledTab === undefined) setLegacyTab(tab)
    onTabChange?.(tab)
  }

  useEffect(() => {
    let mountObserver: MutationObserver | null = null

    const install = () => {
      if (mountRef.current) return true
      const mount = installLegacyRightInspector()
      if (!mount) return false
      mountRef.current = mount
      setPortalTarget(mount.tabsHost)
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
      if (controlledLocale !== undefined) return
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>('.language-switch button')
      if (button?.textContent?.trim() === 'EN') setLegacyLocale('en')
      if (button?.textContent?.trim() === 'RU') setLegacyLocale('ru')
    }
    document.addEventListener('click', onLanguageClick, true)

    return () => {
      mountObserver?.disconnect()
      document.removeEventListener('click', onLanguageClick, true)
      mountRef.current?.destroy()
      mountRef.current = null
      setPortalTarget(null)
    }
  }, [controlledLocale])

  useEffect(() => {
    mountRef.current?.setActiveTab(activeTab)
  }, [activeTab, portalTarget])

  if (!portalTarget) return null

  return createPortal(
    <RightPanelTabs locale={locale} activeTab={activeTab} onChange={changeTab} />,
    portalTarget,
  )
}
