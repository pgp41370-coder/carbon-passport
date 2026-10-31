import { PAGES, pageHref } from '../../lib/routes'
import type { PageId } from '../../types/navigation'
import { Icon } from '../Icon'

interface SidebarProps {
  currentPageId: PageId
  /** Called after a nav link is activated, e.g. to close the mobile drawer. */
  onNavigate?: () => void
}

export function Sidebar({ currentPageId, onNavigate }: SidebarProps) {
  return (
    <div className="flex h-full flex-col bg-forest-950 text-forest-100">
      <div className="flex items-center gap-3 px-5 pt-6 pb-8">
        <span className="grid size-9 place-items-center rounded-xl bg-forest-700 text-forest-200 ring-1 ring-white/10">
          <Icon name="passport" className="size-5" />
        </span>
        <div>
          <p className="text-[15px] font-semibold tracking-tight text-white">Carbon Passport</p>
          <p className="text-xs text-forest-300">MSME carbon evidence</p>
        </div>
      </div>

      <nav aria-label="Main" className="flex-1 px-3">
        <ul className="space-y-1">
          {PAGES.map((page) => {
            const isCurrent = page.id === currentPageId
            return (
              <li key={page.id}>
                <a
                  href={pageHref(page.id)}
                  onClick={onNavigate}
                  aria-current={isCurrent ? 'page' : undefined}
                  className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-300 ${
                    isCurrent
                      ? 'bg-forest-800 text-white shadow-[inset_2px_0_0_var(--color-moss-400)]'
                      : 'text-forest-200 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon
                    name={page.id}
                    className={`size-[18px] shrink-0 ${isCurrent ? 'text-moss-400' : 'text-forest-300 group-hover:text-forest-100'}`}
                  />
                  <span className="flex-1">{page.label}</span>
                  {page.step && (
                    <span
                      className={`grid size-5 place-items-center rounded-full text-xs tabular-nums ${
                        isCurrent ? 'bg-moss-400 text-forest-950' : 'bg-white/5 text-forest-300'
                      }`}
                    >
                      <span className="sr-only">Step </span>
                      {page.step.number}
                    </span>
                  )}
                </a>
              </li>
            )
          })}
        </ul>
      </nav>

      <div className="m-3 rounded-xl bg-white/5 p-4 text-xs leading-relaxed text-forest-200">
        <p className="flex items-center gap-2 font-medium text-white">
          <Icon name="lock" className="size-4 text-moss-400" />
          Browser-only by design
        </p>
        <p className="mt-1.5">
          Documents will be processed on this device. Nothing is uploaded to a server.
        </p>
      </div>
    </div>
  )
}
