import type { StoredDocument } from '../../types/document'
import type {
  DocumentKind,
  ExtractedField,
  ExtractionResult,
  FieldKey,
  IssueReview,
  ValidationIssue,
} from '../../types/extraction'
import type {
  CarbonPassport,
  Claim,
  EvidenceRow,
  PassportIssue,
  PassportStatus,
  Prerequisite,
  ReviewerAction,
} from '../../types/passport'
import type { TraceRecord } from '../../types/traceability'
import { KIND_LABELS } from '../extraction/classify'
import { runValidation } from '../evidence/validation'
import { buildTrace } from '../traceability/buildTrace'

/**
 * Assembles the draft passport from stored documents, extraction results, issue
 * reviews and traceability records. Pure and recomputed on every load, so a
 * removed source can never survive as a claim. No value is hard-coded: anything
 * the documents do not provide is reported as missing.
 */

export const NOT_ESTABLISHED = 'Not established from available evidence.'
export const CALCULATION_INCOMPLETE = 'Calculation incomplete — insufficient verified inputs'

const REVIEW_LABELS: Record<IssueReview['action'], string> = {
  follow_up: 'Discrepancy confirmed in the source: follow-up needed',
  explained: 'Explanation recorded',
  extraction_error: 'Reading looks wrong: the source says something else',
}

function field(result: ExtractionResult, key: FieldKey): ExtractedField | undefined {
  const f = result.fields.find((candidate) => candidate.key === key)
  return f && f.status !== 'not_detected' && f.value ? f : undefined
}

/** "Found as the computed: sum of …" → "Computed: sum of …" */
const computedNote = (f: ExtractedField) => f.method?.replace(/^Found as the computed: /, 'Computed: ')

const withUnit = (f: ExtractedField) =>
  f.unit && !f.value!.toLowerCase().includes(f.unit.toLowerCase()) ? `${f.value} ${f.unit}` : f.value!

/** One claim for a field across documents; several distinct values make it "needs review". */
function claimFrom(label: string, results: ExtractionResult[], key: FieldKey, note?: string, missingNote?: string): Claim {
  const hits = results.flatMap((r) => {
    const f = field(r, key)
    return f ? [{ r, f }] : []
  })
  if (hits.length === 0) return { label, kind: 'missing', sources: [], note: missingNote ?? NOT_ESTABLISHED }
  const values = [...new Set(hits.map(({ f }) => f.normalized))]
  const derived = hits.some(({ f }) => f.method?.includes('computed'))
  const uncertain = values.length > 1 || hits.some(({ f }) => f.status === 'needs_review')
  return {
    label,
    value: values.length > 1 ? hits.map(({ f }) => withUnit(f)).join(' / ') : withUnit(hits[0]!.f),
    kind: uncertain ? 'needs_review' : derived ? 'derived' : 'extracted',
    sources: hits.map(({ r, f }) => ({ ...f.source!, origin: r.origin })),
    note: [
      values.length > 1 ? `${values.length} different values were found.` : undefined,
      hits.find(({ f }) => f.reviewReason)?.f.reviewReason,
      derived ? computedNote(hits[0]!.f) : undefined,
      note,
    ]
      .filter(Boolean)
      .join(' '),
  }
}

export interface PassportInput {
  documents: readonly StoredDocument[]
  results: readonly ExtractionResult[]
  issueReviews: readonly IssueReview[]
  traceRecords: readonly TraceRecord[]
  batchId: string
  now?: string
}

