import type { SourceRef } from '../../types/extraction'
import type { ClaimKind, PassportStatus } from '../../types/passport'
import { describeSource } from '../extraction/sourceRef'

export const PASSPORT_DISCLAIMER =
  'Prototype draft generated in the browser from uploaded documents. It is not certified, verified, compliant or approved by any buyer or third party, and it contains no calculated carbon footprint. Every value must be checked against its source.'

export const STATUS_LABELS: Record<PassportStatus, string> = {
  draft: 'Draft',
  evidence_incomplete: 'Evidence incomplete',
  needs_human_review: 'Needs human review',
  calculation_unavailable: 'Calculation unavailable',
  ready_for_independent_review: 'Ready for independent review',
}

export const CLAIM_LABELS: Record<ClaimKind, { label: string; meaning: string }> = {
  extracted: { label: 'Found in source', meaning: 'Read from a document; source shown.' },
  needs_review: { label: 'Needs check', meaning: 'Read from a document but uncertain or conflicting.' },
  derived: { label: 'Calculated from sources', meaning: 'Computed from values found in documents; method shown.' },
  proposed: { label: 'Proposed by user', meaning: 'Entered by a person; not source-backed.' },
  assumption: { label: 'Assumption', meaning: 'A stated assumption of this draft.' },
  missing: { label: 'Missing', meaning: 'Not established from available evidence.' },
}

export function sourceText(ref: SourceRef & { origin?: string }): string {
  const where = describeSource(ref)
  return `${ref.fileName}${where ? `, ${where}` : ''}${ref.origin === 'sample' ? ' (synthetic sample)' : ''}`
}
