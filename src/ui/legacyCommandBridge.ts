export type LegacyPanelId =
  | 'print-global-panel'
  | 'snapping-global-panel'
  | 'gauge-global-panel'
  | 'pattern-rows-global-panel'
  | 'row-markers-global-panel'
  | 'legend-global-panel'
  | 'help-global-panel'

function normalizedText(value: string | null | undefined) {
  return (value ?? '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function findButtonByText(labels: string[]) {
  const wanted = new Set(labels.map(normalizedText))
  return Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) =>
    wanted.has(normalizedText(button.textContent)),
  ) ?? null
}

function clickButtonByText(labels: string[]) {
  const button = findButtonByText(labels)
  if (!button || button.disabled) return false
  button.click()
  return true
}

export function dispatchEditorShortcut(
  key: string,
  options: { ctrlOrMeta?: boolean; shiftKey?: boolean } = {},
) {
  const eventInit: KeyboardEventInit = {
    key,
    bubbles: true,
    cancelable: true,
    shiftKey: options.shiftKey === true,
    ctrlKey: options.ctrlOrMeta === true,
    metaKey: false,
  }
  window.dispatchEvent(new KeyboardEvent('keydown', eventInit))
  window.dispatchEvent(new KeyboardEvent('keyup', eventInit))
}

export function openLegacyPanel(id: LegacyPanelId) {
  const details = document.querySelector<HTMLDetailsElement>(`details[data-testid="${id}"]`)
  if (!details) return false
  details.open = true
  details.scrollIntoView({ block: 'nearest' })
  details.querySelector<HTMLElement>('summary')?.focus()
  return true
}

export function runLegacyCommand(command: string) {
  switch (command) {
    case 'file.new':
      return document.querySelector<HTMLButtonElement>('.project-actions button:first-child')?.click(), true
    case 'file.import':
      document.querySelector<HTMLInputElement>('input[type="file"][accept*=".json"]')?.click()
      return true
    case 'file.exportProject':
      return clickButtonByText(['Экспорт проекта', 'Export project'])
    case 'file.exportSvg':
      return clickButtonByText(['Экспорт SVG', 'Export SVG'])
    case 'file.print':
      return openLegacyPanel('print-global-panel')
    case 'edit.undo':
      dispatchEditorShortcut('z', { ctrlOrMeta: true })
      return true
    case 'edit.redo':
      dispatchEditorShortcut('z', { ctrlOrMeta: true, shiftKey: true })
      return true
    case 'edit.copy':
      dispatchEditorShortcut('c', { ctrlOrMeta: true })
      return true
    case 'edit.paste':
      dispatchEditorShortcut('v', { ctrlOrMeta: true })
      return true
    case 'edit.duplicate':
      dispatchEditorShortcut('d', { ctrlOrMeta: true })
      return true
    case 'edit.selectAll':
      dispatchEditorShortcut('a', { ctrlOrMeta: true })
      return true
    case 'edit.delete':
      dispatchEditorShortcut('Delete')
      return true
    case 'view.zoom100':
      dispatchEditorShortcut('0')
      return true
    case 'view.fitAll':
      dispatchEditorShortcut('f')
      return true
    case 'view.fitSelection':
      dispatchEditorShortcut('f', { shiftKey: true })
      return true
    case 'view.toggleLeft':
      document.querySelector<HTMLButtonElement>('.sidebar-toggle.left')?.click()
      return true
    case 'view.toggleRight':
      document.querySelector<HTMLButtonElement>('.sidebar-toggle.right')?.click()
      return true
    case 'settings.snapping':
      return openLegacyPanel('snapping-global-panel')
    case 'settings.gauge':
      return openLegacyPanel('gauge-global-panel')
    case 'settings.patternRows':
      return openLegacyPanel('pattern-rows-global-panel')
    case 'settings.rowNumbers':
      return openLegacyPanel('row-markers-global-panel')
    case 'settings.legend':
      return openLegacyPanel('legend-global-panel')
    case 'help.controls':
      return openLegacyPanel('help-global-panel')
    default:
      return false
  }
}
