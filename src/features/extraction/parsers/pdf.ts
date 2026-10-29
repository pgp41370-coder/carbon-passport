import { getDocument, GlobalWorkerOptions, type PDFDocumentProxy } from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { buildLines, type LayoutLine, type Token } from '../layout'
import { ParseError } from './errors'

// The PDF.js worker is bundled with the app and served from the same origin.
GlobalWorkerOptions.workerSrc = pdfWorkerUrl

/** Pages with fewer readable characters than this are treated as scanned images. */
const MIN_TEXT_CHARS = 25
const OCR_RENDER_SCALE = 2.5

export interface PdfPageText {
  pageNumber: number
  lines: LayoutLine[]
  /** True when the page has no usable text layer and needs OCR. */
  needsOcr: boolean
}

export async function openPdf(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  try {
    // The bytes are passed in directly, so PDF.js has nothing to fetch.
    return await getDocument({ data: new Uint8Array(data), disableAutoFetch: true, disableStream: true }).promise
  } catch (error) {
    const name = (error as { name?: string })?.name
    if (name === 'PasswordException') throw new ParseError('password', 'The PDF is password-protected.')
    throw new ParseError(
      'unreadable',
      name === 'InvalidPDFException'
        ? 'The file is not a valid PDF or is damaged.'
        : `The PDF could not be opened (${(error as Error)?.message ?? 'unknown error'}).`,
    )
  }
}

export async function readPdfText(pdf: PDFDocumentProxy): Promise<PdfPageText[]> {
  const pages: PdfPageText[] = []
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1 })
    const content = await page.getTextContent()
    const tokens: Token[] = []
    for (const item of content.items) {
      if (!('str' in item) || item.str.trim() === '') continue
      const [, , , d, x, y] = item.transform as number[]
      const height = Math.abs(item.height || d || 10)
      // PDF coordinates start at the bottom; flip to top-down like OCR output.
      const top = viewport.height - y - height
      tokens.push({ text: item.str, x0: x, x1: x + item.width, y0: top, y1: top + height })
    }
    const lines = buildLines(tokens, pageNumber)
    const chars = lines.reduce((sum, line) => sum + line.text.replace(/\s/g, '').length, 0)
    pages.push({ pageNumber, lines, needsOcr: chars < MIN_TEXT_CHARS })
    page.cleanup()
  }
  return pages
}

/** Renders a page to a canvas for OCR. The canvas never leaves the browser. */
export async function renderPdfPage(pdf: PDFDocumentProxy, pageNumber: number): Promise<HTMLCanvasElement> {
  const page = await pdf.getPage(pageNumber)
  const viewport = page.getViewport({ scale: OCR_RENDER_SCALE })
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(viewport.width)
  canvas.height = Math.ceil(viewport.height)
  await page.render({ canvas, viewport, background: 'white' }).promise
  page.cleanup()
  return canvas
}
