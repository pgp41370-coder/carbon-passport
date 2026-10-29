import type { CarbonPassport } from '../../types/passport'
import type { TraceRequirement, TraceStatus } from '../../types/traceability'

export interface EvidenceReadiness {
  total: number
  counts: Record<TraceStatus, number>
  requirements: (TraceRequirement & { stage: string })[]
}

/**
 * Counts the traceability requirements of the passport by evidence status. This is
 * the only readiness measure in the app: it is not a percentage score, and review
 * notes never change a requirement's status.
 */
export function evidenceReadiness(passport: CarbonPassport): EvidenceReadiness {
  const requirements = passport.stages.flatMap((stage) => stage.requirements.map((r) => ({ ...r, stage: stage.title })))
  const counts: Record<TraceStatus, number> = { supported: 0, needs_review: 0, missing: 0, proposed: 0 }
  for (const r of requirements) counts[r.status]++
  return { total: requirements.length, counts, requirements }
}
