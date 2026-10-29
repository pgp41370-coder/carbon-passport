import { useMemo, useSyncExternalStore } from 'react'

/**
 * Minimal hash router. Hash URLs (`#/upload`) work on static hosting without
 * server rewrites and keep the browser back button working.
 */
export interface HashLocation {
  path: string
  params: URLSearchParams
}

function subscribe(onChange: () => void) {
  window.addEventListener('hashchange', onChange)
  return () => window.removeEventListener('hashchange', onChange)
}

function getHash() {
  return window.location.hash
}

export function parseHash(hash: string): HashLocation {
  const raw = hash.replace(/^#/, '')
  const queryStart = raw.indexOf('?')
  const path = queryStart === -1 ? raw : raw.slice(0, queryStart)
  const query = queryStart === -1 ? '' : raw.slice(queryStart + 1)
  return { path: path || '/', params: new URLSearchParams(query) }
}

export function useHashLocation(): HashLocation {
  const hash = useSyncExternalStore(subscribe, getHash, () => '')
  return useMemo(() => parseHash(hash), [hash])
}

export function toHref(path: string, params?: Record<string, string>): string {
  const query = params ? new URLSearchParams(params).toString() : ''
  return `#${path}${query ? `?${query}` : ''}`
}
