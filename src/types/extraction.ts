import type { DocumentOrigin } from './document'

/** Bump when parsing or field rules change so stored results can be flagged as outdated. */
export const EXTRACTOR_VERSION = 1

export type ExtractionMethod = 'pdf-text' | 'pdf-ocr' | 'pdf-mixed' | 'image-ocr' | 'csv' | 'spreadsheet'

export type ExtractionErrorCode = 'password' | 'unreadable' | 'empty' | 'unsupported' | 'missing-file' | 'ocr-failed' | 'app-updated' | 'unknown'

/** Where a value came from. Only the parts the parser actually knows are filled in. */
export interface SourceRef {
  documentId: string
  fileName: string
  page?: number
  /** 1-based line on the page, in the reading order shown on screen. */
  line?: number
  sheet?: string
  /** Row number as it appears in the CSV file or spreadsheet. */
  row?: number
  column?: string
}

export interface ExtractedLine {
  /** 1-based, matches SourceRef.line. */
  number: number
  text: string
  /** Mean OCR word confidence 0–100; absent for text read directly from a PDF. */
  confidence?: number
}

export interface ExtractedPage {
  pageNumber: number
  method: 'text' | 'ocr'
  lines: ExtractedLine[]
  /** Mean OCR confidence for the page, 0–100. */
  confidence?: number
}

export interface ExtractedRow {
  rowNumber: number
  cells: string[]
}

export interface ExtractedTable {
  /** Worksheet name for Excel files; absent for CSV. */
  sheet?: string
  /** Row number of the detected header row, or null when none was found. */
  headerRow: number | null
  columns: string[]
  /** Rows before the header (titles, notes), then data rows. */
  rows: ExtractedRow[]
  totalRows: number
  truncated: boolean
}

export type DocumentKind =
  | 'mill_test_certificate'
  | 'job_work_challan'
  | 'production_log'
  | 'electricity_bill'
  | 'purchase_invoice'
  | 'dispatch_record'
  | 'job_worker_energy'
  | 'unknown'

export interface DetectedType {
  kind: DocumentKind
  /** Keywords found in the content that led to this guess. */
  matchedKeywords: string[]
}

export type FieldKey =
  | 'heatNumber'
  | 'certificateNumber'
  | 'supplierName'
  | 'challanNumber'
  | 'jobWorkerName'
  | 'batchId'
  | 'material'
  | 'quantity'
  | 'outputQuantity'
  | 'electricityConsumption'
  | 'billingPeriod'

export type FieldStatus = 'detected' | 'needs_review' | 'not_detected'

/** A value inferred from raw content by a deterministic rule. Never a verified fact. */
export interface ExtractedField {
  key: FieldKey
  label: string
  status: FieldStatus
  /** Text exactly as found in the source. */
  value?: string
  /** Comparable form, e.g. upper-cased reference or a number without separators. */
  normalized?: string
  unit?: string
  source?: SourceRef
  /** Plain-language description of the rule that produced the value. */
  method?: string
  /** Why the field needs review (low OCR confidence, several candidates, heuristic guess…). */
  reviewReason?: string
  /** Other distinct values found for the same field. */
  alternatives?: { value: string; source: SourceRef }[]
}

export interface ExtractionError {
  code: ExtractionErrorCode
  message: string
}

export interface ExtractionResult {
  documentId: string
  fileName: string
  origin: DocumentOrigin
  extractorVersion: number
  extractedAt: string
  durationMs: number
  status: 'success' | 'warning' | 'failed'
  method?: ExtractionMethod
  error?: ExtractionError
  warnings: string[]
  pages?: ExtractedPage[]
  tables?: ExtractedTable[]
  detectedType: DetectedType
  fields: ExtractedField[]
}

export type IssueSeverity = 'high' | 'medium' | 'low'

export type CheckId = 'heat-number-match' | 'job-worker-energy' | 'batch-id-present' | 'quantity-present' | 'batch-id-consistent'

export interface IssueEvidence {
  label: string
  value?: string
  source?: SourceRef
  origin?: DocumentOrigin
}

export interface ValidationIssue {
  /** Deterministic id, so re-running checks updates rather than duplicates. */
  id: string
  checkId: CheckId
  severity: IssueSeverity
  title: string
  detail: string
  evidence: IssueEvidence[]
  /** Documents the issue refers to; used to drop issues when a document is removed. */
  documentIds: string[]
  /** Changes whenever the underlying values change; reviews only apply to a matching fingerprint. */
  fingerprint: string
  createdAt: string
}

export type CheckOutcome = 'issue' | 'passed' | 'not_applicable'

export interface CheckResult {
  checkId: CheckId
  title: string
  outcome: CheckOutcome
  summary: string
}

export type ReviewAction = 'follow_up' | 'explained' | 'extraction_error'

/** A person's recorded judgement on an issue. It is not independent verification. */
export interface IssueReview {
  issueId: string
  fingerprint: string
  action: ReviewAction
  note: string
  reviewer?: string
  reviewedAt: string
}
