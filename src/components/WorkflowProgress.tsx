import { WORKFLOW_PAGES } from '../lib/routes'
import type { PageId } from '../types/navigation'

interface WorkflowProgressProps {
  /** Steps the user has finished. Empty until the workflow modules exist. */
  completed: readonly PageId[]
  /** The step to do next, highlighted as current. */
  current: PageId | null
}

/** Upload → Validate → Trace → Passport → Export, shown as a stepper. */
export function WorkflowProgress({ completed, current }: WorkflowProgressProps) {
  return (
    <ol className="grid grid-cols-5">
      {WORKFLOW_PAGES.map((page, index) => {
        const isDone = completed.includes(page.id)
        const isCurrent = page.id === current
        const isLast = index === WORKFLOW_PAGES.length - 1
        const status = isDone ? 'Done' : isCurrent ? 'Next' : 'Not started'

        return (
          <li
            key={page.id}
            aria-current={isCurrent ? 'step' : undefined}
            className="relative flex flex-col items-center text-center"
          >
            {!isLast && (
              <span
                aria-hidden="true"
                className={`absolute top-4 left-1/2 h-0.5 w-full ${isDone ? 'bg-forest-500' : 'bg-line'}`}
              />
            )}
            <span
              aria-hidden="true"
              className={`relative grid size-8 place-items-center rounded-full text-sm font-semibold tabular-nums ring-4 ring-surface ${
                isDone
                  ? 'bg-forest-600 text-white'
                  : isCurrent
                    ? 'bg-forest-950 text-moss-400'
                    : 'border border-line bg-surface text-ink-500'
              }`}
            >
              {page.step?.number}
            </span>
            <span className={`mt-2 text-xs font-semibold sm:text-sm ${isCurrent ? 'text-forest-950' : 'text-ink-700'}`}>
              {page.step?.label}
            </span>
            <span className={`text-[11px] sm:text-xs ${isCurrent ? 'font-medium text-forest-600' : 'text-ink-500'}`}>
              {status}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
