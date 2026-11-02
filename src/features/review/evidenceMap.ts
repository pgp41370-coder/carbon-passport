import { SAMPLE_FIX_FILES } from '../../data/samplePack'
import type { DocumentKind, ExtractionResult, SourceRef } from '../../types/extraction'
import type { CarbonPassport, PassportIssue } from '../../types/passport'
import type { LinkId, TraceDocumentRef, TraceRequirement, TraceStatus } from '../../types/traceability'
import { fixContext, fixGuideFor } from '../fixes/fixGuide'
import { groupFindings, type Finding } from '../passport/findings'

/**
 * The evidence map: the batch as a chain of points, from the steel mill to the
 * finished batch, each tied to the papers that prove it. Everything is derived
 * from the same passport as every other screen; nothing here is stored, and no
 * point or link is shown as supported unless a document backs it.
 */

/** Four states only. "Conflict" is reserved for two documents that disagree. */
export type MapStatus = 'supported' | 'review' | 'conflict' | 'missing'

export type MapNodeId = 'mill' | 'certificate' | 'stockist' | 'receipt' | 'production' | 'job_worker' | 'finished'

export interface MapValue {
  label: string
  value: string
  source?: SourceRef
}

export interface MapNode {
  id: MapNodeId
  title: string
  /** The paper that proves this point, in plain words. */
  paper: string
  /** One short line for the map, e.g. "Heat 24A-1187". */
  headline: string
  status: MapStatus
  requirements: TraceRequirement[]
  documents: TraceDocumentRef[]
  values: MapValue[]
  /** Open findings (problems, checks, missing items) that concern this point. */
  findings: Finding[]
  responsible: string
  nextAction: string
}

export interface MapEdge {
  from: MapNodeId
  to: MapNodeId
  status: MapStatus
  label: string
  detail: string
}

/** Two or more documents that give different values for the same thing. */
export interface Conflict {
  finding: Finding
  issue: PassportIssue
  values: MapValue[]
  nodeIds: MapNodeId[]
  who?: string
  summary: string
}

export interface EvidenceMap {
  nodes: MapNode[]
  edges: MapEdge[]
  conflicts: Conflict[]
  /** Sample "replies" loaded by the demo button, so a simulated fix is never mistaken for a real one. */
  simulated: string[]
}

interface NodeSpec {
  id: MapNodeId
  title: string
  paper: string
  /** Traceability requirements this point rests on. */
  requirements: string[]
  /** Document kinds that belong to this point. */
  kinds: DocumentKind[]
  /** The document kind whose heat number is shown on the map. */
  heatFrom?: DocumentKind
  responsible: string
}

const SPECS: NodeSpec[] = [
  { id: 'mill', title: 'Steel mill', paper: 'Named on the mill certificate', requirements: ['mill-identity'], kinds: [], responsible: 'Steel mill, through your steel supplier' },
  {
    id: 'certificate',
    title: 'Mill test certificate',
    paper: 'Mill test certificate',
    requirements: ['mill-certificate'],
    kinds: ['mill_test_certificate'],
    heatFrom: 'mill_test_certificate',
    responsible: 'Steel supplier (issues the certificate)',
  },
  {
    id: 'stockist',
    title: 'Stockist / material lot',
    paper: 'Lot transfer or trader invoice',
    requirements: ['stockist-record'],
    kinds: ['stockist_record'],
    heatFrom: 'stockist_record',
    responsible: 'Steel seller or trader',
  },
  {
    id: 'receipt',
    title: 'Material receipt',
    paper: 'Purchase invoice',
    requirements: ['material-receipt'],
    kinds: ['purchase_invoice'],
    heatFrom: 'purchase_invoice',
    responsible: 'Your purchase team',
  },
  {
    id: 'production',
    title: 'Production batch',
    paper: 'Production log and electricity bill',
    requirements: ['production-log', 'intermediate-output', 'plant-energy'],
    kinds: ['production_log', 'electricity_bill'],
    heatFrom: 'production_log',
    responsible: 'Your production staff',
  },
  {
    id: 'job_worker',
    title: 'Job-worker processing',
    paper: 'Job-work challan, energy record and return challan',
    requirements: ['job-work-challan', 'job-worker-energy', 'return-record'],
    kinds: ['job_work_challan', 'job_worker_energy', 'return_challan'],
    heatFrom: 'job_work_challan',
    responsible: 'Heat-treatment job-worker',
  },
  {
    id: 'finished',
    title: 'Finished batch',
    paper: 'Returned quantity and dispatch record',
    requirements: ['finished-output', 'dispatch-record'],
    kinds: ['dispatch_record'],
    responsible: 'Your dispatch staff',
  },
]

