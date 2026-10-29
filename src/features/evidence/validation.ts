import type {
  CheckResult,
  DocumentKind,
  ExtractedField,
  ExtractionResult,
  FieldKey,
  IssueEvidence,
  ValidationIssue,
} from '../../types/extraction'
import { fingerprint } from '../../lib/fingerprint'

/**
 * Deterministic cross-document checks over stored extraction results. Checks only
 * compare values that were actually extracted; they never fill gaps or correct values.
 */

interface FieldHit {
  result: ExtractionResult
  field: ExtractedField
}

const usable = (results: readonly ExtractionResult[]) => results.filter((r) => r.status !== 'failed')
const ofKind = (results: readonly ExtractionResult[], kind: DocumentKind) =>
  results.filter((r) => r.detectedType.kind === kind)

function fieldOf(result: ExtractionResult, key: FieldKey): ExtractedField | undefined {
  return result.fields.find((f) => f.key === key)
}

const hasValue = (field: ExtractedField | undefined): field is ExtractedField & { value: string; normalized: string } =>
  !!field && field.status !== 'not_detected' && field.value !== undefined && field.normalized !== undefined

function evidenceFor({ result, field }: FieldHit, label: string): IssueEvidence {
  return { label, value: field.value, source: field.source, origin: result.origin }
}

function issue(
  base: Omit<ValidationIssue, 'fingerprint' | 'createdAt' | 'documentIds'> & { documentIds: string[] },
  fingerprintParts: string[],
  now: string,
): ValidationIssue {
  return { ...base, documentIds: [...new Set(base.documentIds)], fingerprint: fingerprint(fingerprintParts), createdAt: now }
}

export interface ValidationOutcome {
  checks: CheckResult[]
  issues: ValidationIssue[]
}

