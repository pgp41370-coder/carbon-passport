import { useCallback, useEffect, useRef, useState } from 'react'
import { StorageUnavailableError } from '../../lib/db'
import { toErrorMessage } from '../../lib/errors'
import type { StoredDocument } from '../../types/document'
import {
  EXTRACTOR_VERSION,
  type CheckResult,
  type ExtractionResult,
  type IssueReview,
  type ValidationIssue,
} from '../../types/extraction'
import { runValidation } from '../evidence/validation'
import { listDocuments } from '../documents/documentStore'
import { extractDocument, type ExtractionProgress } from './extractDocument'
import {
  deleteReview,
  listExtractions,
  purgeOrphanExtractions,
  replaceIssues,
  saveExtraction,
  saveReview,
} from './extractionStore'

export type LoadState = { status: 'loading' } | { status: 'ready' } | { status: 'unavailable'; message: string }

export interface RunState {
  total: number
  completed: number
  current: { documentId: string; fileName: string } & ExtractionProgress
}

/** Documents that have never been processed, or were processed by an older extractor. */
export function needsProcessing(result: ExtractionResult | undefined) {
  // A failure caused by an app update is not about the document, so it is read again.
  return !result || result.extractorVersion !== EXTRACTOR_VERSION || result.error?.code === 'app-updated'
}

export function useExtraction() {
  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [results, setResults] = useState<Record<string, ExtractionResult>>({})
  const [checks, setChecks] = useState<CheckResult[]>([])
  const [issues, setIssues] = useState<ValidationIssue[]>([])
  const [reviews, setReviews] = useState<Record<string, IssueReview>>({})
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [run, setRun] = useState<RunState | null>(null)
  const [runError, setRunError] = useState<string | null>(null)
  const running = useRef(false)

  /** Recomputes checks from current results and replaces the stored issue set. */
  const revalidate = useCallback(async (current: readonly ExtractionResult[]) => {
    const outcome = runValidation(current)
    const kept = await replaceIssues(outcome.issues)
    setChecks(outcome.checks)
    setIssues(outcome.issues)
    setReviews(Object.fromEntries(kept.map((review) => [review.issueId, review])))
  }, [])

  // Load stored documents and results; drop any result whose document is gone.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await purgeOrphanExtractions()
      const [docs, stored] = await Promise.all([listDocuments(), listExtractions()])
      if (cancelled) return
      const ids = new Set(docs.map((doc) => doc.id))
      const current = stored.filter((result) => ids.has(result.documentId))
      setDocuments(docs)
      setResults(Object.fromEntries(current.map((result) => [result.documentId, result])))
      await revalidate(current)
      if (!cancelled) setLoadState({ status: 'ready' })
    })().catch((error: unknown) => {
      if (cancelled) return
      setLoadState({
        status: 'unavailable',
        message: error instanceof StorageUnavailableError ? error.message : toErrorMessage(error),
      })
    })
    return () => {
      cancelled = true
    }
  }, [revalidate])

  const process = useCallback(
    async (targets: readonly StoredDocument[]) => {
      if (running.current || targets.length === 0) return
      running.current = true
      setRunError(null)
      const latest: Record<string, ExtractionResult> = { ...results }
      try {
        for (const [index, doc] of targets.entries()) {
          setRun({
            total: targets.length,
            completed: index,
            current: { documentId: doc.id, fileName: doc.fileName, stage: 'reading', message: 'Starting' },
          })
          const result = await extractDocument(doc, (progress) =>
            setRun((state) => state && { ...state, current: { documentId: doc.id, fileName: doc.fileName, ...progress } }),
          )
          // A document removed mid-run is not saved and drops out of the view.
          if (await saveExtraction(result)) latest[doc.id] = result
          else delete latest[doc.id]
          setResults({ ...latest })
        }
        const docs = await listDocuments()
        const ids = new Set(docs.map((doc) => doc.id))
        setDocuments(docs)
        await revalidate(Object.values(latest).filter((result) => ids.has(result.documentId)))
      } catch (error) {
        setRunError(toErrorMessage(error))
      } finally {
        const { releaseOcr } = await import('./parsers/ocr')
        await releaseOcr().catch(() => undefined)
        running.current = false
        setRun(null)
      }
    },
    [results, revalidate],
  )

  const recordReview = useCallback(async (review: IssueReview) => {
    await saveReview(review)
    setReviews((current) => ({ ...current, [review.issueId]: review }))
  }, [])

  const clearReview = useCallback(async (issueId: string) => {
    await deleteReview(issueId)
    setReviews((current) => {
      const next = { ...current }
      delete next[issueId]
      return next
    })
  }, [])

  return {
    documents,
    results,
    checks,
    issues,
    reviews,
    loadState,
    run,
    runError,
    dismissRunError: () => setRunError(null),
    process,
    recordReview,
    clearReview,
  }
}
