import { setRole, ROLES, type Role } from '../features/roles/roles'
import { pageHref } from '../lib/routes'
import type { PageRoute } from '../types/navigation'
import { Icon } from './Icon'

/** Shown when a link leads to a screen the current role does not use, instead of showing it anyway. */
export function RoleNotice({ role, page }: { role: Role; page: PageRoute }) {
  const owner = ROLES.find((r) => r.id === 'owner')!
  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-line bg-surface p-7 text-center">
      <Icon name="lock" className="mx-auto size-8 text-ink-500" />
      <h1 id="page-title" tabIndex={-1} className="mt-3 text-xl font-semibold text-ink-900 outline-none">
        {page.label} is not part of the {role.label} view
      </h1>
      <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
        <a
          href={pageHref('dashboard')}
          className="inline-flex min-h-11 items-center justify-center rounded-xl bg-forest-700 px-4 text-sm font-semibold text-white hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
        >
          Go to Home
        </a>
        <button
          type="button"
          onClick={() => setRole(owner.id)}
          className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-4 text-sm font-semibold text-forest-800 ring-1 ring-forest-200 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-forest-500"
        >
          Switch to {owner.label}
        </button>
      </div>
    </section>
  )
}
