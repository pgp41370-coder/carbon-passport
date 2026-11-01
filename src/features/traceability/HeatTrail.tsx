import { Fragment } from 'react'
import { Icon } from '../../components/Icon'
import type { DocumentKind, ExtractionResult, SourceRef } from '../../types/extraction'
import type { StageId, TraceView } from '../../types/traceability'

/**
 * The supplier network at a glance: the heat number each party's paper gives,
 * from mill to job-worker. A value that differs from the mill certificate is
 * shown as a break in the trail; the app never decides which paper is right.
 */

// Each party is shown by the paper it issues, so a document appears in exactly one place.
const NODES: { id: StageId; title: string; who: string; kind: DocumentKind }[] = [
  { id: 'mill', title: 'Steel mill', who: 'Mill test certificate', kind: 'mill_test_certificate' },
  { id: 'stockist', title: 'Steel supplier / stockist', who: 'Steel invoice', kind: 'purchase_invoice' },
  { id: 'factory', title: 'MSME factory', who: 'Production log', kind: 'production_log' },
  { id: 'job_worker', title: 'Job-worker', who: 'Job-work challan', kind: 'job_work_challan' },
]

interface Heat {
  value: string
  normalized: string
  source?: SourceRef
}

function heatsFor(trace: TraceView, resultsById: Record<string, ExtractionResult>, kind: DocumentKind): Heat[] {
  const docs = [...new Map(trace.stages.flatMap((s) => s.documents).map((d) => [d.documentId, d])).values()].filter((d) => d.kind === kind)
  return docs.flatMap((d) => {
    const f = resultsById[d.documentId]?.fields.find((x) => x.key === 'heatNumber' && x.status !== 'not_detected' && x.value)
    return f?.value ? [{ value: f.value, normalized: f.normalized ?? f.value, source: f.source }] : []
  })
}

interface HeatTrailProps {
  trace: TraceView
  resultsById: Record<string, ExtractionResult>
  onInspect: (source: SourceRef) => void
}

export function HeatTrail({ trace, resultsById, onInspect }: HeatTrailProps) {
  const nodes = NODES.map((n) => ({ ...n, heats: heatsFor(trace, resultsById, n.kind) }))
  const reference = nodes.find((n) => n.heats.length)?.heats[0]
  const state = (heats: Heat[]) => (!heats.length ? 'none' : heats.every((h) => h.normalized === reference?.normalized) ? 'match' : 'break')
  const breaks = nodes.filter((n) => state(n.heats) === 'break')
  const missing = nodes.filter((n) => state(n.heats) === 'none')

  return (
    <section aria-labelledby="heat-trail-title" className="rounded-2xl border border-line bg-forest-950 p-5 text-white sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="heat-trail-title" className="text-base font-semibold">
          Supplier network · linked by heat number
        </h2>
        <p className="text-xs text-forest-200">From each party’s own paper</p>
      </div>
      <ol className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-stretch">
        {nodes.map((n, i) => {
          const s = state(n.heats)
          return (
            <Fragment key={n.id}>
              <li
                className={`flex flex-1 flex-col gap-2 rounded-xl p-4 ring-1 ${
                  s === 'break' ? 'bg-status-missing/15 ring-status-missing/60' : s === 'match' ? 'bg-white/5 ring-moss-400/40' : 'bg-white/5 ring-white/15'
                }`}
              >
                <p className="text-xs font-semibold text-forest-200">
                  {i + 1} · {n.who}
                </p>
                <p className="text-sm font-semibold">{n.title}</p>
                {n.heats.length ? (
                  n.heats.map((h, k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => h.source && onInspect(h.source)}
                      className="inline-flex min-h-9 cursor-pointer items-center gap-2 self-start rounded-lg bg-white/10 px-2.5 py-1 font-mono text-base font-semibold whitespace-nowrap hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-moss-400"
                    >
                      {h.value}
                      <Icon name="file-text" className="size-4 text-forest-200" />
                      <span className="sr-only">Show source</span>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-forest-200">No heat number on this paper</p>
                )}
                <p className={`mt-auto text-xs font-semibold ${s === 'break' ? 'text-red-200' : s === 'match' ? 'text-moss-400' : 'text-forest-200'}`}>
                  {s === 'break' ? 'Doesn’t match the mill certificate' : s === 'match' ? 'Matches' : 'Trail not proven here'}
                </p>
              </li>
              {i < nodes.length - 1 && (
                <li aria-hidden="true" className="hidden items-center text-forest-300 xl:flex">
                  <Icon name="arrow-right" className="size-5" />
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
      <p className="mt-4 text-sm text-forest-100">
        {reference && breaks.length === 0 && missing.length === 0
          ? `Linked end to end by heat no. ${reference.value}.`
          : reference
            ? `Trail from heat no. ${reference.value}: ${[
                breaks.length ? `breaks at ${breaks.map((b) => b.title.toLowerCase()).join(', ')}` : '',
                missing.length ? `not proven at ${missing.map((m) => m.title.toLowerCase()).join(', ')}` : '',
              ]
                .filter(Boolean)
                .join('; ')}.`
            : 'No heat number has been read yet.'}
      </p>
    </section>
  )
}
