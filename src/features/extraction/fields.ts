import type {
  DocumentKind,
  ExtractedField,
  ExtractedTable,
  FieldKey,
  SourceRef,
} from '../../types/extraction'
import type { Cell, LayoutLine } from './layout'

/**
 * Deterministic field detection. Every value is copied from the source text with
 * a reference to where it was found. Nothing is guessed, filled in or corrected;
 * anything uncertain is marked "needs review".
 */

/** OCR words below this confidence make a value "needs review". */
export const OCR_REVIEW_THRESHOLD = 80

const NUMBER = String.raw`\d{1,3}(?:,\d{2,3})+(?:\.\d+)?|\d+(?:\.\d+)?`
const REFERENCE = String.raw`[A-Z0-9][A-Z0-9./-]{2,30}`
const DATE = String.raw`\d{1,2}[-/. ](?:[A-Za-z]{3,9}|\d{1,2})[-/. ]\d{2,4}|\d{4}-\d{2}-\d{2}`

interface FieldSpec {
  label: string
  /** Text labels that introduce the value, for PDFs and OCR. */
  labels?: RegExp[]
  /** Pattern a candidate value must match. */
  value: RegExp
  /** 'full': the whole cell must match; 'prefix': the value may be followed by a unit or note. */
  match: 'full' | 'prefix'
  /** Extra sanity check on a candidate. */
  accept?: (value: string) => boolean
  normalize: (value: string) => string
  /** Unit read from the label or column heading, e.g. "Qty (MT)". */
  unitFrom?: (labelText: string, value: string) => string | undefined
  /** Column headings that hold the value, for CSV and Excel. */
  columns?: RegExp[]
  /** How to combine several rows: one distinct value, the last row, or a sum. */
  tableMode?: 'distinct' | 'last' | 'sum'
}

const hasDigit = (value: string) => /\d/.test(value)
const hasWords = (value: string) => /[A-Za-z]{3,}/.test(value) && !/:\s*$/.test(value)
const normalizeReference = (value: string) => value.toUpperCase().replace(/\s+/g, '')
const normalizeNumber = (value: string) => value.match(new RegExp(NUMBER))?.[0].replace(/,/g, '') ?? value
const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim()

function unitInBrackets(label: string, value: string): string | undefined {
  const fromLabel = label.match(/\(([A-Za-z]{1,6})\)/)?.[1] ?? label.match(/_(kg|t|mt|kwh)\b/i)?.[1]
  const fromValue = value.match(new RegExp(String.raw`^(?:${NUMBER})\s*([A-Za-z]{1,5})\b`))?.[1]
  const unit = fromLabel ?? fromValue
  if (!unit) return undefined
  const known: Record<string, string> = { kg: 'kg', mt: 'MT', t: 't', kwh: 'kWh', kvah: 'kVAh' }
  return known[unit.toLowerCase()] ?? unit
}

