import { useCallback, useEffect, useState } from 'react'
import { SAMPLE_PACK_BATCH_ID } from '../../data/samplePack'
import { getStorageEstimate, isQuotaError, StorageUnavailableError, type StorageEstimate } from '../../lib/db'
import { toErrorMessage } from '../../lib/errors'
import type { StoredDocument } from '../../types/document'
import {
  addDocument,
  clearAllDocuments,
  getDocumentFile,
  listDocuments,
  removeDocument,
  type NewDocument,
} from './documentStore'
import { documentsToRead, readDocuments, type ReadOutcome, type ReadProgress } from '../extraction/processDocuments'
import { loadSamplePackIntoStorage } from './samplePackLoader'
import { validateFile } from './fileTypes'

export type FeedbackTone = 'success' | 'warning' | 'error'

export interface FeedbackNote {
  fileName: string
  message: string
  kind: 'rejected' | 'failed' | 'renamed' | 'duplicate'
}

export interface Feedback {
  tone: FeedbackTone
  title: string
  notes: FeedbackNote[]
}

export interface PendingFile {
  key: string
  fileName: string
  sizeBytes: number
  state: 'checking' | 'saving'
}

export type LoadState = { status: 'loading' } | { status: 'ready' } | { status: 'unavailable'; message: string }

export type BusyAction = 'upload' | 'samples' | 'reading' | 'remove' | 'clear'

const QUOTA_MESSAGE =
  'Browser storage is full. Remove some documents or free up space on this device, then try again.'

