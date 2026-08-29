from pathlib import Path


def once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected one match, got {count}')
    return text.replace(old, new, 1)


app_path = Path('src/App.tsx')
app = app_path.read_text()
app = once(
    app,
    "import { LeftWorkbenchSurface } from './ui/LeftWorkbenchSurface'\nimport type { WorkbenchTool } from './ui/workbenchTypes'\n",
    "import { LeftWorkbenchSurface } from './ui/LeftWorkbenchSurface'\nimport { RightPanelTabs, type RightPanelTab } from './ui/RightPanelTabs'\nimport type { WorkbenchTool } from './ui/workbenchTypes'\n",
    'right panel imports',
)
app = once(
    app,
    "  const [favorites, setFavorites] = useState<FavoriteElementKey[]>(loadFavorites)\n",
    "  const [favorites, setFavorites] = useState<FavoriteElementKey[]>(loadFavorites)\n  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('options')\n",
    'right panel state',
)

legacy_left_layers = """        <LayersPanel
          elements={elements}
          selectedIds={selectedIds}
          locale={locale}
          onSelect={handleLayerSelect}
          onToggleVisible={toggleElementVisible}
          onToggleLocked={toggleElementLocked}
          onBringForward={bringSelectionForward}
          onSendBackward={sendSelectionBackward}
          onBringToFront={bringSelectionToFront}
          onSendToBack={sendSelectionToBack}
        />
"""
app = once(app, legacy_left_layers, '', 'left LayersPanel')

app = once(
    app,
    "      <aside className=\"sidebar right-sidebar\">\n        <section className=\"panel-section right-panel-context\" data-testid=\"selection-context-panel\">",
    """      <aside className=\"sidebar right-sidebar\">
        <div className=\"ui-v2-right-tabs-host\">
          <RightPanelTabs locale={locale} activeTab={rightPanelTab} onChange={setRightPanelTab} />
        </div>

        <div
          id=\"ui-v2-right-options-panel\"
          className=\"ui-v2-right-options-host\"
          role=\"tabpanel\"
          aria-labelledby=\"ui-v2-right-tab-options\"
          hidden={rightPanelTab !== 'options'}
        >
        <section className=\"panel-section right-panel-context\" data-testid=\"selection-context-panel\">""",
    'right options host',
)

right_end = """        <details className=\"right-panel-collapsible help-section\" data-testid=\"help-global-panel\">
          <summary>{t.controls}</summary>
          <section className=\"panel-section\">
            <ul>
              <li>{t.help1}</li>
              <li>{t.help2}</li>
              <li>{t.help3}</li>
              <li>{t.help4}</li>
              <li>{t.help5}</li>
              <li>{t.help6}</li>
            </ul>
          </section>
        </details>
      </aside>
"""
right_direct = """        <details className=\"right-panel-collapsible help-section\" data-testid=\"help-global-panel\">
          <summary>{t.controls}</summary>
          <section className=\"panel-section\">
            <ul>
              <li>{t.help1}</li>
              <li>{t.help2}</li>
              <li>{t.help3}</li>
              <li>{t.help4}</li>
              <li>{t.help5}</li>
              <li>{t.help6}</li>
            </ul>
          </section>
        </details>
        </div>

        <div
          id=\"ui-v2-right-layers-panel\"
          className=\"ui-v2-right-layers-host\"
          role=\"tabpanel\"
          aria-labelledby=\"ui-v2-right-tab-layers\"
          tabIndex={0}
          hidden={rightPanelTab !== 'layers'}
        >
          <LayersPanel
            elements={elements}
            selectedIds={selectedIds}
            locale={locale}
            onSelect={handleLayerSelect}
            onToggleVisible={toggleElementVisible}
            onToggleLocked={toggleElementLocked}
            onBringForward={bringSelectionForward}
            onSendBackward={sendSelectionBackward}
            onBringToFront={bringSelectionToFront}
            onSendToBack={sendSelectionToBack}
          />
        </div>
      </aside>
"""
app = once(app, right_end, right_direct, 'right layers host')
app_path.write_text(app)

shell_path = Path('src/ui/EditorShell.tsx')
shell = shell_path.read_text()
shell = once(shell, "import { RightInspectorBridge } from './RightInspectorBridge'\n", '', 'bridge import')
shell = once(shell, "        <RightInspectorBridge locale={locale} />\n", '', 'bridge render')
shell_path.write_text(shell)

tabs_path = Path('src/ui/RightPanelTabs.tsx')
tabs = tabs_path.read_text()
tabs = once(tabs, "import { EditorIcon } from './icons'\n", "import { EditorIcon } from './icons'\nimport './rightInspector.css'\n", 'right inspector css import')
tabs = once(
    tabs,
    "            aria-controls={tab.id === 'layers' ? 'ui-v2-right-layers-panel' : undefined}\n",
    "            aria-controls={`ui-v2-right-${tab.id}-panel`}\n",
    'tab aria controls',
)
tabs_path.write_text(tabs)

