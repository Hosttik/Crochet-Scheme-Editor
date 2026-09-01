import type { ComponentProps } from 'react'
import { FanGeometryControl } from '../editor/FanGeometryControl'
import { RightContextPortal } from './RightContextPortal'
import { SelectionInspector as SelectionInspectorCore } from './SelectionInspectorCore'

export function SelectionInspector(props: ComponentProps<typeof SelectionInspectorCore>) {
  return (
    <RightContextPortal slot="selection">
      <>
        <SelectionInspectorCore {...props} />
        <FanGeometryControl locale={props.locale} element={props.selectedElement} />
      </>
    </RightContextPortal>
  )
}
