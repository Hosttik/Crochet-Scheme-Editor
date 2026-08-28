from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'src' / 'App.tsx'
MAIN = ROOT / 'src' / 'main.tsx'
E2E = ROOT / 'e2e' / 'uiV2LeftWorkbench.e2e.ts'


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, got {count}')
    return text.replace(old, new, 1)


def regex_once(text: str, pattern: str, replacement: str, label: str) -> str:
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f'{label}: expected exactly one match, got {count}')
    return next_text


def migrate_app() -> None:
    text = APP.read_text()

    text = replace_once(
        text,
        "import { CHAIN_BUNDLE_COUNTS, chainBundleLayout, createChainBundle, type ChainBundleCount } from './editor/chainBundle'",
        "import { chainBundleLayout, createChainBundle, type ChainBundleCount } from './editor/chainBundle'",
        'chain bundle import',
    )
    text = replace_once(
        text,
        "  categoryName,\n  symbolName,",
        "  symbolName,",
        'categoryName import',
    )
    text = replace_once(
        text,
        "import { SYMBOLS, SYMBOL_BY_ID, SymbolGlyph, symbolSvgMarkup } from './symbols'\n",
        "import { SYMBOLS, SYMBOL_BY_ID, SymbolGlyph, symbolSvgMarkup } from './symbols'\nimport { EditorShell } from './ui/EditorShell'\nimport type { WorkbenchCommands, WorkbenchTool } from './ui/workbenchTypes'\n",
        'ui workbench imports',
    )
    text = replace_once(
        text,
        "type Tool = { type: 'select' } | { type: 'pan' } | { type: 'lasso' } | { type: 'ruler' } | { type: 'place'; symbolId: string } | { type: 'place-chain-bundle'; count: ChainBundleCount } | { type: 'row-marker' }\n",
        '',
        'legacy Tool alias',
    )
    text = replace_once(
        text,
        "  const [symbolQuery, setSymbolQuery] = useState('')\n",
        '',
        'legacy symbol query state',
    )
    text = replace_once(
        text,
        "  const [tool, setTool] = useState<Tool>({ type: 'select' })",
        "  const [tool, setTool] = useState<WorkbenchTool>({ type: 'select' })",
        'workbench tool state type',
    )

    text = regex_once(
        text,
        r"  const groupedSymbols = useMemo\(\(\) => \{.*?  const lockedSelectedCount = useMemo",
        "  const lockedSelectedCount = useMemo",
        'legacy library derived state',
    )

    text = replace_once(
        text,
        "  const addGuide = (type: Guide['type']) => {",
        "  const addGuide = useCallback((type: Guide['type']) => {",
        'memoize addGuide start',
    )
    text = replace_once(
        text,
        "    setStatus(`${guideLabel(guide, locale)} ${t.added}`)\n  }\n\n  const updateSelectedGuide",
        "    setStatus(`${guideLabel(guide, locale)} ${t.added}`)\n  }, [clearElementSelection, commitGuides, guides, locale, t.added, toDocumentPoint])\n\n"
        "  const selectWorkbenchTool = useCallback(() => {\n"
        "    setTool({ type: 'select' })\n"
        "    setLasso(null)\n"
        "    setPreview(null)\n"
        "    setSnapTarget(null)\n"
        "    setRulerDraft(null)\n"
        "    setRulerDrag(null)\n"
        "  }, [])\n\n"
        "  const togglePanWorkbenchTool = useCallback(() => {\n"
        "    setTool((current) => current.type === 'pan' ? { type: 'select' } : { type: 'pan' })\n"
        "    setLasso(null)\n"
        "    setPreview(null)\n"
        "    setSnapTarget(null)\n"
        "    setRulerDraft(null)\n"
        "  }, [])\n\n"
        "  const toggleLassoWorkbenchTool = useCallback(() => {\n"
        "    setTool((current) => current.type === 'lasso' ? { type: 'select' } : { type: 'lasso' })\n"
        "    setLasso(null)\n"
        "    setPreview(null)\n"
        "    setSnapTarget(null)\n"
        "    setSelectedGuideId(null)\n"
        "    setSelectedRowMarkerId(null)\n"
        "    setSelectedRulerId(null)\n"
        "  }, [])\n\n"
        "  const selectWorkbenchSymbol = useCallback((symbolId: string) => {\n"
        "    if (tool.type === 'place' && tool.symbolId === symbolId) {\n"
        "      setTool({ type: 'select' })\n"
        "      setPreview(null)\n"
        "      setSnapTarget(null)\n"
        "      return\n"
        "    }\n"
        "    setTool({ type: 'place', symbolId })\n"
        "    clearElementSelection()\n"
        "    setSelectedGuideId(null)\n"
        "    setSelectedRowMarkerId(null)\n"
        "    setSelectedRulerId(null)\n"
        "    setRulerDraft(null)\n"
        "    setPreview(null)\n"
        "    setSnapTarget(null)\n"
        "  }, [clearElementSelection, tool])\n\n"
        "  const selectWorkbenchChainBundle = useCallback((count: ChainBundleCount) => {\n"
        "    if (tool.type === 'place-chain-bundle' && tool.count === count) {\n"
        "      setTool({ type: 'select' })\n"
        "      setPreview(null)\n"
        "      setSnapTarget(null)\n"
        "      return\n"
        "    }\n"
        "    setTool({ type: 'place-chain-bundle', count })\n"
        "    clearElementSelection()\n"
        "    setSelectedGuideId(null)\n"
        "    setSelectedRowMarkerId(null)\n"
        "    setSelectedRulerId(null)\n"
        "    setRulerDraft(null)\n"
        "    setPreview(null)\n"
        "    setSnapTarget(null)\n"
        "  }, [clearElementSelection, tool])\n\n"
        "  const workbenchCommands = useMemo<WorkbenchCommands>(() => ({\n"
        "    select: selectWorkbenchTool,\n"
        "    togglePan: togglePanWorkbenchTool,\n"
        "    toggleLasso: toggleLassoWorkbenchTool,\n"
        "    toggleRuler: toggleRulerTool,\n"
        "    addGuide,\n"
        "    selectSymbol: selectWorkbenchSymbol,\n"
        "    selectChainBundle: selectWorkbenchChainBundle,\n"
        "  }), [\n"
        "    addGuide,\n"
        "    selectWorkbenchChainBundle,\n"
        "    selectWorkbenchSymbol,\n"
        "    selectWorkbenchTool,\n"
        "    toggleLassoWorkbenchTool,\n"
        "    togglePanWorkbenchTool,\n"
        "    toggleRulerTool,\n"
        "  ])\n\n"
        "  const updateSelectedGuide",
        'close addGuide and add App-owned workbench commands',
    )

    text = regex_once(
        text,
        r'(      <aside className="sidebar left-sidebar">\n)\s*<section className="panel-section compact-section">.*?</section>\n\n(\s*<ProjectManagerPanel)',
        r'\1\n\2',
        'remove legacy tool section',
    )
    text = regex_once(
        text,
        r'\n\s*<div className="guide-add-grid">.*?</div>(?=\n\s*\{guides\.length > 0)',
        '',
        'remove legacy guide creation grid',
    )
    text = regex_once(
        text,
        r'\n\s*<section className="panel-section symbols-section">.*?</section>(?=\n\n\s*<LayersPanel)',
        '',
        'remove legacy symbol library',
    )

    text = replace_once(
        text,
        "  return (\n    <div className={`app-shell ${leftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''}`}>",
        "  return (\n    <EditorShell locale={locale} workbenchCommands={workbenchCommands} workbenchTool={tool}>\n      <div className={`app-shell ${leftCollapsed ? 'left-collapsed' : ''} ${rightCollapsed ? 'right-collapsed' : ''}`}>",
        'App-owned EditorShell opening',
    )
    text = replace_once(
        text,
        "      </aside>\n    </div>\n  )\n}\n\nexport default App\n",
        "      </aside>\n      </div>\n    </EditorShell>\n  )\n}\n\nexport default App\n",
        'App-owned EditorShell closing',
    )

    legacy_markers = [
        'symbolQuery',
        'filteredGroupedSymbols',
        'filteredChainBundleCounts',
        'normalizedSymbolQuery',
        'categoryName(',
        'CHAIN_BUNDLE_COUNTS',
        'panel-section compact-section',
        'guide-add-grid',
        'panel-section symbols-section',
    ]
    for marker in legacy_markers:
        if marker in text:
            raise RuntimeError(f'legacy App marker remains: {marker}')

    APP.write_text(text)


