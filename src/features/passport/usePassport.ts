import { useCallback, useEffect, useMemo, useState } from 'react'
import { StorageUnavailableError } from '../../lib/db'
import { toErrorMessage } from '../../lib/errors'
import type { StoredDocument } from '../../types/document'
import type { ExtractionResult, IssueReview } from '../../types/extraction'
import type { TraceRecord } from '../../types/traceability'
import { listDocuments } from '../documents/documentStore'
import { listExtractions, listIssueReviews, purgeOrphanExtractions } from '../extraction/extractionStore'
import { needsProcessing } from '../extraction/useExtraction'
import { detectBatchIds } from '../traceability/buildTrace'
import { listTraceRecords } from '../traceability/traceStore'
import { DEFAULT_BATCH_ID } from '../traceability/useTraceability'
import { buildPassport } from './buildPassport'

export interface WorkspaceSummary {
  total: number
  samples: number
  uploads: number
  /** Extracted successfully (with or without warnings). */
  processed: number
  failed: number
  notProcessed: number
  /** Processed by an older extractor version; should be reprocessed. */
  outdated: number
}

type LoadState = { status: 'loading' } | { status: 'ready' } | { status: 'unavailable'; message: string }

interface Snapshot {
  documents: StoredDocument[]
  results: ExtractionResult[]
  issueReviews: IssueReview[]
  traceRecords: TraceRecord[]
  loadedAt: string
}

/** Loads stored data and derives the passport. Re-reads storage whenever the tab is shown again. */
export function usePassport() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null)
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })

  const reload = useCallback(() => {
    return (async () => {
      await purgeOrphanExtractions()
      const [documents, results, issueReviews, traceRecords] = await Promise.all([
        listDocuments(),
        listExtractions(),
        listIssueReviews(),
        listTraceRecords(),
      ])
      return { documents, results, issueReviews, traceRecords, loadedAt: new Date().toISOString() }
    })().then(
      (next) => {
        setSnapshot(next)
        setLoadState({ status: 'ready' })
      },
      (error: unknown) =>
        setLoadState({
          status: 'unavailable',
          message: error instanceof StorageUnavailableError ? error.message : toErrorMessage(error),
        }),
    )
  }, [])

  useEffect(() => {
    reload()
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])

  const batchIds = useMemo(
    () => (snapshot ? detectBatchIds(snapshot.results.filter((r) => r.status !== 'failed')) : []),
    [snapshot],
  )
  const batchId = batchIds.includes(DEFAULT_BATCH_ID) ? DEFAULT_BATCH_ID : (batchIds[0] ?? null)

  const passport = useMemo(
    () => (snapshot && batchId ? buildPassport({ ...snapshot, batchId, now: snapshot.loadedAt }) : null),
    [snapshot, batchId],
  )

  const resultsById = useMemo(
    () => Object.fromEntries((snapshot?.results ?? []).map((r) => [r.documentId, r])) as Record<string, ExtractionResult>,
    [snapshot],
  )

  /** Document presence and extraction status, independent of whether a batch was found. */
  const workspace = useMemo<WorkspaceSummary>(() => {
    const documents = snapshot?.documents ?? []
    const byId = new Map((snapshot?.results ?? []).map((r) => [r.documentId, r]))
    const resultFor = (id: string) => byId.get(id)
    return {
      total: documents.length,
      samples: documents.filter((d) => d.origin === 'sample').length,
      uploads: documents.filter((d) => d.origin === 'user').length,
      processed: documents.filter((d) => resultFor(d.id) && resultFor(d.id)!.status !== 'failed').length,
      failed: documents.filter((d) => resultFor(d.id)?.status === 'failed' && !needsProcessing(resultFor(d.id))).length,
      notProcessed: documents.filter((d) => !resultFor(d.id)).length,
      outdated: documents.filter((d) => resultFor(d.id) && needsProcessing(resultFor(d.id))).length,
    }
  }, [snapshot])

  return { loadState, passport, resultsById, workspace, documentCount: workspace.total, reload }
}
