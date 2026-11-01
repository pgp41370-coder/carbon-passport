import { Icon } from '../../components/Icon'
import { countFindings, groupFindings } from '../../features/passport/findings'
import { selectBatch } from '../../features/passport/selectedBatch'
import { usePassport, type WorkspaceSummary } from '../../features/passport/usePassport'
import { pageHref } from '../../lib/routes'
import { toHref } from '../../lib/router'
import type { CarbonPassport } from '../../types/passport'
import { SampleDataDisclaimer } from './SampleDataDisclaimer'
import { useQuickStart, type QuickStartState } from './useQuickStart'

/**
 * Home: one readiness number and four plain tasks, after the GOV.UK "complete
 * multiple tasks" pattern. Every count comes from the same derived passport as
 * the other screens; this page has no figures of its own.
 */

type Tone = 'done' | 'problem' | 'todo' | 'neutral'

interface Task {
  label: string
  href: string
  tag: string
  tone: Tone
}

const TAG_TONE: Record<Tone, string> = {
  done: 'bg-forest-50 text-forest-800 ring-forest-200',
  problem: 'bg-status-missing/[0.08] text-status-missing ring-status-missing/25',
  todo: 'bg-status-review/[0.1] text-status-review-ink ring-status-review/30',
  neutral: 'bg-canvas text-ink-600 ring-line',
}

const bigButton =
  'inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500 disabled:cursor-wait disabled:opacity-70 sm:w-auto'
const primary = `${bigButton} bg-forest-700 text-white hover:bg-forest-800`
const secondary = `${bigButton} bg-white text-forest-800 ring-1 ring-forest-200 hover:bg-forest-50`

function tasksFor(workspace: WorkspaceSummary, passport: CarbonPassport, counts: ReturnType<typeof countFindings>): Task[] {
  const unread = workspace.notProcessed + workspace.outdated
  const toMatch = counts.problems + counts.check
  return [
    {
      label: 'Add documents',
      href: pageHref('upload'),
      tag: unread ? `${unread} not read` : `${workspace.processed} added`,
      tone: unread ? 'todo' : 'done',
    },
    {
      label: 'Fix what doesn’t match',
      href: pageHref('fix'),
      tag: toMatch ? `${toMatch} to fix` : 'Done',
      tone: counts.problems ? 'problem' : toMatch ? 'todo' : 'done',
    },
    {
      label: 'Get missing papers',
      href: toHref('/fix', { show: 'missing' }),
      tag: counts.missing ? `${counts.missing} needed` : 'Done',
      tone: counts.missing ? 'todo' : 'done',
    },
    {
      label: 'Download draft passport',
      href: pageHref('passport'),
      tag: passport.statuses.includes('ready_for_independent_review') ? 'Ready for review' : 'Draft',
      tone: 'neutral',
    },
  ]
}

