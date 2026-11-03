import type { CarbonPassport, Claim } from '../../types/passport'
import { GRID_FACTOR } from './electricityEmissions'

/**
 * A cradle-to-gate carbon estimate for one batch, worked out in the open from
 * three lines: the steel bought (at the EU's official default value), the
 * factory's electricity shared to this batch by weight, and the job-worker's
 * furnace electricity. Every input is a value read from a paper or a published
 * factor; a line with a missing input is not worked out, and no total is given
 * until every line is. It is an estimate, never a verified footprint.
 */

/** EU CBAM default embedded emissions, India, total (direct; steel has no indirect value in the table). */
export const STEEL_DEFAULT = {
  cn: '7213',
  good: 'wire rod (bars and rods, hot-rolled, in irregularly wound coils)',
  value: 4.27,
  /** CBAM certificates use the default plus a mark-up: 10 % in 2026, 20 % in 2027, 30 % from 2028. */
  markup2026: 0.1,
  source: 'Commission Implementing Regulation (EU) 2025/2621, Annex I, India, CN 7213, total emissions (unchanged by the correction in (EU) 2026/1740)',
  url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32025R2621',
}

/** The same table's default for the finished good, for comparison only. */
export const BOLT_DEFAULT = { cn: '7318 15', good: 'threaded screws and bolts', value: 5.72 }

export interface EstimateLine {
  id: 'steel' | 'factory' | 'job_worker'
  label: string
  /** The arithmetic, written out. */
  formula?: string
  tco2e?: number
  /** Papers the line rests on. */
  claims: Claim[]
  /** Why the line is not worked out. */
  missing?: string
}

export interface BatchEstimate {
  lines: EstimateLine[]
  /** Only when every line is worked out and every passport prerequisite is met. */
  total?: number
  finishedTonnes?: number
  perTonne?: number
  /** The steel line with the 2026 CBAM mark-up, as a CBAM declaration would use it. */
  steelWithMarkup?: number
}

const fmt = (n: number, digits = 2) => n.toLocaleString('en-IN', { maximumFractionDigits: digits })
const round = (n: number, digits = 2) => Math.round(n * 10 ** digits) / 10 ** digits

/** "13.000 MT" → 13, "12,150 kg" → 12.15 (tonnes). Only a single, clearly read value counts. */
export function tonnes(claim?: Claim): number | undefined {
  if (!claim?.value || claim.kind === 'missing' || claim.kind === 'needs_review') return undefined
  const match = claim.value.replace(/,/g, '').match(/^(\d+(?:\.\d+)?)\s*(kg|mt|t)\b/i)
  if (!match) return undefined
  const n = Number(match[1])
  return match[2]!.toLowerCase() === 'kg' ? n / 1000 : n
}

function kwh(claim?: Claim): number | undefined {
  if (!claim?.value || claim.kind === 'missing' || claim.kind === 'needs_review' || !/kwh/i.test(claim.value)) return undefined
  const n = Number(claim.value.replace(/,/g, '').match(/\d+(?:\.\d+)?/)?.[0])
  return Number.isFinite(n) && n > 0 ? n : undefined
}

export function batchEstimate(passport: CarbonPassport): BatchEstimate {
  const find = (label: string) => [...passport.quantities, ...passport.energy].find((c) => c.label === label)
  const steel = find('Steel purchased')
  const batchOut = find('Intermediate output (last recorded row)')
  const plantOut = find('Plant output, same month (all batches)')
  const plantKwh = find('Plant electricity')
  const jobKwh = find('Job-worker heat-treatment energy')
  const finished = find('Finished-batch output (after heat treatment)')

  const steelT = tonnes(steel)
  const steelLine: EstimateLine =
    steelT === undefined
      ? { id: 'steel', label: 'Steel input', claims: [steel].filter(Boolean) as Claim[], missing: 'no clear steel quantity on the purchase invoice' }
      : {
          id: 'steel',
          label: 'Steel input',
          formula: `${fmt(steelT, 3)} t × ${STEEL_DEFAULT.value} tCO₂e/t`,
          tco2e: round(steelT * STEEL_DEFAULT.value),
          claims: [steel!],
        }

  const kwhPlant = kwh(plantKwh)
  const batchT = tonnes(batchOut)
  const plantT = tonnes(plantOut)
  const factoryLine: EstimateLine =
    kwhPlant === undefined || batchT === undefined || plantT === undefined || plantT < batchT
      ? {
          id: 'factory',
          label: 'Factory electricity, this batch’s share',
          claims: [plantKwh, batchOut, plantOut].filter((c): c is Claim => !!c && c.kind !== 'missing'),
          missing:
            kwhPlant === undefined
              ? 'no electricity bill in kWh'
              : plantT === undefined
                ? 'the plant’s total output for the month is not on any paper, so the bill cannot be shared'
                : batchT === undefined
                  ? 'no batch output on the production log'
                  : 'the plant output is smaller than the batch output',
        }
      : (() => {
          const share = kwhPlant * (batchT / plantT)
          return {
            id: 'factory' as const,
            label: 'Factory electricity, this batch’s share',
            formula: `${fmt(kwhPlant, 0)} kWh × (${fmt(batchT * 1000, 0)} ÷ ${fmt(plantT * 1000, 0)} kg) = ${fmt(share, 0)} kWh × ${GRID_FACTOR.value} tCO₂/MWh`,
            tco2e: round((share / 1000) * GRID_FACTOR.value),
            claims: [plantKwh!, batchOut!, plantOut!],
          }
        })()

  const kwhJob = kwh(jobKwh)
  const jobLine: EstimateLine =
    kwhJob === undefined
      ? { id: 'job_worker', label: 'Job-worker furnace electricity', claims: [], missing: 'the job-worker’s energy record is missing; it is not treated as zero' }
      : {
          id: 'job_worker',
          label: 'Job-worker furnace electricity',
          formula: `${fmt(kwhJob, 0)} kWh × ${GRID_FACTOR.value} tCO₂/MWh`,
          tco2e: round((kwhJob / 1000) * GRID_FACTOR.value),
          claims: [jobKwh!],
        }

  const lines = [steelLine, factoryLine, jobLine]
  const complete = lines.every((l) => l.tco2e !== undefined) && passport.calculation.available
  const total = complete ? round(lines.reduce((sum, l) => sum + l.tco2e!, 0)) : undefined
  const finishedTonnes = tonnes(finished)
  return {
    lines,
    total,
    finishedTonnes,
    perTonne: total !== undefined && finishedTonnes ? round(total / finishedTonnes) : undefined,
    steelWithMarkup: steelLine.tco2e !== undefined ? round(steelT! * STEEL_DEFAULT.value * (1 + STEEL_DEFAULT.markup2026)) : undefined,
  }
}
