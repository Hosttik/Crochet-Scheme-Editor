import { useLayoutEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type RightContextSlot = 'selection' | 'productivity'

function slotId(slot: RightContextSlot) {
  return `ui-v2-right-context-${slot}`
}

export function RightContextPortal({
  slot,
  children,
}: {
  slot: RightContextSlot
  children: ReactNode
}) {
  const [target, setTarget] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    setTarget(document.getElementById(slotId(slot)))
  }, [slot])

  return target ? createPortal(children, target) : children
}
