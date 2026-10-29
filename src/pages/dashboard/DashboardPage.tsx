import type { ReactNode } from 'react'
import { Card } from '../../components/Card'
import { Icon } from '../../components/Icon'
import { WorkflowProgress } from '../../components/WorkflowProgress'
import { ClaimKindChip } from '../../features/passport/ClaimList'
import { PassportStatusBadges } from '../../features/passport/PassportStatusBadges'
import { evidenceReadiness } from '../../features/passport/readiness'
import { usePassport, type WorkspaceSummary } from '../../features/passport/usePassport'
import { TraceStatusChip } from '../../features/traceability/TraceStatusChip'
import { TRACE_STATUS } from '../../features/traceability/traceStatus'
import { pageHref } from '../../lib/routes'
import type { CarbonPassport } from '../../types/passport'
import type { PageId } from '../../types/navigation'
import type { TraceStatus } from '../../types/traceability'
import { SampleDataDisclaimer } from './SampleDataDisclaimer'

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

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-xl bg-canvas p-3">
      <dt className="text-xs text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-xl font-semibold text-ink-900 tabular-nums">{value}</dd>
      {hint && <p className="text-[11px] text-ink-500">{hint}</p>}
    </div>
  )
}

export function DashboardPage() {
  const { loadState, passport, workspace } = usePassport()
  const readiness = passport ? evidenceReadiness(passport) : null
  const flow = workflowState(workspace, passport)
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
            From MSME documents to buyer-ready carbon evidence, assembled in your browser.
          </p>
          {passport && (
            <div className="mt-4">
              <PassportStatusBadges statuses={passport.statuses} illustrative={passport.illustrative} />
            </div>
          )}
          <div className="mt-7 flex flex-col gap-3 sm:flex-row">
            <a
              href={pageHref('upload', 'workflow')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-moss-400 px-5 py-3 text-sm font-semibold text-forest-950 shadow-lg shadow-black/20 transition-colors hover:bg-moss-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-400"
            >
              Complete Carbon Passport
              <Icon name="arrow-right" className="size-4" />
            </a>
            <a
              href={pageHref('upload', 'demo')}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              <Icon name="play" className="size-4" />
              Start Guided Demo
            </a>
          </div>
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

      <Card title="Workflow progress">
        <WorkflowProgress completed={flow.completed} current={flow.current} />
      </Card>

      {loadState.status === 'loading' && <p className="text-sm text-ink-500">Loading the workspace…</p>}

      {loadState.status === 'ready' && (
        <div className="grid gap-6 xl:grid-cols-3">
          <Card title="Documents in this browser">
            {workspace.total === 0 ? (
              <div className="space-y-3 text-sm text-ink-600">
                <p>No documents are stored yet.</p>
                <a href={pageHref('upload')} className="inline-flex rounded-xl bg-forest-700 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-800">
                  Upload or load the sample pack
                </a>
              </div>
            ) : (
              <>
                <dl className="grid grid-cols-2 gap-2">
                  <Stat label="Stored" value={workspace.total} hint={`${workspace.samples} sample · ${workspace.uploads} uploaded`} />
                  <Stat label="Extracted" value={workspace.processed} hint="read without failure" />
                  <Stat label="Not processed" value={workspace.notProcessed + workspace.outdated} hint={workspace.outdated ? `${workspace.outdated} outdated` : undefined} />
                  <Stat label="Failed" value={workspace.failed} />
                </dl>
                {(workspace.notProcessed > 0 || workspace.outdated > 0) && (
                  <a href={pageHref('validate')} className="mt-3 inline-block text-sm font-semibold text-forest-700 underline">
                    Process documents in Extraction & Validation
                  </a>
                )}
              </>
            )}
          </Card>

          <Card title="Evidence readiness" className="xl:col-span-2">
            {!readiness ? (
              <p className="text-sm text-ink-600">
                {workspace.total === 0
                  ? 'Nothing to assess until documents are stored and processed.'
                  : 'No batch ID has been read yet. Process the stored documents to assess evidence.'}
              </p>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-ink-700">
                  <span className="text-2xl font-semibold text-ink-900 tabular-nums">{readiness.counts.supported}</span> of{' '}
                  {readiness.total} traceability requirements are supported by a source document. This is a count, not a
                  score; review notes do not change it.
                </p>
                <div className="flex h-3 overflow-hidden rounded-full bg-canvas" role="img" aria-label={(Object.keys(readiness.counts) as TraceStatus[]).map((s) => `${readiness.counts[s]} ${TRACE_STATUS[s].label}`).join(', ')}>
                  {(['supported', 'proposed', 'needs_review', 'missing'] as TraceStatus[]).map((status) =>
                    readiness.counts[status] ? (
                      <span key={status} className={TRACE_STATUS[status].line} style={{ width: `${(readiness.counts[status] / readiness.total) * 100}%` }} />
                    ) : null,
                  )}
                </div>
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
                  {(['supported', 'needs_review', 'missing', 'proposed'] as TraceStatus[]).map((status) => (
                    <li key={status}>
                      <span className="font-semibold text-ink-900 tabular-nums">{readiness.counts[status]}</span> {TRACE_STATUS[status].label.toLowerCase()}
                    </li>
                  ))}
                </ul>
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {readiness.requirements.map((r) => (
                    <li key={`${r.stage}-${r.id}`} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <span className="min-w-0 text-sm text-ink-900">
                        {r.label}
                        <span className="block text-xs text-ink-500">{r.stage}</span>
                      </span>
                      <TraceStatusChip status={r.status} size="sm" />
                    </li>
                  ))}
                </ul>
                <a href={pageHref('traceability')} className="inline-block text-sm font-semibold text-forest-700 underline">
                  Inspect sources in Supply-Chain Traceability
                </a>
              </div>
            )}
          </Card>

          {passport && (
            <Card title="Batch at a glance">
              <dl className="space-y-3">
                {glance.map((c) => (
                  <div key={c.label}>
                    <dt className="text-xs text-ink-500">{c.label}</dt>
                    <dd className="mt-0.5 flex flex-wrap items-center gap-2">
                      <span className={`text-sm font-semibold break-words ${c.value ? 'text-ink-900' : 'text-status-missing'}`}>
                        {c.value ?? 'Not established from available evidence'}
                      </span>
                      <ClaimKindChip kind={c.kind} />
                    </dd>
                    {c.sources.length > 0 && (
                      <p className="text-[11px] text-ink-500">
                        {c.sources.length} source location{c.sources.length === 1 ? '' : 's'}
                      </p>
                    )}
                  </div>
                ))}
                <div>
                  <dt className="text-xs text-ink-500">Carbon footprint</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-ink-900">Not calculated</dd>
                  <p className="text-[11px] text-ink-500">{passport.calculation.headline}</p>
                </div>
              </dl>
              <a href={pageHref('passport')} className="mt-4 inline-block text-sm font-semibold text-forest-700 underline">
                Open the draft passport
              </a>
            </Card>
          )}

          {passport && (
            <Card
              title="Open issues"
              className="xl:col-span-2"
              aside={
                <span className="rounded-full bg-ink-900 px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums">
                  {passport.issues.length} open · {passport.gaps.length} gaps
                </span>
              }
            >
              {passport.issues.length === 0 ? (
                <p className="text-sm text-ink-600">No validation issues for this batch.</p>
              ) : (
                <ul className="grid gap-3 md:grid-cols-2">
                  {passport.issues.map((issue) => (
                    <li key={issue.id} className="rounded-xl border border-line bg-canvas/60 p-4">
                      <p className="text-[11px] font-semibold text-status-missing uppercase">{issue.severity} priority</p>
                      <h3 className="mt-1 font-semibold text-ink-900">{issue.title}</h3>
                      <p className="mt-1 text-sm text-ink-700">{issue.detail}</p>
                      <p className="mt-2 text-xs font-medium text-ink-600">
                        {issue.review ? 'Human review recorded · issue still open' : 'No human review yet'}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                <p className="text-ink-600">
                  <span className="font-semibold text-ink-900">{passport.reviewerActions.filter((a) => a.applies).length}</span> human review
                  {passport.reviewerActions.filter((a) => a.applies).length === 1 ? '' : 's'} recorded
                  {passport.reviewerActions.some((a) => !a.applies) && ` (${passport.reviewerActions.filter((a) => !a.applies).length} no longer apply)`}.
                  Reviews are not verification.
                </p>
                <p className="text-ink-600 sm:text-right">
                  <a href={pageHref('validate')} className="font-semibold text-forest-700 underline">
                    Review issues
                  </a>{' '}
                  ·{' '}
                  <a href={pageHref('export')} className="font-semibold text-forest-700 underline">
                    Export draft
                  </a>
                </p>
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
