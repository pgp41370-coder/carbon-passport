import { useState, type ReactNode } from 'react'
import { Card } from '../../components/Card'
import { Icon } from '../../components/Icon'
import { WorkflowProgress } from '../../components/WorkflowProgress'
import { ClaimKindChip } from '../../features/passport/ClaimList'
import { PassportStatusBadges } from '../../features/passport/PassportStatusBadges'
import { usePassport, type WorkspaceSummary } from '../../features/passport/usePassport'
import { WhatWeFound } from '../../features/passport/WhatWeFound'
import { useFixActions } from '../../features/fixes/useFixActions'
import { SourceInspector } from '../../features/traceability/SourceInspector'
import { pageHref } from '../../lib/routes'
import type { SourceRef } from '../../types/extraction'
import type { CarbonPassport } from '../../types/passport'
import type { PageId } from '../../types/navigation'
import { SampleDataDisclaimer } from './SampleDataDisclaimer'
import { useQuickStart, type QuickStartState } from './useQuickStart'

/**
 * The dashboard shows the same derived passport model as Traceability, the
 * Passport and Export, so batch identity, statuses and gaps always agree. It
 * contains no figures of its own.
 */

function workflowState(workspace: WorkspaceSummary, passport: CarbonPassport | null): { completed: PageId[]; current: PageId } {
  if (workspace.total === 0) return { completed: [], current: 'upload' }
  if (workspace.notProcessed > 0 || workspace.outdated > 0 || !passport) return { completed: ['upload'], current: 'validate' }
  // Extraction is done, but traceability stays the current step while gaps remain.
  return { completed: ['upload', 'validate'], current: passport.gaps.length ? 'traceability' : 'passport' }
}

const HOW_IT_WORKS = [
  { title: 'Add documents', body: 'Invoices, certificates, challans, bills and logs for one batch.' },
  { title: 'We read and check them', body: 'In your browser. Nothing is uploaded to a server.' },
  { title: 'Fix what is missing', body: 'Each problem says who to ask and which document to get.' },
]

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl bg-canvas p-3">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold text-ink-900 tabular-nums">{value}</dd>
      {hint && <p className="text-xs text-ink-500">{hint}</p>}
    </div>
  )
}

