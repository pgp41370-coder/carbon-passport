import { useState } from 'react'
import { Icon } from '../../components/Icon'
import { NextStep } from '../../components/NextStep'
import { WorkflowModeBanner } from '../../components/WorkflowModeBanner'
import { getDocumentFile } from '../../features/documents/documentStore'
import { ValidationPanel } from '../../features/evidence/ValidationPanel'
import { DocumentResultCard } from '../../features/extraction/DocumentResultCard'
import { needsProcessing, useExtraction } from '../../features/extraction/useExtraction'
import { getPage, pageHref, WORKFLOW_STEP_COUNT } from '../../lib/routes'
import type { StoredDocument } from '../../types/document'
import type { SourceRef } from '../../types/extraction'
import type { WorkflowMode } from '../../types/navigation'

const page = getPage('validate')

interface ExtractionValidationPageProps {
  mode: WorkflowMode | null
}

export function ExtractionValidationPage({ mode }: ExtractionValidationPageProps) {
  const x = useExtraction()
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [inspect, setInspect] = useState<SourceRef | null>(null)
  const [queue, setQueue] = useState<Set<string>>(new Set())
  const [openError, setOpenError] = useState<string | null>(null)

  const isReady = x.loadState.status === 'ready'
  const busy = x.run !== null
  const pending = x.documents.filter((doc) => needsProcessing(x.results[doc.id]))
  const processed = x.documents.filter((doc) => x.results[doc.id])
  const failed = processed.filter((doc) => x.results[doc.id]?.status === 'failed')
  const samplesOnly = processed.length > 0 && processed.every((doc) => doc.origin === 'sample')

  const start = (docs: StoredDocument[]) => {
    setQueue(new Set(docs.map((doc) => doc.id)))
    void x.process(docs).finally(() => setQueue(new Set()))
  }

  const showSource = (ref: SourceRef) => {
    setExpanded((current) => new Set(current).add(ref.documentId))
    setInspect({ ...ref })
  }

  const openOriginal = async (doc: StoredDocument) => {
    setOpenError(null)
    const blob = await getDocumentFile(doc.id)
    if (!blob) {
      setOpenError(`The stored file for ${doc.fileName} is missing.`)
      return
    }
    // Opened in a new tab from a local object URL; nothing is uploaded.
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold tracking-wide text-forest-600 uppercase">
          Step {page.step?.number} of {WORKFLOW_STEP_COUNT} · {page.step?.label}
        </p>
        <h1 id="page-title" tabIndex={-1} className="mt-1 text-2xl font-semibold tracking-tight text-forest-950 outline-none sm:text-3xl">
          {page.label}
        </h1>
        <p className="mt-2 max-w-2xl text-ink-600">
          Read each stored document in this browser, see what was extracted and where it came from, and check the evidence
          for gaps and conflicts.
        </p>
      </header>

      {mode && (
        <WorkflowModeBanner mode={mode}>
          {mode === 'demo'
            ? 'The sample documents are read automatically. Open the heat-number problem and look at both source values.'
            : 'Your documents are read automatically after upload. Check each problem against its source before moving on.'}
        </WorkflowModeBanner>
      )}

      <div className="flex gap-3 rounded-2xl border border-line bg-surface p-4 text-sm text-ink-700 sm:p-5">
        <Icon name="lock" className="mt-0.5 size-5 shrink-0 text-forest-700" />
        <p>
          Documents are read on this device. To read scanned images, the app downloads English language data once from{' '}
          <span className="font-medium">cdn.jsdelivr.net</span> and caches it; document contents are never sent there or anywhere
          else.
        </p>
      </div>

      {x.loadState.status === 'loading' && (
        <p className="text-sm text-ink-500" aria-busy="true">
          Loading stored documents and results…
        </p>
      )}
      {x.loadState.status === 'unavailable' && (
        <div role="alert" className="rounded-2xl border border-status-missing/30 bg-status-missing/[0.06] p-4 text-sm">
          <p className="font-semibold text-ink-900">Browser storage is unavailable</p>
          <p className="mt-1 text-ink-700">{x.loadState.message}</p>
        </div>
      )}

      {isReady && x.documents.length === 0 && (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="font-semibold text-ink-900">No documents to process</p>
          <p className="mt-1 text-sm text-ink-500">Upload documents or load the synthetic sample pack first.</p>
          <a
            href={pageHref('upload', mode ?? undefined)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-800"
          >
            <Icon name="arrow-left" className="size-4" />
            Go to Upload documents
          </a>
        </div>
      )}

      {isReady && x.documents.length > 0 && (
        <>
          <section aria-label="Processing" className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <dl className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                {[
                  ['Documents', x.documents.length],
                  ['Read', processed.length],
                  ['Not read yet', pending.length],
                  ['Could not be read', failed.length],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-ink-500">{label}</dt>
                    <dd className="text-lg font-semibold text-ink-900 tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || pending.length === 0}
                  onClick={() => start(pending)}
                  className="inline-flex items-center gap-2 rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Icon name={busy ? 'loader' : 'play'} className={`size-4 ${busy ? 'animate-spin' : ''}`} />
                  {busy ? 'Reading…' : pending.length ? `Read ${pending.length} document${pending.length === 1 ? '' : 's'}` : 'All read'}
                </button>
                <button
                  type="button"
                  disabled={busy || processed.length === 0}
                  onClick={() => start(x.documents)}
                  className="rounded-xl px-4 py-2.5 text-sm font-semibold text-forest-700 ring-1 ring-forest-200 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-forest-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Read all again
                </button>
              </div>
            </div>
            {x.run && (
              <div className="mt-4" aria-live="polite">
                <div className="flex justify-between text-xs text-ink-600">
                  <span className="min-w-0 truncate">
                    {x.run.completed + 1} of {x.run.total}: {x.run.current.fileName}
                  </span>
                  <span className="shrink-0 pl-2">{x.run.current.message}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-forest-50">
                  <div
                    className="h-full rounded-full bg-forest-600 transition-[width]"
                    style={{ width: `${Math.round(((x.run.completed + (x.run.current.progress ?? 0.3)) / x.run.total) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {x.runError && (
              <p role="alert" className="mt-3 text-sm text-status-missing">
                Reading stopped: {x.runError}{' '}
                <button type="button" onClick={x.dismissRunError} className="font-semibold underline">
                  Dismiss
                </button>
              </p>
            )}
            {samplesOnly && (
              <p className="mt-3 text-xs text-status-review-ink">
                All results below come from the synthetic sample pack (fictional documents), not from your own uploads.
              </p>
            )}
          </section>

          <ValidationPanel
            checks={x.checks}
            issues={x.issues}
            reviews={x.reviews}
            hasResults={processed.length > 0}
            onInspect={showSource}
            onSaveReview={x.recordReview}
            onClearReview={x.clearReview}
          />

          <section aria-labelledby="documents-heading" className="space-y-3">
            <h2 id="documents-heading" className="text-base font-semibold text-ink-900">
              Documents
            </h2>
            {openError && (
              <p role="alert" className="text-sm text-status-missing">
                {openError}
              </p>
            )}
            {x.documents.map((doc) => (
              <DocumentResultCard
                key={doc.id}
                document={doc}
                result={x.results[doc.id]}
                run={x.run}
                queued={queue.has(doc.id)}
                expanded={expanded.has(doc.id)}
                highlight={inspect?.documentId === doc.id ? inspect : null}
                disabled={busy}
                onToggle={() =>
                  setExpanded((current) => {
                    const next = new Set(current)
                    if (!next.delete(doc.id)) next.add(doc.id)
                    return next
                  })
                }
                onProcess={() => start([doc])}
                onOpenOriginal={() => void openOriginal(doc)}
                onInspect={showSource}
              />
            ))}
          </section>

          {processed.length > 0 && !busy && (
            <NextStep
              to="traceability"
              mode={mode}
              title="Next: Supply chain"
              body="See how the batch moved from steel supplier to job-worker and back, and which hand-offs are proven."
            />
          )}
        </>
      )}
    </div>
  )
}
