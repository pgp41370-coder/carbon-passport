import { useSyncExternalStore } from 'react'

/**
 * The batch the user picked, shared by every screen for this browser tab. Kept
 * in sessionStorage as a convenience only: if storage is blocked, every screen
 * falls back to the default batch.
 */
const KEY = 'carbon-passport:selected-batch'
const EVENT = 'carbon-passport:selected-batch'

function read(): string | null {
  try {
    return sessionStorage.getItem(KEY)
  } catch {
    return null
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  return () => window.removeEventListener(EVENT, onChange)
}

export function selectBatch(batchId: string) {
  try {
    sessionStorage.setItem(KEY, batchId)
  } catch {
    // Storage blocked: the choice simply isn't remembered.
  }
  window.dispatchEvent(new Event(EVENT))
}

export function useSelectedBatch(): string | null {
  return useSyncExternalStore(subscribe, read, () => null)
}
