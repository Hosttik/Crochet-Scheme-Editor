import type { ComponentProps } from 'react'
import { FanGeometryControl } from '../editor/FanGeometryControl'
import { SelectionInspector as SelectionInspectorCore } from './SelectionInspectorCore'

export function SelectionInspector(props: ComponentProps<typeof SelectionInspectorCore>) {
  return (
    <div className="right-properties-context right-properties-selection" data-testid="right-properties-selection">
      <SelectionInspectorCore {...props} />
      <FanGeometryControl locale={props.locale} element={props.selectedElement} />
    </div>
  )
}
