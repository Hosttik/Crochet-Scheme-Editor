from pathlib import Path


def replace_once(path: str, old: str, new: str) -> None:
    target = Path(path)
    text = target.read_text()
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: expected exactly one match, found {count}: {old[:80]!r}')
    target.write_text(text.replace(old, new, 1))


APP = 'src/App.tsx'

replace_once(
    APP,
    "import { RightPanelTabs, type RightPanelTab } from './ui/RightPanelTabs'\nimport type { WorkbenchTool } from './ui/workbenchTypes'",
    "import { RightPanelTabs, type RightPanelTab } from './ui/RightPanelTabs'\nimport type { ApplicationCommandId, ApplicationCommandRunner } from './ui/applicationCommands'\nimport type { WorkbenchTool } from './ui/workbenchTypes'",
)

replace_once(
    APP,
    "  const svgRef = useRef<SVGSVGElement>(null)\n  const loadInputRef = useRef<HTMLInputElement>(null)",
    "  const svgRef = useRef<SVGSVGElement>(null)\n  const loadInputRef = useRef<HTMLInputElement>(null)\n  const printPanelRef = useRef<HTMLDetailsElement>(null)\n  const snappingPanelRef = useRef<HTMLDetailsElement>(null)\n  const gaugePanelRef = useRef<HTMLDetailsElement>(null)\n  const patternRowsPanelRef = useRef<HTMLDetailsElement>(null)\n  const rowMarkersPanelRef = useRef<HTMLDetailsElement>(null)\n  const legendPanelRef = useRef<HTMLDetailsElement>(null)\n  const helpPanelRef = useRef<HTMLDetailsElement>(null)",
)

old_export = """  const exportSvg = () => {
    downloadText(
      'crochet-scheme.svg',
      outputSvg,
      'image/svg+xml',
    )
    setStatus(t.svgExported)
  }

  const anchorLabels: Record<AnchorName, string> = {
"""
new_export = """  const exportSvg = () => {
    downloadText(
      'crochet-scheme.svg',
      outputSvg,
      'image/svg+xml',
    )
    setStatus(t.svgExported)
  }

  const openInspectorPanel = (panel: HTMLDetailsElement | null) => {
    if (!panel) return false
    setRightCollapsed(false)
    setRightPanelTab('options')
    requestAnimationFrame(() => {
      panel.open = true
      panel.scrollIntoView({ block: 'nearest' })
      panel.querySelector<HTMLElement>('summary')?.focus()
    })
    return true
  }

  const runApplicationCommand: ApplicationCommandRunner = (command: ApplicationCommandId) => {
    switch (command) {
      case 'file.new':
        void handleNewLocalProject()
        return true
      case 'file.import':
        loadInputRef.current?.click()
        return Boolean(loadInputRef.current)
      case 'file.exportProject':
        saveProject()
        return true
      case 'file.exportSvg':
        exportSvg()
        return true
      case 'file.print':
        return openInspectorPanel(printPanelRef.current)
      case 'edit.undo':
        undo()
        return true
      case 'edit.redo':
        redo()
        return true
      case 'edit.copy':
        copySelection()
        return true
      case 'edit.paste':
        pasteSelection()
        return true
      case 'edit.duplicate':
        duplicateSelection()
        return true
      case 'edit.delete':
        deleteSelected()
        return true
      case 'edit.selectAll':
        selectAll()
        return true
      case 'view.zoom100':
        setCanvasZoom(1)
        return true
      case 'view.fitAll':
        fitAll()
        return true
      case 'view.fitSelection':
        fitSelection()
        return true
      case 'view.toggleLeft':
        setLeftCollapsed((value) => !value)
        return true
      case 'view.toggleRight':
        setRightCollapsed((value) => !value)
        return true
      case 'settings.snapping':
        return openInspectorPanel(snappingPanelRef.current)
      case 'settings.gauge':
        return openInspectorPanel(gaugePanelRef.current)
      case 'settings.patternRows':
        return openInspectorPanel(patternRowsPanelRef.current)
      case 'settings.rowNumbers':
        return openInspectorPanel(rowMarkersPanelRef.current)
      case 'settings.legend':
        return openInspectorPanel(legendPanelRef.current)
      case 'help.controls':
        return openInspectorPanel(helpPanelRef.current)
      case 'ui.commandPalette':
        return false
    }
  }

  const anchorLabels: Record<AnchorName, string> = {
"""
replace_once(APP, old_export, new_export)

replace_once(APP, '<EditorShell locale={locale}>', '<EditorShell locale={locale} runCommand={runApplicationCommand}>')

panel_refs = {
    '<details className="right-panel-collapsible" data-testid="gauge-global-panel">': '<details ref={gaugePanelRef} className="right-panel-collapsible" data-testid="gauge-global-panel">',
    '<details className="right-panel-collapsible" data-testid="print-global-panel">': '<details ref={printPanelRef} className="right-panel-collapsible" data-testid="print-global-panel">',
    '<details className="right-panel-collapsible" data-testid="snapping-global-panel">': '<details ref={snappingPanelRef} className="right-panel-collapsible" data-testid="snapping-global-panel">',
    '<details className="right-panel-collapsible" data-testid="pattern-rows-global-panel">': '<details ref={patternRowsPanelRef} className="right-panel-collapsible" data-testid="pattern-rows-global-panel">',
    '<details className="right-panel-collapsible" data-testid="row-markers-global-panel">': '<details ref={rowMarkersPanelRef} className="right-panel-collapsible" data-testid="row-markers-global-panel">',
    '<details className="right-panel-collapsible" data-testid="legend-global-panel">': '<details ref={legendPanelRef} className="right-panel-collapsible" data-testid="legend-global-panel">',
    '<details className="right-panel-collapsible help-section" data-testid="help-global-panel">': '<details ref={helpPanelRef} className="right-panel-collapsible help-section" data-testid="help-global-panel">',
}
for old, new in panel_refs.items():
    replace_once(APP, old, new)

