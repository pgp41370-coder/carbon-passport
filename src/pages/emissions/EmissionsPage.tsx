import { useState } from 'react'
import { EmissionsPreview } from '../../features/passport/EmissionsPreview'
import { usePassport } from '../../features/passport/usePassport'
import { SourceInspector } from '../../features/traceability/SourceInspector'
import { pageHref } from '../../lib/routes'
import type { SourceRef } from '../../types/extraction'

/**
 * Kept on its own screen so the passport itself never shows a carbon number:
 * this is arithmetic on one bill, not the batch's footprint.
 */
export function EmissionsPage() {
  const { loadState, passport, resultsById } = usePassport()
  const [inspect, setInspect] = useState<SourceRef | null>(null)

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight text-forest-950 outline-none sm:text-3xl">
          Emissions preview
        </h1>
        <p className="mt-2 text-ink-600">
          What the papers already allow you to work out, and what they don’t. This is not the batch’s carbon footprint.
        </p>
      </header>

      {loadState.status === 'loading' && <p className="text-sm text-ink-600">Loading…</p>}
      {loadState.status === 'unavailable' && (
        <p role="alert" className="rounded-2xl border border-status-missing/30 bg-status-missing/[0.06] p-4 text-sm">
          {loadState.message}
        </p>
      )}
      {loadState.status === 'ready' && !passport && (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="font-semibold text-ink-900">No batch yet</p>
          <p className="mt-1 text-sm text-ink-600">Add and read the documents for one batch first.</p>
          <a href={pageHref('dashboard')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-700 px-4 text-sm font-semibold text-white hover:bg-forest-800">
            Go to Home
          </a>
        </div>
      )}

      {passport && <EmissionsPreview passport={passport} onInspect={setInspect} />}

      <SourceInspector source={inspect} result={inspect ? resultsById[inspect.documentId] : undefined} onClose={() => setInspect(null)} />
    </div>
  )
}
