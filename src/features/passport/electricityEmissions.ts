import type { CarbonPassport, Claim } from '../../types/passport'

/**
 * Illustrative electricity emissions: kWh read from a bill × the official Indian
 * grid factor. Only electricity that a document states is used. It is never
 * allocated to the batch, nothing missing is filled in, and the result is not
 * part of the passport or its download.
 */

export const GRID_FACTOR = {
  /** tCO2 per MWh, all-India weighted average including renewables and captive injection. */
  value: 0.675,
  fiscalYear: 'FY 2025-26',
  // Fiscal year runs April to March.
  from: new Date(2025, 3, 1),
  to: new Date(2026, 2, 31),
  source: 'CEA, CO2 Baseline Database for the Indian Power Sector, Version 22.0 (August 2026), Table S, page 1',
  url: 'https://cea.nic.in/api/cdm-report-version/view-pdf/en/82',
}

export interface ElectricityLine {
  label: string
  claim?: Claim
  /** MWh read from the document, when its value is in kWh. */
  mwh?: number
  tco2?: number
  /** Why no number is shown. */
  reason?: string
}

export interface EmissionsPreview {
  lines: ElectricityLine[]
  /** Billing period start, when it could be read. */
  periodStart?: Date
  factorMatchesPeriod?: boolean
  /** Same month repeated twelve times; only offered for a one-month bill. */
  straightLineYear?: number
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

function kwhIn(claim?: Claim): number | undefined {
  if (!claim?.value || claim.kind === 'missing' || !/kwh/i.test(claim.value)) return undefined
  const n = Number(claim.value.replace(/,/g, '').match(/\d+(?:\.\d+)?/)?.[0])
  return Number.isFinite(n) && n > 0 ? n : undefined
}

function datesIn(text?: string): Date[] {
  return [...(text ?? '').matchAll(/(\d{1,2})-([A-Za-z]{3})-(\d{4})/g)].flatMap(([, d, m, y]) => {
    const month = MONTHS.indexOf(m!.toLowerCase())
    return month < 0 ? [] : [new Date(Number(y), month, Number(d))]
  })
}

const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits

export function emissionsPreview(passport: CarbonPassport): EmissionsPreview {
  const energy = (label: string) => passport.energy.find((c) => c.label === label)
  const plant = energy('Plant electricity')
  const jobWorker = energy('Job-worker heat-treatment energy')

  const line = (label: string, claim: Claim | undefined, missing: string): ElectricityLine => {
    const kwh = kwhIn(claim)
    if (kwh === undefined) return { label, claim, reason: claim?.value ? 'not in kWh, so not converted' : missing }
    return { label, claim, mwh: kwh / 1000, tco2: round((kwh / 1000) * GRID_FACTOR.value) }
  }

  const [start, end] = datesIn(energy('Plant electricity billing period')?.value)
  const days = start && end ? (end.getTime() - start.getTime()) / 86_400_000 + 1 : undefined
  const plantLine = line('Factory electricity, whole plant, this bill', plant, 'no electricity bill was read')

  return {
    lines: [plantLine, line('Job-worker furnace electricity', jobWorker, 'record missing, not treated as zero')],
    periodStart: start,
    factorMatchesPeriod: start ? start >= GRID_FACTOR.from && start <= GRID_FACTOR.to : undefined,
    straightLineYear: plantLine.tco2 !== undefined && days !== undefined && days >= 28 && days <= 31 ? round(plantLine.tco2 * 12, 1) : undefined,
  }
}
