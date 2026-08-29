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

export type ApplicationCommandState = {
  enabled: boolean
  disabledReason?: string
}

export type ApplicationCommandResult =
  | { status: 'executed' }
  | { status: 'disabled'; reason?: string }
  | { status: 'failed'; error: string }

export type ApplicationCommandRegistry = {
  getState: (command: ApplicationCommandId) => ApplicationCommandState
  execute: (command: ApplicationCommandId) => Promise<ApplicationCommandResult>
}

/**
 * Legacy runner type retained for lower-level adapters and tests while command
 * surfaces migrate to ApplicationCommandRegistry. New application chrome should
 * depend on the registry so availability and execution cannot drift apart.
 */
export type ApplicationCommandRunner = (command: ApplicationCommandId) => boolean | void

export const COMMAND_ENABLED: ApplicationCommandState = { enabled: true }

export function commandDisabled(reason?: string): ApplicationCommandResult {
  return reason ? { status: 'disabled', reason } : { status: 'disabled' }
}

export function commandExecuted(): ApplicationCommandResult {
  return { status: 'executed' }
}

export function commandFailed(error: string): ApplicationCommandResult {
  return { status: 'failed', error }
}
