import { pageHref } from '../lib/routes'
import type { PageId, WorkflowMode } from '../types/navigation'
import { Icon } from './Icon'

interface NextStepProps {
  to: PageId
  title: string
  body: string
  mode?: WorkflowMode | null
}

/** One clear "what to do next" action at the end of each workflow screen. */
export function NextStep({ to, title, body, mode }: NextStepProps) {
  return (
    <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-forest-200 bg-forest-50 p-5 sm:flex-row sm:items-center">
      <div>
        <p className="text-sm font-semibold text-forest-950">{title}</p>
        <p className="mt-0.5 text-sm text-ink-600">{body}</p>
      </div>
      <a
        href={pageHref(to, mode ?? undefined)}
        className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
      >
        Continue
        <Icon name="arrow-right" className="size-4" />
      </a>
    </div>
  )
}
