import type { DocumentFormat } from '../../types/document'
import { MAX_FILE_SIZE_BYTES, MAX_FILE_SIZE_MB } from './config'

interface FormatSpec {
  label: string
  extensions: readonly string[]
  /** MIME types browsers report for this format. An empty MIME type is accepted. */
  mimeTypes: readonly string[]
  /** MIME type to record when the browser reports none. */
  defaultMimeType: string
  /** Checks the first bytes of the file to confirm the content matches the extension. */
  matchesSignature: (head: Uint8Array) => boolean
}

// Many systems report unknown binaries as octet-stream; the signature check still applies.
const GENERIC_BINARY = 'application/octet-stream'

const startsWith = (head: Uint8Array, bytes: readonly number[]) => bytes.every((byte, i) => head[i] === byte)

const ZIP = [0x50, 0x4b, 0x03, 0x04]
const OLE2 = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]

function containsAscii(head: Uint8Array, text: string): boolean {
  const needle = Array.from(text, (char) => char.charCodeAt(0))
  outer: for (let i = 0; i <= head.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (head[i + j] !== needle[j]) continue outer
    return true
  }
  return false
}

function looksLikeText(head: Uint8Array): boolean {
  return !head.includes(0)
}

function firstNonSpaceByte(head: Uint8Array): number | undefined {
  // Skips a UTF-8 BOM and whitespace.
  let i = startsWith(head, [0xef, 0xbb, 0xbf]) ? 3 : 0
  while (i < head.length && [0x09, 0x0a, 0x0d, 0x20].includes(head[i])) i++
  return head[i]
}

export const FORMAT_SPECS: Record<DocumentFormat, FormatSpec> = {
  pdf: {
    label: 'PDF',
    extensions: ['pdf'],
    mimeTypes: ['application/pdf', 'application/x-pdf', GENERIC_BINARY],
    defaultMimeType: 'application/pdf',
    // The PDF header may be preceded by a few junk bytes; readers search the first 1 KB.
    matchesSignature: (head) => containsAscii(head, '%PDF-'),
  },
  png: {
    label: 'PNG image',
    extensions: ['png'],
    mimeTypes: ['image/png', GENERIC_BINARY],
    defaultMimeType: 'image/png',
    matchesSignature: (head) => startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  },
  jpeg: {
    label: 'JPEG image',
    extensions: ['jpg', 'jpeg'],
    mimeTypes: ['image/jpeg', 'image/pjpeg', GENERIC_BINARY],
    defaultMimeType: 'image/jpeg',
    matchesSignature: (head) => startsWith(head, [0xff, 0xd8, 0xff]),
  },
  csv: {
    label: 'CSV',
    extensions: ['csv'],
    // Windows commonly reports CSV as application/vnd.ms-excel.
    mimeTypes: [
      'text/csv',
      'text/plain',
      'application/csv',
      'text/x-csv',
      'application/x-csv',
      'text/comma-separated-values',
      'application/vnd.ms-excel',
      GENERIC_BINARY,
    ],
    defaultMimeType: 'text/csv',
    matchesSignature: looksLikeText,
  },
  xlsx: {
    label: 'Excel workbook',
    extensions: ['xlsx'],
    mimeTypes: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip', GENERIC_BINARY],
    defaultMimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    matchesSignature: (head) => startsWith(head, ZIP),
  },
  xls: {
    label: 'Excel 97–2003 workbook',
    extensions: ['xls'],
    mimeTypes: ['application/vnd.ms-excel', 'application/x-msexcel', 'application/msexcel', GENERIC_BINARY],
    defaultMimeType: 'application/vnd.ms-excel',
    // Real .xls files are OLE2. Many ERP and bank exports are HTML/XML tables or
    // mislabelled .xlsx files saved as .xls; SheetJS reads those too, so accept them.
    matchesSignature: (head) => startsWith(head, OLE2) || startsWith(head, ZIP) || firstNonSpaceByte(head) === 0x3c,
  },
}

export const SUPPORTED_EXTENSIONS = Object.values(FORMAT_SPECS).flatMap((spec) => spec.extensions)

/** Value for an `<input type="file" accept>` attribute. Extensions only, so the picker doesn't offer .txt files. */
export const ACCEPT_ATTRIBUTE = SUPPORTED_EXTENSIONS.map((ext) => `.${ext}`).join(',')

export const SUPPORTED_FORMATS_TEXT = 'PDF, PNG, JPG/JPEG, CSV, XLSX and XLS'

export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf('.')
  return dot <= 0 ? '' : fileName.slice(dot + 1).toLowerCase()
}

export function formatFromExtension(extension: string): DocumentFormat | null {
  for (const [format, spec] of Object.entries(FORMAT_SPECS) as [DocumentFormat, FormatSpec][]) {
    if (spec.extensions.includes(extension)) return format
  }
  return null
}

export type ValidationResult =
  | { ok: true; format: DocumentFormat; mimeType: string }
  | { ok: false; reason: string }

const HEAD_BYTES = 1024

/**
 * Checks extension, size, reported MIME type and file signature. This confirms the
 * file looks like what its name says; it does not parse or interpret the contents.
 */
export async function validateFile(file: File): Promise<ValidationResult> {
  const extension = getExtension(file.name)
  const format = formatFromExtension(extension)
  if (!format) {
    const shown = extension ? `.${extension} files are` : 'Files without an extension are'
    return { ok: false, reason: `${shown} not supported. Supported formats: ${SUPPORTED_FORMATS_TEXT}.` }
  }
  const spec = FORMAT_SPECS[format]

  if (file.size === 0) return { ok: false, reason: 'The file is empty.' }
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { ok: false, reason: `The file is ${formatBytes(file.size)}; the limit is ${MAX_FILE_SIZE_MB} MB per file.` }
  }

  const reportedType = file.type.toLowerCase()
  if (reportedType && !spec.mimeTypes.includes(reportedType)) {
    return {
      ok: false,
      reason: `The file is named .${extension} but your browser reports it as "${reportedType}". It may be renamed or corrupted.`,
    }
  }

  let head: Uint8Array
  try {
    head = new Uint8Array(await file.slice(0, HEAD_BYTES).arrayBuffer())
  } catch {
    return { ok: false, reason: 'The file could not be read. It may have been moved or deleted.' }
  }
  if (!spec.matchesSignature(head)) {
    return {
      ok: false,
      reason: `The contents do not look like a valid ${spec.label}. The file may be renamed or corrupted.`,
    }
  }

  return { ok: true, format, mimeType: reportedType || spec.defaultMimeType }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value < 10 ? value.toFixed(1) : Math.round(value)} ${units[unit]}`
}
