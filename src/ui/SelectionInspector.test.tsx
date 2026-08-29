import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import type { Guide } from '../types'
import { SelectionInspector } from './SelectionInspector'

const lineGuide: Guide = {
  id: 'guide-1',
  type: 'line',
  start: { x: 10, y: 20 },
  end: { x: 210, y: 20 },
  divisions: 8,
  visible: true,
}

const callbacks = {
  onSelectionColorChange: () => undefined,
  onParametricRowChange: () => undefined,
  onParametricRowDelete: () => undefined,
  onTopologyParentSelect: () => undefined,
  onRotate: () => undefined,
  onAttachSelectedToGuide: () => undefined,
  onUpdateSelectedGuideAttachment: () => undefined,
  onDetachSelectedFromGuide: () => undefined,
  onCopy: () => undefined,
  onDuplicate: () => undefined,
  onToggleElementVisible: () => undefined,
  onToggleElementLocked: () => undefined,
  onDelete: () => undefined,
  onGuideChange: () => undefined,
  onFitSelectedLineToProject: () => undefined,
  onReverseGuide: () => undefined,
  onGenerateGuideRow: () => undefined,
}

describe('selection inspector', () => {
  it('preserves the contextual panel and empty-selection contract', () => {
    const markup = renderToStaticMarkup(
      <SelectionInspector
        locale="en"
        elements={[]}
        guides={[]}
        selectedIds={[]}
        selectedElement={null}
        selectedGuide={null}
        selectedParametricRow={null}
        selectedParametricGuide={null}
        selectedTopologyParentId={null}
        lockedSelectedCount={0}
        editableSelectedCount={0}
        guideLabel={() => ''}
        {...callbacks}
      />,
    )

    expect(markup).toContain('class="panel-section right-panel-context"')
    expect(markup).toContain('data-testid="selection-context-panel"')
    expect(markup).toContain('class="empty-state"')
  })

  it('renders the controlled line-guide editor without owning guide state', () => {
    const markup = renderToStaticMarkup(
      <SelectionInspector
        locale="en"
        elements={[]}
        guides={[lineGuide]}
        selectedIds={[]}
        selectedElement={null}
        selectedGuide={lineGuide}
        selectedParametricRow={null}
        selectedParametricGuide={null}
        selectedTopologyParentId={null}
        lockedSelectedCount={0}
        editableSelectedCount={0}
        guideLabel={() => 'Line'}
        {...callbacks}
      />,
    )

    expect(markup).toContain('class="guide-editor"')
    expect(markup).toContain('<strong>Line</strong>')
    expect(markup).toContain('Fit to project')
    expect(markup).toContain('Reverse direction')
  })

  it('uses the shared outline lock icon for locked selection state', () => {
    const markup = renderToStaticMarkup(
      <SelectionInspector
        locale="en"
        elements={[]}
        guides={[]}
        selectedIds={[]}
        selectedElement={null}
        selectedGuide={null}
        selectedParametricRow={null}
        selectedParametricGuide={null}
        selectedTopologyParentId={null}
        lockedSelectedCount={2}
        editableSelectedCount={0}
        guideLabel={() => ''}
        {...callbacks}
      />,
    )

    expect(markup).toContain('lock-indicator-icon')
    expect(markup).toContain('2 selected locked stitch(es)')
    expect(markup).not.toContain('🔒')
  })
})
