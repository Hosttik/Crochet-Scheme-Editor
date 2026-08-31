import { useSyncExternalStore } from 'react'
import type { MeasurementRuler } from '../types'

type RulerLayerActions = {
  select: (id: string) => void
  update: (id: string, patch: Partial<MeasurementRuler>) => void
  delete: (id: string) => void
}

type RulerLayersSnapshot = {
  rulers: MeasurementRuler[]
  selectedRulerId: string | null
  actions: RulerLayerActions | null
}

const EMPTY_SNAPSHOT: RulerLayersSnapshot = {
  rulers: [],
  selectedRulerId: null,
  actions: null,
}

let snapshot: RulerLayersSnapshot = EMPTY_SNAPSHOT
const listeners = new Set<() => void>()

function emit() {
  listeners.forEach((listener) => listener())
}

export function publishRulerLayers(snapshotNext: RulerLayersSnapshot) {
  snapshot = snapshotNext
  emit()
}

export function clearRulerLayers(actions: RulerLayerActions) {
  if (snapshot.actions !== actions) return
  snapshot = EMPTY_SNAPSHOT
  emit()
}

export function useRulerLayersStore() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => snapshot,
    () => EMPTY_SNAPSHOT,
  )
}
