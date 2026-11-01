import { Icon } from '../../components/Icon'
import type { SourceRef } from '../../types/extraction'
import type { CarbonPassport } from '../../types/passport'
import { emissionsPreview, GRID_FACTOR } from './electricityEmissions'

const fmt = (n: number, digits = 2) => n.toLocaleString('en-IN', { maximumFractionDigits: digits })

/**
 * Electricity-only emissions worked out in the open: bill kWh × the official
 * grid factor. Shown beside the passport, never inside it, and never as the
 * batch's carbon footprint.
 */
export function EmissionsPreview({ passport, onInspect }: { passport: CarbonPassport; onInspect: (source: SourceRef) => void }) {
  const p = emissionsPreview(passport)
  return (
    <section aria-labelledby="emissions-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="emissions-title" className="text-base font-semibold text-ink-900">
          Batch <span className="font-mono">{passport.batchId}</span>
        </h2>
        <span className="rounded-full bg-status-review/[0.1] px-2.5 py-1 text-xs font-semibold text-status-review-ink ring-1 ring-status-review/30">
          Illustrative · not part of the passport
        </span>
      </div>
      <p className="mt-2 text-sm text-ink-700">
        Only electricity a document states, times India’s official grid factor. Nothing missing is filled in.
      </p>

      <ul className="mt-4 divide-y divide-line rounded-xl border border-line">
        {p.lines.map((l) => (
          <li key={l.label} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
            <span className="w-full text-sm text-ink-600 sm:w-56">{l.label}</span>
            {l.tco2 !== undefined && l.mwh !== undefined ? (
              <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <span className="font-mono text-sm text-ink-700">
                  {fmt(l.mwh, 3)} MWh × {GRID_FACTOR.value} =
                </span>
                <span className="text-base font-semibold text-ink-900 tabular-nums">{fmt(l.tco2)} tCO₂</span>
                {l.claim?.sources[0] && (
                  <button
                    type="button"
                    onClick={() => onInspect(l.claim!.sources[0]!)}
                    className="ml-auto inline-flex min-h-9 cursor-pointer items-center gap-1 text-sm font-semibold text-forest-700 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-forest-500"
                  >
                    <Icon name="file-text" className="size-4" />
                    Source<span className="sr-only"> for {l.label}</span>
                  </button>
                )}
              </span>
            ) : (
              <span className="flex-1 text-sm font-semibold text-status-missing">Not calculated: {l.reason}</span>
            )}
          </li>
        ))}
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
          <span className="w-full text-sm text-ink-600 sm:w-56">Steel input (usually the largest part)</span>
          <span className="flex-1 text-sm font-semibold text-status-missing">Not calculated: needs the mill’s own emissions data</span>
        </li>
        <li className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
          <span className="w-full text-sm text-ink-600 sm:w-56">Share for this batch</span>
          <span className="flex-1 text-sm font-semibold text-status-missing">Not calculated: no allocation method documented</span>
        </li>
      </ul>

      {p.straightLineYear !== undefined && (
        <p className="mt-4 rounded-xl bg-canvas px-4 py-3 text-sm text-ink-700">
          <span className="font-semibold text-ink-900">Simple year view:</span> {fmt(p.lines[0]!.tco2!)} tCO₂ × 12 months ={' '}
          <span className="font-semibold text-ink-900 tabular-nums">{fmt(p.straightLineYear, 1)} tCO₂</span> for the whole plant, if every month used
          the same as this bill. A real forecast needs 12 months of bills.
        </p>
      )}

      <p className="mt-4 text-xs text-ink-600">
        Factor: {GRID_FACTOR.value} tCO₂/MWh, all-India weighted average for {GRID_FACTOR.fiscalYear}. Source:{' '}
        <a href={GRID_FACTOR.url} target="_blank" rel="noreferrer" className="font-semibold text-forest-700 underline">
          {GRID_FACTOR.source}
        </a>
        .{p.factorMatchesPeriod === false && ' The bill is from a different year than the factor.'} Location-based Scope 2 only.
      </p>
    </section>
  )
}
