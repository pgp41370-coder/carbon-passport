import { Icon } from '../../components/Icon'
import { switchRole, type RoleId } from '../../features/roles/roles'

/**
 * The plan after the Ludhiana proof, as the team set it out (deck slide 05 and
 * the final report's roadmap). Every number here is a target, not a result, and
 * Phases 2 and 3 are not built: the role previews only show the idea.
 */

const PHASES: {
  phase: string
  title: string
  when: string
  line: string
  points: string[]
  preview?: { role: RoleId; label: string }
  now?: boolean
}[] = [
  {
    phase: 'Phase 1',
    title: 'Ludhiana proof',
    when: '0 – 18 months',
    line: 'Steel-fastener exporters in one cluster',
    points: ['Validate · pilot on real papers with 5 exporters', 'Commercialise · 50 paying subscribers', 'Replicate · a playbook for new clusters'],
    now: true,
  },
  {
    phase: 'Phase 2',
    title: 'Expert network',
    when: 'After the Phase 1 gate',
    line: 'Consultants serve MSMEs for a fee',
    points: ['One case view across all their MSME clients', 'They see only what each client chooses to share', 'Option: the industry association runs a shared vault, never owning the data'],
    preview: { role: 'consultant', label: 'Preview the consultant view' },
  },
  {
    phase: 'Phase 3',
    title: 'Importer workspace',
    when: 'After Phase 2',
    line: 'EU buyers track their suppliers',
    points: ['Every supplier’s passport in one place', 'Read-only links that expire', 'A verifier only sees the evidence pack, so it stays independent'],
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

      <ol className="grid gap-4 lg:grid-cols-3">
        {PHASES.map((p, i) => (
          <li
            key={p.phase}
            className={`relative flex flex-col rounded-2xl p-5 sm:p-6 ${p.now ? 'bg-forest-950 text-white' : 'border border-line bg-surface shadow-[0_1px_2px_rgb(21_26_24/0.04)]'}`}
          >
            {i > 0 && (
              <span aria-hidden="true" className="absolute top-1/2 -left-3.5 hidden size-7 -translate-y-1/2 place-items-center rounded-full bg-canvas text-ink-500 ring-1 ring-line lg:grid">
                <Icon name="arrow-right" className="size-4" />
              </span>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs font-semibold tracking-wide uppercase ${p.now ? 'text-moss-400' : 'text-forest-700'}`}>{p.phase}</p>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.now ? 'bg-white/10 text-white' : 'bg-canvas text-ink-600 ring-1 ring-line'}`}
              >
                {p.now ? 'Now' : 'Planned, not built'}
              </span>
            </div>
            <h2 className={`mt-3 text-xl font-semibold tracking-tight ${p.now ? 'text-white' : 'text-ink-900'}`}>{p.title}</h2>
            <p className={`mt-1 text-sm ${p.now ? 'text-forest-200' : 'text-ink-600'}`}>
              {p.line} · {p.when}
            </p>
            <ul className="mt-4 flex-1 space-y-2">
              {p.points.map((point) => (
                <li key={point} className={`flex items-start gap-2 text-sm ${p.now ? 'text-forest-50' : 'text-ink-900'}`}>
                  <Icon name="check" className={`mt-0.5 size-4 shrink-0 ${p.now ? 'text-moss-400' : 'text-forest-600'}`} />
                  {point}
                </li>
              ))}
            </ul>
            {p.preview && (
              <button
                type="button"
                onClick={() => switchRole(p.preview!.role)}
                className="mt-5 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 self-start rounded-xl px-4 text-sm font-semibold text-forest-800 ring-1 ring-forest-200 transition-colors duration-150 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
              >
                {p.preview.label}
                <Icon name="arrow-right" className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ol>

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
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="text-xs font-semibold tracking-wide text-ink-600 uppercase">Built on the way</h3>
          <ul className="mt-3 flex flex-wrap gap-2">
            {BUILT_ON_THE_WAY.map((item) => (
              <li key={item} className="rounded-full bg-canvas px-3 py-1.5 text-sm text-ink-700 ring-1 ring-line">
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <p className="text-xs text-ink-600">Source: team go-to-market plan and stage-gate targets (deck, slide 05) and the final report’s roadmap. Targets, not results.</p>
    </div>
  )
}
