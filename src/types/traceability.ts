import type { DocumentOrigin } from './document'
import type { DocumentKind, FieldStatus, SourceRef } from './extraction'

/**
 * Evidence status for a stage, requirement or hand-off. There is deliberately no
 * "verified" state: the app can only say whether a source document supports a link.
 */
export type TraceStatus = 'supported' | 'needs_review' | 'missing' | 'proposed'

export type StageId = 'mill' | 'stockist' | 'factory' | 'job_worker' | 'finished_batch'

export type LinkId = 'mill-stockist' | 'stockist-factory' | 'factory-job_worker' | 'job_worker-finished_batch'

export interface TraceEvidence {
  label: string
  value?: string
  source?: SourceRef
  origin?: DocumentOrigin
  /** Status of the extracted field the value came from, if any. */
  fieldStatus?: FieldStatus
}

export interface TraceRequirement {
  id: string
  label: string
  status: TraceStatus
  detail: string
  evidence: TraceEvidence[]
}

export interface TraceDocumentRef {
  documentId: string
  fileName: string
  origin: DocumentOrigin
  kind: DocumentKind
}

export interface TraceStage {
  id: StageId
  order: number
  title: string
  role: string
  status: TraceStatus
  /** One-line headline for the chain view, e.g. "Heat no. 24A-1187". */
  headline: string
  /** True when every supporting document is from the synthetic sample pack. */
  illustrative: boolean
  requirements: TraceRequirement[]
  documents: TraceDocumentRef[]
}

export interface TraceLink {
  id: LinkId
  from: StageId
  to: StageId
  title: string
  status: TraceStatus
  /** The source-backed reference that ties the two stages, or what is absent. */
  reference: string
  evidence: TraceEvidence[]
  nextAction: string
  illustrative: boolean
  /** Documents the link currently rests on. */
  documentIds: string[]
  /** Changes whenever the link's evidence changes; user records only apply to a matching value. */
  fingerprint: string
}

export interface TraceGap {
  id: string
  stageId: StageId
  status: Exclude<TraceStatus, 'supported'>
  text: string
}

export interface TraceView {
  batchId: string
  stages: TraceStage[]
  links: TraceLink[]
  gaps: TraceGap[]
  /** Documents in storage that have no current extraction result. */
  unprocessed: { documentId: string; fileName: string }[]
}

/**
 * A person's note on a hand-off. A "proposal" asserts a link that no source
 * document supports; it is always shown as proposed, never as supported.
 */
export interface TraceRecord {
  /** `${batchId}:${linkId}`: one record per hand-off, so saving again replaces it. */
  id: string
  batchId: string
  linkId: LinkId
  kind: 'review' | 'proposal'
  /** For proposals: the reference the user believes links the stages (e.g. a trader invoice no.). */
  proposedReference?: string
  note: string
  reviewer?: string
  recordedAt: string
  /** Link fingerprint when recorded; a different current value means the note has lapsed. */
  fingerprint: string
  /** Documents the link rested on when recorded; removing one deletes the record. */
  documentIds: string[]
}
