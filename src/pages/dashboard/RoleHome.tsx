import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { fixContext, fixGuideFor, type FixGuide } from '../../features/fixes/fixGuide'
import { FINDING_ORDER, groupFindings, type Finding, type FindingGroup } from '../../features/passport/findings'
import { usePassport } from '../../features/passport/usePassport'
import { setRole, type Role } from '../../features/roles/roles'
import { pageHref } from '../../lib/routes'
import type { CarbonPassport, Claim } from '../../types/passport'

/**
 * Home for everyone except the owner: the same batch, cut down to what this
 * person does. Built from the same derived passport as every other screen;
 * nothing is added or changed. The owner's Home is the full dashboard.
 */

const TITLE: Record<Role['id'], string> = {
  owner: 'Home',
  staff: 'Papers for this batch',
  supplier: 'What the exporter needs from you',
  job_worker: 'What the exporter needs from you',
  consultant: 'Review this batch',
  buyer: 'Your supplier’s draft passport',
}

const GROUP_LABEL: Record<FindingGroup, string> = { problems: 'Doesn’t match', missing: 'Missing', check: 'Needs check', found: 'Found' }

const GROUP_TONE: Record<FindingGroup, string> = {
  problems: 'bg-status-missing/[0.08] text-status-missing ring-status-missing/25',
  missing: 'bg-canvas text-ink-700 ring-line',
  check: 'bg-status-review/[0.1] text-status-review-ink ring-status-review/30',
  found: 'bg-forest-50 text-forest-800 ring-forest-200',
}

// Which party a request goes to, decided by the "who" line of its fix guide.
const PARTY_MATCH: Record<'supplier' | 'job_worker', RegExp> = { supplier: /steel supplier|trader|mill/i, job_worker: /job-worker/i }

// The document types each outside party issues.
const PARTY_PAPERS: Record<'supplier' | 'job_worker', string[]> = {
  supplier: ['Mill test certificate', 'Stockist lot transfer', 'Purchase invoice'],
  job_worker: ['Job-work challan', 'Job-worker energy record', 'Return challan'],
}

interface Item {
  group: FindingGroup
  finding: Finding
  guide: FixGuide
}

function openItems(passport: CarbonPassport): Item[] {
  const findings = groupFindings(passport)
  const ctx = fixContext(passport)
  const items = FINDING_ORDER.filter((g) => g !== 'found').flatMap((group) => findings[group].map((finding) => ({ group, finding, guide: fixGuideFor(finding, ctx) })))
  // A problem and a missing requirement can share one topic (e.g. job-worker energy); ask once, at the stronger status.
  return items.filter((item, i) => items.findIndex((other) => other.finding.topic === item.finding.topic) === i)
}

function claim(passport: CarbonPassport, label: string): Claim | undefined {
  return [...passport.identity, ...passport.quantities, ...passport.energy].find((c) => c.label === label)
}

export function RoleHome({ role }: { role: Role }) {
  const { loadState, passport } = usePassport()

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-sm text-ink-600">
          {role.label} view
          {passport && (
            <>
              {' '}
              · Batch <span className="font-mono font-semibold text-ink-900">{passport.batchId}</span>
            </>
          )}
        </p>
        <h1 id="page-title" tabIndex={-1} className="mt-1 text-2xl font-semibold tracking-tight text-ink-900 outline-none sm:text-3xl">
          {TITLE[role.id]}
        </h1>
      </header>

      {loadState.status === 'loading' && <p className="text-sm text-ink-600">Loading…</p>}
      {loadState.status === 'unavailable' && (
        <p role="alert" className="rounded-2xl border border-status-missing/30 bg-status-missing/[0.06] p-4 text-sm">
          {loadState.message}
        </p>
      )}
      {loadState.status === 'ready' && !passport && (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="font-semibold text-ink-900">No batch shared yet</p>
          <p className="mt-1 text-sm text-ink-600">The owner adds the papers first.</p>
          <button type="button" onClick={() => setRole('owner')} className={`${primary} mt-4`}>
            Switch to Owner
          </button>
        </div>
      )}

      {passport && role.id === 'staff' && <StaffHome passport={passport} />}
      {passport && (role.id === 'supplier' || role.id === 'job_worker') && <PartyHome passport={passport} party={role.id} />}
      {passport && role.id === 'consultant' && <ConsultantHome passport={passport} />}
      {passport && role.id === 'buyer' && <BuyerHome passport={passport} />}

      {passport && (
        <p className="flex items-start gap-2 text-xs text-ink-600">
          <Icon name="info" className="mt-0.5 size-4 shrink-0" />
          Preview on this device. In the full product each person gets their own sign-in.
        </p>
      )}
    </div>
  )
}

