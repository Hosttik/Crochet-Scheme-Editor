import type { ComponentProps } from 'react'
import { ProductivityPanel as ProductivityPanelCore } from './ProductivityPanelCore'

export function ProductivityPanel(props: ComponentProps<typeof ProductivityPanelCore>) {
  return (
    <div className="right-properties-context right-properties-productivity" data-testid="right-properties-productivity">
      <ProductivityPanelCore {...props} />
    </div>
  )
}
