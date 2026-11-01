import { useCallback, useEffect, useMemo, useState } from 'react'
import { StorageUnavailableError } from '../../lib/db'
import { toErrorMessage } from '../../lib/errors'
import type { StoredDocument } from '../../types/document'
import type { ExtractionResult } from '../../types/extraction'
import type { LinkId, TraceRecord } from '../../types/traceability'
import { listDocuments } from '../documents/documentStore'
import { listExtractions, purgeOrphanExtractions } from '../extraction/extractionStore'
import { selectBatch, useSelectedBatch } from '../passport/selectedBatch'
import { buildTrace, detectBatchIds } from './buildTrace'
import { deleteTraceRecord, listTraceRecords, saveTraceRecord } from './traceStore'

/** The demo batch; used by default when the documents mention it. */
export const DEFAULT_BATCH_ID = 'CP-LDH-2026-001'

type LoadState = { status: 'loading' } | { status: 'ready' } | { status: 'unavailable'; message: string }

interface Snapshot {
  documents: StoredDocument[]
  results: ExtractionResult[]
  records: TraceRecord[]
}

export interface RecordInput {
  linkId: LinkId
  kind: TraceRecord['kind']
  note: string
  reviewer?: string
  proposedReference?: string
}

export function useTraceability() {
  const [snapshot, setSnapshot] = useState<Snapshot>({ documents: [], results: [], records: [] })
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const chosenBatch = useSelectedBatch()

  const load = useCallback(async () => {
    await purgeOrphanExtractions()
    const [documents, results, records] = await Promise.all([listDocuments(), listExtractions(), listTraceRecords()])
    return { documents, results, records }
  }, [])

  const reload = useCallback(() => {
    load().then(
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
  }, [load])

  useEffect(() => {
    reload()
    // Documents can be removed in another tab; re-read storage whenever this one is shown again.
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [reload])

  const batchIds = useMemo(() => detectBatchIds(snapshot.results.filter((r) => r.status !== 'failed')), [snapshot.results])
  const batchId =
    chosenBatch && batchIds.includes(chosenBatch)
      ? chosenBatch
      : batchIds.includes(DEFAULT_BATCH_ID)
        ? DEFAULT_BATCH_ID
        : (batchIds[0] ?? null)

  const trace = useMemo(
    () => (batchId ? buildTrace(snapshot.documents, snapshot.results, batchId, snapshot.records) : null),
    [batchId, snapshot],
  )

  const resultsById = useMemo(
    () => Object.fromEntries(snapshot.results.map((r) => [r.documentId, r])) as Record<string, ExtractionResult>,
    [snapshot.results],
  )

  /** Saves a note against the link's current evidence. Returns false if that evidence changed meanwhile. */
  const saveRecord = useCallback(
    async (input: RecordInput): Promise<boolean> => {
      const link = trace?.links.find((l) => l.id === input.linkId)
      if (!trace || !link) return false
      // link.fingerprint is computed before proposals are applied, so a proposal never invalidates itself.
      const ok = await saveTraceRecord({
        id: `${trace.batchId}:${input.linkId}`,
        batchId: trace.batchId,
        linkId: input.linkId,
        kind: input.kind,
        note: input.note,
        reviewer: input.reviewer,
        proposedReference: input.proposedReference,
        recordedAt: new Date().toISOString(),
        fingerprint: link.fingerprint,
        documentIds: link.documentIds,
      })
      reload()
      return ok
    },
    [reload, trace],
  )

  const deleteRecord = useCallback(
    async (id: string) => {
      await deleteTraceRecord(id)
      reload()
    },
    [reload],
  )

  return {
    loadState,
    documents: snapshot.documents,
    hasResults: snapshot.results.length > 0,
    resultsById,
    batchIds,
    batchId,
    setBatchId: selectBatch,
    trace,
    saveRecord,
    deleteRecord,
  }
}
