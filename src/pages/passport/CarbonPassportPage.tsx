import { useState, type ReactNode } from 'react'
import { Card } from '../../components/Card'
import { Icon } from '../../components/Icon'
import { ClaimList } from '../../features/passport/ClaimList'
import { downloadText, exportFileName, passportToHtml, passportToJson } from '../../features/passport/exportPassport'
import { CLAIM_LABELS, PASSPORT_DISCLAIMER } from '../../features/passport/passportLabels'
import { PassportStatusBadges } from '../../features/passport/PassportStatusBadges'
import { usePassport } from '../../features/passport/usePassport'
import { SourceInspector } from '../../features/traceability/SourceInspector'
import { TraceChain } from '../../features/traceability/TraceChain'
import { IllustrativeTag, TraceStatusChip } from '../../features/traceability/TraceStatusChip'
import { pageHref } from '../../lib/routes'
import type { SourceRef } from '../../types/extraction'
import type { CarbonPassport, Claim, ClaimKind } from '../../types/passport'

/** The handful of facts a buyer asks about first, in plain words. Everything else is under "full details". */
const KEY_FACTS: { label: string; claim: string }[] = [
  { label: 'Product', claim: 'Product (as dispatched)' },
  { label: 'Steel heat number', claim: 'Steel heat number (mill certificate)' },
  { label: 'Steel bought', claim: 'Steel purchased' },
  { label: 'Finished output', claim: 'Finished-batch output (after heat treatment)' },
  { label: 'Factory electricity', claim: 'Plant electricity' },
  { label: 'Job-worker furnace energy', claim: 'Job-worker heat-treatment energy' },
]

function keyFacts(passport: CarbonPassport): { label: string; claim?: Claim }[] {
  const all = [...passport.identity, ...passport.quantities, ...passport.energy]
  return KEY_FACTS.map(({ label, claim }) => ({ label, claim: all.find((c) => c.label === claim) }))
}

function Section({ number, title, id, children, collapsed }: { number: number; title: string; id: string; children: ReactNode; collapsed?: boolean }) {
  if (collapsed)
    return (
      <details className="group rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-6">
        <summary className="flex cursor-pointer items-center gap-2 text-base font-semibold text-ink-900 select-none">
          <span className="grid size-6 place-items-center rounded-full bg-forest-50 text-xs font-semibold text-forest-700 tabular-nums">{number}</span>
          <h2 id={id} className="inline">
            {title}
          </h2>
          <span className="ml-auto text-xs font-normal text-forest-700 group-open:hidden">Show details</span>
          <span className="ml-auto hidden text-xs font-normal text-forest-700 group-open:inline">Hide details</span>
        </summary>
        <div className="mt-4 space-y-4">{children}</div>
      </details>
    )
  return (
    <section aria-labelledby={id} className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-6">
      <h2 id={id} className="flex items-center gap-2 text-base font-semibold text-ink-900">
        <span className="grid size-6 place-items-center rounded-full bg-forest-50 text-xs font-semibold text-forest-700 tabular-nums">{number}</span>
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  )
}

