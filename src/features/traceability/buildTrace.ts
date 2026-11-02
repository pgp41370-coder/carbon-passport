import { fingerprint } from '../../lib/fingerprint'
import type { StoredDocument } from '../../types/document'
import type { DocumentKind, ExtractedField, ExtractionResult, FieldKey } from '../../types/extraction'
import type {
  LinkId,
  StageId,
  TraceEvidence,
  TraceGap,
  TraceLink,
  TraceRecord,
  TraceRequirement,
  TraceStage,
  TraceStatus,
  TraceView,
} from '../../types/traceability'

/**
 * Derives the supply-chain trace for one batch from current extraction results.
 * Deterministic and recomputed on every load: nothing here is stored, so a
 * removed document can never linger as evidence. Links are only ever "supported
 * by source", "needs review", "missing evidence" or "proposed"; never verified.
 */

type Result = ExtractionResult

const SEVERITY: Record<TraceStatus, number> = { supported: 0, proposed: 1, needs_review: 2, missing: 3 }
const worst = (statuses: TraceStatus[]): TraceStatus =>
  statuses.reduce<TraceStatus>((a, b) => (SEVERITY[b] > SEVERITY[a] ? b : a), 'supported')

function field(result: Result, key: FieldKey): ExtractedField | undefined {
  const f = result.fields.find((candidate) => candidate.key === key)
  return f && f.status !== 'not_detected' && f.value ? f : undefined
}

const withUnit = (f: ExtractedField) =>
  f.unit && !f.value!.toLowerCase().includes(f.unit.toLowerCase()) ? `${f.value} ${f.unit}` : f.value!

function fieldEvidence(result: Result, f: ExtractedField, label: string): TraceEvidence {
  return { label, value: withUnit(f), source: f.source, origin: result.origin, fieldStatus: f.status }
}

function documentEvidence(result: Result, label: string): TraceEvidence {
  return { label, source: { documentId: result.documentId, fileName: result.fileName }, origin: result.origin }
}

/** Status of a requirement that rests on one field across several documents. */
function fieldStatus(results: Result[], key: FieldKey): TraceStatus {
  if (results.length === 0) return 'missing'
  const fields = results.map((r) => field(r, key))
  if (fields.some((f) => !f)) return 'needs_review'
  const values = new Set(fields.map((f) => f!.normalized))
  if (values.size > 1 || fields.some((f) => f!.status === 'needs_review')) return 'needs_review'
  return 'supported'
}

const isIllustrative = (results: Result[]) => results.length > 0 && results.every((r) => r.origin === 'sample')
const distinct = (values: (string | undefined)[]) => [...new Set(values.filter((v): v is string => !!v))]

/** Batch IDs found in current results, most frequent first. */
export function detectBatchIds(results: readonly Result[]): string[] {
  const counts = new Map<string, number>()
  for (const result of results) {
    const f = field(result, 'batchId')
    if (f?.normalized) counts.set(f.normalized, (counts.get(f.normalized) ?? 0) + 1)
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([id]) => id)
}

export interface LinkRecordState {
  record: TraceRecord
  /** False when the link's evidence has changed since the note was recorded. */
  active: boolean
}

export interface TraceOutcome extends TraceView {
  records: Partial<Record<LinkId, LinkRecordState>>
  /** Documents excluded because they reference a different batch. */
  otherBatchDocuments: string[]
}