export const FIELD_SPECS: Record<FieldKey, FieldSpec> = {
  heatNumber: {
    label: 'Heat number',
    labels: [/heat\s*(?:no|number|n0)\b\.?/i],
    value: new RegExp(REFERENCE, 'i'),
    match: 'full',
    accept: hasDigit,
    normalize: normalizeReference,
    columns: [/heat/i],
    tableMode: 'distinct',
  },
  certificateNumber: {
    label: 'Certificate number',
    labels: [/certificate\s*(?:no|number)\b\.?/i],
    value: new RegExp(REFERENCE, 'i'),
    match: 'full',
    accept: hasDigit,
    normalize: normalizeReference,
  },
  supplierName: {
    // Found by position, not by a label; see findCompanyHeading.
    label: 'Supplier (heading)',
    value: /.+/,
    match: 'full',
    normalize: normalizeText,
  },
  challanNumber: {
    label: 'Challan number',
    labels: [/challan\s*(?:no|number)\b\.?/i],
    value: new RegExp(REFERENCE, 'i'),
    match: 'full',
    accept: hasDigit,
    normalize: normalizeReference,
  },
  jobWorkerName: {
    label: 'Job-worker',
    labels: [/to\s*\(?\s*job[\s-]*worker\s*\)?/i, /job[\s-]*worker\s*(?:name)?\s*:/i],
    value: /[A-Za-z][\w&.,'() -]{2,80}/,
    match: 'full',
    accept: hasWords,
    normalize: normalizeText,
  },
  batchId: {
    label: 'Batch ID',
    labels: [/batch\s*(?:ref(?:erence)?|id|no|number)?\b\.?\s*:?/i],
    value: new RegExp(REFERENCE, 'i'),
    match: 'full',
    accept: (value) => hasDigit(value) && value.length >= 5,
    normalize: normalizeReference,
    columns: [/^batch(?:[\s_]*(?:id|no|ref|number))?$/i],
    tableMode: 'distinct',
  },
  material: {
    label: 'Material / product',
    labels: [/description(?:\s+of\s+goods)?/i, /^product$/i, /^material$/i],
    value: /.{3,120}/,
    match: 'full',
    accept: hasWords,
    normalize: normalizeText,
    columns: [/^(?:product|material|item|description)/i],
    tableMode: 'distinct',
  },
  quantity: {
    label: 'Quantity',
    labels: [/\b(?:qty|quantity)\b(?:\s*\([^)]*\))?/i],
    value: new RegExp(NUMBER),
    match: 'prefix',
    normalize: normalizeNumber,
    unitFrom: unitInBrackets,
    columns: [/net[\s_]*weight|^qty|quantity/i],
    tableMode: 'sum',
  },
  outputQuantity: {
    label: 'Output quantity (last recorded row)',
    value: new RegExp(NUMBER),
    match: 'prefix',
    normalize: normalizeNumber,
    unitFrom: unitInBrackets,
    columns: [/^output/i],
    tableMode: 'last',
  },
  electricityConsumption: {
    label: 'Electricity consumption',
    labels: [/units?\s+consumed(?:\s*\([^)]*\))?/i, /(?:energy|electricity)\s+consumption(?:\s*\([^)]*\))?/i],
    value: new RegExp(NUMBER),
    match: 'prefix',
    normalize: normalizeNumber,
    unitFrom: (label, value) => unitInBrackets(label, value) ?? (/kwh/i.test(label + value) ? 'kWh' : undefined),
    columns: [/kwh|units?\s*consumed/i],
    tableMode: 'sum',
  },
  billingPeriod: {
    label: 'Billing period',
    labels: [/bill(?:ing)?\s+period/i, /period\s+of\s+(?:supply|billing)/i],
    value: new RegExp(String.raw`(?:${DATE})\s*(?:to|-|–)\s*(?:${DATE})`, 'i'),
    match: 'prefix',
    normalize: normalizeText,
  },
  buyerName: {
    // "Buyer:" or a "buyer" column. "Buyer PO:" on a supplier invoice is not matched: it needs the colon right after.
    label: 'Buyer',
    labels: [/\b(?:buyer|consignee)\s*(?:name)?\s*:/i],
    value: /[A-Za-z][\w&.,'() -]{2,80}/,
    match: 'full',
    accept: hasWords,
    normalize: normalizeText,
    columns: [/^(?:buyer|consignee)(?:[\s_]*name)?$/i],
    tableMode: 'distinct',
  },
}

/** Fields worth looking for in each document type. Missing ones are shown as "Not detected". */
export const EXPECTED_FIELDS: Record<DocumentKind, FieldKey[]> = {
  mill_test_certificate: ['heatNumber', 'certificateNumber', 'supplierName'],
  job_work_challan: ['heatNumber', 'challanNumber', 'jobWorkerName', 'batchId', 'quantity'],
  production_log: ['batchId', 'outputQuantity', 'heatNumber'],
  electricity_bill: ['electricityConsumption', 'billingPeriod'],
  purchase_invoice: ['material', 'heatNumber', 'quantity', 'batchId', 'supplierName'],
  dispatch_record: ['material', 'batchId', 'quantity', 'buyerName'],
  job_worker_energy: ['electricityConsumption', 'billingPeriod', 'batchId'],
  unknown: ['batchId', 'heatNumber', 'quantity'],
}

/** Lines that belong to the synthetic-sample banner are not evidence and are skipped. */
const isSampleBanner = (text: string) => /synthetic sample|demo sample pack/i.test(text)

interface Candidate {
  value: string
  source: SourceRef
  unit?: string
  confidence?: number
  via: string
}

