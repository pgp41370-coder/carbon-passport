import type { DocumentOrigin } from './document'
import type { IssueSeverity, SourceRef } from './extraction'
import type { TraceGap, TraceLink, TraceStage } from './traceability'

/**
 * How a passport statement is known. Kept separate so extracted values, user
 * input, assumptions and gaps can never be confused.
 */
export type ClaimKind = 'extracted' | 'needs_review' | 'derived' | 'proposed' | 'assumption' | 'missing'

export interface Claim {
  label: string
  /** Value as read, computed or entered. Absent for missing claims. */
  value?: string
  kind: ClaimKind
  /** Every source location the value appears at, first one primary. */
  sources: (SourceRef & { origin?: DocumentOrigin })[]
  note?: string
}

export type PassportStatus =
  | 'draft'
  | 'evidence_incomplete'
  | 'needs_human_review'
  | 'calculation_unavailable'
  | 'ready_for_independent_review'

export interface Prerequisite {
  id: string
  label: string
  met: boolean
  detail: string
}

export interface PassportIssue {
  id: string
  severity: IssueSeverity
  title: string
  detail: string
  evidence: Claim[]
  review?: { action: string; note: string; reviewer?: string; reviewedAt: string }
}

export interface ReviewerAction {
  scope: string
  kind: 'issue_review' | 'trace_review' | 'trace_proposal'
  note: string
  reference?: string
  reviewer?: string
  recordedAt: string
  /** False when the evidence changed after the note was written; it is then not applied. */
  applies: boolean
}

export interface EvidenceRow {
  documentId: string
  fileName: string
  origin: DocumentOrigin
  documentType: string
  claims: Claim[]
}

export interface CarbonPassport {
  batchId: string
  generatedAt: string
  statuses: PassportStatus[]
  /** True when every supporting document is from the synthetic sample pack. */
  illustrative: boolean
  identity: Claim[]
  stages: TraceStage[]
  links: TraceLink[]
  quantities: Claim[]
  boundary: Claim[]
  energy: Claim[]
  calculation: {
    available: boolean
    headline: string
    prerequisites: Prerequisite[]
  }
  issues: PassportIssue[]
  gaps: TraceGap[]
  reviewerActions: ReviewerAction[]
  evidence: EvidenceRow[]
  methodology: string[]
  assumptions: string[]
  limitations: string[]
  /** Documents that exist but could not contribute (not processed or failed). */
  excludedDocuments: { fileName: string; reason: string }[]
}