export function buildPassport({ documents, results, issueReviews, traceRecords, batchId, now }: PassportInput): CarbonPassport {
  const existing = new Set(documents.map((d) => d.id))
  const current = results.filter((r) => existing.has(r.documentId))
  const trace = buildTrace(documents, current, batchId, traceRecords)

  // Documents the trace uses for this batch.
  const batchDocIds = new Set(trace.stages.flatMap((s) => s.documents.map((d) => d.documentId)))
  const inBatch = current.filter((r) => batchDocIds.has(r.documentId) && r.status !== 'failed')
  const ofKind = (kind: DocumentKind) => inBatch.filter((r) => r.detectedType.kind === kind)
  const certs = ofKind('mill_test_certificate')
  const invoices = ofKind('purchase_invoice')
  const logs = ofKind('production_log')
  const bills = ofKind('electricity_bill')
  const challans = ofKind('job_work_challan')
  const energyDocs = ofKind('job_worker_energy')
  const dispatches = ofKind('dispatch_record')

  // ── 1. Identity ────────────────────────────────────────────────────────────
  const batchClaim = claimFrom('Batch ID', inBatch, 'batchId')
  const identity: Claim[] = [
    { ...batchClaim, value: batchClaim.value ?? batchId, note: [`Referenced in ${batchClaim.sources.length} source location${batchClaim.sources.length === 1 ? '' : 's'}.`, batchClaim.note].filter(Boolean).join(' ') },
    claimFrom('Product (as dispatched)', dispatches, 'material', undefined, 'No product description was read from a dispatch record.'),
    claimFrom('Input material', invoices, 'material', undefined, 'No material description was read from a purchase invoice.'),
    claimFrom('Steel heat number (mill certificate)', certs, 'heatNumber', undefined, 'No mill test certificate heat number was read.'),
    claimFrom('Steel supplier (certificate heading)', certs, 'supplierName', undefined, 'No supplier name was read.'),
    claimFrom('Heat-treatment job-worker', challans, 'jobWorkerName', undefined, 'No job-worker was read from a challan.'),
  ]

  // ── 3. Quantities and boundary ─────────────────────────────────────────────
  const quantities: Claim[] = [
    claimFrom('Steel purchased', invoices, 'quantity', 'Quantity on the purchase invoice.', 'No purchased quantity was read.'),
    claimFrom(
      'Intermediate output (last recorded row)',
      logs,
      'outputQuantity',
      'Recorded in the production log before heat treatment. Not the finished-batch output.',
      'No output was read from a production log.',
    ),
    claimFrom('Sent for heat treatment', challans, 'quantity', 'Quantity on the job-work challan.', 'No quantity was read from a job-work challan.'),
    {
      label: 'Finished-batch output (after heat treatment)',
      kind: 'missing',
      sources: [],
      note: `${NOT_ESTABLISHED} No document records the quantity after heat treatment.`,
    },
    claimFrom(
      'Dispatched quantity',
      dispatches,
      'quantity',
      'What was dispatched, not a measured production output. Quantities returned from heat treatment are not reconciled.',
      'No dispatched quantity was read.',
    ),
  ]

  const boundary: Claim[] = [
    {
      label: 'Declared reporting boundary',
      kind: 'missing',
      sources: [],
      note: 'No boundary (for example cradle-to-gate) has been documented for this draft.',
    },
    {
      label: 'Stages with any supporting evidence',
      value: trace.stages.filter((s) => s.documents.length > 0).map((s) => s.title).join(', ') || 'None',
      kind: 'derived',
      sources: [],
      note: 'Lists where evidence exists. This is not a declared boundary.',
    },
    {
      label: 'Declared unit for reporting',
      kind: 'missing',
      sources: [],
      note: 'No declared unit (for example per tonne of finished fasteners) has been documented.',
    },
  ]

  // ── 4. Energy and activity data ────────────────────────────────────────────
  const plant = claimFrom('Plant electricity', bills, 'electricityConsumption', undefined, 'No plant electricity bill was read.')
  const period = claimFrom('Plant electricity billing period', bills, 'billingPeriod', undefined, 'No billing period was read.')
  const energy: Claim[] = [
    { ...plant, note: [plant.note, plant.value ? 'Allocation to this batch: not allocated. The bill covers the whole plant for the billing period and no allocation method is documented.' : undefined].filter(Boolean).join(' ') },
    period,
    energyDocs.length
      ? claimFrom('Job-worker heat-treatment energy', energyDocs, 'electricityConsumption', 'Allocation to this batch: not documented.')
      : {
          label: 'Job-worker heat-treatment energy',
          kind: 'missing',
          sources: [],
          note: 'Not provided. Heat-treatment energy is unknown and is not treated as zero.',
        },
  ]

  // ── 5. Calculation prerequisites ───────────────────────────────────────────
  const validation = runValidation(current)
  const issueInBatch = (issue: ValidationIssue) => issue.documentIds.length === 0 || issue.documentIds.some((id) => batchDocIds.has(id))
  const openIssues = validation.issues.filter(issueInBatch)
  const heatMismatch = openIssues.some((i) => i.checkId === 'heat-number-match')

  const prerequisites: Prerequisite[] = [
    {
      id: 'finished-output',
      label: 'Confirmed finished-batch output',
      met: false,
      detail: NOT_ESTABLISHED,
    },
    {
      id: 'job-worker-energy',
      label: 'Job-worker heat-treatment energy for this job',
      met: energy[2]!.kind === 'extracted',
      detail: energy[2]!.kind === 'missing' ? 'Missing. Not treated as zero.' : energy[2]!.kind === 'extracted' ? 'Present.' : 'Present but needs review.',
    },
    {
      id: 'allocation',
      label: 'Documented allocation of plant electricity to this batch',
      met: false,
      detail: plant.value ? 'Plant-level bill present; no allocation method documented.' : 'No plant electricity data.',
    },
    {
      id: 'steel-input',
      label: 'Steel input traceable to its certificate',
      met: certs.length > 0 && !heatMismatch,
      detail: certs.length === 0 ? 'No mill test certificate.' : heatMismatch ? 'Heat-number mismatch unresolved.' : 'Heat numbers agree.',
    },
    {
      id: 'emission-factors',
      label: 'Emission factors with documented sources',
      met: false,
      detail: 'None provided. This prototype does not supply emission factors.',
    },
    {
      id: 'methodology',
      label: 'Declared boundary, unit and calculation methodology',
      met: false,
      detail: 'Not documented.',
    },
  ]
  const calculationAvailable = prerequisites.every((p) => p.met)

  // ── 6. Issues, gaps and reviewer actions ───────────────────────────────────
  const reviewsById = new Map(issueReviews.map((r) => [r.issueId, r]))
  const issues: PassportIssue[] = openIssues.map((issue) => {
    const review = reviewsById.get(issue.id)
    return {
      id: issue.id,
      severity: issue.severity,
      title: issue.title,
      detail: issue.detail,
      evidence: issue.evidence.map((e) => ({
        label: e.label,
        value: e.value,
        kind: e.value ? 'extracted' : 'missing',
        sources: e.source ? [{ ...e.source, origin: e.origin }] : [],
      })),
      review:
        review && review.fingerprint === issue.fingerprint
          ? { action: REVIEW_LABELS[review.action], note: review.note, reviewer: review.reviewer, reviewedAt: review.reviewedAt }
          : undefined,
    }
  })

  const reviewerActions: ReviewerAction[] = [
    ...issues.flatMap((issue) =>
      issue.review
        ? [{ scope: issue.title, kind: 'issue_review' as const, note: `${issue.review.action}. ${issue.review.note}`.trim(), reviewer: issue.review.reviewer, recordedAt: issue.review.reviewedAt, applies: true }]
        : [],
    ),
    ...Object.values(trace.records).map((state) => ({
      scope: trace.links.find((l) => l.id === state!.record.linkId)?.title ?? state!.record.linkId,
      kind: state!.record.kind === 'proposal' ? ('trace_proposal' as const) : ('trace_review' as const),
      note: state!.record.note,
      reference: state!.record.proposedReference,
      reviewer: state!.record.reviewer,
      recordedAt: state!.record.recordedAt,
      applies: state!.active,
    })),
  ]

  // ── 7. Evidence register ───────────────────────────────────────────────────
  const evidence: EvidenceRow[] = inBatch.map((r) => ({
    documentId: r.documentId,
    fileName: r.fileName,
    origin: r.origin,
    documentType: KIND_LABELS[r.detectedType.kind],
    claims: r.fields.map((f) =>
      f.status === 'not_detected' || !f.value
        ? { label: f.label, kind: 'missing' as const, sources: [], note: 'Not detected in this document.' }
        : {
            label: f.label,
            value: withUnit(f),
            kind: f.status === 'needs_review' ? ('needs_review' as const) : f.method?.includes('computed') ? ('derived' as const) : ('extracted' as const),
            sources: [{ ...f.source!, origin: r.origin }],
            note: f.reviewReason ?? (f.method?.includes('computed') ? computedNote(f) : undefined),
          },
    ),
  }))

  const excludedDocuments = [
    ...trace.unprocessed.map((d) => ({ fileName: d.fileName, reason: 'Not processed yet' })),
    ...current.filter((r) => r.status === 'failed').map((r) => ({ fileName: r.fileName, reason: `Extraction failed: ${r.error?.message ?? 'unknown error'}` })),
    ...trace.otherBatchDocuments.map((fileName) => ({ fileName, reason: 'Refers to a different batch' })),
  ]

  // ── 8. Methodology, assumptions, limitations ───────────────────────────────
  const noBatchRef = inBatch.filter((r) => !field(r, 'batchId')).map((r) => KIND_LABELS[r.detectedType.kind].toLowerCase())
  const assumptions = [
    noBatchRef.length
      ? `Documents without a batch reference (${[...new Set(noBatchRef)].join(', ')}) are included because of their document type, not because they name this batch.`
      : undefined,
    certs.length ? 'The steel supplier is the company named in the certificate heading; it is read by position and needs confirmation.' : undefined,
    dispatches.some((r) => field(r, 'quantity')?.method?.includes('computed'))
      ? 'Dispatched quantity is the sum of the dispatch rows for this batch.'
      : undefined,
  ].filter((a): a is string => !!a)

  const methodology = [
    'Documents were read in the browser: PDF text with PDF.js, scanned pages and images with Tesseract.js OCR, CSV with Papa Parse and Excel with SheetJS.',
    'Fields were mapped by deterministic label and position rules. Each value keeps its source file and page/line or sheet/row/column.',
    'Validation checks compared heat numbers, batch references and required quantities across documents, and checked for job-worker energy evidence.',
    'The supply chain was assembled from those values. Links are marked supported by source, needs review, missing evidence or proposed by user.',
    'No emissions were calculated. No emission factors, allocation method or boundary are part of this draft.',
  ]

  const limitations = [
    'This is a prototype draft. It is not certified, verified, compliant or approved by any buyer or third party.',
    'Supported by source means a document contains the value; it does not mean the value has been independently checked.',
    'OCR and rule-based extraction can misread values. Inspect each source before relying on it.',
    'Stockist documents, return challans and finished-output records are not recognised automatically yet.',
    'Review notes record a person’s judgement and are not verification.',
  ]

  // ── Status ─────────────────────────────────────────────────────────────────
  const missingGaps = trace.gaps.filter((g) => g.status === 'missing')
  const needsReview = issues.length > 0 || trace.gaps.some((g) => g.status !== 'missing') || inBatch.some((r) => r.fields.some((f) => f.status === 'needs_review'))
  const statuses: PassportStatus[] = ['draft']
  if (missingGaps.length || excludedDocuments.length) statuses.push('evidence_incomplete')
  if (needsReview) statuses.push('needs_human_review')
  if (!calculationAvailable) statuses.push('calculation_unavailable')
  if (calculationAvailable && !missingGaps.length && !issues.some((i) => i.severity === 'high')) statuses.push('ready_for_independent_review')

  return {
    batchId,
    generatedAt: now ?? new Date().toISOString(),
    statuses,
    illustrative: inBatch.length > 0 && inBatch.every((r) => r.origin === 'sample'),
    identity,
    stages: trace.stages,
    links: trace.links,
    quantities,
    boundary,
    energy,
    calculation: {
      available: calculationAvailable,
      headline: calculationAvailable ? 'Prerequisites documented' : CALCULATION_INCOMPLETE,
      prerequisites,
    },
    issues,
    gaps: trace.gaps,
    reviewerActions,
    evidence,
    methodology,
    assumptions,
    limitations,
    excludedDocuments,
  }
}
