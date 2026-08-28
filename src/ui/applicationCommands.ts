export type ApplicationCommandId =
  | 'file.new'
  | 'file.import'
  | 'file.exportProject'
  | 'file.exportSvg'
  | 'file.print'
  | 'edit.undo'
  | 'edit.redo'
  | 'edit.copy'
  | 'edit.paste'
  | 'edit.duplicate'
  | 'edit.delete'
  | 'edit.selectAll'
  | 'view.zoom100'
  | 'view.fitAll'
  | 'view.fitSelection'
  | 'view.toggleLeft'
  | 'view.toggleRight'
  | 'settings.snapping'
  | 'settings.gauge'
  | 'settings.patternRows'
  | 'settings.rowNumbers'
  | 'settings.legend'
  | 'help.controls'
  | 'ui.commandPalette'

/**
 * Semantic command boundary for application chrome. Menus and command search
 * depend on command IDs only; the temporary DOM/keyboard implementation can be
 * replaced by App-owned callbacks without changing those UI surfaces again.
 */
export type ApplicationCommandRunner = (command: ApplicationCommandId) => boolean | void
