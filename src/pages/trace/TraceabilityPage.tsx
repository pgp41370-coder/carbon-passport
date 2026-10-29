import { useState } from 'react'
import { Card } from '../../components/Card'
import { Icon } from '../../components/Icon'
import { EvidenceList } from '../../features/traceability/EvidenceList'
import { HandoffTable } from '../../features/traceability/HandoffTable'
import { LinkRecordDialog } from '../../features/traceability/LinkRecordDialog'
import { SourceInspector } from '../../features/traceability/SourceInspector'
import { TraceChain } from '../../features/traceability/TraceChain'
import { IllustrativeTag, TraceStatusChip } from '../../features/traceability/TraceStatusChip'
import { TRACE_STATUS } from '../../features/traceability/traceStatus'
import { useTraceability } from '../../features/traceability/useTraceability'
import { getPage, pageHref, WORKFLOW_STEP_COUNT } from '../../lib/routes'
import type { SourceRef } from '../../types/extraction'
import type { LinkId, TraceLink, TraceStatus } from '../../types/traceability'

const page = getPage('traceability')

export function TraceabilityPage() {
  const t = useTraceability()
  const [inspect, setInspect] = useState<SourceRef | null>(null)
  const [editing, setEditing] = useState<TraceLink | null>(null)
  const [highlighted, setHighlighted] = useState<LinkId | null>(null)
  const trace = t.trace

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  const selectLink = (id: LinkId) => {
    setHighlighted(id)
    scrollTo(window.matchMedia('(min-width: 1280px)').matches ? `handoff-${id}` : `handoff-card-${id}`)
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
          Which links from steel mill to finished batch are backed by a document, which need review, and which are missing.
          Nothing here is independently verified.
        </p>
      </header>

      {t.loadState.status === 'loading' && <p className="text-sm text-ink-500">Loading processed documents…</p>}
      {t.loadState.status === 'unavailable' && (
        <p role="alert" className="rounded-2xl border border-status-missing/30 bg-status-missing/[0.06] p-4 text-sm">
          {t.loadState.message}
        </p>
      )}

      {t.loadState.status === 'ready' && !trace && (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="font-semibold text-ink-900">{t.documents.length ? 'No batch ID found in processed documents' : 'No documents yet'}</p>
          <p className="mt-1 text-sm text-ink-500">
            {t.documents.length
              ? 'Process the documents in Extraction & Validation first; the trace is built from their extracted values.'
              : 'Upload documents or load the synthetic sample pack, then process them.'}
          </p>
          <a
            href={pageHref(t.documents.length ? 'validate' : 'upload')}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-800"
          >
            {t.documents.length ? 'Go to Extraction & Validation' : 'Go to Document Upload'}
          </a>
        </div>
      )}

      {trace && (
        <>
          <section aria-label="Batch" className="flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-surface p-4">
            <span className="text-sm text-ink-600">Batch</span>
            {t.batchIds.length > 1 ? (
              <select
                value={trace.batchId}
                onChange={(e) => t.setBatchId(e.target.value)}
                className="rounded-lg border border-line px-2 py-1 font-mono text-sm"
                aria-label="Batch"
              >
                {t.batchIds.map((id) => (
                  <option key={id}>{id}</option>
                ))}
              </select>
            ) : (
              <span className="font-mono text-sm font-semibold text-ink-900">{trace.batchId}</span>
            )}
            {trace.stages.some((s) => s.illustrative) && <IllustrativeTag />}
            {trace.unprocessed.length > 0 && (
              <a href={pageHref('validate')} className="text-xs font-semibold text-status-review-ink underline">
                {trace.unprocessed.length} document{trace.unprocessed.length === 1 ? ' is' : 's are'} not processed and not part of this trace
              </a>
            )}
            {trace.otherBatchDocuments.length > 0 && (
              <span className="text-xs text-ink-500">Excluded (other batch): {trace.otherBatchDocuments.join(', ')}</span>
            )}
          </section>

          <Card title="Status legend">
            <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {(Object.keys(TRACE_STATUS) as TraceStatus[]).map((status) => (
                <li key={status} className="text-xs text-ink-600">
                  <TraceStatusChip status={status} size="sm" />
                  <p className="mt-1">{TRACE_STATUS[status].meaning}</p>
                </li>
              ))}
              <li className="text-xs text-ink-600">
                <IllustrativeTag />
                <p className="mt-1">Every supporting document is from the synthetic sample pack.</p>
              </li>
            </ul>
          </Card>

          <TraceChain
            stages={trace.stages}
            links={trace.links}
            onSelectStage={(id) => scrollTo(`stage-${id}`)}
            onSelectLink={selectLink}
          />

          <Card title="What is still missing?">
            {trace.gaps.length === 0 ? (
              <p className="text-sm text-ink-600">No gaps found in the processed documents.</p>
            ) : (
              <ul className="space-y-2">
                {trace.gaps.map((gap) => (
                  <li key={gap.id} className="flex items-start gap-2 text-sm text-ink-700">
                    <TraceStatusChip status={gap.status} size="sm" />
                    <span>{gap.text}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink-500">
              Traceability does not calculate emissions. Missing activity data is not treated as zero.
            </p>
          </Card>

          <Card title="Hand-offs">
            <HandoffTable
              links={trace.links}
              records={trace.records}
              highlighted={highlighted}
              onInspect={setInspect}
              onAddRecord={setEditing}
              onDeleteRecord={(id) => void t.deleteRecord(id)}
            />
          </Card>

          <section aria-labelledby="stages-heading" className="space-y-3">
            <h2 id="stages-heading" className="text-base font-semibold text-ink-900">
              Stage details
            </h2>
            {trace.stages.map((stage) => (
              <article key={stage.id} id={`stage-${stage.id}`} className="rounded-2xl border border-line bg-surface p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid size-7 place-items-center rounded-full bg-forest-950 text-xs font-semibold text-moss-400">{stage.order}</span>
                  <h3 className="font-semibold text-ink-900">{stage.title}</h3>
                  <TraceStatusChip status={stage.status} size="sm" />
                  {stage.illustrative && <IllustrativeTag />}
                </div>
                <p className="mt-1 text-xs text-ink-500">{stage.role}</p>
                <ul className="mt-3 divide-y divide-line rounded-xl border border-line">
                  {stage.requirements.map((req) => (
                    <li key={req.id} className="grid gap-2 p-3 sm:grid-cols-[14rem_minmax(0,1fr)]">
                      <div>
                        <p className="text-sm font-medium text-ink-900">{req.label}</p>
                        <span className="mt-1 inline-block">
                          <TraceStatusChip status={req.status} size="sm" />
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        <p className="text-sm text-ink-700">{req.detail}</p>
                        <EvidenceList evidence={req.evidence} onInspect={setInspect} empty="No supporting document." />
                      </div>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </section>

          <p className="flex items-center gap-2 text-xs text-ink-500">
            <Icon name="info" className="size-4" />
            This view is rebuilt from current extraction results each time it opens. Removing a document removes its links.
          </p>
        </>
      )}

      <SourceInspector source={inspect} result={inspect ? t.resultsById[inspect.documentId] : undefined} onClose={() => setInspect(null)} />
      <LinkRecordDialog
        link={editing}
        existing={editing ? trace?.records[editing.id]?.record : undefined}
        onCancel={() => setEditing(null)}
        onSave={t.saveRecord}
      />
    </div>
  )
}
