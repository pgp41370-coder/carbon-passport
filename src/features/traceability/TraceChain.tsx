import { Fragment } from 'react'
import type { TraceLink, TraceStage } from '../../types/traceability'
import { IllustrativeTag, TraceStatusChip } from './TraceStatusChip'
import { TRACE_STATUS } from './traceStatus'

interface TraceChainProps {
  stages: readonly TraceStage[]
  links: readonly TraceLink[]
  onSelectStage: (id: TraceStage['id']) => void
  onSelectLink: (id: TraceLink['id']) => void
}

/** Five stages in supply order, joined by hand-offs coloured by their evidence status. */
export function TraceChain({ stages, links, onSelectStage, onSelectLink }: TraceChainProps) {
  return (
    <ol aria-label="Supply chain, in order" className="flex flex-col xl:flex-row xl:items-stretch">
      {stages.map((stage, i) => {
        const link = links.find((l) => l.from === stage.id)
        return (
          <Fragment key={stage.id}>
            <li className="xl:min-w-0 xl:flex-1">
              <button
                type="button"
                onClick={() => onSelectStage(stage.id)}
                className="group flex h-full w-full flex-col rounded-2xl border border-line bg-surface px-4 py-3 text-left shadow-[0_1px_2px_rgb(21_26_24/0.04)] transition-colors hover:border-forest-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500 xl:py-4"
              >
                {/* Compact row when stacked, so all five stages fit on one screen. */}
                <span className="flex w-full items-center gap-3 xl:hidden">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-forest-950 text-xs font-semibold text-moss-400 tabular-nums">
                    {stage.order}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-ink-900">{stage.title}</span>
                    <span className="block text-xs text-ink-600">{stage.headline}</span>
                  </span>
                  {stage.illustrative && (
                    <span className="hidden sm:inline-flex">
                      <IllustrativeTag />
                    </span>
                  )}
                  <TraceStatusChip status={stage.status} size="sm" />
                </span>
                <span className="hidden h-full flex-col xl:flex">
                <span className="flex items-center gap-2">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-forest-950 text-xs font-semibold text-moss-400 tabular-nums">
                    {stage.order}
                  </span>
                  <span className="min-w-0 text-sm leading-tight font-semibold text-ink-900">{stage.title}</span>
                </span>
                <span className="mt-3">
                  <TraceStatusChip status={stage.status} size="sm" />
                </span>
                <span className="mt-2 text-xs font-medium break-words text-ink-700">{stage.headline}</span>
                <span className="mt-1 text-[11px] text-ink-500">{stage.role}</span>
                {stage.illustrative && (
                  <span className="mt-2">
                    <IllustrativeTag />
                  </span>
                )}
                <span className="mt-auto pt-2 text-[11px] font-semibold text-forest-700 group-hover:underline">Details</span>
                </span>
              </button>
            </li>
            {link && i < stages.length - 1 && (
              <li className="flex items-center justify-center py-1 xl:w-10 xl:shrink-0 xl:py-0" aria-label={`Hand-off ${link.title}: ${TRACE_STATUS[link.status].label}`}>
                <button
                  type="button"
                  onClick={() => onSelectLink(link.id)}
                  title={`${link.title}: ${TRACE_STATUS[link.status].label}`}
                  className="group flex flex-row items-center gap-2 xl:flex-col xl:gap-1 focus-visible:outline-2 focus-visible:outline-forest-500"
                >
                  <span aria-hidden="true" className={`h-5 w-1 rounded-full xl:h-1 xl:w-8 ${TRACE_STATUS[link.status].line} ${link.status === 'missing' ? 'opacity-60' : ''}`} />
                  <span
                    aria-hidden="true"
                    className={`grid size-6 place-items-center rounded-full text-[11px] font-bold text-white ${TRACE_STATUS[link.status].line}`}
                  >
                    {link.status === 'supported' ? '✓' : link.status === 'missing' ? '?' : '!'}
                  </span>
                  <span aria-hidden="true" className="text-[11px] font-medium text-ink-500 xl:hidden">
                    Hand-off: {TRACE_STATUS[link.status].label.toLowerCase()}
                  </span>
                  <span className="sr-only">View hand-off details</span>
                </button>
              </li>
            )}
          </Fragment>
        )
      })}
    </ol>
  )
}