export function DashboardPage() {
  const { loadState, passport, orders, workspace, reload } = usePassport()
  const quick = useQuickStart(reload)
  const unread = workspace.notProcessed + workspace.outdated

  if (loadState.status === 'unavailable')
    return (
      <p role="alert" className="rounded-2xl border border-status-missing/30 bg-status-missing/[0.06] p-4 text-sm">
        {loadState.message}
      </p>
    )

  const counts = passport ? countFindings(groupFindings(passport)) : null
  const total = counts ? counts.found + counts.missing + counts.check : 0
  const left = counts ? counts.problems + counts.missing + counts.check : 0

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        {passport && (
          <p className="text-sm text-ink-600">
            Batch <span className="font-mono font-semibold text-ink-900">{passport.batchId}</span>
            {buyerOf(passport) && <> · for {buyerOf(passport)}</>}
          </p>
        )}
        <h1 id="page-title" tabIndex={-1} className="mt-1 text-2xl font-semibold tracking-tight text-ink-900 outline-none sm:text-3xl">
          {workspace.total === 0 ? 'Make a carbon passport for one batch' : 'Your batch'}
        </h1>
      </div>

      {loadState.status === 'loading' && <p className="text-sm text-ink-600">Loading…</p>}

      {loadState.status === 'ready' && workspace.total === 0 && (
        <section className="rounded-2xl border border-line bg-surface p-6">
          <p className="text-base text-ink-700">Add the bills and certificates for one batch. We show what is ready and what to fix.</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={quick.trySample} disabled={quick.busy} className={primary}>
              <Icon name="play" className="size-5" />
              Try with sample documents
            </button>
            <a href={pageHref('upload', 'workflow')} className={secondary}>
              <Icon name="upload" className="size-5" />
              Upload my documents
            </a>
          </div>
          <QuickStartStatus state={quick.state} />
        </section>
      )}

      {loadState.status === 'ready' && workspace.total > 0 && !passport && (
        <section className="rounded-2xl border border-line bg-surface p-6">
          <p className="text-base text-ink-700">
            {unread > 0 ? `${unread} document${unread === 1 ? ' is' : 's are'} not read yet.` : 'No batch number was found in your documents.'}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {unread > 0 ? (
              <button type="button" onClick={quick.readStored} disabled={quick.busy} className={primary}>
                Read documents
                <Icon name="arrow-right" className="size-5" />
              </button>
            ) : (
              <a href={pageHref('validate')} className={primary}>
                See what was read
                <Icon name="arrow-right" className="size-5" />
              </a>
            )}
          </div>
          <QuickStartStatus state={quick.state} />
        </section>
      )}

      {passport && orders.length > 1 && <Orders orders={orders} current={passport.batchId} />}

      {passport && counts && (
        <>
          <section aria-label="Readiness" className="flex items-center gap-5 rounded-2xl border border-line bg-surface p-6">
            <ReadyRing done={counts.found} total={total} />
            <div>
              <p className="text-2xl font-semibold text-ink-900 tabular-nums">
                {counts.found} of {total} ready
              </p>
              <p className="mt-0.5 text-base text-ink-600">{left ? `${left} thing${left === 1 ? '' : 's'} left to do` : 'Nothing left to fix'}</p>
            </div>
          </section>

          <section aria-labelledby="tasks-title" className="rounded-2xl border border-line bg-surface p-2 sm:p-3">
            <h2 id="tasks-title" className="sr-only">
              Tasks
            </h2>
            <ol>
              {tasksFor(workspace, passport, counts).map((task, i) => (
                <li key={task.label} className={i ? 'border-t border-line' : ''}>
                  <a
                    href={task.href}
                    className="flex min-h-14 items-center gap-3 rounded-xl px-3 py-3 transition-colors duration-150 hover:bg-canvas focus-visible:outline-2 focus-visible:outline-forest-500"
                  >
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-canvas text-sm font-semibold text-ink-700 tabular-nums">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-base font-medium text-ink-900">{task.label}</span>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${TAG_TONE[task.tone]}`}>{task.tag}</span>
                    <Icon name="arrow-right" className="size-4 shrink-0 text-ink-400" />
                  </a>
                </li>
              ))}
            </ol>
          </section>

          {unread > 0 ? (
            // Documents changed or the reading rules were updated: read again before fixing anything.
            <div>
              <button type="button" onClick={quick.readStored} disabled={quick.busy} className={primary}>
                <Icon name="replace" className="size-5" />
                Read {unread} document{unread === 1 ? '' : 's'} again
              </button>
              <QuickStartStatus state={quick.state} />
            </div>
          ) : (
            <a href={left ? pageHref('fix') : pageHref('passport')} className={primary}>
              {left ? 'Fix next problem' : 'Open passport'}
              <Icon name="arrow-right" className="size-5" />
            </a>
          )}
        </>
      )}

      {workspace.total > 0 && (
        <SampleDataDisclaimer compact illustrative={passport ? passport.illustrative : workspace.uploads === 0} hasDocuments />
      )}
    </div>
  )
}

function buyerOf(passport: CarbonPassport) {
  return passport.identity.find((c) => c.label.startsWith('Export buyer'))?.value
}

/** One row per batch found in the documents. Picking one switches every screen to that batch. */
function Orders({ orders, current }: { orders: readonly CarbonPassport[]; current: string }) {
  return (
    <section aria-labelledby="orders-title" className="rounded-2xl border border-line bg-surface p-2 sm:p-3">
      <h2 id="orders-title" className="px-3 pt-2 pb-1 text-sm font-semibold text-ink-700">
        Your orders
      </h2>
      <ul>
        {orders.map((order) => {
          const c = countFindings(groupFindings(order))
          const left = c.problems + c.missing + c.check
          const selected = order.batchId === current
          return (
            <li key={order.batchId}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => selectBatch(order.batchId)}
                className={`flex min-h-14 w-full cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-forest-500 ${
                  selected ? 'bg-forest-50 ring-1 ring-forest-200' : 'hover:bg-canvas'
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-sm font-semibold text-ink-900">{order.batchId}</span>
                  <span className="block truncate text-sm text-ink-600">{buyerOf(order) ?? 'Buyer not found'}</span>
                </span>
                <span className="shrink-0 text-sm text-ink-700 tabular-nums">
                  {c.found} of {c.found + c.missing + c.check}
                </span>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${TAG_TONE[left ? (c.problems ? 'problem' : 'todo') : 'done']}`}>
                  {left ? `${left} to do` : 'Ready'}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

/** Simple progress ring; the number next to it carries the meaning, so the ring is decorative. */
function ReadyRing({ done, total }: { done: number; total: number }) {
  const r = 15
  const circumference = 2 * Math.PI * r
  const share = total ? done / total : 0
  return (
    <svg viewBox="0 0 36 36" className="size-20 shrink-0 -rotate-90" aria-hidden="true">
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--color-line)" strokeWidth="4" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="var(--color-forest-500)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={`${share * circumference} ${circumference}`}
        className="transition-[stroke-dasharray] duration-500"
      />
    </svg>
  )
}

function QuickStartStatus({ state }: { state: QuickStartState }) {
  if (state.status === 'idle') return null
  if (state.status === 'error')
    return (
      <p role="alert" className="mt-4 rounded-xl bg-status-missing/[0.06] px-4 py-3 text-sm text-ink-900 ring-1 ring-status-missing/30">
        {state.message}
      </p>
    )
  const p = state.status === 'reading' ? state.progress : null
  const pct = p ? Math.round(((p.index + (p.progress ?? 0.3)) / p.total) * 100) : 5
  return (
    <div role="status" aria-live="polite" className="mt-4 rounded-xl bg-forest-50 px-4 py-3 ring-1 ring-forest-200">
      <p className="flex items-center gap-2 text-sm font-semibold text-forest-950">
        <Icon name="loader" className="size-4 animate-spin text-forest-700" />
        {state.status === 'loading-samples'
          ? 'Loading the sample documents…'
          : p
            ? `Reading document ${p.index + 1} of ${p.total}…`
            : 'Reading documents…'}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-forest-600 transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
