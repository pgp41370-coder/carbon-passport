import { Icon } from '../components/Icon'
import { WORKFLOW_STEP_COUNT, pageHref } from '../lib/routes'
import type { PageRoute } from '../types/navigation'

interface ComingNextPageProps {
  page: PageRoute
}

/** Honest placeholder for modules that are not built yet. */
export function ComingNextPage({ page }: ComingNextPageProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-line bg-surface px-6 py-10 text-center shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:px-12 sm:py-16">
        <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-forest-50 text-forest-700">
          <Icon name={page.id} className="size-7" />
        </span>
        {page.step && (
          <p className="mt-6 text-xs font-semibold tracking-wide text-forest-600 uppercase">
            Step {page.step.number} of {WORKFLOW_STEP_COUNT} · {page.step.label}
          </p>
        )}
        <h1 id="page-title" tabIndex={-1} className="mt-2 text-2xl font-semibold tracking-tight text-forest-950 outline-none sm:text-3xl">
          {page.label}
        </h1>
        <p className="mx-auto mt-3 max-w-lg text-ink-600">{page.summary}</p>

        <p className="mx-auto mt-6 inline-flex items-start gap-2 rounded-xl bg-canvas px-3 py-2 text-left text-xs font-medium text-ink-700 ring-1 ring-line">
          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-status-review" aria-hidden="true" />
          Coming next: not built yet. Nothing is uploaded, parsed or calculated on this screen.
        </p>

        <div className="mt-8">
          <a
            href={pageHref('dashboard')}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-forest-700 ring-1 ring-forest-200 transition-colors hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
          >
            <Icon name="arrow-left" className="size-4" />
            Back to Dashboard
          </a>
        </div>
      </section>
    </div>
  )
}