export function DashboardPage() {
  const { loadState, passport, resultsById, workspace, reload } = usePassport()
  const quick = useQuickStart(reload)
  const fix = useFixActions(reload)
  const [inspect, setInspect] = useState<SourceRef | null>(null)
  const flow = workflowState(workspace, passport)
  const unread = workspace.notProcessed + workspace.outdated
  const claim = (label: string) =>
    passport?.identity.find((c) => c.label.startsWith(label)) ?? passport?.quantities.find((c) => c.label.startsWith(label))

  const glance = passport
    ? [
        claim('Batch ID'),
        claim('Product'),
        claim('Steel heat number'),
        claim('Finished-batch output'),
      ].filter((c): c is NonNullable<typeof c> => !!c)
    : []

  const primary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-moss-400 px-5 py-3 text-sm font-semibold text-forest-950 shadow-lg shadow-black/20 transition-colors hover:bg-moss-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-400 disabled:cursor-wait disabled:opacity-70'
  const secondary = 'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white'

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl bg-forest-950 px-6 py-8 text-white sm:px-10 sm:py-10">
        <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-24 size-80 rounded-full bg-forest-600/40 blur-3xl" />
        <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-moss-500/20 blur-3xl" />
        <div className="relative">
          <p className="inline-flex flex-wrap items-center gap-2 text-xs font-medium text-forest-200">
            <span className="rounded-full bg-white/10 px-2.5 py-1 ring-1 ring-white/15">
              {passport ? (
                <>
                  Batch <span className="font-mono text-white">{passport.batchId}</span>
                </>
              ) : (
                'No batch identified yet'
              )}
            </span>
          </p>
          <h1 id="page-title" tabIndex={-1} className="mt-4 text-3xl font-semibold tracking-tight outline-none sm:text-4xl">
            Carbon Passport
          </h1>
          <p className="mt-2 max-w-xl text-base text-forest-200 sm:text-lg">
            Add your batch documents. We read them in your browser and show what is found, what is missing and where
            documents disagree.
          </p>
          {passport && (
            <div className="mt-4">
              <PassportStatusBadges statuses={passport.statuses} illustrative={passport.illustrative} />
            </div>
          )}

          {loadState.status === 'ready' && (
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {workspace.total === 0 ? (
                <>
                  <button type="button" onClick={quick.trySample} disabled={quick.busy} className={primary}>
                    <Icon name="play" className="size-4" />
                    Try with sample documents
                  </button>
                  <a href={pageHref('upload', 'workflow')} className={secondary}>
                    <Icon name="upload" className="size-4" />
                    Upload my documents
                  </a>
                </>
              ) : unread > 0 ? (
                <>
                  <button type="button" onClick={quick.readStored} disabled={quick.busy} className={primary}>
                    Read {unread} document{unread === 1 ? '' : 's'}
                    <Icon name="arrow-right" className="size-4" />
                  </button>
                  <a href={pageHref('upload', 'workflow')} className={secondary}>
                    Add or change documents
                  </a>
                </>
              ) : (
                <>
                  <a href={pageHref('passport')} className={primary}>
                    Open Carbon Passport
                    <Icon name="arrow-right" className="size-4" />
                  </a>
                  <a href={pageHref('upload', 'workflow')} className={secondary}>
                    Add or change documents
                  </a>
                </>
              )}
            </div>
          )}

          <QuickStartStatus state={quick.state} />

          <ol className="mt-8 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-3">
            {HOW_IT_WORKS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10 text-sm font-semibold text-moss-400 ring-1 ring-white/15 tabular-nums">
                  {i + 1}
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{step.title}</p>
                  <p className="mt-0.5 text-sm text-forest-200">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <SampleDataDisclaimer
        // Before processing there is no passport, so fall back to the stored documents' origin.
        illustrative={passport ? passport.illustrative : workspace.total > 0 && workspace.uploads === 0}
        hasDocuments={workspace.total > 0}
      />

      {loadState.status === 'unavailable' && (
        <p role="alert" className="rounded-2xl border border-status-missing/30 bg-status-missing/[0.06] p-4 text-sm">
          {loadState.message}
        </p>
      )}

      <Card title="Your progress">
        <WorkflowProgress completed={flow.completed} current={flow.current} />
      </Card>

      {loadState.status === 'loading' && <p className="text-sm text-ink-500">Loading the workspace…</p>}

      {loadState.status === 'ready' && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card title="What we found" className="xl:col-span-2">
            {passport ? (
              <>
                <WhatWeFound passport={passport} onInspect={setInspect} fix={fix} />
                <p className="mt-4 text-xs text-ink-500">
                  “Found” means a document contains the value, with a page, line or cell you can open. It is not
                  independent verification. The app never edits a value or fills a gap: every fix is a real document,
                  read and checked again.
                </p>
              </>
            ) : (
              <p className="text-sm text-ink-600">
                {workspace.total === 0
                  ? 'Nothing yet. Try the sample documents or upload your own to see results here.'
                  : unread > 0
                    ? 'Your documents are stored but not read yet. Use “Read documents” above.'
                    : 'No batch ID could be read from the documents. Open Check documents to see what was read.'}
              </p>
            )}
          </Card>

          <div className="space-y-6">
            {passport && (
              <Card title="Batch at a glance">
                <dl className="space-y-3">
                  {glance.map((c) => (
                    <div key={c.label}>
                      <dt className="text-xs text-ink-500">{c.label}</dt>
                      <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-semibold break-words ${c.value ? 'text-ink-900' : 'text-status-missing'}`}>
                          {c.value ?? 'Missing'}
                        </span>
                        <ClaimKindChip kind={c.kind} />
                      </dd>
                    </div>
                  ))}
                  <div>
                    <dt className="text-xs text-ink-500">Carbon footprint</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-ink-900">Not calculated</dd>
                    <p className="text-xs text-ink-500">{passport.calculation.headline}</p>
                  </div>
                </dl>
              </Card>
            )}

            <Card title="Documents in this browser">
              {workspace.total === 0 ? (
                <p className="text-sm text-ink-600">No documents are stored yet.</p>
              ) : (
                <dl className="grid grid-cols-2 gap-2">
                  <Stat label="Stored" value={workspace.total} hint={`${workspace.samples} sample · ${workspace.uploads} yours`} />
                  <Stat label="Read" value={workspace.processed} />
                  <Stat label="Not read yet" value={unread} />
                  <Stat label="Could not be read" value={workspace.failed} />
                </dl>
              )}
            </Card>
          </div>
        </div>
      )}

      <SourceInspector source={inspect} result={inspect ? resultsById[inspect.documentId] : undefined} onClose={() => setInspect(null)} />
    </div>
  )
}

function QuickStartStatus({ state }: { state: QuickStartState }) {
  if (state.status === 'idle') return null
  if (state.status === 'error')
    return (
      <p role="alert" className="mt-4 rounded-xl bg-white/10 px-4 py-3 text-sm text-white ring-1 ring-status-missing/60">
        {state.message}
      </p>
    )
  const p = state.status === 'reading' ? state.progress : null
  const pct = p ? Math.round(((p.index + (p.progress ?? 0.3)) / p.total) * 100) : 5
  return (
    <div role="status" aria-live="polite" className="mt-4 max-w-xl rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <Icon name="loader" className="size-4 animate-spin" />
        {state.status === 'loading-samples'
          ? 'Loading the sample documents…'
          : p
            ? `Reading document ${p.index + 1} of ${p.total} in your browser…`
            : 'Reading documents in your browser…'}
      </p>
      {p && <p className="mt-0.5 truncate text-xs text-forest-200">{p.fileName} · {p.message}</p>}
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div className="h-full rounded-full bg-moss-400 transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