layers_path = Path('src/editor/LayersPanel.tsx')
layers = layers_path.read_text()
layers = once(
    layers,
    "    <details className=\"panel-section layers-section\">\n",
    "    <details className=\"panel-section layers-section\" open>\n",
    'open direct layers panel',
)
layers_path.write_text(layers)

right_css = """.ui-v2-right-tabs-host {
  position: sticky;
  top: 0;
  z-index: 6;
  flex: 0 0 auto;
  border-bottom: 1px solid var(--ui-border);
  background: var(--ui-surface);
}

.right-panel-tabs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 4px;
  padding: 6px 8px 5px;
}

.right-panel-tabs > button {
  position: relative;
  display: inline-flex;
  min-width: 0;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 10px;
  border: 0;
  border-radius: var(--ui-radius-sm);
  background: transparent;
  color: var(--ui-text-muted);
  font-size: 11px;
  font-weight: 600;
}

.right-panel-tabs > button:hover {
  background: var(--ui-surface-hover);
  color: var(--ui-text);
}

.right-panel-tabs > button.is-active {
  background: var(--ui-accent-soft);
  color: var(--ui-accent-hover);
}

.right-panel-tabs > button.is-active::after {
  content: '';
  position: absolute;
  right: 10px;
  bottom: -5px;
  left: 10px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--ui-accent);
}

.ui-v2-right-options-host,
.ui-v2-right-layers-host {
  min-width: 0;
  flex: 0 0 auto;
  background: var(--ui-surface);
}

.ui-v2-right-options-host[hidden],
.ui-v2-right-layers-host[hidden] {
  display: none !important;
}

.ui-v2-right-layers-host:focus-visible {
  position: relative;
  z-index: 1;
  outline: 0;
  box-shadow: inset var(--ui-focus-ring);
}

.ui-v2-right-layers-host > .layers-section {
  display: block;
  min-width: 0;
  margin: 0;
  padding: 8px 10px 12px;
  border: 0;
  border-radius: 0;
  background: transparent;
}

.ui-v2-right-layers-host .layers-summary {
  display: none;
}

.ui-v2-right-layers-host .layers-content {
  display: grid;
  gap: 8px;
}

.ui-v2-right-layers-host .layers-list {
  max-height: none;
}

@media (max-width: 1080px) {
  .right-panel-tabs {
    padding-inline: 6px;
  }

  .right-panel-tabs > button {
    gap: 4px;
    padding-inline: 6px;
  }
}
"""
Path('src/ui/rightInspector.css').write_text(right_css)

structure_path = Path('src/ui/workbench-structure.css')
structure = structure_path.read_text()
structure = structure.replace(
    ' * workbench directly. Layers are temporarily reparented into\n * the right inspector until App.tsx exposes typed panel actions directly.\n',
    ' * workbench directly. The right Options / Layers tabs are also rendered\n * directly from App; remaining compatibility debt is limited to app commands.\n',
)
structure = structure.replace('.right-sidebar > .right-panel-context', '.right-sidebar .right-panel-context')
structure = structure.replace('.right-sidebar > .right-panel-collapsible', '.right-sidebar .right-panel-collapsible')
structure_path.write_text(structure)

right_test_path = Path('e2e/uiV2RightInspector.e2e.ts')
right_test = right_test_path.read_text()
right_test = right_test.replace(
    "test('moves Layers to the right inspector and switches Options / Layers tabs'",
    "test('renders Layers directly in the right inspector and switches Options / Layers tabs'",
)
right_test = once(
    right_test,
    "  await expect(page.locator('.left-sidebar > .layers-section')).toHaveCount(0)\n  await expect(page.locator('.ui-v2-right-layers-host > .layers-section')).toHaveCount(1)\n",
    "  await expect(page.locator('.left-sidebar > .layers-section')).toHaveCount(0)\n  await expect(page.locator('[data-ui-v2-bridge=\"right-inspector\"]')).toHaveCount(0)\n  await expect(page.locator('.ui-v2-right-layers-host > .layers-section')).toHaveCount(1)\n",
    'right inspector no bridge assertion',
)
right_test_path.write_text(right_test)

Path('src/ui/RightInspectorBridge.tsx').unlink()
Path('src/ui/legacyRightInspectorAdapter.ts').unlink()
Path('src/ui/rightInspectorBridge.css').unlink()

for root in (Path('src'), Path('e2e')):
    for path in root.rglob('*'):
        if not path.is_file():
            continue
        text = path.read_text(errors='ignore')
        if 'RightInspectorBridge' in text or 'legacyRightInspectorAdapter' in text or 'rightInspectorBridge.css' in text:
            raise RuntimeError(f'obsolete right inspector bridge reference remains in {path}')

print('direct right inspector migration applied')
