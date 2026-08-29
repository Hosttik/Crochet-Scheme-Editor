import type { ComponentProps } from 'react'
import { RightContextPortal } from '../ui/RightContextPortal'
import { ProductivityPanel as ProductivityPanelCore } from './ProductivityPanelCore'

export function ProductivityPanel(props: ComponentProps<typeof ProductivityPanelCore>) {
  return (
    <RightContextPortal slot="productivity">
      <ProductivityPanelCore {...props} />
    </RightContextPortal>
  )
}