interface DocContext {
  documentId: string
  fileName: string
}

function candidateFrom(spec: FieldSpec, text: string): string | null {
  const trimmed = text.trim()
  const pattern = new RegExp(`^(?:${spec.value.source})${spec.match === 'full' ? '$' : ''}`, spec.value.flags)
  const found = trimmed.match(pattern)?.[0].trim()
  if (!found || (spec.accept && !spec.accept(found))) return null
  return found
}

/** A row of three or more cells with no digits is treated as table headings. */
const isHeaderRow = (line: LayoutLine) => line.cells.length >= 3 && !line.cells.some((c) => /\d/.test(c.text))

function overlaps(a: Cell, b: Cell) {
  return Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0) > 0
}

/** Looks for a label, then takes the value after it in the same cell, the next cell, or the cell below. */
function findInLines(spec: FieldSpec, lines: readonly LayoutLine[], ctx: DocContext): Candidate[] {
  const candidates: Candidate[] = []
  const usable = lines.filter((line) => !isSampleBanner(line.text))
  for (const [lineIndex, line] of usable.entries()) {
    for (const [cellIndex, cell] of line.cells.entries()) {
      const label = spec.labels?.map((re) => cell.text.match(re)).find(Boolean)
      if (!label || label.index === undefined) continue
      const labelText = label[0]
      const source = (target: LayoutLine): SourceRef => ({ ...ctx, page: target.page, line: target.number })
      const push = (value: string, target: LayoutLine, valueCell: Cell, via: string) =>
        candidates.push({
          value,
          source: source(target),
          unit: spec.unitFrom?.(labelText, valueCell.text),
          confidence: valueCell.confidence,
          via,
        })

      // 1. Same cell: "Customer batch ref: CP-LDH-2026-001"
      const rest = cell.text.slice(label.index + labelText.length).replace(/^[\s:.\-–|]+/, '')
      const inline = rest ? candidateFrom({ ...spec, match: 'prefix' }, rest) : null
      if (inline && (spec.match === 'prefix' || candidateFrom(spec, inline))) {
        push(inline, line, cell, `text after the label “${labelText.trim()}”`)
        continue
      }
      // 2. Next cell on the same line: "Heat No.        24A-1187". Skipped in a heading
      //    row, where the next cell is another heading rather than a value.
      const next = isHeaderRow(line) ? undefined : line.cells[cellIndex + 1]
      const nextValue = next ? candidateFrom(spec, next.text) : null
      if (next && nextValue) {
        push(nextValue, line, next, `value next to the label “${labelText.trim()}”`)
        continue
      }
      // 3. Column below a heading: a table header followed by its row.
      for (const below of usable.slice(lineIndex + 1, lineIndex + 4)) {
        if (below.page !== line.page) break
        const under = below.cells.find((c) => overlaps(c, cell))
        if (!under) continue
        const value = candidateFrom(spec, under.text)
        if (value) push(value, below, under, `value under the column heading “${labelText.trim()}”`)
        break
      }
    }
  }
  return candidates
}

const COMPANY = /\b(?:ltd|limited|pvt|llp|inc|gmbh|co)\b\.?/i
const NOT_SUPPLIER = /^(?:customer|bill to|ship to|buyer|consignee|consumer|to\b|from\b|received by|sent by)/i

/** The first company name near the top of page 1, used as a supplier hint only. */
function findCompanyHeading(lines: readonly LayoutLine[], ctx: DocContext): Candidate[] {
  const pageOne = lines.filter((line) => line.page === 1 && !isSampleBanner(line.text))
  for (const line of pageOne.slice(0, Math.ceil(pageOne.length / 3))) {
    if (NOT_SUPPLIER.test(line.cells[0]?.text ?? '')) continue
    const cell = line.cells.find((c) => COMPANY.test(c.text))
    if (cell) {
      return [
        {
          value: cell.text,
          source: { ...ctx, page: line.page, line: line.number },
          confidence: cell.confidence,
          via: 'the first company name near the top of the document',
        },
      ]
    }
  }
  return []
}

