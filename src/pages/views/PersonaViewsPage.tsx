import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { fixContext, fixGuideFor, type FixGuide } from '../../features/fixes/fixGuide'
import { FINDING_ORDER, groupFindings, type Finding, type FindingGroup } from '../../features/passport/findings'
import { PASSPORT_DISCLAIMER } from '../../features/passport/passportLabels'
import { PassportStatusBadges } from '../../features/passport/PassportStatusBadges'
import { usePassport } from '../../features/passport/usePassport'
import { pageHref } from '../../lib/routes'
import { toHref } from '../../lib/router'
import type { CarbonPassport, Claim } from '../../types/passport'

/**
 * One batch, as each person in the chain would see it. Every view is built from
 * the same derived passport as the other screens; nothing here is added or
 * changed. In this prototype every view runs on the owner's device: suppliers,
 * job-workers and buyers do not log in, so each view is a preview of what they
 * would be sent.
 */

type PersonaId = 'owner' | 'staff' | 'supplier' | 'job_worker' | 'consultant' | 'buyer'

const PERSONAS: { id: PersonaId; label: string; who: string; needs: string }[] = [
  { id: 'owner', label: 'Owner', who: 'MSME owner', needs: 'Is the batch ready, and what is left?' },
  { id: 'staff', label: 'Office staff', who: 'Accounts or stores', needs: 'Which papers to add, and which are not read yet' },
  { id: 'supplier', label: 'Steel supplier', who: 'Mill or stockist', needs: 'What is asked of them, and their papers on file' },
  { id: 'job_worker', label: 'Job-worker', who: 'Heat-treatment unit', needs: 'What is asked of them, and their papers on file' },
  { id: 'consultant', label: 'Consultant', who: 'Reviewer or auditor', needs: 'Every value, its source and every open problem' },
  { id: 'buyer', label: 'Export buyer', who: 'EU importer', needs: 'The draft facts only, with no internal notes' },
]

const GROUP_LABEL: Record<FindingGroup, string> = {
  problems: 'Doesn’t match',
  missing: 'Missing',
  check: 'Needs check',
  found: 'Found',
}

const GROUP_TONE: Record<FindingGroup, string> = {
  problems: 'bg-status-missing/[0.08] text-status-missing ring-status-missing/25',
  missing: 'bg-status-review/[0.1] text-status-review-ink ring-status-review/30',
  check: 'bg-status-review/[0.1] text-status-review-ink ring-status-review/30',
  found: 'bg-forest-50 text-forest-800 ring-forest-200',
}

// Which party a request goes to, decided by the "who" line of its fix guide.
const PARTY_MATCH: Partial<Record<PersonaId, RegExp>> = {
  supplier: /steel supplier|trader|mill/i,
  job_worker: /job-worker/i,
}

// The document types each outside party issues.
const PARTY_PAPERS: Partial<Record<PersonaId, string[]>> = {
  supplier: ['Mill test certificate', 'Purchase invoice'],
  job_worker: ['Job-work challan', 'Job-worker energy record'],
}

interface Item {
  group: FindingGroup
  finding: Finding
  guide: FixGuide
}

function openItems(passport: CarbonPassport): Item[] {
  const findings = groupFindings(passport)
  const ctx = fixContext(passport)
  const items = FINDING_ORDER.filter((g) => g !== 'found').flatMap((group) =>
    findings[group].map((finding) => ({ group, finding, guide: fixGuideFor(finding, ctx) })),
  )
  // A problem and a missing requirement can share one topic (e.g. job-worker energy); ask once, at the stronger status.
  return items.filter((item, i) => items.findIndex((other) => other.finding.topic === item.finding.topic) === i)
}

function claim(passport: CarbonPassport, label: string): Claim | undefined {
  return [...passport.identity, ...passport.quantities, ...passport.energy].find((c) => c.label === label)
}

