import { Icon } from '../../components/Icon'
import type { SourceRef } from '../../types/extraction'
import type { CarbonPassport } from '../../types/passport'
import { batchEstimate, BOLT_DEFAULT, STEEL_DEFAULT } from './batchEstimate'
import { GRID_FACTOR } from './electricityEmissions'

const fmt = (n: number, digits = 2) => n.toLocaleString('en-IN', { maximumFractionDigits: digits })

const sourceButton =
  'inline-flex min-h-9 cursor-pointer items-center gap-1 text-sm font-semibold text-forest-700 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-forest-500'

/**
 * The batch carbon estimate: three lines with their arithmetic and papers, a
 * total only when every line is worked out, and the EU default for the same
 * good beside it. Labelled an estimate everywhere; nothing is verified.
 */
export function CarbonEstimate({ passport, onInspect }: { passport: CarbonPassport; onInspect: (source: SourceRef) => void }) {
  const e = batchEstimate(passport)
  const unmet = passport.calculation.prerequisites.filter((p) => !p.met)
  const below = e.perTonne !== undefined ? Math.round((1 - e.perTonne / BOLT_DEFAULT.value) * 100) : undefined

  return (
    <div className="space-y-5">
      <section aria-labelledby="estimate-title" className={`rounded-2xl p-5 sm:p-7 ${e.total !== undefined ? 'bg-forest-950 text-white' : 'border border-line bg-surface'}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="estimate-title" className={`text-sm font-medium ${e.total !== undefined ? 'text-forest-200' : 'text-ink-600'}`}>
            Batch <span className="font-mono">{passport.batchId}</span>
          </h2>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${e.total !== undefined ? 'bg-white/10 text-white' : 'bg-status-review/[0.1] text-status-review-ink ring-1 ring-status-review/30'}`}
          >
            Estimate · not verified
          </span>
        </div>

        {e.total !== undefined ? (
          <>
            <p className="mt-3 text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
              {fmt(e.total, 1)} <span className="text-2xl font-medium text-forest-200">tCO₂e</span>
            </p>
            {e.perTonne !== undefined && (
              <p className="mt-1 text-base text-forest-100">
                {fmt(e.perTonne)} tCO₂e per tonne of finished bolts ({fmt(e.finishedTonnes!, 3)} t)
              </p>
            )}
            {e.perTonne !== undefined && (
              <div className="mt-6 space-y-3" aria-label="Compared with the EU default value">
                {[
                  { label: 'This batch, from its papers', value: e.perTonne, tone: 'bg-moss-400' },
                  { label: `EU default for ${BOLT_DEFAULT.good} from India (CN ${BOLT_DEFAULT.cn})`, value: BOLT_DEFAULT.value, tone: 'bg-white/40' },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-forest-100">{bar.label}</span>
                      <span className="font-semibold tabular-nums">{fmt(bar.value)} t/t</span>
                    </div>
                    <div className="mt-1 h-2.5 rounded-sm bg-white/10">
                      <div className={`h-full rounded-sm ${bar.tone}`} style={{ width: `${(bar.value / Math.max(e.perTonne!, BOLT_DEFAULT.value)) * 100}%` }} />
                    </div>
                  </div>
                ))}
                {below !== undefined && below > 0 && (
                  <p className="text-sm text-forest-100">
                    {below}% below the default an EU importer must use when no actual data is given.
                  </p>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="mt-3 text-2xl font-semibold text-ink-900">Not worked out yet</p>
            <p className="mt-1 text-sm text-ink-700">A total is given only when every line below has its papers.</p>
            {unmet.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {unmet.map((p) => (
                  <li key={p.id} className="flex items-start gap-2 text-sm text-ink-900">
                    <Icon name="circle-dashed" className="mt-0.5 size-4 shrink-0 text-ink-500" />
                    {p.label}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </section>

      <section aria-labelledby="lines-title" className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-7">
        <h2 id="lines-title" className="text-base font-semibold text-ink-900">
          How it is worked out
        </h2>
        <ol className="mt-4 divide-y divide-line rounded-xl border border-line">
          {e.lines.map((line, i) => (
            <li key={line.id} className="px-4 py-3">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <span className="text-sm font-semibold text-ink-900">
                  {i + 1}. {line.label}
                </span>
                {line.tco2e !== undefined ? (
                  <span className="text-base font-semibold text-ink-900 tabular-nums">{fmt(line.tco2e)} tCO₂e</span>
                ) : (
                  <span className="text-sm font-semibold text-ink-600">Not worked out</span>
                )}
              </div>
              <p className="mt-1 font-mono text-xs text-ink-700">{line.formula ?? `Missing: ${line.missing}`}</p>
              {line.claims.some((c) => c.sources[0]) && (
                <div className="mt-1 flex flex-wrap gap-x-4">
                  {line.claims.flatMap((c) =>
                    c.sources[0]
                      ? [
                          <button key={c.label} type="button" onClick={() => onInspect(c.sources[0]!)} className={sourceButton}>
                            <Icon name="file-text" className="size-4" />
                            {c.label.split(' (')[0]}: {c.value}
                          </button>,
                        ]
                      : [],
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>

        <dl className="mt-5 space-y-3 text-sm">
          <div>
            <dt className="font-semibold text-ink-900">Steel factor · {STEEL_DEFAULT.value} tCO₂e per tonne of {STEEL_DEFAULT.good}</dt>
            <dd className="mt-0.5 text-ink-700">
              EU CBAM default value.{' '}
              <a href={STEEL_DEFAULT.url} target="_blank" rel="noreferrer" className="font-semibold text-forest-700 underline">
                {STEEL_DEFAULT.source}
              </a>
              .{e.steelWithMarkup !== undefined && ` A 2026 CBAM declaration using default values adds a 10% mark-up: ${fmt(e.steelWithMarkup)} tCO₂e for this steel.`} The mill’s own measured value, when it gives one, replaces the default.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-900">Electricity factor · {GRID_FACTOR.value} tCO₂ per MWh</dt>
            <dd className="mt-0.5 text-ink-700">
              <a href={GRID_FACTOR.url} target="_blank" rel="noreferrer" className="font-semibold text-forest-700 underline">
                {GRID_FACTOR.source}
              </a>
              , {GRID_FACTOR.fiscalYear}. For iron and steel the EU table gives no indirect value, so a CBAM declaration counts the steel and direct emissions; the
              electricity lines are here for the batch’s footprint.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-900">Check the CN code</dt>
            <dd className="mt-0.5 text-ink-700">
              The invoice gives HSN 7213. Boron steel such as SAE 10B21 can count as alloy steel (CN 7227, default 7.30 tCO₂e/t). Confirm the code with
              your customs broker.
            </dd>
          </div>
          <div>
            <dt className="font-semibold text-ink-900">Not included</dt>
            <dd className="mt-0.5 text-ink-700">Transport, packaging, and any fuel the papers do not show.</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}
