import { useSyncExternalStore } from 'react'
import type { PageId } from '../../types/navigation'

/**
 * Who is using the app. Every screen and the sidebar follow this one choice.
 * In the prototype every role runs on the owner's device, so a role is a
 * preview of what that person would see; it is kept in this browser only.
 */

export type RoleId = 'owner' | 'staff' | 'supplier' | 'job_worker' | 'consultant' | 'buyer'

export interface Role {
  id: RoleId
  label: string
  who: string
  /** Sidebar: the screens this person uses, in order. Home is always first. */
  main: PageId[]
  more: PageId[]
}

export const ROLES: readonly Role[] = [
  {
    id: 'owner',
    label: 'Owner',
    who: 'MSME owner',
    main: ['dashboard', 'fix', 'passport', 'review'],
    more: ['upload', 'validate', 'traceability', 'map', 'emissions', 'export', 'roadmap'],
  },
  {
    id: 'staff',
    label: 'Office staff',
    who: 'Accounts or stores',
    main: ['dashboard', 'upload', 'validate', 'fix'],
    more: ['traceability', 'passport', 'roadmap'],
  },
  { id: 'supplier', label: 'Steel supplier', who: 'Mill or stockist', main: ['dashboard', 'upload'], more: ['roadmap'] },
  { id: 'job_worker', label: 'Job-worker', who: 'Heat-treatment unit', main: ['dashboard', 'upload'], more: ['roadmap'] },
  {
    id: 'consultant',
    label: 'Consultant',
    who: 'Reviewer or auditor',
    main: ['dashboard', 'review', 'map', 'validate'],
    more: ['traceability', 'passport', 'emissions', 'export', 'roadmap'],
  },
  { id: 'buyer', label: 'EU buyer', who: 'Importer', main: ['dashboard', 'passport', 'review', 'map'], more: ['export', 'roadmap'] },
]

const KEY = 'carbon-passport-role'
const EVENT = 'carbon-passport-role'

export const isRoleId = (value: unknown): value is RoleId => ROLES.some((r) => r.id === value)

function read(): RoleId {
  try {
    const value = window.localStorage.getItem(KEY)
    return isRoleId(value) ? value : 'owner'
  } catch {
    return 'owner'
  }
}

export function setRole(role: RoleId) {
  try {
    window.localStorage.setItem(KEY, role)
  } catch {
    // Storage blocked (private window): the choice still applies until reload.
    current = role
  }
  window.dispatchEvent(new Event(EVENT))
}

let current: RoleId | null = null

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

const snapshot = () => current ?? read()

export function useRole(): Role {
  const id = useSyncExternalStore(subscribe, snapshot, () => 'owner' as RoleId)
  return ROLES.find((r) => r.id === id)!
}

/** A screen this role does not use is still reachable, but the app says so instead of showing it. */
export const roleUses = (role: Role, page: PageId) => page === 'dashboard' || role.main.includes(page) || role.more.includes(page)

/** Only the MSME side corrects documents; a buyer or consultant can only point at what is wrong. */
export const roleCanFix = (role: Role) => role.id === 'owner' || role.id === 'staff'

/** Switches role and opens its Home, since every role has its own. */
export function switchRole(role: RoleId) {
  setRole(role)
  window.location.hash = '#/'
}
