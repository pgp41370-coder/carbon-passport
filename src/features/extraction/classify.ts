import type { DetectedType, DocumentKind } from '../../types/extraction'

export const KIND_LABELS: Record<DocumentKind, string> = {
  mill_test_certificate: 'Mill test certificate',
  job_work_challan: 'Job-work challan',
  production_log: 'Production log',
  electricity_bill: 'Electricity bill',
  purchase_invoice: 'Purchase invoice',
  dispatch_record: 'Dispatch record',
  job_worker_energy: 'Job-worker energy record',
  unknown: 'Unrecognised document',
}

const RULES: { kind: Exclude<DocumentKind, 'unknown' | 'job_worker_energy'>; keywords: string[] }[] = [
  {
    kind: 'mill_test_certificate',
    keywords: ['mill test certificate', 'test certificate', 'inspection certificate', 'chemical composition', 'heat no', 'tensile', 'en 10204'],
  },
  {
    kind: 'job_work_challan',
    keywords: ['job work', 'job-work', 'challan', 'job-worker', 'job worker', 'rule 55', 'sent for processing'],
  },
  {
    kind: 'electricity_bill',
    keywords: ['electricity bill', 'units consumed', 'kwh', 'meter', 'contract demand', 'billing period', 'energy charges'],
  },
  {
    kind: 'purchase_invoice',
    keywords: ['tax invoice', 'invoice no', 'gstin', 'hsn', 'taxable value', 'cgst', 'sgst', 'igst'],
  },
  {
    kind: 'production_log',
    keywords: ['production log', 'operation', 'machine', 'scrap', 'run hours', 'output'],
  },
  {
    kind: 'dispatch_record',
    keywords: ['dispatch', 'net_weight', 'net weight', 'vehicle', 'consignee', 'packages'],
  },
]

const JOB_WORKER = /job[\s-]?work(er)?|heat[\s-]?treat/
const ENERGY = /kwh|units consumed|fuel|lpg|diesel|furnace (log|energy)|energy (log|record)/

/**
 * Guesses the document type from keywords in the extracted text. This is a
 * heuristic shown to the user as such, not a verified classification.
 */
export function classifyDocument(text: string): DetectedType {
  const haystack = text.toLowerCase().replace(/\s+/g, ' ')

  // An energy record that names the job-worker or heat treatment is what the
  // missing-evidence check looks for, so it takes priority.
  const jobWorker = haystack.match(JOB_WORKER)
  const energy = haystack.match(ENERGY)
  if (jobWorker && energy && !haystack.includes('challan')) {
    return { kind: 'job_worker_energy', matchedKeywords: [jobWorker[0], energy[0]] }
  }

  let best: DetectedType = { kind: 'unknown', matchedKeywords: [] }
  for (const rule of RULES) {
    const matched = rule.keywords.filter((keyword) => haystack.includes(keyword))
    if (matched.length >= 2 && matched.length > best.matchedKeywords.length) {
      best = { kind: rule.kind, matchedKeywords: matched }
    }
  }
  return best
}
