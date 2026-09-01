import { useEffect, type ComponentProps } from 'react'
import { FanGeometryControl } from '../editor/FanGeometryControl'
import { SelectionInspector as SelectionInspectorCore } from './SelectionInspectorCore'
import { setRightPanelMode } from './RightPanelTabs'

export function SelectionInspector(props: ComponentProps<typeof SelectionInspectorCore>) {
  const hasContextSelection = props.selectedIds.length > 0 || Boolean(props.selectedGuide)

  useEffect(() => {
    if (hasContextSelection) setRightPanelMode('properties')
  }, [hasContextSelection, props.selectedElement?.id, props.selectedGuide?.id])

  return (
    <div className="right-properties-context right-properties-selection" data-testid="right-properties-selection">
      <SelectionInspectorCore {...props} />
      <FanGeometryControl locale={props.locale} element={props.selectedElement} />
    </div>
  )
}
