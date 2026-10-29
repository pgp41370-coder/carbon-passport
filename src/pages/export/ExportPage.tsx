import { useState } from 'react'
import { Card } from '../../components/Card'
import { Icon } from '../../components/Icon'
import {
  downloadText,
  exportFileName,
  passportToHtml,
  passportToJson,
  printPassportHtml,
} from '../../features/passport/exportPassport'
import { PASSPORT_DISCLAIMER } from '../../features/passport/passportLabels'
import { PassportStatusBadges } from '../../features/passport/PassportStatusBadges'
import { evidenceReadiness } from '../../features/passport/readiness'
import { usePassport } from '../../features/passport/usePassport'
import { TraceStatusChip } from '../../features/traceability/TraceStatusChip'
import { getPage, pageHref, WORKFLOW_STEP_COUNT } from '../../lib/routes'

const page = getPage('export')

const formatSize = (chars: number) => (chars < 1024 ? `${chars} B` : `${(chars / 1024).toFixed(1)} KB`)

export function ExportPage() {
  const { loadState, passport, workspace } = usePassport()
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null)

  const html = passport ? passportToHtml(passport) : ''
  const json = passport ? passportToJson(passport) : ''
  const readiness = passport ? evidenceReadiness(passport) : null

  const save = (kind: 'html' | 'json') => {
    if (!passport) return
    const name = exportFileName(passport, kind)
    downloadText(kind === 'html' ? html : json, name, kind === 'html' ? 'text/html' : 'application/json')
    setMessage({ tone: 'ok', text: `${name} was generated in this browser and handed to your browser’s downloads.` })
  }

  const print = () => {
    printPassportHtml(html).then(
      () => setMessage({ tone: 'ok', text: 'Print dialog opened. Choose “Save as PDF” to keep a PDF copy.' }),
      (error: unknown) => setMessage({ tone: 'error', text: (error as Error).message }),
    )
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
          Download the current draft passport. Files are generated in this browser from the evidence stored here; open issues
          and gaps are always included.
        </p>
      </header>

      {loadState.status === 'loading' && <p className="text-sm text-ink-500">Preparing the current draft…</p>}
      {loadState.status === 'unavailable' && (
        <p role="alert" className="rounded-2xl border border-status-missing/30 bg-status-missing/[0.06] p-4 text-sm">
          {loadState.message}
        </p>
      )}

      {loadState.status === 'ready' && !passport && (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="font-semibold text-ink-900">Nothing to export yet</p>
          <p className="mt-1 text-sm text-ink-500">
            {workspace.total
              ? `${workspace.total} document${workspace.total === 1 ? ' is' : 's are'} stored, but no batch has been read from them. Process them first.`
              : 'Upload documents or load the synthetic sample pack, then process them.'}
          </p>
          <a
            href={pageHref(workspace.total ? 'validate' : 'upload')}
            className="mt-4 inline-flex rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-800"
          >
            {workspace.total ? 'Go to Extraction & Validation' : 'Go to Document Upload'}
          </a>
        </div>
      )}

      {passport && readiness && (
        <>
          <Card title={`Draft passport · batch ${passport.batchId}`}>
            <div className="space-y-4">
              <PassportStatusBadges statuses={passport.statuses} illustrative={passport.illustrative} />
              <dl className="grid gap-2 sm:grid-cols-4">
                {[
                  ['Evidence supported by source', `${readiness.counts.supported} of ${readiness.total}`],
                  ['Open issues', String(passport.issues.length)],
                  ['Open gaps', String(passport.gaps.length)],
                  ['Carbon footprint', 'Not calculated'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-canvas p-3">
                    <dt className="text-xs text-ink-500">{label}</dt>
                    <dd className="mt-0.5 font-semibold text-ink-900 tabular-nums">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="rounded-xl border border-status-missing/30 bg-status-missing/[0.06] p-3 text-sm text-ink-700">
                <span className="font-semibold text-status-missing">Draft, not certified.</span> {PASSPORT_DISCLAIMER}
              </p>
              {workspace.notProcessed + workspace.outdated > 0 && (
                <p className="text-sm text-status-review-ink">
                  {workspace.notProcessed + workspace.outdated} stored document{workspace.notProcessed + workspace.outdated === 1 ? ' is' : 's are'} not
                  processed and will be listed as not used.{' '}
                  <a href={pageHref('validate')} className="font-semibold underline">
                    Process now
                  </a>
                </p>
              )}
            </div>
          </Card>

          <Card title="Still open before this draft is complete">
            <p className="mb-3 text-xs text-ink-500">Everything below is written into both exports. Nothing is omitted or marked resolved.</p>
            <ul className="space-y-2">
              {passport.issues.map((issue) => (
                <li key={issue.id} className="flex flex-wrap items-start gap-2 text-sm text-ink-700">
                  <span className="rounded-full bg-status-missing/10 px-2 py-0.5 text-[11px] font-semibold text-status-missing">
                    {issue.severity} issue
                  </span>
                  <span>
                    <span className="font-medium text-ink-900">{issue.title}.</span> {issue.review ? 'Reviewed, still open.' : 'Not reviewed.'}
                  </span>
                </li>
              ))}
              {passport.gaps.map((gap) => (
                <li key={gap.id} className="flex flex-wrap items-start gap-2 text-sm text-ink-700">
                  <TraceStatusChip status={gap.status} size="sm" />
                  {gap.text}
                </li>
              ))}
              {passport.calculation.prerequisites
                .filter((p) => !p.met)
                .map((p) => (
                  <li key={p.id} className="flex flex-wrap items-start gap-2 text-sm text-ink-700">
                    <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-700 ring-1 ring-line">Calculation input</span>
                    {p.label}: {p.detail}
                  </li>
                ))}
              {passport.excludedDocuments.map((d) => (
                <li key={d.fileName} className="flex flex-wrap items-start gap-2 text-sm text-ink-700">
                  <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-semibold text-ink-700 ring-1 ring-line">Not used</span>
                  {d.fileName}: {d.reason}
                </li>
              ))}
            </ul>
          </Card>

          <Card title="Download">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Draft passport (HTML)',
                  body: 'A readable, self-contained document with every value, source reference, gap and the disclaimer.',
                  meta: `${exportFileName(passport, 'html')} · ${formatSize(html.length)}`,
                  action: () => save('html'),
                  label: 'Download HTML',
                },
                {
                  title: 'Structured data (JSON)',
                  body: 'The same passport model for other tools, flagged draft: true, certified: false, verified: false.',
                  meta: `${exportFileName(passport, 'json')} · ${formatSize(json.length)}`,
                  action: () => save('json'),
                  label: 'Download JSON',
                },
                {
                  title: 'PDF via print',
                  body: 'Prints the HTML draft. In the print dialog, choose “Save as PDF”.',
                  meta: 'Uses your browser’s print feature',
                  action: print,
                  label: 'Print / Save as PDF',
                },
              ].map((option) => (
                <div key={option.title} className="flex flex-col rounded-xl border border-line p-4">
                  <p className="font-semibold text-ink-900">{option.title}</p>
                  <p className="mt-1 flex-1 text-sm text-ink-600">{option.body}</p>
                  <p className="mt-2 text-[11px] break-all text-ink-500">{option.meta}</p>
                  <button
                    type="button"
                    onClick={option.action}
                    className="mt-3 inline-flex items-center justify-center gap-2 rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
                  >
                    <Icon name="download" className="size-4" />
                    {option.label}
                  </button>
                </div>
              ))}
            </div>
            <p role="status" className={`mt-3 text-sm ${message?.tone === 'error' ? 'text-status-missing' : 'text-ink-600'}`}>
              {message?.text ?? 'Nothing is uploaded. Downloads are created on this device.'}
            </p>
          </Card>

          <Card title="Not available">
            <p className="text-sm text-ink-600">These outputs are blocked because the evidence does not support them.</p>
            <ul className="mt-3 grid gap-3 md:grid-cols-2">
              {[
                ['Verified carbon certificate', 'This tool never issues certificates. Verification needs an independent reviewer.'],
                ['Batch carbon footprint report', `${passport.calculation.headline}. ${passport.calculation.prerequisites.filter((p) => !p.met).length} required inputs are missing.`],
              ].map(([title, reason]) => (
                <li key={title} className="rounded-xl border border-dashed border-line p-4">
                  <button type="button" disabled aria-describedby={`blocked-${title}`} className="w-full cursor-not-allowed rounded-xl bg-canvas px-4 py-2.5 text-sm font-semibold text-ink-400">
                    {title}: not available
                  </button>
                  <p id={`blocked-${title}`} className="mt-2 text-xs text-ink-600">
                    {reason}
                  </p>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  )
}
