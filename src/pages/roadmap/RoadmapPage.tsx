import type { ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { switchRole, type RoleId } from '../../features/roles/roles'

/**
 * The plan after the Ludhiana proof, as the team set it out: the deck (slide 05)
 * names the phases, and the final report's persona table, revenue streams and
 * roadmap give what is in each. Every number is a target or a quote, never a
 * result, and Phases 2 and 3 are not built: the role previews only show the idea.
 */

interface Phase {
  phase: string
  title: string
  line: string
  rows: { label: string; body: ReactNode }[]
  preview: { role: RoleId; label: string }
}

const PHASES: Phase[] = [
  {
    phase: 'Phase 2',
    title: 'Expert network',
    line: 'Consultants serve MSMEs for a fee',
    rows: [
      { label: 'For', body: 'CBAM consultants and verifiers who look after many exporters. Today they quote ₹0.5–3 lakh per exporter a year.' },
      { label: 'Their problem today', body: 'Data is collected by hand, with no standard format.' },
      {
        label: 'What they get',
        body: (
          <ul className="list-disc space-y-1 pl-4">
            <li>One case view across all their MSME clients</li>
            <li>Every value with its source, every open problem, and what still blocks a carbon number</li>
            <li>Only what each client chooses to share</li>
          </ul>
        ),
      },
      {
        label: 'Shared once, used many times',
        body: 'A job-worker shares a record once, with consent, with every MSME it serves. Optionally the industry association runs this cluster vault; it never owns the data.',
      },
      { label: 'How it earns', body: 'Consultant seats (paid by consultants) and a cluster licence (paid by the association). Neither is counted in our 3-year numbers.' },
      { label: 'Our role', body: 'We do not replace the consultant. We cut the paper-chasing; the consultant still does the final calculation and verification.' },
    ],
    preview: { role: 'consultant', label: 'Preview the consultant view' },
  },
  {
    phase: 'Phase 3',
    title: 'Importer workspace',
    line: 'EU buyers track their suppliers',
    rows: [
      { label: 'For', body: 'EU importers buying steel goods from Indian MSMEs.' },
      { label: 'Their problem today', body: 'Inconsistent data from suppliers and many follow-ups.' },
      {
        label: 'What they get',
        body: (
          <ul className="list-disc space-y-1 pl-4">
            <li>Every Indian supplier’s passport in one place</li>
            <li>Draft facts and status only, never the supplier’s internal notes</li>
            <li>Read-only links that expire</li>
            <li>Each batch’s estimate beside the EU default, and the four verifier questions</li>
          </ul>
        ),
      },
      { label: 'Stays independent', body: 'A verifier is never a user. It only receives the evidence pack.' },
      { label: 'How it earns', body: 'Not priced yet. Importers already pay for CBAM software: Dubrink starts at €1,990 a year.' },
    ],
    preview: { role: 'buyer', label: 'Preview the EU buyer view' },
  },
]

// Stage-gate targets at 12–18 months (Replicate), from the team's success scorecard.
const GATE: [string, string][] = [
  ['≥ 150', 'paying and active subscribers'],
  ['≥ 60%', 'pilot users who pay'],
  ['≥ 85%', 'make one passport a month'],
  ['≥ 60%', 'renew each year'],
  ['≥ 80%', 'suppliers sending data'],
]

const BUILT_ON_THE_WAY = ['Sign-ins for suppliers and job-workers', 'Many orders at once', 'WhatsApp Business messages', 'Hosting in AWS Mumbai', 'CBAM default values and versioned factors']

export function RoadmapPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight text-ink-900 outline-none sm:text-3xl">
          What comes next
        </h1>
        <p className="mt-2 text-base text-ink-600">Phases 2 and 3 start only after the Ludhiana stage gate is met.</p>
      </header>

      <section aria-labelledby="phase-1" className="rounded-2xl bg-forest-950 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-wide text-moss-400 uppercase">Phase 1 · 0 – 18 months</p>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">Now</span>
        </div>
        <h2 id="phase-1" className="mt-2 text-xl font-semibold tracking-tight">
          Ludhiana proof · steel-fastener exporters in one cluster
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ['Validate · 3–6 months', 'Pilot on real papers with 5 exporters'],
            ['Commercialise · 6–12 months', '50 paying and active subscribers'],
            ['Replicate · 12–18 months', 'A playbook for new clusters'],
          ].map(([stage, goal]) => (
            <li key={stage} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <p className="text-xs font-semibold text-forest-200">{stage}</p>
              <p className="mt-1 text-sm text-white">{goal}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="gate-title" className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-6">
        <h2 id="gate-title" className="text-base font-semibold text-ink-900">
          The gate before Phase 2 · targets at 12 – 18 months
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {GATE.map(([value, label]) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd className="text-2xl font-semibold text-ink-900 tabular-nums">{value}</dd>
              <dd className="mt-0.5 text-xs text-ink-600">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {PHASES.map((p) => (
          <section key={p.phase} aria-labelledby={`${p.phase}-title`} className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-wide text-forest-700 uppercase">{p.phase}</p>
              <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-ink-600 ring-1 ring-line">Planned, not built</span>
            </div>
            <h2 id={`${p.phase}-title`} className="mt-2 text-xl font-semibold tracking-tight text-ink-900">
              {p.title}
            </h2>
            <p className="mt-1 text-sm text-ink-600">{p.line}</p>
            <dl className="mt-4 flex-1 divide-y divide-line">
              {p.rows.map((row) => (
                <div key={row.label} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <dt className="text-xs font-semibold text-ink-600">{row.label}</dt>
                  <dd className="text-sm text-ink-900">{row.body}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              onClick={() => switchRole(p.preview.role)}
              className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 self-start rounded-xl px-4 text-sm font-semibold text-forest-800 ring-1 ring-forest-200 transition-colors duration-150 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
            >
              {p.preview.label}
              <Icon name="arrow-right" className="size-4" />
            </button>
          </section>
        ))}
      </div>

      <section aria-labelledby="built-title">
        <h2 id="built-title" className="text-xs font-semibold tracking-wide text-ink-600 uppercase">
          Built on the way
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {BUILT_ON_THE_WAY.map((item) => (
            <li key={item} className="rounded-full bg-surface px-3 py-1.5 text-sm text-ink-700 ring-1 ring-line">
              {item}
            </li>
          ))}
        </ul>
      </section>

      <p className="text-xs text-ink-600">
        Sources: team go-to-market plan and stage-gate targets (deck, slide 05); final report: persona table, revenue streams, roadmap and competitor
        table (Dubrink price from a third-party review, checked 23 Oct 2026); consultant quotes from our interviews with 5 exporters. Targets, not results.
      </p>
    </div>
  )
}