def migrate_main() -> None:
    text = MAIN.read_text()
    text = replace_once(text, "import { EditorShell } from './ui/EditorShell'\n", '', 'main EditorShell import')
    text = replace_once(
        text,
        "  <StrictMode>\n    <EditorShell>\n      <App />\n    </EditorShell>\n  </StrictMode>,",
        "  <StrictMode>\n    <App />\n  </StrictMode>,",
        'main shell wrapper',
    )
    MAIN.write_text(text)


def migrate_e2e() -> None:
    text = E2E.read_text()
    text = replace_once(
        text,
        "  await expect(page.locator('.left-sidebar > [data-ui-v2-legacy-tools=\"true\"]')).toBeHidden()\n"
        "  await expect(page.locator('.left-sidebar > .legacy-symbols-section')).toBeHidden()\n\n"
        "  // The temporary adapter exposes semantic identities internally; the visible\n"
        "  // UI no longer depends on translated legacy labels or button ordering.\n"
        "  const legacyPan = page.locator('[data-ui-v2-legacy-tools=\"true\"] [data-ui-v2-tool=\"pan\"]')\n"
        "  await expect(legacyPan).toHaveCount(1)\n"
        "  await expect(page.locator('[data-ui-v2-legacy-library=\"true\"] [data-ui-v2-symbol-id=\"chain\"]')).toHaveCount(1)\n"
        "  await expect(page.locator('[data-ui-v2-legacy-library=\"true\"] [data-ui-v2-chain-count=\"4\"]')).toHaveCount(1)\n"
        "  await expect(page.locator('.ui-v2-legacy-guide-add [data-ui-v2-guide-type=\"line\"]')).toHaveCount(1)\n\n",
        "  // App now owns the complete typed workbench boundary, so the hidden\n"
        "  // compatibility controls are physically gone rather than merely hidden.\n"
        "  await expect(page.locator('[data-ui-v2-legacy-tools=\"true\"]')).toHaveCount(0)\n"
        "  await expect(page.locator('[data-ui-v2-legacy-library=\"true\"]')).toHaveCount(0)\n"
        "  await expect(page.locator('.ui-v2-legacy-guide-add')).toHaveCount(0)\n\n",
        'first test legacy assertions',
    )
    text = replace_once(text, "  await expect(legacyPan).not.toHaveClass(/\\btool-button\\b/)\n", '', 'legacy pan assertion 1')
    text = replace_once(text, "  await expect(legacyPan).not.toHaveClass(/\\btool-button\\b/)\n", '', 'legacy pan assertion 2')
    text = replace_once(
        text,
        "  // The legacy implementation may re-render translated labels, but the\n"
        "  // semantic adapter key remains the stable command target.\n"
        "  await expect(page.locator('[data-ui-v2-legacy-library=\"true\"] [data-ui-v2-symbol-id=\"chain\"]')).toHaveCount(1)\n",
        "  await expect(page.locator('[data-ui-v2-legacy-library=\"true\"]')).toHaveCount(0)\n",
        'locale legacy assertion',
    )
    text = replace_once(
        text,
        "  const legacyGuideAdd = page.locator('.left-sidebar .ui-v2-legacy-guide-add')\n"
        "  await expect(legacyGuideAdd).toBeHidden()\n"
        "  await expect(legacyGuideAdd).toHaveAttribute('aria-hidden', 'true')\n",
        "  await expect(page.locator('.left-sidebar .ui-v2-legacy-guide-add')).toHaveCount(0)\n",
        'guide legacy assertion',
    )
    E2E.write_text(text)


migrate_app()
migrate_main()
migrate_e2e()
print('UI v2 App-owned workbench migration applied')
