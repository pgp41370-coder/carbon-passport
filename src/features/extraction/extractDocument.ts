import type { StoredDocument } from '../../types/document'
import {
  EXTRACTOR_VERSION,
  type ExtractedPage,
  type ExtractedTable,
  type ExtractionError,
  type ExtractionMethod,
  type ExtractionResult,
} from '../../types/extraction'
import { getDocumentFile } from '../documents/documentStore'
import { classifyDocument } from './classify'
import { extractFields } from './fields'
import type { LayoutLine } from './layout'
import { ParseError } from './parsers/errors'

export type ExtractionStage = 'reading' | 'parsing' | 'ocr' | 'mapping'

export interface ExtractionProgress {
  stage: ExtractionStage
  /** Human-readable status, e.g. "Recognising text on page 1 of 2". */
  message: string
  /** 0–1 when known. */
  progress?: number
}

/** Pages whose mean OCR confidence is below this get a warning. */
const LOW_PAGE_CONFIDENCE = 70

const OCR_STATUS: Record<string, string> = {
  'loading tesseract core': 'Loading the OCR engine',
  'initializing tesseract': 'Starting the OCR engine',
  'initialized tesseract': 'Starting the OCR engine',
  'loading language traineddata': 'Loading English OCR data (downloaded once, then cached)',
  'loading language traineddata (from cache)': 'Loading English OCR data from cache',
  'initializing api': 'Preparing OCR',
  'initialized api': 'Preparing OCR',
  'recognizing text': 'Recognising text',
}

function toPage(pageNumber: number, method: 'text' | 'ocr', lines: LayoutLine[], confidence?: number): ExtractedPage {
  return {
    pageNumber,
    method,
    confidence,
    lines: lines.map((line) => ({
      number: line.number,
      text: line.text,
      confidence: line.confidence === undefined ? undefined : Math.round(line.confidence),
    })),
  }
}

/**
 * Reads one stored document entirely in the browser and returns raw content plus
 * inferred fields. Failures are returned as results, not thrown.
 */
