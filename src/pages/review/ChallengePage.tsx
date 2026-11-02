import { useMemo, useState, type ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { documentName } from '../../features/documents/documentName'
import { usePassport } from '../../features/passport/usePassport'
import { buildChallenge, type Challenge, type ChecklistItem } from '../../features/review/challenge'
import type { Conflict, MapStatus } from '../../features/review/evidenceMap'
import { MapStatusChip, SimulatedNote } from '../../features/review/mapStatus'
import { MAP_STATUS } from '../../features/review/mapStatusMeta'
import { primaryButton, quietButton, secondaryButton, sourceLink } from '../../features/review/ui'
import { SourceInspector } from '../../features/traceability/SourceInspector'
import { pageHref, pageLink } from '../../lib/routes'
import type { SourceRef } from '../../types/extraction'

/**
 * The batch as an EU buyer or verifier would challenge it: four questions, each
 * answered only from the documents read and the checks already run. It is an
 * evidence review. It never says verified, certified or compliant.
 */

const QUESTIONS = [
  { id: 'q-origin', short: 'Origin' },
  { id: 'q-complete', short: 'Completeness' },
  { id: 'q-conflicts', short: 'Contradictions' },
  { id: 'q-reliance', short: 'Reliance' },
] as const

export function ChallengePage() {
  const { loadState, passport, resultsById } = usePassport()
  const [inspect, setInspect] = useState<SourceRef | null>(null)
  const challenge = useMemo(() => (passport ? buildChallenge(passport, resultsById) : null), [passport, resultsById])

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <a href={pageHref('passport')} className={`${quietButton} -ml-3`}>
        <Icon name="arrow-left" className="size-4" />
        Back to the passport
      </a>

      <header>
        {passport && (
          <p className="text-sm text-ink-600">
            Verifier review · Batch <span className="font-mono font-semibold text-ink-900">{passport.batchId}</span>
          </p>
        )}
        <h1 id="page-title" tabIndex={-1} className="mt-1 text-2xl font-semibold tracking-tight text-ink-900 outline-none sm:text-3xl">
          Challenge this batch
        </h1>
        <p className="mt-2 text-base text-ink-600">
          The four questions an EU buyer or verifier asks. Every answer comes only from the documents read and the checks already run.
        </p>
        <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-canvas px-3 py-1.5 text-xs font-medium text-ink-700 ring-1 ring-line">
          <Icon name="info" className="size-3.5 text-ink-500" />
          An evidence review, not a verification or certification
          {passport?.illustrative ? ' · sample documents (fictional)' : ''}
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
          <p className="font-semibold text-ink-900">No batch to challenge yet</p>
          <p className="mt-1 text-sm text-ink-600">Add and read the documents for one batch first.</p>
          <a href={pageHref('dashboard')} className={`${primaryButton} mt-4`}>
            Go to Home
          </a>
        </div>
      )}

      {challenge && (
        <>
          {challenge.map.simulated.length > 0 && <SimulatedNote files={challenge.map.simulated} />}
          <Overview challenge={challenge} />
          <OriginQuestion challenge={challenge} onInspect={setInspect} />
          <CompletenessQuestion challenge={challenge} />
          <ContradictionQuestion challenge={challenge} onInspect={setInspect} />
          <RelianceQuestion challenge={challenge} />
          <Summary challenge={challenge} />
        </>
      )}

      <SourceInspector source={inspect} result={inspect ? resultsById[inspect.documentId] : undefined} onClose={() => setInspect(null)} />
    </div>
  )
}

