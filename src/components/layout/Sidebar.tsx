import { ROLES, isRoleId, switchRole, useRole } from '../../features/roles/roles'
import { getPage, pageHref } from '../../lib/routes'
import type { PageId, PageRoute } from '../../types/navigation'
import { Icon } from '../Icon'

interface NavListProps {
  pages: readonly PageRoute[]
  currentPageId: PageId
  onNavigate?: () => void
  /** Main screens get a larger row; "More" screens stay quiet. */
  large?: boolean
}

function NavList({ pages, currentPageId, onNavigate, large = false }: NavListProps) {
  return (
    <ul className="space-y-1">
      {pages.map((page) => {
        const isCurrent = page.id === currentPageId
        return (
          <li key={page.id}>
            <a
              href={pageHref(page.id)}
              onClick={onNavigate}
              aria-current={isCurrent ? 'page' : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-300 ${
                large ? 'min-h-11 text-[15px]' : 'min-h-10 text-sm'
              } ${
                isCurrent
                  ? 'bg-forest-800 text-white shadow-[inset_2px_0_0_var(--color-moss-400)]'
                  : large
                    ? 'text-forest-100 hover:bg-white/5 hover:text-white'
                    : 'text-forest-300 hover:bg-white/5 hover:text-white'
              }`}
            >
              <Icon
                name={page.id}
                className={`size-[18px] shrink-0 ${isCurrent ? 'text-moss-400' : 'text-forest-300 group-hover:text-forest-100'}`}
              />
              {page.label}
            </a>
          </li>
        )
      })}
    </ul>
  )
}

interface SidebarProps {
  currentPageId: PageId
  /** Called after a nav link is activated, e.g. to close the mobile drawer. */
  onNavigate?: () => void
}

export function Sidebar({ currentPageId, onNavigate }: SidebarProps) {
  const role = useRole()
  return (
    <div className="flex h-full flex-col bg-forest-950 text-forest-100">
      <div className="flex items-center gap-3 px-5 pt-6 pb-6">
        <span className="grid size-9 place-items-center rounded-xl bg-forest-700 text-forest-200 ring-1 ring-white/10">
          <Icon name="passport" className="size-5" />
        </span>
        <div>
          <p className="text-[15px] font-semibold tracking-tight text-white">Carbon Passport</p>
          <p className="text-xs text-forest-300">MSME carbon evidence</p>
        </div>
      </div>

      <div className="mx-3 mb-6">
        <label htmlFor="role" className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-medium text-forest-300">
          <Icon name="views" className="size-3.5" />
          Viewing as
        </label>
        <select
          id="role"
          value={role.id}
          onChange={(event) => {
            const next = event.target.value
            if (!isRoleId(next)) return
            switchRole(next)
            onNavigate?.()
          }}
          className="min-h-11 w-full cursor-pointer rounded-xl bg-white/10 px-3 text-sm font-semibold text-white ring-1 ring-white/15 transition-colors hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-400"
        >
          {ROLES.map((r) => (
            <option key={r.id} value={r.id} className="text-ink-900">
              {r.label} · {r.who}
            </option>
          ))}
        </select>
      </div>

      <nav aria-label="Main" className="min-h-0 flex-1 overflow-y-auto px-3">
        <NavList pages={role.main.map(getPage)} currentPageId={currentPageId} onNavigate={onNavigate} large />
        <p className="mt-8 mb-2 px-3 text-xs font-medium text-forest-300">More</p>
        <NavList pages={role.more.map(getPage)} currentPageId={currentPageId} onNavigate={onNavigate} />
      </nav>

      <p className="m-3 flex items-center gap-2 rounded-xl bg-white/5 p-3 text-xs text-forest-200">
        <Icon name="lock" className="size-4 shrink-0 text-moss-400" />
        Your documents stay on this device.
      </p>
    </div>
  )
}
