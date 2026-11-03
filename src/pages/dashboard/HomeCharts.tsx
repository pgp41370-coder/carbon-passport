import { Icon } from '../../components/Icon'
import { batchEstimate } from '../../features/passport/batchEstimate'
import { emissionsPreview, GRID_FACTOR } from '../../features/passport/electricityEmissions'
import { pageHref } from '../../lib/routes'
import type { CarbonPassport } from '../../types/passport'
import type { TraceStatus } from '../../types/traceability'

/**
 * Two small charts for Home, drawn from the same derived passport as every other
 * screen. Each segment and bar also carries its number as text, so nothing is
 * read from colour alone.
 */

type Bucket = 'found' | 'check' | 'missing'

const BUCKETS: { id: Bucket; label: string; fill: string }[] = [
  { id: 'found', label: 'Found', fill: 'bg-forest-500' },
  { id: 'check', label: 'Needs check', fill: 'bg-status-review' },
  { id: 'missing', label: 'Missing', fill: 'bg-status-missing' },
]

// A link someone proposed without a document still needs checking, as on the Fix screen.
const BUCKET_OF: Record<TraceStatus, Bucket> = { supported: 'found', needs_review: 'check', proposed: 'check', missing: 'missing' }

export function HomeCharts({ passport }: { passport: CarbonPassport }) {
  return (
    <section aria-label="Charts" className="grid gap-4 sm:grid-cols-2">
      <StageChart passport={passport} />
      {batchEstimate(passport).total !== undefined ? <EstimateChart passport={passport} /> : <ElectricityChart passport={passport} />}
    </section>
  )
}

function StageChart({ passport }: { passport: CarbonPassport }) {
  const rows = passport.stages.map((stage) => {
    const counts: Record<Bucket, number> = { found: 0, check: 0, missing: 0 }
    for (const r of stage.requirements) counts[BUCKET_OF[r.status]]++
    return { title: stage.title, counts, total: stage.requirements.length }
  })
  const widest = Math.max(1, ...rows.map((r) => r.total))

  return (
    <figure className="rounded-2xl border border-line bg-surface p-5">
      <figcaption className="text-sm font-semibold text-ink-900">Proof at each step of the supply chain</figcaption>
      <ul aria-hidden="true" className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-600">
        {BUCKETS.map((b) => (
          <li key={b.id} className="flex items-center gap-1.5">
            <span className={`size-2.5 rounded-sm ${b.fill}`} />
            {b.label}
          </li>
        ))}
      </ul>
      <ul className="mt-3 space-y-2.5">
        {rows.map((row) => (
          <li key={row.title}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="truncate text-ink-700">{row.title}</span>
              <span className="shrink-0 text-ink-600 tabular-nums">
                {row.counts.found} of {row.total}
              </span>
            </div>
            <div
              role="img"
              aria-label={`${row.title}: ${BUCKETS.map((b) => `${row.counts[b.id]} ${b.label.toLowerCase()}`).join(', ')}`}
              className="mt-1 flex h-2.5 gap-0.5"
              style={{ width: `${(row.total / widest) * 100}%` }}
            >
              {BUCKETS.flatMap((b) =>
                row.counts[b.id]
                  ? [
                      <span
                        key={b.id}
                        title={`${b.label}: ${row.counts[b.id]}`}
                        className={`h-full rounded-sm ${b.fill}`}
                        style={{ flexGrow: row.counts[b.id] }}
                      />,
                    ]
                  : [],
              )}
            </div>
          </li>
        ))}
      </ul>
    </figure>
  )
}

function ElectricityChart({ passport }: { passport: CarbonPassport }) {
  const lines = emissionsPreview(passport).lines
  const max = Math.max(0, ...lines.map((l) => l.tco2 ?? 0))
  const short = ['Factory (whole plant)', 'Job-worker furnace']

  return (
    <figure className="flex flex-col rounded-2xl border border-line bg-surface p-5">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink-900">Electricity emissions</span>
        <span className="text-xs text-ink-600">tCO₂ · illustrative</span>
      </figcaption>
      <ul className="mt-4 flex-1 space-y-3">
        {lines.map((l, i) => (
          <li key={l.label}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-ink-700">{short[i] ?? l.label}</span>
              <span className={`shrink-0 tabular-nums ${l.tco2 === undefined ? 'text-status-missing' : 'font-semibold text-ink-900'}`}>
                {l.tco2 === undefined ? 'Not provided' : l.tco2.toLocaleString('en-IN')}
              </span>
            </div>
            {l.tco2 !== undefined && max > 0 ? (
              <div
                role="img"
                aria-label={`${short[i] ?? l.label}: ${l.tco2} tonnes CO2`}
                title={`${l.mwh} MWh × grid factor = ${l.tco2} tCO₂`}
                className="mt-1 h-2.5 rounded-sm bg-forest-500"
                style={{ width: `${Math.max(2, (l.tco2 / max) * 100)}%` }}
              />
            ) : (
              <div aria-hidden="true" className="mt-1 h-2.5 rounded-sm border border-dashed border-status-missing/60" />
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-600">
        kWh from the papers × {GRID_FACTOR.value} tCO₂/MWh (CEA grid factor, {GRID_FACTOR.fiscalYear}). Steel is not included.
      </p>
      <a
        href={pageHref('emissions')}
        className="mt-4 inline-flex min-h-9 items-center gap-1 self-start text-xs font-semibold text-forest-700 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-forest-500"
      >
        How this is worked out
        <Icon name="arrow-right" className="size-3.5" />
      </a>
    </figure>
  )
}

/** Once every line has its papers: the batch estimate, split by where it comes from. */
function EstimateChart({ passport }: { passport: CarbonPassport }) {
  const e = batchEstimate(passport)
  const max = Math.max(...e.lines.map((l) => l.tco2e ?? 0))
  const short: Record<string, string> = { steel: 'Steel input', factory: 'Factory electricity (batch share)', job_worker: 'Job-worker furnace' }

  return (
    <figure className="flex flex-col rounded-2xl border border-line bg-surface p-5">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-ink-900">Carbon estimate</span>
        <span className="text-xs text-ink-600">tCO₂e · estimate</span>
      </figcaption>
      <p className="mt-2 text-2xl font-semibold text-ink-900 tabular-nums">
        {e.total!.toLocaleString('en-IN', { maximumFractionDigits: 1 })} <span className="text-sm font-normal text-ink-600">tCO₂e</span>
        {e.perTonne !== undefined && <span className="ml-2 text-sm font-normal text-ink-600">· {e.perTonne} per tonne</span>}
      </p>
      <ul className="mt-3 flex-1 space-y-3">
        {e.lines.map((l) => (
          <li key={l.id}>
            <div className="flex items-baseline justify-between gap-2 text-xs">
              <span className="text-ink-700">{short[l.id]}</span>
              <span className="shrink-0 font-semibold text-ink-900 tabular-nums">{l.tco2e!.toLocaleString('en-IN')}</span>
            </div>
            <div
              role="img"
              aria-label={`${short[l.id]}: ${l.tco2e} tonnes CO2e`}
              title={l.formula}
              className="mt-1 h-2.5 rounded-sm bg-forest-500"
              style={{ width: `${Math.max(2, (l.tco2e! / max) * 100)}%` }}
            />
          </li>
        ))}
      </ul>
      <a
        href={pageHref('emissions')}
        className="mt-4 inline-flex min-h-9 items-center gap-1 self-start text-xs font-semibold text-forest-700 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-forest-500"
      >
        How this is worked out
        <Icon name="arrow-right" className="size-3.5" />
      </a>
    </figure>
  )
}