/** Checks that concern one point even when they cite no document (e.g. a paper that was never sent). */
const CHECK_NODE: Record<string, MapNodeId> = { 'job-worker-energy': 'job_worker' }

const FROM_TRACE: Record<TraceStatus, MapStatus> = { supported: 'supported', needs_review: 'review', proposed: 'review', missing: 'missing' }
const RANK: Record<MapStatus, number> = { supported: 0, review: 1, missing: 2, conflict: 3 }
const worst = (statuses: MapStatus[]): MapStatus => statuses.reduce<MapStatus>((a, b) => (RANK[b] > RANK[a] ? b : a), 'supported')

export const MAP_NODE_ORDER: readonly MapNodeId[] = SPECS.map((s) => s.id)

export function buildEvidenceMap(passport: CarbonPassport, resultsById: Record<string, ExtractionResult>): EvidenceMap {
  const findings = groupFindings(passport)
  const ctx = fixContext(passport)
  const requirements = new Map(passport.stages.flatMap((s) => s.requirements.map((r) => [r.id, r] as const)))
  const documents = [...new Map(passport.stages.flatMap((s) => s.documents).map((d) => [d.documentId, d])).values()]
  const docsOf = (kinds: DocumentKind[]) => documents.filter((d) => kinds.includes(d.kind))
  const nodeOfDocument = (documentId: string) => SPECS.find((s) => docsOf(s.kinds).some((d) => d.documentId === documentId))?.id

  const heats = (kind: DocumentKind | undefined): MapValue[] =>
    kind
      ? docsOf([kind]).flatMap((d) => {
          const f = resultsById[d.documentId]?.fields.find((x) => x.key === 'heatNumber' && x.status !== 'not_detected' && x.value)
          return f?.value ? [{ label: 'Heat no.', value: f.value, source: f.source }] : []
        })
      : []

  // ── Conflicts: only issues where the cited documents give two different values ──
  const conflicts: Conflict[] = []
  for (const finding of findings.problems) {
    const issue = passport.issues.find((i) => i.id === finding.key)
    if (!issue) continue
    const values = finding.sources.flatMap((s) => (s.value ? [{ label: s.label, value: s.value, source: s.source }] : []))
    if (new Set(values.map((v) => v.value)).size < 2) continue
    const nodeIds = [...new Set(values.flatMap((v) => (v.source ? [nodeOfDocument(v.source.documentId)] : [])).filter((id): id is MapNodeId => !!id))]
    const guide = fixGuideFor(finding, ctx)
    conflicts.push({ finding, issue, values, nodeIds, who: guide.who, summary: guide.summary })
  }
  const conflictNodes = new Set(conflicts.flatMap((c) => c.nodeIds))

  // ── Points ──
  const open = [...findings.problems, ...findings.check, ...findings.missing]
  const nodes: MapNode[] = SPECS.map((spec) => {
    const reqs = spec.requirements.flatMap((id) => {
      const r = requirements.get(id)
      return r ? [r] : []
    })
    const docs = docsOf(spec.kinds)
    const docIds = new Set(docs.map((d) => d.documentId))
    const related = open.filter((f) =>
      findings.problems.includes(f)
        ? f.sources.some((s) => docIds.has(s.source.documentId)) || CHECK_NODE[f.topic] === spec.id
        : spec.requirements.includes(f.topic),
    )
    const status = conflictNodes.has(spec.id) ? 'conflict' : reqs.length ? worst(reqs.map((r) => FROM_TRACE[r.status])) : 'missing'
    const values = dedupe([
      ...heats(spec.heatFrom),
      ...reqs.flatMap((r) => r.evidence.flatMap((e) => (e.value ? [{ label: e.label, value: e.value, source: e.source }] : []))),
    ])
    const heat = heats(spec.heatFrom)[0]?.value
    const first = related[0]
    return {
      id: spec.id,
      title: spec.title,
      paper: spec.paper,
      headline: headlineFor(spec.id, heat, values, docs.length),
      status,
      requirements: reqs,
      documents: docs,
      values,
      findings: related,
      responsible: spec.id === 'job_worker' && ctx.jobWorker ? `Job-worker: ${ctx.jobWorker}` : spec.responsible,
      nextAction: first
        ? fixGuideFor(first, ctx).summary
        : status === 'supported'
          ? 'Nothing to do here. Keep these papers with the batch file.'
          : (reqs.find((r) => r.status !== 'supported')?.detail ?? 'Add the paper that proves this point.'),
    }
  })

  // ── Links between points ──
  const link = (id: LinkId) => passport.links.find((l) => l.id === id)
  const fromLink = (id: LinkId, from: MapNodeId, to: MapNodeId, label: string): MapEdge => {
    const l = link(id)
    const touchesConflict = conflictNodes.has(to) && conflicts.some((c) => c.nodeIds.includes(to) && c.nodeIds.some((n) => MAP_NODE_ORDER.indexOf(n) < MAP_NODE_ORDER.indexOf(to)))
    return {
      from,
      to,
      label,
      status: touchesConflict ? 'conflict' : l ? FROM_TRACE[l.status] : 'missing',
      detail: l?.reference ?? 'No document links these two points.',
    }
  }
  const certHeat = heats('mill_test_certificate')
  const invoiceHeat = heats('purchase_invoice')
  const logHeat = heats('production_log')
  const sameHeat = (a: MapValue[], b: MapValue[]) => a.length > 0 && b.length > 0 && b.every((x) => a.some((y) => norm(y.value) === norm(x.value)))

  const edges: MapEdge[] = [
    {
      from: 'mill',
      to: 'certificate',
      label: 'Certificate issued',
      status: certHeat.length ? 'supported' : docsOf(['mill_test_certificate']).length ? 'review' : 'missing',
      detail: certHeat.length ? `The certificate gives heat no. ${certHeat.map((h) => h.value).join(', ')}.` : 'No mill test certificate with a readable heat number.',
    },
    fromLink('mill-stockist', 'certificate', 'stockist', 'Lot handed to a stockist'),
    fromLink('stockist-factory', 'stockist', 'receipt', 'Steel bought by the factory'),
    {
      from: 'receipt',
      to: 'production',
      label: 'Steel issued to production',
      status: !logHeat.length || !invoiceHeat.length ? (docsOf(['production_log']).length ? 'review' : 'missing') : sameHeat(invoiceHeat, logHeat) ? 'supported' : 'conflict',
      detail:
        !logHeat.length || !invoiceHeat.length
          ? 'A heat number is missing on the invoice or the production log, so this step cannot be matched.'
          : sameHeat(invoiceHeat, logHeat)
            ? `Invoice and production log both give heat no. ${logHeat[0]!.value}.`
            : `Invoice gives ${invoiceHeat.map((h) => h.value).join(', ')}; production log gives ${logHeat.map((h) => h.value).join(', ')}.`,
    },
    fromLink('factory-job_worker', 'production', 'job_worker', 'Sent for heat treatment'),
    fromLink('job_worker-finished_batch', 'job_worker', 'finished', 'Returned and finished'),
  ]

  const fixNames = new Set<string>(SAMPLE_FIX_FILES.map((f) => f.fileName))
  const simulated = documents.filter((d) => fixNames.has(d.fileName)).map((d) => d.fileName)

  return { nodes, edges, conflicts, simulated }
}