/** The four answers at a glance, each a jump link to its question. */
function Overview({ challenge }: { challenge: Challenge }) {
  const answers = [challenge.origin, challenge.completeness, challenge.contradictions, challenge.reliance]
  return (
    <nav aria-label="Questions" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {QUESTIONS.map((q, i) => {
        const answer = answers[i]!
        const meta = MAP_STATUS[answer.status]
        return (
          <a
            key={q.id}
            href={`#${q.id}`}
            onClick={(event) => {
              // Hash links would change the route; scroll to the question instead.
              event.preventDefault()
              document.getElementById(q.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
            className="rounded-xl bg-surface px-3 py-2.5 ring-1 ring-line transition-colors duration-150 hover:bg-canvas focus-visible:outline-2 focus-visible:outline-forest-500"
          >
            <span className="block text-xs text-ink-500 tabular-nums">Question {i + 1}</span>
            <span className="block text-sm font-semibold text-ink-900">{q.short}</span>
            <span className={`mt-1 flex items-center gap-1 text-xs font-semibold ${meta.text}`}>
              <Icon name={meta.icon} className="size-3.5" />
              {answer.label}
            </span>
          </a>
        )
      })}
    </nav>
  )
}

function Question({ id, number, question, status, statusLabel, answer, children }: { id: string; number: number; question: string; status: MapStatus; statusLabel?: string; answer: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-6 rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h2 id={`${id}-title`} className="flex items-center gap-3 text-lg font-semibold tracking-tight text-ink-900">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-forest-50 text-sm font-semibold text-forest-700 tabular-nums">{number}</span>
          {question}
        </h2>
        <MapStatusChip status={status} label={statusLabel} />
      </div>
      <p className="mt-3 text-base text-ink-900">{answer}</p>
      <div className="mt-5">{children}</div>
    </section>
  )
}

// ── 1 · Where did this steel come from? ─────────────────────────────────────
function OriginQuestion({ challenge, onInspect }: { challenge: Challenge; onInspect: (s: SourceRef) => void }) {
  const { trail, answer, status, label } = challenge.origin
  return (
    <Question id="q-origin" number={1} question="Where did this steel come from?" status={status} statusLabel={label} answer={answer}>
      <ol aria-label="Material trail" className="relative">
        {trail.map((node, i) => {
          const meta = MAP_STATUS[node.status]
          // A point with no paper of its own shows no source, even if a neighbouring paper names it.
          const sourced = node.status === 'missing' && node.documents.length === 0 ? undefined : node.values.find((v) => v.source)
          return (
            <li key={node.id} className="relative flex gap-4 pb-4 last:pb-0">
              {i < trail.length - 1 && <span aria-hidden="true" className="absolute top-7 bottom-0 left-[11px] w-px bg-line" />}
              <Icon name={meta.icon} className={`relative mt-0.5 size-6 shrink-0 rounded-full bg-surface ${meta.text}`} />
              <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink-900">{node.title}</p>
                  <p className="text-xs text-ink-600">{node.paper}</p>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className={`text-sm font-semibold text-ink-900 ${/^(Heat|Batch) /.test(node.headline) ? 'font-mono' : ''}`}>{node.headline}</span>
                  {sourced?.source && (
                    <button type="button" onClick={() => onInspect(sourced.source!)} className={sourceLink}>
                      <Icon name="file-text" className="size-4" />
                      Source<span className="sr-only"> for {node.title}</span>
                    </button>
                  )}
                  <a href={pageLink('map', { node: node.id, from: 'review' })} className={sourceLink}>
                    <Icon name="map" className="size-4" />
                    Map<span className="sr-only"> point {node.title}</span>
                  </a>
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </Question>
  )
}

// ── 2 · Is the batch evidence complete? ─────────────────────────────────────
function CompletenessQuestion({ challenge }: { challenge: Challenge }) {
  const c = challenge.completeness
  const tiles: { status: MapStatus; label: string; value: number }[] = [
    { status: 'supported', label: 'Found', value: c.found },
    { status: 'review', label: 'Needs check', value: c.check },
    { status: 'missing', label: 'Missing', value: c.missing },
  ]
  const stages = [...new Set(c.items.map((i) => i.stage))]
  return (
    <Question id="q-complete" number={2} question="Is the batch evidence complete?" status={c.status} statusLabel={c.label} answer={c.answer}>
      <dl className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-canvas p-3 sm:p-4">
            <dt className={`flex items-center gap-1.5 text-xs font-semibold ${MAP_STATUS[t.status].text}`}>
              <Icon name={MAP_STATUS[t.status].icon} className="size-3.5" />
              {t.label}
            </dt>
            <dd className="mt-1 text-2xl font-semibold text-ink-900 tabular-nums">{t.value}</dd>
          </div>
        ))}
      </dl>
      <details className="group mt-4">
        <summary className="flex min-h-10 cursor-pointer items-center gap-1 text-sm font-semibold text-forest-700">
          <span className="group-open:hidden">Show all {c.total} items</span>
          <span className="hidden group-open:inline">Hide the list</span>
        </summary>
        <div className="mt-3 space-y-4">
          {stages.map((stage) => (
            <div key={stage}>
              <h3 className="mb-1 text-xs font-semibold tracking-wide text-ink-600 uppercase">{stage}</h3>
              <ul className="divide-y divide-line">
                {c.items.filter((i) => i.stage === stage).map((i) => (
                  <ChecklistRow key={i.key} item={i} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </details>
    </Question>
  )
}

function ChecklistRow({ item }: { item: ChecklistItem }) {
  const meta = MAP_STATUS[item.status]
  return (
    <li className="flex items-center gap-3 py-2">
      <Icon name={meta.icon} className={`size-4 shrink-0 ${meta.text}`} />
      <span className="min-w-0 flex-1 text-sm text-ink-900" title={item.detail}>
        {item.label}
      </span>
      {item.status === 'supported' ? (
        <span className="text-xs text-ink-500">{meta.label}</span>
      ) : (
        <a href={pageLink('fix', { item: item.key, from: 'review' })} className={sourceLink}>
          Fix<span className="sr-only"> {item.label}</span>
        </a>
      )}
    </li>
  )
}

// ── 3 · Is any evidence contradictory? ──────────────────────────────────────
function ContradictionQuestion({ challenge, onInspect }: { challenge: Challenge; onInspect: (s: SourceRef) => void }) {
  const { conflicts, otherProblems, answer, status, label } = challenge.contradictions
  return (
    <Question id="q-conflicts" number={3} question="Is any evidence contradictory?" status={status} statusLabel={label} answer={answer}>
      <div className="space-y-4">
        {conflicts.map((c) => (
          <ConflictCard key={c.finding.key} conflict={c} onInspect={onInspect} />
        ))}
        {otherProblems.length > 0 && (
          <div>
            <h3 className="mb-1 text-xs font-semibold tracking-wide text-ink-600 uppercase">Other problems raised by the checks</h3>
            <ul className="divide-y divide-line">
              {otherProblems.map((f) => (
                <li key={f.key} className="flex items-center gap-3 py-2">
                  <Icon name="alert" className="size-4 shrink-0 text-status-review-ink" />
                  <span className="min-w-0 flex-1 text-sm text-ink-900" title={f.detail}>
                    {f.title}
                  </span>
                  <a href={pageLink('fix', { item: f.key, from: 'review' })} className={sourceLink}>
                    Fix<span className="sr-only"> {f.title}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Question>
  )
}

function ConflictCard({ conflict, onInspect }: { conflict: Conflict; onInspect: (s: SourceRef) => void }) {
  const review = conflict.issue.review
  return (
    <article className="rounded-xl bg-status-missing/[0.03] p-4 ring-1 ring-status-missing/25 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-ink-900">{conflict.issue.title}</h3>
        <span className="text-xs font-semibold text-status-missing">{review ? 'Open · review note recorded' : 'Open'}</span>
      </div>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {conflict.values.map((v, i) => (
          <li key={`${v.value}-${i}`} className="rounded-lg bg-white p-3 ring-1 ring-line">
            <p className="truncate text-xs font-medium text-ink-600">{v.source ? documentName(v.source.fileName) : v.label}</p>
            <p className="mt-0.5 font-mono text-lg font-semibold text-ink-900">{v.value}</p>
            {v.source && (
              <button type="button" onClick={() => onInspect(v.source!)} className={sourceLink}>
                <Icon name="file-text" className="size-4" />
                Show source<span className="sr-only"> for {v.label}</span>
              </button>
            )}
          </li>
        ))}
      </ul>
      <details className="group mt-3">
        <summary className="flex min-h-9 cursor-pointer items-center text-sm font-semibold text-ink-700">Why it matters and who corrects it</summary>
        <div className="mt-2 space-y-2 text-sm text-ink-700">
          <p>{conflict.issue.detail}</p>
          <p>
            Who corrects it: <span className="font-semibold text-ink-900">{conflict.who ?? 'The issuer of the wrong document'}</span>. {conflict.summary}
          </p>
          {review && <p className="text-ink-600">Review note: {review.note}. A note does not close the problem; only a corrected document does.</p>}
        </div>
      </details>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <a href={pageLink('map', { issue: conflict.finding.key, from: 'review' })} className={secondaryButton}>
          <Icon name="map" className="size-4" />
          Trace issue
        </a>
        <a href={pageLink('fix', { item: conflict.finding.key, from: 'review' })} className={quietButton}>
          <Icon name="wrench" className="size-4" />
          Fix this issue
        </a>
      </div>
    </article>
  )
}

// ── 4 · Can it be relied on for actual emissions data? ──────────────────────
function RelianceQuestion({ challenge }: { challenge: Challenge }) {
  const r = challenge.reliance
  return (
    <Question
      id="q-reliance"
      number={4}
      question="Can this batch be relied on for actual emissions data?"
      status={r.status}
      statusLabel={r.label}
      answer={r.verdict}
    >
      {r.reasons.length > 0 && (
        <ul className="space-y-2">
          {r.reasons.map((reason) => (
            <li key={reason.text} className="flex items-start gap-2.5 text-sm text-ink-900">
              <Icon name={MAP_STATUS[reason.tone].icon} className={`mt-0.5 size-4 shrink-0 ${MAP_STATUS[reason.tone].text}`} />
              {reason.text}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-4 text-sm text-ink-600">
        This review only reports what the papers show. It cannot say a batch is verified, certified or CBAM compliant; an accredited verifier has to do that.
      </p>
    </Question>
  )
}

// ── Summary ─────────────────────────────────────────────────────────────────
function Summary({ challenge }: { challenge: Challenge }) {
  const { completeness: c, contradictions, summary } = challenge
  const rows: { label: string; value: string; status: MapStatus }[] = [
    { label: 'Evidence completeness', value: `${c.found} of ${c.total}`, status: c.status },
    { label: 'Open discrepancies', value: String(contradictions.conflicts.length), status: contradictions.conflicts.length ? 'conflict' : 'supported' },
    { label: 'Broken traceability links', value: `${summary.brokenLinks} of ${summary.totalLinks}`, status: summary.brokenLinks ? 'missing' : 'supported' },
    { label: 'Missing supporting documents', value: String(c.missing), status: c.missing ? 'missing' : 'supported' },
  ]
  const fixHref = summary.next.findingKey ? pageLink('fix', { item: summary.next.findingKey, from: 'review' }) : pageHref('export')
  return (
    <section aria-labelledby="summary-title" className="rounded-2xl bg-forest-950 p-5 text-white sm:p-7">
      <h2 id="summary-title" className="text-lg font-semibold">
        Challenge summary
      </h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        {rows.map((row) => (
          <div key={row.label}>
            <dt className="text-xs text-forest-200">{row.label}</dt>
            <dd className="mt-1 flex items-center gap-2 text-2xl font-semibold tabular-nums">
              {row.value}
              <Icon name={MAP_STATUS[row.status].icon} className={`size-4 ${row.status === 'supported' ? 'text-moss-400' : row.status === 'conflict' ? 'text-red-300' : 'text-forest-200'}`} />
              <span className="sr-only">{MAP_STATUS[row.status].label}</span>
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-6 border-t border-white/10 pt-5">
        <p className="text-xs text-forest-200">Recommended next action</p>
        <p className="mt-1 text-base">{summary.next.text}</p>
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <a
          href={fixHref}
          className="inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-white px-5 text-base font-semibold text-forest-900 transition-colors duration-150 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-moss-400"
        >
          {summary.next.findingKey ? 'Return to Fix Problems' : 'Download the draft'}
          <Icon name="arrow-right" className="size-5" />
        </a>
        <a
          href={pageHref('passport')}
          className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-forest-100 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-moss-400"
        >
          Back to the passport
        </a>
      </div>
    </section>
  )
}
