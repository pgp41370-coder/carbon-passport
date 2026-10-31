import type { StoredDocument } from '../../types/document'
import { runValidation } from '../evidence/validation'
import { listDocuments } from '../documents/documentStore'
import { extractDocument } from './extractDocument'
import { listExtractions, purgeOrphanExtractions, replaceIssues, saveExtraction } from './extractionStore'
import { needsProcessing } from './useExtraction'

/** Progress of a batch read, for screens that read documents automatically. */
export interface ReadProgress {
  index: number
  total: number
  fileName: string
  message: string
  /** 0–1 within the current document, when known. */
  progress?: number
}

export interface ReadOutcome {
  read: number
  failed: number
  /** Validation issues for all stored documents after the read. */
  problems: number
}

/** Stored documents with no current extraction result. */
export async function documentsToRead(): Promise<StoredDocument[]> {
  const [docs, results] = await Promise.all([listDocuments(), listExtractions()])
  const byId = new Map(results.map((r) => [r.documentId, r]))
  return docs.filter((doc) => needsProcessing(byId.get(doc.id)))
}

/** Recomputes validation issues from every current result and stores them. */
export async function revalidateStoredResults(): Promise<number> {
  await purgeOrphanExtractions()
  const [docs, results] = await Promise.all([listDocuments(), listExtractions()])
  const ids = new Set(docs.map((doc) => doc.id))
  const { issues } = runValidation(results.filter((r) => ids.has(r.documentId)))
  await replaceIssues(issues)
  return issues.length
}

/**
 * Reads documents in this browser one by one, saves each result, then re-runs the
 * checks. The same extraction and validation code as the Check documents screen.
 */
export async function readDocuments(docs: readonly StoredDocument[], onProgress?: (p: ReadProgress) => void): Promise<ReadOutcome> {
  let failed = 0
  try {
    for (const [index, doc] of docs.entries()) {
      const report = (message: string, progress?: number) =>
        onProgress?.({ index, total: docs.length, fileName: doc.fileName, message, progress })
      report('Starting')
      const result = await extractDocument(doc, (p) => report(p.message, p.progress))
      if (result.status === 'failed') failed++
      await saveExtraction(result)
    }
  } finally {
    const { releaseOcr } = await import('./parsers/ocr')
    await releaseOcr().catch(() => undefined)
  }
  const problems = await revalidateStoredResults()
  return { read: docs.length, failed, problems }
}