export function PersonaViewsPage({ persona }: { persona: string | null }) {
  const { loadState, passport } = usePassport()
  const current = PERSONAS.find((p) => p.id === persona) ?? PERSONAS[0]!

  return (
    <div className="space-y-6">
      <header>
        <h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight text-forest-950 outline-none sm:text-3xl">
          Who sees what
        </h1>
        <p className="mt-2 max-w-2xl text-ink-600">
          The same batch, shown to each person in the chain. Each sees only what they need to do.
        </p>
      </header>

      <nav aria-label="Choose a person" className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        {PERSONAS.map((p) => {
          const selected = p.id === current.id
          return (
            <a
              key={p.id}
              href={toHref('/views', { as: p.id })}
              aria-current={selected ? 'page' : undefined}
              className={`flex min-h-16 flex-col justify-center rounded-xl px-3 py-2 ring-1 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500 ${
                selected ? 'bg-forest-950 text-white ring-forest-950' : 'bg-surface text-ink-900 ring-line hover:bg-forest-50'
              }`}
            >
              <span className="text-sm font-semibold">{p.label}</span>
              <span className={`text-xs ${selected ? 'text-forest-200' : 'text-ink-600'}`}>{p.who}</span>
            </a>
          )
        })}
      </nav>

      {loadState.status === 'loading' && <p className="text-sm text-ink-600">Loading…</p>}
      {loadState.status === 'unavailable' && (
        <p role="alert" className="rounded-2xl border border-status-missing/30 bg-status-missing/[0.06] p-4 text-sm">
          {loadState.message}
        </p>
      )}
      {loadState.status === 'ready' && !passport && (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="font-semibold text-ink-900">No batch yet</p>
          <p className="mt-1 text-sm text-ink-600">Add and read the documents for one batch first.</p>
          <a href={pageHref('dashboard')} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-forest-700 px-4 text-sm font-semibold text-white hover:bg-forest-800">
            Go to Home
          </a>
        </div>
      )}

      {passport && (
        <section aria-labelledby="persona-title" className="space-y-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="persona-title" className="text-lg font-semibold text-ink-900">
              {current.label}: {current.needs.charAt(0).toLowerCase() + current.needs.slice(1)}
            </h2>
            <p className="text-sm text-ink-600">
              Batch <span className="font-mono font-semibold text-ink-900">{passport.batchId}</span>
            </p>
          </div>
          {current.id === 'owner' && <OwnerView passport={passport} />}
          {current.id === 'staff' && <StaffView passport={passport} />}
          {(current.id === 'supplier' || current.id === 'job_worker') && <PartyView passport={passport} persona={current.id} />}
          {current.id === 'consultant' && <ConsultantView passport={passport} />}
          {current.id === 'buyer' && <BuyerView passport={passport} />}
          <p className="flex items-start gap-2 text-xs text-ink-600">
            <Icon name="info" className="mt-0.5 size-4 shrink-0" />
            Prototype preview on this device. In the full product each person gets their own sign-in or link; here nobody else can see your
            documents.
          </p>
        </section>
      )}
    </div>
  )
}

function Panel({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-ink-900">{title}</h3>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </div>
  )
}

function Tag({ group }: { group: FindingGroup }) {
  return <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${GROUP_TONE[group]}`}>{GROUP_LABEL[group]}</span>
}

function ItemList({ items, empty, showWho = true }: { items: Item[]; empty: string; showWho?: boolean }) {
  if (!items.length) return <p className="text-sm text-ink-600">{empty}</p>
  return (
    <ul className="divide-y divide-line">
      {items.map(({ group, finding, guide }) => (
        <li key={finding.key} className="flex items-start gap-3 py-3">
          <Tag group={group} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink-900">{finding.title}</p>
            <p className="mt-0.5 text-sm text-ink-700">{guide.summary}</p>
            {showWho && guide.who && <p className="mt-0.5 text-xs text-ink-600">Ask: {guide.who}</p>}
          </div>
        </li>
      ))}
    </ul>
  )
}

function ButtonLink({ href, children, quiet }: { href: string; children: ReactNode; quiet?: boolean }) {
  return (
    <a
      href={href}
      className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500 ${
        quiet ? 'text-forest-800 ring-1 ring-forest-200 hover:bg-forest-50' : 'bg-forest-700 text-white hover:bg-forest-800'
      }`}
    >
      {children}
      <Icon name="arrow-right" className="size-4" />
    </a>
  )
}