export async function extractDocument(
  doc: StoredDocument,
  onProgress: (progress: ExtractionProgress) => void,
): Promise<ExtractionResult> {
  const started = performance.now()
  const base = {
    documentId: doc.id,
    fileName: doc.fileName,
    origin: doc.origin,
    extractorVersion: EXTRACTOR_VERSION,
  }
  const finish = (partial: Omit<ExtractionResult, keyof typeof base | 'extractedAt' | 'durationMs'>): ExtractionResult => ({
    ...base,
    ...partial,
    extractedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - started),
  })
  const fail = (error: ExtractionError, method?: ExtractionMethod) =>
    finish({ status: 'failed', method, error, warnings: [], detectedType: { kind: 'unknown', matchedKeywords: [] }, fields: [] })

  onProgress({ stage: 'reading', message: 'Reading the stored file' })
  const blob = await getDocumentFile(doc.id)
  if (!blob) return fail({ code: 'missing-file', message: 'The stored file contents are missing. Remove the document and upload it again.' })
  if (blob.size === 0) return fail({ code: 'empty', message: 'The file is empty.' })

  const warnings: string[] = []
  let method: ExtractionMethod
  let layoutLines: LayoutLine[] | undefined
  let pages: ExtractedPage[] | undefined
  let tables: ExtractedTable[] | undefined

  const ocrProgress = (prefix: string) => (status: string, progress: number) =>
    onProgress({ stage: 'ocr', message: `${prefix}${OCR_STATUS[status] ?? status}`, progress })

  try {
    switch (doc.format) {
      case 'pdf': {
        onProgress({ stage: 'parsing', message: 'Reading PDF text' })
        const pdfParser = await import('./parsers/pdf')
        const pdf = await pdfParser.openPdf(await blob.arrayBuffer())
        try {
          const textPages = await pdfParser.readPdfText(pdf)
          pages = []
          layoutLines = []
          const scanned = textPages.filter((p) => p.needsOcr)
          for (const page of textPages) {
            if (!page.needsOcr) {
              pages.push(toPage(page.pageNumber, 'text', page.lines))
              layoutLines.push(...page.lines)
              continue
            }
            const { recognise } = await import('./parsers/ocr')
            const canvas = await pdfParser.renderPdfPage(pdf, page.pageNumber)
            const ocr = await recognise(
              canvas,
              page.pageNumber,
              ocrProgress(`Page ${page.pageNumber} of ${textPages.length}: `),
            )
            pages.push(toPage(page.pageNumber, 'ocr', ocr.lines, Math.round(ocr.confidence)))
            layoutLines.push(...ocr.lines)
          }
          method = scanned.length === 0 ? 'pdf-text' : scanned.length === textPages.length ? 'pdf-ocr' : 'pdf-mixed'
          if (scanned.length) {
            warnings.push(
              `${scanned.length} of ${textPages.length} page${textPages.length === 1 ? ' has' : 's have'} no text layer and ${scanned.length === 1 ? 'was' : 'were'} read with OCR.`,
            )
          }
        } finally {
          void pdf.loadingTask.destroy()
        }
        break
      }
      case 'png':
      case 'jpeg': {
        const { recognise } = await import('./parsers/ocr')
        const ocr = await recognise(blob, 1, ocrProgress(''))
        pages = [toPage(1, 'ocr', ocr.lines, Math.round(ocr.confidence))]
        layoutLines = ocr.lines
        method = 'image-ocr'
        break
      }
      case 'csv': {
        onProgress({ stage: 'parsing', message: 'Parsing CSV rows' })
        const { parseCsv } = await import('./parsers/csv')
        tables = [parseCsv(await blob.text())]
        method = 'csv'
        break
      }
      case 'xlsx':
      case 'xls': {
        onProgress({ stage: 'parsing', message: 'Parsing workbook sheets' })
        const { parseWorkbook } = await import('./parsers/spreadsheet')
        tables = parseWorkbook(await blob.arrayBuffer())
        method = 'spreadsheet'
        break
      }
      default:
        return fail({ code: 'unsupported', message: `Files of type “${doc.format}” cannot be read yet.` })
    }
  } catch (error) {
    const message = (error as Error)?.message ?? String(error)
    // A new version was deployed while this tab was open, so the old reader code is gone.
    if (/dynamically imported module|importing a module script failed|module script/i.test(message)) {
      return fail({
        code: 'app-updated',
        message: 'The app was updated while this page was open, so its reader could not load. Reload the page; the document is then read again.',
      })
    }
    if (error instanceof ParseError) {
      return fail({
        code: error.code,
        message: error.code === 'password' ? `${message} Remove the password and upload the file again.` : message,
      })
    }
    if (doc.format === 'png' || doc.format === 'jpeg' || /tesseract|traineddata|wasm|worker/i.test(message)) {
      return fail({
        code: 'ocr-failed',
        message: `Text recognition failed: ${message}. If this is the first OCR run, check the connection (English language data is downloaded once).`,
      })
    }
    return fail({ code: 'unknown', message: `The document could not be processed: ${message}` })
  }

  onProgress({ stage: 'mapping', message: 'Looking for evidence fields' })
  const text = [
    ...(layoutLines ?? []).map((line) => line.text),
    ...(tables ?? []).flatMap((table) => [table.sheet ?? '', ...table.rows.map((row) => row.cells.join(' '))]),
  ].join('\n')
  if (text.replace(/\s/g, '').length === 0) {
    return fail({ code: 'empty', message: 'No readable text or rows were found in this document.' }, method)
  }

  for (const page of pages ?? []) {
    if (page.method === 'ocr' && page.confidence !== undefined && page.confidence < LOW_PAGE_CONFIDENCE) {
      warnings.push(`OCR confidence on page ${page.pageNumber} is low (${page.confidence}%). Check values against the original.`)
    }
  }
  for (const table of tables ?? []) {
    if (table.truncated) warnings.push(`${table.sheet ? `Sheet “${table.sheet}”` : 'The file'} has ${table.totalRows} rows; only the first ${table.rows.length} were kept.`)
    const looksTabular = table.rows.some((row) => row.cells.filter((cell) => cell !== '').length >= 2)
    if (table.headerRow === null && looksTabular) {
      warnings.push(`${table.sheet ? `Sheet “${table.sheet}”` : 'The file'} has no recognisable header row, so columns could not be named.`)
    }
  }

  const detectedType = classifyDocument(text)
  if (detectedType.kind === 'unknown') warnings.push('The document type could not be recognised from its content.')
  const fields = extractFields(detectedType.kind, { lines: layoutLines, tables }, { documentId: doc.id, fileName: doc.fileName })
  const needsReview = fields.some((f) => f.status !== 'detected')

  return finish({
    status: warnings.length || needsReview ? 'warning' : 'success',
    method,
    warnings,
    pages,
    tables,
    detectedType,
    fields,
  })
}