export function buildTrace(
  documents: readonly StoredDocument[],
  allResults: readonly Result[],
  batchId: string,
  records: readonly TraceRecord[],
): TraceOutcome {
  const existing = new Set(documents.map((d) => d.id))
  const current = allResults.filter((r) => existing.has(r.documentId))
  const usable = current.filter((r) => r.status !== 'failed')

  // A document that names a different batch never supports this one.
  const otherBatch = usable.filter((r) => {
    const f = field(r, 'batchId')
    return f && f.normalized !== batchId
  })
  const inBatch = usable.filter((r) => !otherBatch.includes(r))
  const ofKind = (kind: DocumentKind) => inBatch.filter((r) => r.detectedType.kind === kind)

  const certs = ofKind('mill_test_certificate')
  const invoices = ofKind('purchase_invoice')
  const logs = ofKind('production_log')
  const bills = ofKind('electricity_bill')
  const challans = ofKind('job_work_challan')
  const energy = ofKind('job_worker_energy')
  const dispatches = ofKind('dispatch_record')
  const stockists = ofKind('stockist_record')
  const returns = ofKind('return_challan')

  const heats = (results: Result[]) => distinct(results.map((r) => field(r, 'heatNumber')?.normalized))
  const certHeats = heats(certs)
  const invoiceHeats = heats(invoices)
  const logHeats = heats(logs)
  const challanHeats = heats(challans)
  const stockistHeats = heats(stockists)
  const returnHeats = heats(returns)
  const upstreamHeats = distinct([...certHeats, ...logHeats])

  const noBatchRef = (results: Result[]) => results.filter((r) => !field(r, 'batchId'))
  const batchNote = (results: Result[]) =>
    noBatchRef(results).length
      ? ` ${noBatchRef(results).length === 1 ? 'One document has' : 'Some documents have'} no batch reference and ${noBatchRef(results).length === 1 ? 'is' : 'are'} included by type only.`
      : ''

  // ── Stage 1: steel mill ────────────────────────────────────────────────────
  const millRequirements: TraceRequirement[] = [
    {
      id: 'mill-certificate',
      label: 'Mill test certificate with heat number',
      status: fieldStatus(certs, 'heatNumber'),
      detail: certs.length
        ? certHeats.length
          ? `Certificate${certs.length > 1 ? 's give' : ' gives'} heat no. ${certHeats.join(', ')}.${certHeats.length > 1 ? ' Several heat numbers were found; confirm which applies.' : ''}`
          : 'A certificate is present, but no heat number could be read from it.'
        : 'No mill test certificate has been processed.',
      evidence: certs.flatMap((r) => {
        const f = field(r, 'heatNumber')
        return f ? [fieldEvidence(r, f, 'Heat no.')] : [documentEvidence(r, 'Mill test certificate')]
      }),
    },
    {
      id: 'mill-identity',
      label: 'Mill or supplier identity',
      status: certs.length ? (certs.every((r) => field(r, 'supplierName')?.status === 'detected') ? 'supported' : 'needs_review') : 'missing',
      detail: certs.length
        ? certs.every((r) => field(r, 'supplierName')?.status === 'detected')
          ? 'Named next to the “Manufacturer” label on the certificate.'
          : 'Read from the certificate heading by position, not from a label. Confirm the issuing mill.'
        : 'Unknown without a mill test certificate.',
      evidence: certs.flatMap((r) => {
        const f = field(r, 'supplierName')
        return f ? [fieldEvidence(r, f, f.status === 'detected' ? 'Manufacturer' : 'Certificate heading')] : []
      }),
    },
  ]

  // ── Stage 2: stockist / trader ─────────────────────────────────────────────
  const stockistRequirements: TraceRequirement[] = [
    {
      id: 'stockist-record',
      label: 'Stockist or trader record for this lot',
      status: stockists.length ? (stockistHeats.length && stockistHeats.every((h) => certHeats.includes(h)) ? 'supported' : 'needs_review') : 'missing',
      detail: stockists.length
        ? stockistHeats.length
          ? stockistHeats.every((h) => certHeats.includes(h))
            ? `Lot transfer for heat no. ${stockistHeats.join(', ')}, the same heat as the mill certificate.`
            : `Lot transfer gives heat no. ${stockistHeats.join(', ')}, which does not match the mill certificate (${certHeats.join(', ') || 'none read'}).`
          : 'A lot transfer is present, but no heat number could be read from it.'
        : 'No stockist or trader document (lot transfer, dispatch note or trader invoice) has been uploaded, so it is not known whether the steel came straight from the mill or through a trader.',
      evidence: stockists.length
        ? stockists.flatMap((r) =>
            (['heatNumber', 'supplierName', 'quantity'] as const).flatMap((key) => {
              const f = field(r, key)
              return f ? [fieldEvidence(r, f, { heatNumber: 'Heat no.', supplierName: 'Stockist', quantity: 'Quantity transferred' }[key])] : []
            }),
          )
        : invoices.flatMap((r) => {
            const f = field(r, 'supplierName')
            return f ? [fieldEvidence(r, f, 'Seller named on purchase invoice (role not stated)')] : []
          }),
    },
  ]

  // ── Stage 3: MSME factory ──────────────────────────────────────────────────
  const outputFields = logs.map((r) => ({ r, f: field(r, 'outputQuantity') }))
  const factoryRequirements: TraceRequirement[] = [
    {
      id: 'material-receipt',
      label: 'Purchase invoice for the steel',
      status: fieldStatus(invoices, 'heatNumber'),
      detail: invoices.length
        ? invoiceHeats.length
          ? `Invoice records steel with heat no. ${invoiceHeats.join(', ')}.`
          : 'An invoice is present, but no heat number could be read from it.'
        : 'No purchase invoice has been processed.',
      evidence: invoices.flatMap((r) =>
        (['heatNumber', 'material', 'quantity'] as const).flatMap((key) => {
          const f = field(r, key)
          return f ? [fieldEvidence(r, f, { heatNumber: 'Heat no.', material: 'Material', quantity: 'Quantity' }[key])] : []
        }),
      ),
    },
    {
      id: 'production-log',
      label: `Production log for batch ${batchId}`,
      status: logs.length ? (logs.every((r) => field(r, 'batchId')?.normalized === batchId) ? 'supported' : 'needs_review') : 'missing',
      detail: logs.length
        ? `Production log refers to batch ${batchId}${logHeats.length ? ` and heat no. ${logHeats.join(', ')}` : ''}.${batchNote(logs)}`
        : 'No production log for this batch has been processed.',
      evidence: logs.flatMap((r) =>
        (['batchId', 'heatNumber'] as const).flatMap((key) => {
          const f = field(r, key)
          return f ? [fieldEvidence(r, f, key === 'batchId' ? 'Batch ID' : 'Heat no.')] : []
        }),
      ),
    },
    {
      id: 'intermediate-output',
      label: 'Intermediate output (last recorded row)',
      status: logs.length ? (outputFields.every(({ f }) => f) ? 'supported' : 'needs_review') : 'missing',
      detail: outputFields.some(({ f }) => f)
        ? `${outputFields.map(({ f }) => f && withUnit(f)).filter(Boolean).join(', ')} is the output of the last recorded in-house row, before heat treatment. It is not the finished-batch output.`
        : 'No output quantity could be read from the production log.',
      evidence: outputFields.flatMap(({ r, f }) => (f ? [fieldEvidence(r, f, 'Last recorded output (pre heat treatment)')] : [])),
    },
    {
      id: 'plant-energy',
      label: 'Plant electricity record',
      status: fieldStatus(bills, 'electricityConsumption'),
      detail: bills.length
        ? 'Plant-level consumption for the billing period. It covers all production in that period and has not been allocated to this batch.'
        : 'No plant electricity bill has been processed.',
      evidence: bills.flatMap((r) =>
        (['electricityConsumption', 'billingPeriod'] as const).flatMap((key) => {
          const f = field(r, key)
          return f ? [fieldEvidence(r, f, key === 'billingPeriod' ? 'Billing period' : 'Consumption')] : []
        }),
      ),
    },
  ]

  // ── Stage 4: heat-treatment job-worker ─────────────────────────────────────
  const jobWorkerRequirements: TraceRequirement[] = [
    {
      id: 'job-work-challan',
      label: 'Job-work challan (goods sent)',
      status: fieldStatus(challans, 'jobWorkerName'),
      detail: challans.length
        ? `Goods sent to ${distinct(challans.map((r) => field(r, 'jobWorkerName')?.value)).join(', ') || 'a job-worker (name not read)'}.${batchNote(challans)}`
        : 'No job-work challan has been processed.',
      evidence: challans.flatMap((r) =>
        (['jobWorkerName', 'challanNumber', 'quantity'] as const).flatMap((key) => {
          const f = field(r, key)
          return f ? [fieldEvidence(r, f, { jobWorkerName: 'Job-worker', challanNumber: 'Challan no.', quantity: 'Quantity sent' }[key])] : []
        }),
      ),
    },
    {
      id: 'job-worker-energy',
      label: 'Job-worker energy record',
      status: energy.length ? fieldStatus(energy, 'electricityConsumption') : 'missing',
      detail: energy.length
        ? 'Energy record from the job-worker found.'
        : 'No electricity or fuel record from the job-worker. Heat-treatment energy is unknown and is not treated as zero.',
      evidence: energy.flatMap((r) => {
        const f = field(r, 'electricityConsumption')
        return f ? [fieldEvidence(r, f, 'Consumption')] : [documentEvidence(r, 'Energy record')]
      }),
    },
    {
      id: 'return-record',
      label: 'Return of goods after heat treatment',
      status: returns.length ? (returns.every((r) => field(r, 'batchId')?.normalized === batchId) && returnHeats.every((h) => certHeats.includes(h)) ? 'supported' : 'needs_review') : 'missing',
      detail: returns.length
        ? `Return challan for batch ${distinct(returns.map((r) => field(r, 'batchId')?.value)).join(', ') || '(not read)'}${returnHeats.length ? `, heat no. ${returnHeats.join(', ')}` : ''}.${batchNote(returns)}`
        : 'No document shows the goods coming back from the job-worker.',
      evidence: returns.flatMap((r) =>
        (['challanNumber', 'batchId', 'heatNumber'] as const).flatMap((key) => {
          const f = field(r, key)
          return f ? [fieldEvidence(r, f, { challanNumber: 'Return challan no.', batchId: 'Batch ref.', heatNumber: 'Heat no.' }[key])] : []
        }),
      ),
    },
  ]

  // ── Stage 5: finished batch ────────────────────────────────────────────────
  const finishedRequirements: TraceRequirement[] = [
    {
      id: 'finished-output',
      label: 'Finished output after heat treatment',
      status: fieldStatus(returns, 'quantity'),
      detail: returns.some((r) => field(r, 'quantity'))
        ? `${distinct(returns.map((r) => { const f = field(r, 'quantity'); return f && withUnit(f) })).join(', ')} came back after heat treatment, on the return challan.`
        : `No document records the finished quantity after heat treatment.${outputFields.some(({ f }) => f) ? ' The production log figure is from before heat treatment.' : ''}`,
      evidence: returns.flatMap((r) => {
        const f = field(r, 'quantity')
        return f ? [fieldEvidence(r, f, 'Returned after heat treatment')] : []
      }),
    },
    {
      id: 'dispatch-record',
      label: `Dispatch record for batch ${batchId}`,
      status: dispatches.length ? (dispatches.every((r) => field(r, 'batchId')?.normalized === batchId) ? 'supported' : 'needs_review') : 'missing',
      detail: dispatches.length
        ? `Dispatched quantity: ${distinct(dispatches.map((r) => { const f = field(r, 'quantity'); return f && withUnit(f) })).join(', ') || 'not read'}. This is what was dispatched, not a measured finished output.${batchNote(dispatches)}`
        : 'No dispatch record for this batch has been processed.',
      evidence: dispatches.flatMap((r) =>
        (['batchId', 'quantity'] as const).flatMap((key) => {
          const f = field(r, key)
          return f ? [fieldEvidence(r, f, key === 'batchId' ? 'Batch ID' : 'Dispatched quantity')] : []
        }),
      ),
    },
  ]

  const stage = (
    id: StageId,
    order: number,
    title: string,
    role: string,
    headline: string,
    requirements: TraceRequirement[],
    results: Result[],
  ): TraceStage => ({
    id,
    order,
    title,
    role,
    headline,
    requirements,
    status: worst(requirements.map((r) => r.status)),
    illustrative: isIllustrative(results),
    documents: results.map((r) => ({ documentId: r.documentId, fileName: r.fileName, origin: r.origin, kind: r.detectedType.kind })),
  })

  const firstOutput = outputFields.find(({ f }) => f)?.f
  const stages: TraceStage[] = [
    stage('mill', 1, 'Steel mill', 'Melts and rolls the steel; issues the mill test certificate', certHeats.length ? `Heat no. ${certHeats.join(', ')}` : 'No certificate', millRequirements, certs),
    stage(
      'stockist',
      2,
      'Stockist / trader',
      'Holds or resells mill stock, if used',
      stockists.length ? (distinct(stockists.map((r) => field(r, 'supplierName')?.value))[0] ?? 'Lot transfer on file') : 'Not confirmed',
      stockistRequirements,
      stockists,
    ),
    stage(
      'factory',
      3,
      'MSME factory',
      'Draws, heads and threads the fasteners',
      firstOutput ? `${withUnit(firstOutput)} before heat treatment` : logs.length ? 'Output not read' : 'No production log',
      factoryRequirements,
      [...invoices, ...logs, ...bills],
    ),
    stage(
      'job_worker',
      4,
      'Heat-treatment job-worker',
      'Hardens and tempers the bolts (outsourced)',
      distinct(challans.map((r) => field(r, 'jobWorkerName')?.value))[0] ?? (challans.length ? 'Name not read' : 'No challan'),
      jobWorkerRequirements,
      [...challans, ...energy, ...returns],
    ),
    stage(
      'finished_batch',
      5,
      'Finished batch',
      `Batch ${batchId} ready for the buyer`,
      returns.some((r) => field(r, 'quantity')) ? `${distinct(returns.map((r) => { const f = field(r, 'quantity'); return f && withUnit(f) }))[0]} after heat treatment` : 'Finished output not recorded',
      finishedRequirements,
      dispatches,
    ),
  ]

  // ── Hand-offs ──────────────────────────────────────────────────────────────
  const link = (
    id: LinkId,
    from: StageId,
    to: StageId,
    title: string,
    status: TraceStatus,
    reference: string,
    evidence: TraceEvidence[],
    nextAction: string,
    results: Result[],
  ): TraceLink => {
    const documentIds = [...new Set(results.map((r) => r.documentId))]
    return {
      id,
      from,
      to,
      title,
      status,
      reference,
      evidence,
      nextAction,
      illustrative: isIllustrative(results),
      documentIds,
      fingerprint: fingerprint([id, batchId, status, ...evidence.map((e) => `${e.source?.documentId ?? ''}:${e.value ?? ''}`)]),
    }
  }

  const heatEvidence = (results: Result[], label: string) =>
    results.flatMap((r) => {
      const f = field(r, 'heatNumber')
      return f ? [fieldEvidence(r, f, label)] : []
    })

  const invoiceMatchesCert = invoiceHeats.length > 0 && certHeats.length > 0 && invoiceHeats.every((h) => certHeats.includes(h))
  // The seller's role is only known when the stockist's own lot transfer carries the same heat.
  const invoiceMatchesStockist = invoiceMatchesCert && stockistHeats.length > 0 && invoiceHeats.every((h) => stockistHeats.includes(h))
  const returnBatches = distinct(returns.map((r) => field(r, 'batchId')?.normalized))
  const returnAgrees = returns.length > 0 && returnBatches.includes(batchId) && returnHeats.length > 0 && returnHeats.every((h) => certHeats.includes(h))
  const challanMismatch = challanHeats.filter((h) => upstreamHeats.length > 0 && !upstreamHeats.includes(h))
  const challanBatches = distinct(challans.map((r) => field(r, 'batchId')?.normalized))
  const challanQty = distinct(challans.map((r) => field(r, 'quantity')?.normalized))
  const logQty = distinct(logs.map((r) => field(r, 'outputQuantity')?.normalized))
  const qtyAgrees = challanQty.length === 1 && logQty.length === 1 && challanQty[0] === logQty[0]

  const links: TraceLink[] = [
    link(
      'mill-stockist',
      'mill',
      'stockist',
      'Steel mill → Stockist / trader',
      stockists.length ? (stockistHeats.length && stockistHeats.every((h) => certHeats.includes(h)) ? 'supported' : 'needs_review') : 'missing',
      stockists.length
        ? stockistHeats.length && stockistHeats.every((h) => certHeats.includes(h))
          ? `The stockist’s lot transfer carries heat no. ${stockistHeats.join(', ')}, as on the mill certificate.`
          : `The lot transfer gives heat no. ${stockistHeats.join(', ') || '(not read)'}; the certificate gives ${certHeats.join(', ') || '(not read)'}.`
        : 'No document links the mill lot to a stockist or trader.',
      [...heatEvidence(certs, 'Mill certificate heat no.'), ...heatEvidence(stockists, 'Lot transfer heat no.')],
      stockists.length
        ? 'Keep the lot transfer with the batch file.'
        : 'Check with the steel seller whether the material came directly from the mill or through a stockist; upload the stockist’s lot transfer or invoice if there is one.',
      [...certs, ...stockists],
    ),
    link(
      'stockist-factory',
      'stockist',
      'factory',
      'Stockist / trader → MSME factory',
      invoices.length === 0 ? 'missing' : invoiceMatchesStockist ? 'supported' : 'needs_review',
      invoices.length === 0
        ? 'No purchase invoice for the steel.'
        : invoiceMatchesStockist
          ? `Heat no. ${invoiceHeats.join(', ')} on the purchase invoice matches the stockist’s lot transfer and the mill certificate.`
          : invoiceMatchesCert
          ? `Heat no. ${invoiceHeats.join(', ')} on the purchase invoice matches the mill certificate, but the seller’s role (mill or trader) is not shown.`
          : invoiceHeats.length
            ? `Invoice heat no. ${invoiceHeats.join(', ')} does not match the certificate (${certHeats.join(', ') || 'none read'}).`
            : 'No heat number could be read from the purchase invoice.',
      [...heatEvidence(invoices, 'Invoice heat no.'), ...heatEvidence(stockists, 'Lot transfer heat no.'), ...heatEvidence(certs, 'Mill certificate heat no.')],
      invoiceMatchesStockist
        ? 'Keep the invoice with the batch file.'
        : invoiceMatchesCert
          ? 'Confirm who sold the steel and that the invoiced lot is the certified heat.'
          : 'Check the purchase invoice against the mill certificate.',
      [...invoices, ...stockists, ...certs],
    ),
    link(
      'factory-job_worker',
      'factory',
      'job_worker',
      'MSME factory → Heat-treatment job-worker',
      challans.length === 0
        ? 'missing'
        : challanMismatch.length || challanHeats.length === 0 || !challanBatches.includes(batchId)
          ? 'needs_review'
          : 'supported',
      challans.length === 0
        ? 'No job-work challan.'
        : challanMismatch.length
          ? `Heat-number mismatch: challan lists ${challanMismatch.join(', ')}, but the certificate${logHeats.length ? ' and production log' : ''} list ${upstreamHeats.join(', ')}.${qtyAgrees ? ` Quantities agree (${challanQty[0]} kg).` : ''}`
          : challanHeats.length === 0
            ? 'No heat number could be read from the challan.'
            : `Challan heat no. ${challanHeats.join(', ')} and batch ${challanBatches.join(', ') || '(none)'} agree with the production log.${qtyAgrees ? ` Quantities agree (${challanQty[0]} kg).` : ''}`,
      [
        ...heatEvidence(certs, 'Mill certificate heat no.'),
        ...heatEvidence(logs, 'Production log heat no.'),
        ...heatEvidence(challans, 'Challan heat no.'),
        ...challans.flatMap((r) => {
          const f = field(r, 'batchId')
          return f ? [fieldEvidence(r, f, 'Challan batch ref.')] : []
        }),
      ],
      challanMismatch.length
        ? 'Resolve the heat-number discrepancy with the job-worker and correct the record at source. The extracted values are not edited.'
        : 'Keep the challan with the batch file.',
      [...challans, ...logs, ...certs],
    ),
    link(
      'job_worker-finished_batch',
      'job_worker',
      'finished_batch',
      'Heat-treatment job-worker → Finished batch',
      returns.length ? (returnAgrees ? 'supported' : 'needs_review') : 'missing',
      returns.length
        ? returnAgrees
          ? `Return challan for batch ${batchId} and heat no. ${returnHeats.join(', ')} shows the goods came back.`
          : 'A return challan is present, but its batch or heat number does not match this batch.'
        : 'No return challan or post-heat-treatment output record.',
      [
        ...returns.flatMap((r) => (['batchId', 'heatNumber', 'quantity'] as const).flatMap((key) => {
          const f = field(r, key)
          return f ? [fieldEvidence(r, f, { batchId: 'Return challan batch ref.', heatNumber: 'Return challan heat no.', quantity: 'Quantity returned' }[key])] : []
        })),
        ...dispatches.flatMap((r) => {
          const f = field(r, 'batchId')
          return f ? [fieldEvidence(r, f, 'Dispatch record batch ID')] : []
        }),
      ],
      returns.length
        ? returnAgrees
          ? 'Keep the return challan with the batch file.'
          : 'Check the return challan against the outward challan and the certificate.'
        : 'Get the job-worker’s return challan with the returned quantity, and their furnace energy record for this job.',
      [...returns, ...dispatches],
    ),
  ]

  // ── Human records: applied only while the evidence they refer to is unchanged ──
  const recordStates: Partial<Record<LinkId, LinkRecordState>> = {}
  for (const record of records.filter((r) => r.batchId === batchId)) {
    const target = links.find((l) => l.id === record.linkId)
    if (!target) continue
    const active = target.fingerprint === record.fingerprint
    recordStates[record.linkId] = { record, active }
    if (active && record.kind === 'proposal' && target.status === 'missing') {
      target.status = 'proposed'
      target.evidence = [...target.evidence, { label: 'Proposed by user (not source-backed)', value: record.proposedReference }]
    }
  }
  const stockistProposal = (['mill-stockist', 'stockist-factory'] as const).some(
    (id) => recordStates[id]?.active && recordStates[id]?.record.kind === 'proposal',
  )
  if (stockistProposal && stages.find((s) => s.id === 'stockist')!.requirements[0]!.status === 'missing') {
    const stockist = stages.find((s) => s.id === 'stockist')!
    stockist.requirements[0]!.status = 'proposed'
    stockist.status = worst(stockist.requirements.map((r) => r.status))
    stockist.headline = 'Proposed, not confirmed'
  }

  // ── What is still missing ──────────────────────────────────────────────────
  const gaps: TraceGap[] = []
  const addGap = (id: string, stageId: StageId, status: TraceGap['status'], text: string) => {
    if (!gaps.some((g) => g.id === id)) gaps.push({ id, stageId, status, text })
  }
  if (challanMismatch.length) {
    addGap('heat-mismatch', 'job_worker', 'needs_review', `Resolve the heat-number mismatch: certificate ${upstreamHeats.join(', ')} vs challan ${challanMismatch.join(', ')}.`)
  }
  for (const s of stages) {
    for (const r of s.requirements) {
      if (r.status === 'supported') continue
      if (r.id === 'mill-identity' && r.status === 'needs_review') continue // a routine confirmation, shown on the stage
      addGap(r.id, s.id, r.status, `${s.title}: ${r.label.charAt(0).toLowerCase() + r.label.slice(1)}${r.status === 'proposed' ? ' (proposed by user, not source-backed)' : r.status === 'missing' ? ' is missing' : ' needs review'}.`)
    }
  }

  const resultIds = new Set(current.map((r) => r.documentId))
  return {
    batchId,
    stages,
    links,
    gaps,
    unprocessed: documents.filter((d) => !resultIds.has(d.id)).map((d) => ({ documentId: d.id, fileName: d.fileName })),
    records: recordStates,
    otherBatchDocuments: otherBatch.map((r) => r.fileName),
  }
}