export function runValidation(allResults: readonly ExtractionResult[], now = new Date().toISOString()): ValidationOutcome {
  const results = usable(allResults)
  const checks: CheckResult[] = []
  const issues: ValidationIssue[] = []

  // 1. Heat number: mill test certificate vs job-work challan.
  {
    const certs = ofKind(results, 'mill_test_certificate')
    const challans = ofKind(results, 'job_work_challan')
    const title = 'Heat number: mill certificate vs job-work challan'
    if (certs.length === 0 || challans.length === 0) {
      checks.push({
        checkId: 'heat-number-match',
        title,
        outcome: 'not_applicable',
        summary: `Needs at least one mill test certificate and one job-work challan (found ${certs.length} and ${challans.length}).`,
      })
    } else {
      const certHits = certs.map((r) => ({ result: r, field: fieldOf(r, 'heatNumber') }))
      const challanHits = challans.map((r) => ({ result: r, field: fieldOf(r, 'heatNumber') }))
      const missing = [...certHits, ...challanHits].filter((hit) => !hasValue(hit.field))
      const certValues = new Set(certHits.filter((h) => hasValue(h.field)).map((h) => h.field!.normalized))
      let found = 0

      for (const hit of missing) {
        found++
        issues.push(
          issue(
            {
              id: `heat-number-match:missing:${hit.result.documentId}`,
              checkId: 'heat-number-match',
              severity: 'medium',
              title: 'Heat number not detected',
              detail: `No heat number could be read from ${hit.result.fileName}, so it cannot be compared. Check the source document.`,
              evidence: [{ label: 'Document', source: { documentId: hit.result.documentId, fileName: hit.result.fileName }, origin: hit.result.origin }],
              documentIds: [hit.result.documentId],
            },
            [hit.result.documentId],
            now,
          ),
        )
      }

      for (const hit of challanHits) {
        if (!hasValue(hit.field) || certValues.size === 0 || certValues.has(hit.field.normalized)) continue
        found++
        const relatedCerts = certHits.filter((h) => hasValue(h.field)) as FieldHit[]
        const uncertain = [hit, ...relatedCerts].some((h) => h.field!.status === 'needs_review')
        issues.push(
          issue(
            {
              id: `heat-number-match:mismatch:${hit.result.documentId}`,
              checkId: 'heat-number-match',
              severity: 'high',
              title: 'Heat-number mismatch',
              detail:
                `The job-work challan lists heat no. ${hit.field.value}, but the mill test certificate${relatedCerts.length > 1 ? 's list' : ' lists'} ` +
                `${relatedCerts.map((h) => h.field.value).join(', ')}. The batch cannot be traced from steel input to finished goods until this is resolved.` +
                (uncertain ? ' At least one of these values needs review, so confirm the readings against the source first.' : ''),
              evidence: [
                ...relatedCerts.map((h) => evidenceFor(h, 'Mill test certificate')),
                evidenceFor(hit as FieldHit, 'Job-work challan'),
              ],
              documentIds: [hit.result.documentId, ...relatedCerts.map((h) => h.result.documentId)],
            },
            [hit.result.documentId + ':' + hit.field.normalized, ...relatedCerts.map((h) => h.result.documentId + ':' + h.field.normalized)],
            now,
          ),
        )
      }

      checks.push({
        checkId: 'heat-number-match',
        title,
        outcome: found ? 'issue' : 'passed',
        summary: found
          ? `${found} problem${found === 1 ? '' : 's'} found.`
          : `Heat numbers match (${[...certValues].join(', ')}).`,
      })
    }
  }

  // 2. Job-worker energy evidence.
  {
    const challans = ofKind(results, 'job_work_challan')
    const energy = ofKind(results, 'job_worker_energy')
    const title = 'Job-worker energy evidence'
    if (challans.length === 0) {
      checks.push({
        checkId: 'job-worker-energy',
        title,
        outcome: 'not_applicable',
        summary: 'No job-work challan found, so outsourced processing is not evidenced.',
      })
    } else if (energy.length === 0) {
      issues.push(
        issue(
          {
            id: 'job-worker-energy:missing',
            checkId: 'job-worker-energy',
            severity: 'high',
            title: 'Missing job-worker energy evidence',
            detail:
              'A job-work challan shows processing by a job-worker, but no electricity or fuel record from the job-worker has been uploaded. ' +
              'The energy used for that processing is unknown. It is not assumed to be zero.',
            evidence: challans.map((r) => ({
              label: 'Job-work challan',
              value: fieldOf(r, 'jobWorkerName')?.value,
              source: fieldOf(r, 'jobWorkerName')?.source ?? { documentId: r.documentId, fileName: r.fileName },
              origin: r.origin,
            })),
            documentIds: challans.map((r) => r.documentId),
          },
          challans.map((r) => r.documentId),
          now,
        ),
      )
      checks.push({ checkId: 'job-worker-energy', title, outcome: 'issue', summary: 'No job-worker energy record found.' })
    } else {
      const withoutValue = energy.filter((r) => !hasValue(fieldOf(r, 'electricityConsumption')))
      for (const r of withoutValue) {
        issues.push(
          issue(
            {
              id: `job-worker-energy:no-value:${r.documentId}`,
              checkId: 'job-worker-energy',
              severity: 'medium',
              title: 'Job-worker energy amount not detected',
              detail: `${r.fileName} looks like a job-worker energy record, but no consumption figure could be read from it.`,
              evidence: [{ label: 'Energy record', source: { documentId: r.documentId, fileName: r.fileName }, origin: r.origin }],
              documentIds: [r.documentId],
            },
            [r.documentId],
            now,
          ),
        )
      }
      checks.push({
        checkId: 'job-worker-energy',
        title,
        outcome: withoutValue.length ? 'issue' : 'passed',
        summary: withoutValue.length
          ? 'An energy record was found, but its consumption could not be read.'
          : `${energy.length} job-worker energy record${energy.length === 1 ? '' : 's'} found.`,
      })
    }
  }

  // 3 & 4. Required batch IDs and quantities per document type.
  const required: { checkId: 'batch-id-present' | 'quantity-present'; title: string; rules: [DocumentKind, FieldKey][] }[] = [
    {
      checkId: 'batch-id-present',
      title: 'Batch ID present where required',
      rules: [
        ['job_work_challan', 'batchId'],
        ['production_log', 'batchId'],
        ['dispatch_record', 'batchId'],
      ],
    },
    {
      checkId: 'quantity-present',
      title: 'Quantity present where required',
      rules: [
        ['job_work_challan', 'quantity'],
        ['production_log', 'outputQuantity'],
        ['dispatch_record', 'quantity'],
      ],
    },
  ]
  for (const { checkId, title, rules } of required) {
    let applicable = 0
    let missing = 0
    for (const [kind, key] of rules) {
      for (const r of ofKind(results, kind)) {
        applicable++
        const field = fieldOf(r, key)
        if (hasValue(field)) continue
        missing++
        issues.push(
          issue(
            {
              id: `${checkId}:${r.documentId}`,
              checkId,
              severity: 'medium',
              title: `${field?.label ?? key} not detected`,
              detail: `A ${field?.label.toLowerCase() ?? key} is expected on this type of document but could not be read from ${r.fileName}. Add it or check the source.`,
              evidence: [{ label: 'Document', source: { documentId: r.documentId, fileName: r.fileName }, origin: r.origin }],
              documentIds: [r.documentId],
            },
            [r.documentId, key],
            now,
          ),
        )
      }
    }
    checks.push({
      checkId,
      title,
      outcome: applicable === 0 ? 'not_applicable' : missing ? 'issue' : 'passed',
      summary:
        applicable === 0
          ? 'No challan, production log or dispatch record found.'
          : missing
            ? `Missing in ${missing} of ${applicable} document${applicable === 1 ? '' : 's'}.`
            : `Found in all ${applicable} document${applicable === 1 ? '' : 's'} that need one.`,
    })
  }

  // 5. Batch references agree across documents.
  {
    const hits: FieldHit[] = []
    for (const r of results) {
      const field = fieldOf(r, 'batchId')
      if (!hasValue(field)) continue
      hits.push({ result: r, field })
      for (const alt of field.alternatives ?? []) {
        hits.push({ result: r, field: { ...field, value: alt.value, normalized: alt.value.toUpperCase().replace(/\s+/g, ''), source: alt.source } })
      }
    }
    const distinct = new Set(hits.map((h) => h.field.normalized))
    const title = 'Batch references agree across documents'
    if (hits.length < 2) {
      checks.push({
        checkId: 'batch-id-consistent',
        title,
        outcome: 'not_applicable',
        summary: 'Fewer than two batch references found, so there is nothing to compare.',
      })
    } else if (distinct.size > 1) {
      issues.push(
        issue(
          {
            id: 'batch-id-consistent:conflict',
            checkId: 'batch-id-consistent',
            severity: 'high',
            title: 'Conflicting batch references',
            detail: `Documents refer to ${distinct.size} different batch IDs (${[...distinct].join(', ')}). They may not all belong to the same batch.`,
            evidence: hits.map((h) => evidenceFor(h, 'Batch reference')),
            documentIds: hits.map((h) => h.result.documentId),
          },
          hits.map((h) => `${h.result.documentId}:${h.field.normalized}`),
          now,
        ),
      )
      checks.push({ checkId: 'batch-id-consistent', title, outcome: 'issue', summary: `${distinct.size} different batch IDs found.` })
    } else {
      checks.push({
        checkId: 'batch-id-consistent',
        title,
        outcome: 'passed',
        summary: `${hits.length} references in ${new Set(hits.map((h) => h.result.documentId)).size} documents all read ${[...distinct][0]}.`,
      })
    }
  }

  return { checks, issues }
}