# Application chrome must receive an App-owned command runner. No fallback DOM
# or synthetic-keyboard implementation remains in the UI components.
replace_once(
    'src/ui/AppMenuBar.tsx',
    "import { openCommandPalette } from './CommandPalette'\nimport { runLegacyCommand } from './legacyCommandBridge'",
    "import { openCommandPalette } from './CommandPalette'",
)
replace_once(
    'src/ui/AppMenuBar.tsx',
    "export function AppMenuBar({\n  runCommand = runLegacyCommand,\n  locale: controlledLocale,\n}: {\n  runCommand?: ApplicationCommandRunner\n  locale?: Locale\n} = {}) {",
    "export function AppMenuBar({\n  runCommand,\n  locale: controlledLocale,\n}: {\n  runCommand: ApplicationCommandRunner\n  locale?: Locale\n}) {",
)

replace_once(
    'src/ui/CommandPalette.tsx',
    "import { EditorIcon } from './icons'\nimport { runLegacyCommand } from './legacyCommandBridge'\nimport './commandPalette.css'",
    "import { EditorIcon } from './icons'\nimport './commandPalette.css'",
)
replace_once(
    'src/ui/CommandPalette.tsx',
    "export function CommandPalette({\n  runCommand = runLegacyCommand,\n  locale: controlledLocale,\n}: {\n  runCommand?: ApplicationCommandRunner\n  locale?: Locale\n} = {}) {",
    "export function CommandPalette({\n  runCommand,\n  locale: controlledLocale,\n}: {\n  runCommand: ApplicationCommandRunner\n  locale?: Locale\n}) {",
)

replace_once(
    'src/ui/EditorShell.tsx',
    "  runCommand?: ApplicationCommandRunner\n}\n\nexport function EditorShell({ children, locale, runCommand }: EditorShellProps) {",
    "  runCommand: ApplicationCommandRunner\n}\n\nexport function EditorShell({ children, locale, runCommand }: EditorShellProps) {",
)

# Strengthen the regression contract: menu commands must not synthesize
# untrusted keyboard events to reach App behavior.
menu_path = Path('e2e/uiV2Menu.e2e.ts')
menu = menu_path.read_text()
needle = """test('application menu supports desktop keyboard navigation', async ({ page }) => {
"""
addition = """test('application menu executes App commands without synthetic keyboard dispatch', async ({ page }) => {
  await openEditor(page)

  await page.evaluate(() => {
    sessionStorage.setItem('ui-v2-synthetic-keydowns', '0')
    window.addEventListener('keydown', (event) => {
      if (!event.isTrusted) {
        const count = Number(sessionStorage.getItem('ui-v2-synthetic-keydowns') ?? '0')
        sessionStorage.setItem('ui-v2-synthetic-keydowns', String(count + 1))
      }
    }, true)
  })

  const library = page.getByRole('region', { name: 'Библиотека элементов' })
  await library.getByRole('button', { name: 'Воздушная петля · ch', exact: true }).click()
  const canvas = page.locator('svg.editor-canvas')
  const box = await canvas.boundingBox()
  expect(box).not.toBeNull()
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2)
  await page.keyboard.press('Escape')

  await page.getByRole('button', { name: 'Правка', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Выбрать всё', exact: true }).click()
  await expect(page.locator('.stitch-element.selected')).toHaveCount(1)

  await page.getByRole('button', { name: 'Правка', exact: true }).click()
  await page.getByRole('menuitem', { name: 'Дублировать', exact: true }).click()
  await expect(page.locator('.stitch-element')).toHaveCount(2)

  await expect.poll(() => page.evaluate(() => sessionStorage.getItem('ui-v2-synthetic-keydowns'))).toBe('0')
})

"""
if menu.count(needle) != 1:
    raise SystemExit('uiV2Menu.e2e.ts: keyboard-navigation insertion point not unique')
menu_path.write_text(menu.replace(needle, addition + needle, 1))

# Update structural note now that both workbench layout and application chrome
# are React/App-owned.
replace_once(
    'src/ui/workbench-structure.css',
    " * App.tsx owns the left ToolRail / ElementLibrary and the right Options /\n * Layers tab layout directly. Structural DOM reparenting is no longer used;\n * the remaining migration seam is application-command routing.",
    " * App.tsx owns the left ToolRail / ElementLibrary, the right Options /\n * Layers layout, and the application command runner directly. Structural DOM\n * reparenting and synthetic command routing are no longer used.",
)

legacy = Path('src/ui/legacyCommandBridge.ts')
if not legacy.exists():
    raise SystemExit('legacyCommandBridge.ts already missing before migration')
legacy.unlink()