const primary =
  'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl bg-forest-700 px-5 text-base font-semibold text-white transition-colors duration-150 hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500'
const quiet =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-forest-800 transition-colors duration-150 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-forest-500'

function Panel({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink-900">{title}</h2>
        {aside && <span className="text-xs text-ink-600">{aside}</span>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function Tag({ group }: { group: FindingGroup }) {
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${GROUP_TONE[group]}`}>{GROUP_LABEL[group]}</span>
}

function Tiles({ tiles }: { tiles: [string, number | string][] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {tiles.map(([label, value]) => (
        <div key={label} className="rounded-2xl border border-line bg-surface p-4">
          <dt className="text-xs text-ink-600">{label}</dt>
          <dd className="mt-1 text-2xl font-semibold text-ink-900 tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

// ── Office staff: what is in, what is still to collect ─────────────────────
function StaffHome({ passport }: { passport: CarbonPassport }) {
  const toCollect = openItems(passport).filter((i) => i.group === 'missing')
  return (
    <>
      <Panel title="Read" aside={`${passport.evidence.length} papers`}>
        <ul className="divide-y divide-line">
          {passport.evidence.map((row) => (
            <li key={row.documentId} className="flex items-center gap-3 py-2.5">
              <Icon name="check-circle" className="size-5 shrink-0 text-forest-600" />
              <span className="text-sm font-medium text-ink-900">{row.documentType}</span>
            </li>
          ))}
          {passport.excludedDocuments.map((d) => (
            <li key={d.fileName} className="flex items-center gap-3 py-2.5">
              <Icon name="alert" className="size-5 shrink-0 text-status-review-ink" />
              <span className="flex-1 truncate text-sm font-medium text-ink-900">{d.fileName}</span>
              <span className="text-xs text-status-review-ink">{d.reason}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Still to collect" aside={`${toCollect.length} papers`}>
        {toCollect.length ? (
          <ul className="divide-y divide-line">
            {toCollect.map(({ finding, guide }) => (
              <li key={finding.key} className="flex flex-wrap items-baseline justify-between gap-x-3 py-2.5">
                <span className="text-sm font-semibold text-ink-900">{guide.document ?? finding.title}</span>
                {guide.who && <span className="text-xs text-ink-600">{guide.who}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-600">Nothing missing.</p>
        )}
      </Panel>
      <a href={pageHref('upload')} className={primary}>
        <Icon name="upload" className="size-5" />
        Upload papers
      </a>
    </>
  )
}

// ── Steel supplier or job-worker: only what is asked of them ───────────────
function PartyHome({ passport, party }: { passport: CarbonPassport; party: 'supplier' | 'job_worker' }) {
  const requests = openItems(passport).filter((i) => i.guide.who && PARTY_MATCH[party].test(i.guide.who))
  const papers = passport.evidence.filter((row) => PARTY_PAPERS[party].includes(row.documentType))
  const name = party === 'job_worker' ? claim(passport, 'Heat-treatment job-worker')?.value : claim(passport, 'Steel supplier (certificate heading)')?.value
  return (
    <>
      {name && <p className="-mt-3 text-sm text-ink-700">{name}</p>}
      <Panel title="Asked of you" aside={`${requests.length} open`}>
        {requests.length ? (
          <ul className="space-y-3">
            {requests.map(({ group, finding, guide }) => (
              <li key={finding.key} className="rounded-xl bg-canvas p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Tag group={group} />
                  <p className="text-sm font-semibold text-ink-900">{guide.document ?? finding.title}</p>
                </div>
                {guide.mustShow && (
                  <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink-700">
                    {guide.mustShow.map((m) => (
                      <li key={m}>{m}</li>
                    ))}
                  </ul>
                )}
                {guide.message && (
                  <details className="mt-2 text-sm">
                    <summary className="min-h-8 cursor-pointer font-medium text-forest-700">The exporter’s message</summary>
                    <p className="mt-1 text-ink-700">{guide.message.en}</p>
                    <p lang="hi" className="mt-1.5 text-ink-600">
                      {guide.message.hi}
                    </p>
                  </details>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-600">Nothing is asked of you for this batch.</p>
        )}
      </Panel>
      <Panel title="Your papers on file">
        {papers.length ? (
          <ul className="divide-y divide-line">
            {papers.map((row) => {
              const heat = row.claims.find((c) => c.label === 'Heat number' && c.value)
              return (
                <li key={row.documentId} className="flex flex-wrap items-center gap-3 py-2.5">
                  <span className="flex-1 text-sm font-medium text-ink-900">{row.documentType}</span>
                  {heat && <span className="font-mono text-sm text-ink-700">Heat no. {heat.value}</span>}
                </li>
              )
            })}
          </ul>
        ) : (
          <p className="text-sm text-ink-600">None yet.</p>
        )}
      </Panel>
      {requests.length > 0 && (
        <a href={pageHref('upload')} className={primary}>
          <Icon name="upload" className="size-5" />
          Send a paper
        </a>
      )}
    </>
  )
}

// ── Consultant: the whole file, then the review ────────────────────────────
function ConsultantHome({ passport }: { passport: CarbonPassport }) {
  const values = passport.evidence.flatMap((row) => row.claims.filter((c) => c.kind !== 'missing'))
  const items = openItems(passport)
  const prerequisites = passport.calculation.prerequisites
  return (
    <>
      <Tiles
        tiles={[
          ['Papers read', passport.evidence.length],
          ['Values with a source', values.length],
          ['Values to check', values.filter((c) => c.kind === 'needs_review').length],
          ['Open problems', passport.issues.length],
        ]}
      />
      <Panel title="Still open" aside={`${items.length} items`}>
        {items.length ? (
          <ul className="divide-y divide-line">
            {items.map(({ group, finding }) => (
              <li key={finding.key} className="flex items-center gap-3 py-2.5">
                <Tag group={group} />
                <span className="text-sm text-ink-900">{finding.title}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-600">Nothing open.</p>
        )}
        <details className="mt-3 border-t border-line pt-3">
          <summary className="min-h-8 cursor-pointer text-sm font-semibold text-forest-700">
            Before a carbon number can be worked out · {prerequisites.filter((p) => p.met).length} of {prerequisites.length} in place
          </summary>
          <ul className="mt-2 space-y-1.5">
            {prerequisites.map((p) => (
              <li key={p.id} className="flex items-start gap-2 text-sm text-ink-900">
                <Icon name={p.met ? 'check-circle' : 'circle-dashed'} className={`mt-0.5 size-4 shrink-0 ${p.met ? 'text-forest-600' : 'text-ink-500'}`} />
                {p.label}
              </li>
            ))}
          </ul>
        </details>
      </Panel>
      <div className="flex flex-col gap-2 sm:flex-row">
        <a href={pageHref('review')} className={primary}>
          <Icon name="review" className="size-5" />
          Challenge this batch
        </a>
        <a href={pageHref('validate')} className={quiet}>
          Check every value
        </a>
      </div>
    </>
  )
}

// ── EU buyer: facts only, no internal notes ────────────────────────────────
const BUYER_FACTS: { label: string; claim: string }[] = [
  { label: 'Product', claim: 'Product (as dispatched)' },
  { label: 'Dispatched', claim: 'Dispatched quantity' },
  { label: 'Steel heat number', claim: 'Steel heat number (mill certificate)' },
  { label: 'Steel supplier', claim: 'Steel supplier (certificate heading)' },
  { label: 'Heat treatment by', claim: 'Heat-treatment job-worker' },
  { label: 'Job-worker furnace energy', claim: 'Job-worker heat-treatment energy' },
]

function BuyerHome({ passport }: { passport: CarbonPassport }) {
  const findings = groupFindings(passport)
  const total = findings.found.length + findings.missing.length + findings.check.length
  return (
    <>
      <section className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-6">
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {BUYER_FACTS.map(({ label, claim: c }) => {
            const value = claim(passport, c)?.value
            return (
              <div key={label} className="border-b border-line pb-2">
                <dt className="text-xs text-ink-600">{label}</dt>
                <dd className={`text-sm font-semibold ${value ? 'text-ink-900' : 'text-ink-500'}`}>{value ?? 'Not provided'}</dd>
              </div>
            )
          })}
        </dl>
        <p className="mt-4 text-sm text-ink-700">
          <span className="font-semibold text-ink-900 tabular-nums">
            {findings.found.length} of {total}
          </span>{' '}
          supply-chain steps backed by a document ·{' '}
          <span className="font-semibold text-ink-900 tabular-nums">{passport.issues.length}</span> open problem{passport.issues.length === 1 ? '' : 's'}
        </p>
        <p className="mt-2 text-xs font-medium text-status-review-ink">Draft. It is not certified or verified.</p>
      </section>
      <div className="flex flex-col gap-2 sm:flex-row">
        <a href={pageHref('review')} className={primary}>
          <Icon name="review" className="size-5" />
          Challenge this batch
        </a>
        <a href={pageHref('export')} className={quiet}>
          Download the draft
        </a>
      </div>
    </>
  )
}