export function CarbonPassportPage() {
  const { loadState, passport, resultsById, documentCount } = usePassport()
  const [inspect, setInspect] = useState<SourceRef | null>(null)
  const [exported, setExported] = useState<string | null>(null)

  const exportAs = (kind: 'html' | 'json') => {
    if (!passport) return
    const content = kind === 'html' ? passportToHtml(passport) : passportToJson(passport)
    const name = exportFileName(passport, kind)
    downloadText(content, name, kind === 'html' ? 'text/html' : 'application/json')
    setExported(`${name} created in this browser.`)
  }

  return (
    <div className="space-y-6">
      <header className="mx-auto max-w-2xl">
        <h1 id="page-title" tabIndex={-1} className="flex flex-wrap items-center gap-3 text-2xl font-semibold tracking-tight text-ink-900 outline-none sm:text-3xl">
          Carbon passport
          <span className="rounded-full bg-status-review/[0.1] px-2.5 py-1 text-sm font-semibold text-status-review-ink ring-1 ring-status-review/30">Draft</span>
        </h1>
      </header>

      {loadState.status === 'loading' && <p className="text-sm text-ink-500">Loading stored evidence…</p>}
      {loadState.status === 'unavailable' && (
        <p role="alert" className="rounded-2xl border border-status-missing/30 bg-status-missing/[0.06] p-4 text-sm">
          {loadState.message}
        </p>
      )}
      {loadState.status === 'ready' && !passport && (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="font-semibold text-ink-900">{documentCount ? 'No batch found in processed documents' : 'No documents yet'}</p>
          <p className="mt-1 text-sm text-ink-500">The passport is built only from processed documents.</p>
          <a
            href={pageHref(documentCount ? 'validate' : 'upload')}
            className="mt-4 inline-flex rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-800"
          >
            {documentCount ? 'Go to Check documents' : 'Go to Upload documents'}
          </a>
        </div>
      )}

      {passport && (
        <>
          <section aria-label="Passport summary" className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-line bg-surface p-5 sm:p-7">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <p className="text-sm text-ink-600">Batch</p>
                <p className="font-mono text-2xl font-semibold tracking-tight text-ink-900">{passport.batchId}</p>
              </div>
              <p className="text-sm text-ink-600">
                Carbon footprint: <span className="font-semibold text-ink-900">{passport.calculation.available ? 'see details' : 'not calculated'}</span>
              </p>
            </div>

            <a
              href={pageHref('review')}
              className="group flex items-center gap-3 rounded-xl bg-forest-950 px-4 py-3.5 text-white transition-colors duration-150 hover:bg-forest-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
            >
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white/10">
                <Icon name="review" className="size-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-base font-semibold">Challenge this batch</span>
                <span className="block text-sm text-forest-200">Review it the way an EU buyer or verifier would</span>
              </span>
              <Icon name="arrow-right" className="size-5 shrink-0 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </a>

            <dl className="divide-y divide-line rounded-xl border border-line">
              {keyFacts(passport).map(({ label, claim }) => (
                <div key={label} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                  <dt className="w-full shrink-0 text-sm text-ink-600 sm:w-44">{label}</dt>
                  <dd className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                    <span className={`text-base font-semibold break-words ${claim?.value ? 'text-ink-900' : 'text-status-missing'}`}>{claim?.value ?? 'Missing'}</span>
                    {claim?.sources[0] && (
                      <button
                        type="button"
                        onClick={() => setInspect(claim.sources[0])}
                        className="ml-auto inline-flex min-h-9 cursor-pointer items-center gap-1 text-sm font-semibold text-forest-700 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-forest-500"
                      >
                        <Icon name="file-text" className="size-4" />
                        Source<span className="sr-only"> for {label}</span>
                      </button>
                    )}
                  </dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() => exportAs('html')}
                className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-forest-700 px-5 text-base font-semibold text-white transition-colors duration-150 hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
              >
                <Icon name="download" className="size-5" />
                Download draft
              </button>
              <button
                type="button"
                onClick={() => exportAs('json')}
                className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-forest-800 transition-colors duration-150 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-forest-500"
              >
                Data file (JSON)
              </button>
            </div>
            <p className="text-sm text-ink-600" role="status">
              {exported ?? 'Open the downloaded file and print it to save a PDF.'}
            </p>
            <p className="flex items-start gap-2 rounded-xl bg-status-review/[0.07] px-3 py-2 text-sm text-ink-700 ring-1 ring-status-review/30">
              <Icon name="info" className="mt-0.5 size-4 shrink-0 text-status-review-ink" />
              <span>
                {passport.illustrative ? 'Sample documents (fictional). ' : ''}Draft for a person to review: not certified or verified.
              </span>
            </p>
          </section>

          <details className="group mx-auto max-w-2xl">
            <summary className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-xl text-sm font-semibold text-forest-700 hover:bg-forest-50">
              <span className="group-open:hidden">Show full details for a reviewer</span>
              <span className="hidden group-open:inline">Hide full details</span>
            </summary>
            <div className="mt-4 space-y-6">
          <PassportStatusBadges statuses={passport.statuses} illustrative={passport.illustrative} />
          <p className="text-sm text-ink-700">Draft, not certified. {PASSPORT_DISCLAIMER}</p>

          <Card title="How to read this passport">
            <ul className="grid gap-2 text-xs text-ink-600 sm:grid-cols-3">
              {(Object.keys(CLAIM_LABELS) as ClaimKind[]).map((kind) => (
                <li key={kind}>
                  <span className="font-semibold text-ink-900">{CLAIM_LABELS[kind].label}:</span> {CLAIM_LABELS[kind].meaning}
                </li>
              ))}
            </ul>
          </Card>

          <Section number={1} title="Batch identity and product" id="pp-identity">
            <ClaimList claims={passport.identity} onInspect={setInspect} />
          </Section>

          <Section number={2} title="Supply-chain stages and hand-offs" id="pp-chain">
            <TraceChain
              stages={passport.stages}
              links={passport.links}
              onSelectStage={() => (window.location.hash = pageHref('traceability'))}
              onSelectLink={() => (window.location.hash = pageHref('traceability'))}
            />
            <ul className="space-y-2">
              {passport.links.map((link) => (
                <li key={link.id} className="flex flex-wrap items-start gap-2 text-sm">
                  <TraceStatusChip status={link.status} size="sm" />
                  <span className="font-medium text-ink-900">{link.title}:</span>
                  <span className="text-ink-700">{link.reference}</span>
                </li>
              ))}
            </ul>
            <a href={pageHref('traceability')} className="inline-block text-sm font-semibold text-forest-700 underline">
              Open full traceability with sources
            </a>
          </Section>

          <Section number={3} title="Production quantity and reporting boundary" id="pp-quantity">
            <ClaimList claims={passport.quantities} onInspect={setInspect} />
            <ClaimList claims={passport.boundary} onInspect={setInspect} />
          </Section>

          <Section number={4} title="Energy and activity data" id="pp-energy">
            <ClaimList claims={passport.energy} onInspect={setInspect} />
          </Section>

          <Section number={5} title="Carbon calculation status" id="pp-calc">
            <div className={`rounded-xl border-2 p-4 ${passport.calculation.available ? 'border-forest-300 bg-forest-50' : 'border-status-review/40 bg-status-review/[0.07]'}`}>
              <p className="font-semibold text-ink-900">{passport.calculation.headline}</p>
              <p className="mt-1 text-sm text-ink-700">
                No batch carbon footprint or intensity is shown. These inputs are needed first:
              </p>
              <ul className="mt-3 space-y-2">
                {passport.calculation.prerequisites.map((p) => (
                  <li key={p.id} className="flex items-start gap-2 text-sm">
                    <Icon name={p.met ? 'check-circle' : 'x-circle'} className={`mt-0.5 size-4 shrink-0 ${p.met ? 'text-status-verified' : 'text-status-missing'}`} />
                    <span>
                      <span className="font-medium text-ink-900">{p.label}</span>
                      <span className="text-ink-600"> · {p.met ? 'Met' : 'Not met'}: {p.detail}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          <Section number={6} title="Problems, missing items and reviews" id="pp-gaps">
            {passport.issues.map((issue) => (
              <div key={issue.id} className="rounded-xl border border-line bg-canvas/50 p-4">
                <p className="text-xs font-semibold text-status-missing uppercase">{issue.severity} priority</p>
                <h3 className="font-semibold text-ink-900">{issue.title}</h3>
                <p className="mt-1 text-sm text-ink-700">{issue.detail}</p>
                {issue.evidence.length > 0 && (
                  <div className="mt-3">
                    <ClaimList claims={issue.evidence} onInspect={setInspect} />
                  </div>
                )}
                <p className="mt-2 text-xs text-ink-600">
                  {issue.review
                    ? `Review recorded (not verification): ${issue.review.action}. “${issue.review.note}”`
                    : 'No review recorded yet.'}
                </p>
              </div>
            ))}
            <div>
              <h3 className="text-sm font-semibold text-ink-900">What is still missing</h3>
              <ul className="mt-2 space-y-1.5">
                {passport.gaps.map((gap) => (
                  <li key={gap.id} className="flex flex-wrap items-start gap-2 text-sm text-ink-700">
                    <TraceStatusChip status={gap.status} size="sm" />
                    {gap.text}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-ink-900">Reviewer actions</h3>
              {passport.reviewerActions.length === 0 ? (
                <p className="mt-1 text-sm text-ink-500">None recorded. Add notes in Check documents or Supply chain.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm text-ink-700">
                  {passport.reviewerActions.map((a, i) => (
                    <li key={i}>
                      <span className="font-medium text-ink-900">{a.scope}:</span>{' '}
                      {a.kind === 'trace_proposal' ? 'proposed link, not source-backed' : 'review note'}
                      {a.reference ? ` (${a.reference})` : ''}: “{a.note}”
                      {!a.applies && <span className="font-semibold text-status-review-ink"> No longer applies: the evidence changed.</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {passport.excludedDocuments.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-ink-900">Documents not used</h3>
                <ul className="mt-1 text-sm text-ink-700">
                  {passport.excludedDocuments.map((d) => (
                    <li key={d.fileName}>
                      {d.fileName}: {d.reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Section>

          <Section number={7} title="Evidence register" id="pp-evidence" collapsed>
            {passport.evidence.map((row) => (
              <div key={row.documentId}>
                <h3 className="mb-2 flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
                  <span className="break-all">{row.fileName}</span>
                  <span className="font-normal text-ink-500">· {row.documentType}</span>
                  {row.origin === 'sample' && <IllustrativeTag />}
                </h3>
                <ClaimList claims={row.claims} onInspect={setInspect} />
              </div>
            ))}
          </Section>

          <Section number={8} title="Methodology, assumptions and limitations" id="pp-method" collapsed>
            {[
              ['How this draft was produced', passport.methodology],
              ['Assumptions', passport.assumptions.length ? passport.assumptions : ['None.']],
              ['Limitations', passport.limitations],
            ].map(([title, items]) => (
              <div key={title as string}>
                <h3 className="text-sm font-semibold text-ink-900">{title as string}</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink-700">
                  {(items as string[]).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>

            </div>
          </details>
        </>
      )}

      <SourceInspector source={inspect} result={inspect ? resultsById[inspect.documentId] : undefined} onClose={() => setInspect(null)} />
    </div>
  )
}