function OwnerView({ passport }: { passport: CarbonPassport }) {
  const findings = groupFindings(passport)
  const items = openItems(passport)
  const total = findings.found.length + findings.missing.length + findings.check.length
  return (
    <>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(['found', 'problems', 'missing', 'check'] as const).map((g) => (
          <div key={g} className="rounded-2xl border border-line bg-surface p-4">
            <dt className="text-xs text-ink-600">{GROUP_LABEL[g]}</dt>
            <dd className="mt-1 text-2xl font-semibold text-ink-900 tabular-nums">
              {findings[g].length}
              {g === 'found' && <span className="text-base font-normal text-ink-600"> of {total}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <Panel title="Next three things to do">
        <ItemList items={items.slice(0, 3)} empty="Nothing left to do for this batch." />
      </Panel>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={pageHref('fix')}>Fix next problem</ButtonLink>
        <ButtonLink href={pageHref('dashboard')} quiet>
          Open Home
        </ButtonLink>
      </div>
    </>
  )
}

function StaffView({ passport }: { passport: CarbonPassport }) {
  const toCollect = openItems(passport).filter((i) => i.group === 'missing')
  return (
    <>
      <Panel title="Papers for this batch" aside={<span className="text-xs text-ink-600">{passport.evidence.length} read</span>}>
        <ul className="divide-y divide-line">
          {passport.evidence.map((row) => (
            <li key={row.documentId} className="flex items-center gap-3 py-2.5">
              <Icon name="check-circle" className="size-5 shrink-0 text-forest-600" />
              <span className="flex-1 text-sm font-medium text-ink-900">{row.documentType}</span>
              <span className="min-w-0 truncate text-xs text-ink-600">{row.fileName}</span>
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
      <Panel title="Papers still to collect">
        {toCollect.length ? (
          <ul className="divide-y divide-line">
            {toCollect.map(({ finding, guide }) => (
              <li key={finding.key} className="py-2.5">
                <p className="text-sm font-semibold text-ink-900">{guide.document ?? finding.title}</p>
                {guide.who && <p className="text-xs text-ink-600">From: {guide.who}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-ink-600">No missing papers.</p>
        )}
      </Panel>
      <ButtonLink href={pageHref('upload')}>Upload papers</ButtonLink>
    </>
  )
}

function PartyView({ passport, persona }: { passport: CarbonPassport; persona: 'supplier' | 'job_worker' }) {
  const match = PARTY_MATCH[persona]!
  const requests = openItems(passport).filter((i) => i.guide.who && match.test(i.guide.who))
  const papers = passport.evidence.filter((row) => PARTY_PAPERS[persona]!.includes(row.documentType))
  const name =
    persona === 'job_worker'
      ? claim(passport, 'Heat-treatment job-worker')?.value
      : claim(passport, 'Steel supplier (certificate heading)')?.value
  return (
    <>
      {name && (
        <p className="text-sm text-ink-700">
          As read from the papers: <span className="font-semibold text-ink-900">{name}</span>
        </p>
      )}
      <Panel title="Asked of you" aside={<span className="text-xs text-ink-600">{requests.length} open</span>}>
        {requests.length ? (
          <ul className="space-y-4">
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
                  <blockquote className="mt-3 border-l-2 border-forest-300 pl-3 text-sm text-ink-700">
                    <p>{guide.message.en}</p>
                    <p lang="hi" className="mt-1.5 text-ink-600">
                      {guide.message.hi}
                    </p>
                  </blockquote>
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
          <p className="text-sm text-ink-600">None of your papers are on file yet.</p>
        )}
      </Panel>
    </>
  )
}

function ConsultantView({ passport }: { passport: CarbonPassport }) {
  const values = passport.evidence.flatMap((row) => row.claims.filter((c) => c.kind !== 'missing'))
  const needsCheck = values.filter((c) => c.kind === 'needs_review').length
  const unmet = passport.calculation.prerequisites.filter((p) => !p.met)
  return (
    <>
      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ['Papers read', passport.evidence.length],
          ['Values with a source', values.length],
          ['Values to check', needsCheck],
          ['Open problems', passport.issues.length],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-line bg-surface p-4">
            <dt className="text-xs text-ink-600">{label}</dt>
            <dd className="mt-1 text-2xl font-semibold text-ink-900 tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
      <Panel title="Everything still open">
        <ItemList items={openItems(passport)} empty="No open items." />
      </Panel>
      <Panel title="Before any carbon number can be worked out" aside={<span className="text-xs text-ink-600">{unmet.length} not met</span>}>
        <ul className="divide-y divide-line">
          {passport.calculation.prerequisites.map((p) => (
            <li key={p.id} className="flex items-start gap-3 py-2.5">
              <Icon name={p.met ? 'check-circle' : 'x-circle'} className={`mt-0.5 size-5 shrink-0 ${p.met ? 'text-forest-600' : 'text-status-missing'}`} />
              <span className="flex-1 text-sm text-ink-900">{p.label}</span>
              <span className="text-xs text-ink-600">{p.detail}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <div className="flex flex-wrap gap-2">
        <ButtonLink href={pageHref('validate')}>Check every value</ButtonLink>
        <ButtonLink href={pageHref('traceability')} quiet>
          Open supply chain
        </ButtonLink>
      </div>
    </>
  )
}

const BUYER_FACTS: { label: string; claim: string }[] = [
  { label: 'Product', claim: 'Product (as dispatched)' },
  { label: 'Dispatched', claim: 'Dispatched quantity' },
  { label: 'Steel heat number', claim: 'Steel heat number (mill certificate)' },
  { label: 'Steel supplier', claim: 'Steel supplier (certificate heading)' },
  { label: 'Heat treatment by', claim: 'Heat-treatment job-worker' },
  { label: 'Job-worker furnace energy', claim: 'Job-worker heat-treatment energy' },
]

function BuyerView({ passport }: { passport: CarbonPassport }) {
  const findings = groupFindings(passport)
  const total = findings.found.length + findings.missing.length + findings.check.length
  const buyer = claim(passport, 'Export buyer (dispatch record)')?.value
  return (
    <>
      <div className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-ink-700">{buyer ? <>Prepared for {buyer}</> : 'Buyer not named in the papers'}</p>
          <PassportStatusBadges statuses={passport.statuses} illustrative={passport.illustrative} />
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {BUYER_FACTS.map(({ label, claim: c }) => {
            const value = claim(passport, c)
            return (
              <div key={label} className="border-b border-line pb-2">
                <dt className="text-xs text-ink-600">{label}</dt>
                <dd className={`text-sm font-semibold ${value?.value ? 'text-ink-900' : 'text-status-missing'}`}>{value?.value ?? 'Not provided'}</dd>
              </div>
            )
          })}
        </dl>
        <p className="mt-4 text-sm text-ink-700">
          Supply-chain evidence: <span className="font-semibold text-ink-900 tabular-nums">{findings.found.length} of {total}</span> steps backed by a document ·{' '}
          <span className="font-semibold text-ink-900 tabular-nums">{passport.issues.length}</span> open problem{passport.issues.length === 1 ? '' : 's'}
        </p>
      </div>
      <p className="rounded-xl bg-status-review/[0.08] p-4 text-sm text-status-review-ink ring-1 ring-status-review/25">{PASSPORT_DISCLAIMER}</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <ButtonLink href={pageHref('review')}>Challenge this batch</ButtonLink>
        <a href={pageHref('export')} className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-forest-800 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-forest-500">
          Download the draft
        </a>
      </div>
    </>
  )
}