function headlineFor(id: MapNodeId, heat: string | undefined, values: MapValue[], documentCount: number) {
  if (heat) return `Heat ${heat}`
  switch (id) {
    case 'mill':
      return values[0]?.value ?? 'Mill not named'
    case 'stockist':
      return values.some((v) => v.label.startsWith('Proposed')) ? 'Proposed by a person' : 'No lot record'
    case 'finished':
      return documentCount ? 'Dispatch recorded' : 'Not recorded'
    default:
      return documentCount ? 'No heat no. read' : 'No paper yet'
  }
}

const norm = (value: string) => value.replace(/[\s-]/g, '').toUpperCase()

function dedupe(values: MapValue[]) {
  const seen = new Set<string>()
  return values.filter((v) => {
    const key = `${v.label}|${v.value}|${v.source?.documentId ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Points after this one in the chain: what loses its documented link to the steel if this point is broken. */
export function downstreamOf(map: EvidenceMap, id: MapNodeId): MapNode[] {
  const i = MAP_NODE_ORDER.indexOf(id)
  return map.nodes.slice(i + 1)
}

export function upstreamOf(map: EvidenceMap, id: MapNodeId): MapNode | undefined {
  const i = MAP_NODE_ORDER.indexOf(id)
  return i > 0 ? map.nodes[i - 1] : undefined
}
