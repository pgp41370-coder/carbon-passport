import { createWorker, type PSM, type Worker } from 'tesseract.js'
// Worker script and WASM engine are bundled and served from this site.
import coreUrl from 'tesseract.js-core/tesseract-core-simd-lstm.wasm.js?url'
import workerUrl from 'tesseract.js/dist/worker.min.js?url'
import { buildLines, type LayoutLine, type Token } from '../layout'

/**
 * English language data is the only OCR asset fetched from a CDN (jsDelivr), once,
 * then cached by the browser. Images are recognised locally inside a Web Worker and
 * are never sent anywhere.
 */
export const OCR_LANGUAGE_HOST = 'cdn.jsdelivr.net'

export type OcrProgress = (status: string, progress: number) => void

let workerPromise: Promise<Worker> | null = null
let progressListener: OcrProgress | null = null

/**
 * Tesseract.js defaults to page-segmentation mode 6 (one uniform block), which
 * garbles bordered tables. Mode 3 (automatic layout) keeps table cells readable;
 * buildLines then rebuilds rows from word positions.
 */
export const OCR_PAGE_SEGMENTATION_MODE = '3' as PSM

function getWorker(): Promise<Worker> {
  workerPromise ??= createWorker('eng', 1, {
    workerPath: new URL(workerUrl, window.location.href).href,
    corePath: new URL(coreUrl, window.location.href).href,
    workerBlobURL: false,
    logger: (message) => progressListener?.(message.status, message.progress),
  })
    .then(async (worker) => {
      await worker.setParameters({ tessedit_pageseg_mode: OCR_PAGE_SEGMENTATION_MODE })
      return worker
    })
    .catch((error: unknown) => {
      workerPromise = null
      throw error
    })
  return workerPromise
}

export interface OcrPage {
  lines: LayoutLine[]
  confidence: number
}

export async function recognise(image: Blob | HTMLCanvasElement, page: number, onProgress?: OcrProgress): Promise<OcrPage> {
  progressListener = onProgress ?? null
  try {
    const worker = await getWorker()
    const { data } = await worker.recognize(image, {}, { blocks: true, text: false })
    const tokens: Token[] = []
    for (const block of data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          for (const word of line.words) {
            tokens.push({
              text: word.text,
              x0: word.bbox.x0,
              x1: word.bbox.x1,
              y0: word.bbox.y0,
              y1: word.bbox.y1,
              confidence: word.confidence,
            })
          }
        }
      }
    }
    return { lines: buildLines(tokens, page), confidence: data.confidence }
  } finally {
    progressListener = null
  }
}

/** Frees the OCR worker's memory once a batch is finished. */
export async function releaseOcr(): Promise<void> {
  const pending = workerPromise
  workerPromise = null
  if (pending) await (await pending.catch(() => null))?.terminate()
}