function findInTables(spec: FieldSpec, tables: readonly ExtractedTable[], ctx: DocContext): Candidate[] {
  const candidates: Candidate[] = []
  for (const table of tables) {
    if (table.headerRow === null || !spec.columns) continue
    const columnIndex = table.columns.findIndex((name) => spec.columns!.some((re) => re.test(name.trim())))
    if (columnIndex === -1) continue
    const column = table.columns[columnIndex]!
    const dataRows = table.rows.filter((row) => row.rowNumber > table.headerRow! && row.cells[columnIndex]?.trim())
    const at = (rowNumber: number): SourceRef => ({ ...ctx, sheet: table.sheet, row: rowNumber, column })
    const where = table.sheet ? `column “${column}” on sheet “${table.sheet}”` : `column “${column}”`

    if (spec.tableMode === 'last') {
      const last = [...dataRows].reverse().find((row) => candidateFrom(spec, row.cells[columnIndex]!))
      if (last) {
        const value = candidateFrom(spec, last.cells[columnIndex]!)!
        candidates.push({ value, source: at(last.rowNumber), unit: spec.unitFrom?.(column, value), via: `last value in ${where}` })
      }
    } else if (spec.tableMode === 'sum') {
      const values = dataRows.map((row) => ({ row, value: candidateFrom(spec, row.cells[columnIndex]!) }))
      if (values.length === 0 || values.some((v) => v.value === null)) continue
      const total = values.reduce((sum, v) => sum + Number(normalizeNumber(v.value!)), 0)
      const first = values[0]!.row.rowNumber
      const lastRow = values[values.length - 1]!.row.rowNumber
      candidates.push({
        value: values.length === 1 ? values[0]!.value! : total.toLocaleString('en-IN'),
        source: at(first),
        unit: spec.unitFrom?.(column, values[0]!.value!),
        via:
          values.length === 1
            ? `single value in ${where}`
            : `computed: sum of ${values.length} values in ${where}, rows ${first}–${lastRow}`,
      })
    } else {
      for (const row of dataRows) {
        const value = candidateFrom(spec, row.cells[columnIndex]!)
        if (value) candidates.push({ value, source: at(row.rowNumber), via: `${where}` })
      }
    }
  }
  return candidates
}

function toField(key: FieldKey, candidates: Candidate[], heuristic: boolean): ExtractedField {
  const spec = FIELD_SPECS[key]
  if (candidates.length === 0) return { key, label: spec.label, status: 'not_detected' }

  const distinct = new Map<string, Candidate>()
  for (const candidate of candidates) {
    const normalized = spec.normalize(candidate.value)
    if (!distinct.has(normalized)) distinct.set(normalized, candidate)
  }
  const [normalized, first] = [...distinct.entries()][0]!
  const alternatives = [...distinct.values()].slice(1).map((c) => ({ value: c.value, source: c.source }))
  const lowConfidence = first.confidence !== undefined && first.confidence < OCR_REVIEW_THRESHOLD

  const reasons: string[] = []
  if (alternatives.length) reasons.push(`${distinct.size} different values were found`)
  if (lowConfidence) reasons.push(`OCR confidence for this value is ${Math.round(first.confidence!)}%`)
  if (heuristic) reasons.push('Guessed from the document layout, not from a label')

  return {
    key,
    label: spec.label,
    status: reasons.length ? 'needs_review' : 'detected',
    value: first.value,
    normalized,
    unit: first.unit,
    source: first.source,
    method: `Found as the ${first.via}${candidates.length > 1 && !alternatives.length ? ` (same value appears ${candidates.length} times)` : ''}.`,
    reviewReason: reasons.length ? `${reasons.join('. ')}.` : undefined,
    alternatives: alternatives.length ? alternatives : undefined,
  }
}

export function extractFields(
  kind: DocumentKind,
  content: { lines?: readonly LayoutLine[]; tables?: readonly ExtractedTable[] },
  ctx: DocContext,
): ExtractedField[] {
  return EXPECTED_FIELDS[kind].map((key) => {
    const spec = FIELD_SPECS[key]
    if (key === 'supplierName') return toField(key, content.lines ? findCompanyHeading(content.lines, ctx) : [], true)
    const candidates = [
      ...(content.lines && spec.labels ? findInLines(spec, content.lines, ctx) : []),
      ...(content.tables ? findInTables(spec, content.tables, ctx) : []),
    ]
    return toField(key, candidates, false)
  })
}
