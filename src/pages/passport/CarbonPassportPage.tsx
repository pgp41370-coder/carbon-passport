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
import { getPage, pageHref, WORKFLOW_STEP_COUNT } from '../../lib/routes'
import type { SourceRef } from '../../types/extraction'
import type { ClaimKind } from '../../types/passport'

const page = getPage('passport')

function Section({ number, title, id, children }: { number: number; title: string; id: string; children: ReactNode }) {
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
      <header>
        <p className="text-xs font-semibold tracking-wide text-forest-600 uppercase">
          Step {page.step?.number} of {WORKFLOW_STEP_COUNT} · {page.step?.label}
        </p>
        <h1 id="page-title" tabIndex={-1} className="mt-1 text-2xl font-semibold tracking-tight text-forest-950 outline-none sm:text-3xl">
          Carbon Passport <span className="text-status-missing">(draft)</span>
        </h1>
        <p className="mt-2 max-w-2xl text-ink-600">
          Every statement below links to its source document, or says plainly that it is missing. Nothing is certified or
          verified, and no carbon footprint is calculated.
        </p>
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
            {documentCount ? 'Go to Extraction & Validation' : 'Go to Document Upload'}
          </a>
        </div>
      )}

      {passport && (
        <>
          {/* Passport cover: identity, honest status and exports at a glance. */}
          <section aria-label="Passport summary" className="relative overflow-hidden rounded-3xl bg-forest-950 p-6 text-white sm:p-8">
            <div aria-hidden="true" className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full bg-forest-600/40 blur-3xl" />
            <div className="relative space-y-4">
              <PassportStatusBadges statuses={passport.statuses} illustrative={passport.illustrative} />
              <div>
                <p className="text-sm text-forest-200">Batch</p>
                <p className="font-mono text-2xl font-semibold tracking-tight">{passport.batchId}</p>
                <p className="mt-1 text-sm text-forest-200">
                  {passport.identity.find((c) => c.label.startsWith('Product'))?.value ?? 'Product not established'} · generated{' '}
                  {new Date(passport.generatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
              <dl className="grid gap-3 sm:grid-cols-3">
                {[
                  ['Carbon footprint', passport.calculation.available ? 'See section 5' : 'Not calculated'],
                  ['Finished-batch output', passport.quantities.find((q) => q.label.startsWith('Finished'))?.value ?? 'Not established'],
                  ['Open issues and gaps', `${passport.issues.length} issues · ${passport.gaps.length} gaps`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
                    <dt className="text-xs text-forest-200">{label}</dt>
                    <dd className="mt-0.5 font-semibold">{value}</dd>
                  </div>
                ))}
              </dl>
              <p className="rounded-xl bg-status-missing/20 p-3 text-sm font-medium text-white ring-1 ring-status-missing/40">
                Draft, not certified. {PASSPORT_DISCLAIMER}
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  onClick={() => exportAs('html')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-moss-400 px-4 py-2.5 text-sm font-semibold text-forest-950 hover:bg-moss-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-400"
                >
                  <Icon name="download" className="size-4" />
                  Download draft (HTML)
                </button>
                <button
                  type="button"
                  onClick={() => exportAs('json')}
                  className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <Icon name="download" className="size-4" />
                  Download data (JSON)
                </button>
              </div>
              <p className="text-xs text-forest-200" role="status">
                {exported ?? 'Exports are generated in this browser and contain the same statuses, sources and gaps as this page. Open the HTML file and print it to save a PDF.'}
              </p>
            </div>
          </section>

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

          <Section number={6} title="Missing evidence, mismatches and reviewer actions" id="pp-gaps">
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
                <p className="mt-1 text-sm text-ink-500">None recorded. Add notes in Extraction & Validation or Traceability.</p>
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

          <Section number={7} title="Evidence register" id="pp-evidence">
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

          <Section number={8} title="Methodology, assumptions and limitations" id="pp-method">
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
        </>
      )}

      <SourceInspector source={inspect} result={inspect ? resultsById[inspect.documentId] : undefined} onClose={() => setInspect(null)} />
    </div>
  )
}
