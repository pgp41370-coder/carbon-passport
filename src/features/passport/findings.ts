import type { SourceRef } from '../../types/extraction'
import type { CarbonPassport } from '../../types/passport'
import type { TraceEvidence, TraceStatus } from '../../types/traceability'
import { evidenceReadiness } from './readiness'

export type FindingGroup = 'problems' | 'missing' | 'check' | 'found'

export const FINDING_ORDER: readonly FindingGroup[] = ['problems', 'missing', 'check', 'found']

export interface FindingSource {
  label: string
  value?: string
  source: SourceRef
}

export interface Finding {
  key: string
  /** Validation check ID for problems, traceability requirement ID otherwise. */
  topic: string
  status?: TraceStatus
  title: string
  where?: string
  detail: string
  sources: FindingSource[]
}

export type Findings = Record<FindingGroup, Finding[]>

function withSources(evidence: readonly TraceEvidence[]): FindingSource[] {
  return evidence.flatMap((e) => (e.source ? [{ label: e.label, value: e.value, source: e.source }] : []))
}

/** Splits the passport into plain groups, each item linked to its source locations. */
export function groupFindings(passport: CarbonPassport): Findings {
  const { requirements } = evidenceReadiness(passport)
  const toItem = (r: (typeof requirements)[number]): Finding => ({
    key: `${r.stage}-${r.id}`,
    topic: r.id,
    status: r.status,
    title: r.label,
    where: r.stage,
    detail: r.detail,
    sources: withSources(r.evidence),
  })
  return {
    problems: passport.issues.map((issue) => ({
      key: issue.id,
      topic: issue.id.split(':')[0],
      title: issue.title,
      detail: issue.detail,
      sources: issue.evidence.flatMap((claim) =>
        claim.sources.slice(0, 1).map((source) => ({ label: claim.label, value: claim.value, source })),
      ),
    })),
    missing: requirements.filter((r) => r.status === 'missing').map(toItem),
    // A link a person proposed without a document still needs someone to check it.
    check: requirements.filter((r) => r.status === 'needs_review' || r.status === 'proposed').map(toItem),
    found: requirements.filter((r) => r.status === 'supported').map(toItem),
  }
}

export function countFindings(findings: Findings): Record<FindingGroup, number> {
  return {
    problems: findings.problems.length,
    missing: findings.missing.length,
    check: findings.check.length,
    found: findings.found.length,
  }
}