function describeError(error: unknown): string {
  if (isQuotaError(error)) return QUOTA_MESSAGE
  if (error instanceof StorageUnavailableError) return error.message
  return `The file could not be saved: ${toErrorMessage(error)}`
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? '' : 's'}`
}

export function useDocuments() {
  const [documents, setDocuments] = useState<StoredDocument[]>([])
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' })
  const [pending, setPending] = useState<PendingFile[]>([])
  const [busy, setBusy] = useState<BusyAction | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [storage, setStorage] = useState<StorageEstimate | null>(null)
  const [reading, setReading] = useState<ReadProgress | null>(null)
  const [readResult, setReadResult] = useState<(ReadOutcome & { error?: string }) | null>(null)

  const refresh = useCallback(async () => {
    const [docs, estimate] = await Promise.all([listDocuments(), getStorageEstimate()])
    setDocuments(docs)
    setStorage(estimate)
  }, [])

  /** Reads every stored document that has no current result, so users never need a separate step. */
  const readNew = useCallback(async () => {
    const pendingDocs = await documentsToRead()
    if (pendingDocs.length === 0) return
    setBusy('reading')
    setReadResult(null)
    try {
      const outcome = await readDocuments(pendingDocs, setReading)
      setReadResult(outcome)
    } catch (error) {
      setReadResult({ read: 0, failed: pendingDocs.length, problems: 0, error: toErrorMessage(error) })
    } finally {
      setReading(null)
    }
  }, [])

  // Restore the stored list on first render (e.g. after a page refresh).
  useEffect(() => {
    let cancelled = false
    Promise.all([listDocuments(), getStorageEstimate()]).then(
      ([docs, estimate]) => {
        if (cancelled) return
        setDocuments(docs)
        setStorage(estimate)
        setLoadState({ status: 'ready' })
      },
      (error: unknown) => {
        if (cancelled) return
        const message = error instanceof StorageUnavailableError ? error.message : toErrorMessage(error)
        setLoadState({ status: 'unavailable', message })
      },
    )
    return () => {
      cancelled = true
    }
  }, [])

  const addFiles = useCallback(
    async (files: readonly File[]) => {
      if (files.length === 0 || busy) return
      setBusy('upload')
      setFeedback(null)

      const batchKey = Date.now().toString(36)
      const queue: PendingFile[] = files.map((file, i) => ({
        key: `${batchKey}-${i}`,
        fileName: file.name,
        sizeBytes: file.size,
        state: 'checking',
      }))
      setPending(queue)
      const setState = (key: string, state: PendingFile['state'] | null) =>
        setPending((current) =>
          state === null ? current.filter((p) => p.key !== key) : current.map((p) => (p.key === key ? { ...p, state } : p)),
        )

      let saved = 0
      const notes: FeedbackNote[] = []
      let freeBytes = storage ? storage.quotaBytes - storage.usageBytes : Infinity

      for (const [i, file] of files.entries()) {
        const key = queue[i].key
        const result = await validateFile(file)
        if (!result.ok) {
          notes.push({ fileName: file.name, message: result.reason, kind: 'rejected' })
          setState(key, null)
          continue
        }
        if (file.size > freeBytes) {
          notes.push({ fileName: file.name, message: QUOTA_MESSAGE, kind: 'failed' })
          setState(key, null)
          continue
        }

        setState(key, 'saving')
        try {
          // Copy the bytes now so later changes to the file on disk cannot affect what is stored.
          const blob = new Blob([await file.arrayBuffer()], { type: result.mimeType })
          const input: NewDocument = {
            originalFileName: file.name,
            format: result.format,
            mimeType: result.mimeType,
            blob,
            origin: 'user',
          }
          const { document, duplicateContentOf } = await addDocument(input)
          saved++
          freeBytes -= file.size
          if (document.fileName !== file.name) {
            notes.push({
              fileName: file.name,
              message: `A document with this name already exists, so it was saved as "${document.fileName}".`,
              kind: 'renamed',
            })
          }
          if (duplicateContentOf) {
            notes.push({
              fileName: document.fileName,
              message: `Has identical contents to "${duplicateContentOf}". Both copies are kept; remove one if it was added by mistake.`,
              kind: 'duplicate',
            })
          }
        } catch (error) {
          notes.push({ fileName: file.name, message: describeError(error), kind: 'failed' })
        }
        setState(key, null)
      }

      await refresh().catch(() => undefined)
      setPending([])

      const problems = notes.filter((n) => n.kind === 'rejected' || n.kind === 'failed').length
      const tone: FeedbackTone = problems === 0 ? (notes.length ? 'warning' : 'success') : saved ? 'warning' : 'error'
      const parts = [saved ? `${plural(saved, 'file')} saved in this browser` : 'No files were saved']
      if (problems) parts.push(`${plural(problems, 'file')} not added`)
      setFeedback({ tone, title: parts.join(' · '), notes })
      if (saved > 0) await readNew()
      setBusy(null)
    },
    [busy, readNew, refresh, storage],
  )

  const loadSamplePack = useCallback(async () => {
    if (busy) return
    setBusy('samples')
    setFeedback(null)
    const isReload = documents.some((doc) => doc.origin === 'sample')
    try {
      const count = await loadSamplePackIntoStorage()
      await refresh()
      setFeedback({
        tone: 'success',
        title: `Synthetic sample pack ${isReload ? 'reloaded' : 'loaded'}: ${plural(count, 'document')} for batch ${SAMPLE_PACK_BATCH_ID}`,
        notes: [],
      })
      await readNew()
    } catch (error) {
      const message =
        error instanceof TypeError
          ? 'The sample files could not be downloaded from this site. Check your connection and try again.'
          : isQuotaError(error) || error instanceof StorageUnavailableError
            ? describeError(error)
            : toErrorMessage(error)
      setFeedback({ tone: 'error', title: 'Sample pack not loaded', notes: [{ fileName: 'Sample pack', message, kind: 'failed' }] })
    }
    setBusy(null)
  }, [busy, documents, readNew, refresh])

  const remove = useCallback(
    async (document: StoredDocument) => {
      if (busy) return
      setBusy('remove')
      setReadResult(null)
      try {
        await removeDocument(document.id)
        await refresh()
        setFeedback({ tone: 'success', title: `Removed "${document.fileName}" and its stored contents`, notes: [] })
      } catch (error) {
        setFeedback({
          tone: 'error',
          title: 'Could not remove the document',
          notes: [{ fileName: document.fileName, message: toErrorMessage(error), kind: 'failed' }],
        })
      }
      setBusy(null)
    },
    [busy, refresh],
  )

  const clearAll = useCallback(async () => {
    if (busy) return
    setBusy('clear')
    setReadResult(null)
    const count = documents.length
    try {
      await clearAllDocuments()
      await refresh()
      setFeedback({ tone: 'success', title: `Deleted ${plural(count, 'document')} from this browser`, notes: [] })
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not delete the stored documents',
        notes: [{ fileName: 'All documents', message: toErrorMessage(error), kind: 'failed' }],
      })
    }
    setBusy(null)
  }, [busy, documents.length, refresh])

  /** Saves a copy of the stored file back to the user's device. */
  const download = useCallback(async (document: StoredDocument) => {
    try {
      const blob = await getDocumentFile(document.id)
      if (!blob) throw new Error('The stored contents are missing.')
      const url = URL.createObjectURL(blob)
      const link = window.document.createElement('a')
      link.href = url
      link.download = document.fileName
      link.click()
      setTimeout(() => URL.revokeObjectURL(url), 10_000)
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Could not open the stored copy',
        notes: [{ fileName: document.fileName, message: toErrorMessage(error), kind: 'failed' }],
      })
    }
  }, [])

  return {
    documents,
    loadState,
    pending,
    busy,
    feedback,
    storage,
    reading,
    readResult,
    dismissFeedback: () => setFeedback(null),
    addFiles,
    loadSamplePack,
    remove,
    clearAll,
    download,
  }
}
