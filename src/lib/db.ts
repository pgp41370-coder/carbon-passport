import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { StoredDocument } from '../types/document'
import type { ExtractionResult, IssueReview, ValidationIssue } from '../types/extraction'
import type { TraceRecord } from '../types/traceability'

/**
 * Local browser database. Everything here stays on this device; nothing is synced.
 * Bump DB_VERSION and extend `upgrade` when later modules add stores.
 */
export const DB_NAME = 'carbon-passport'
const DB_VERSION = 3

export interface StoredFile {
  id: string
  blob: Blob
}

export interface CarbonPassportDB extends DBSchema {
  /** Document metadata, kept separate so the list loads without reading file contents. */
  documents: {
    key: string
    value: StoredDocument
    indexes: { 'by-addedAt': string }
  }
  /** Raw file contents, keyed by the same id as `documents`. */
  documentFiles: {
    key: string
    value: StoredFile
  }
  /** One extraction result per document, keyed by document id. */
  extractions: {
    key: string
    value: ExtractionResult
  }
  /** Current validation issues, recomputed from extractions and replaced as a set. */
  validationIssues: {
    key: string
    value: ValidationIssue
    indexes: { 'by-document': string }
  }
  /** Human review records, keyed by issue id. */
  issueReviews: {
    key: string
    value: IssueReview
  }
  /** User notes and proposed links on traceability hand-offs. The trace itself is derived, not stored. */
  traceRecords: {
    key: string
    value: TraceRecord
    indexes: { 'by-document': string }
  }
}

export type CarbonPassportDatabase = IDBPDatabase<CarbonPassportDB>

export class StorageUnavailableError extends Error {
  constructor(cause?: unknown) {
    super(
      'This browser is not allowing local storage. Private browsing or strict privacy settings can block it. Try a normal window in an up-to-date browser.',
      { cause },
    )
    this.name = 'StorageUnavailableError'
  }
}

let dbPromise: Promise<CarbonPassportDatabase> | null = null

export function getDb(): Promise<CarbonPassportDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new StorageUnavailableError())

  dbPromise ??= openDB<CarbonPassportDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const documents = db.createObjectStore('documents', { keyPath: 'id' })
        documents.createIndex('by-addedAt', 'addedAt')
        db.createObjectStore('documentFiles', { keyPath: 'id' })
      }
      if (oldVersion < 2) {
        db.createObjectStore('extractions', { keyPath: 'documentId' })
        const issues = db.createObjectStore('validationIssues', { keyPath: 'id' })
        issues.createIndex('by-document', 'documentIds', { multiEntry: true })
        db.createObjectStore('issueReviews', { keyPath: 'issueId' })
      }
      if (oldVersion < 3) {
        const records = db.createObjectStore('traceRecords', { keyPath: 'id' })
        records.createIndex('by-document', 'documentIds', { multiEntry: true })
      }
    },
    blocking() {
      // Another tab needs a newer schema: release our connection so it can upgrade.
      void dbPromise?.then((db) => db.close())
      dbPromise = null
    },
    terminated() {
      dbPromise = null
    },
  }).catch((error: unknown) => {
    dbPromise = null
    throw new StorageUnavailableError(error)
  })

  return dbPromise
}

/** True for the various ways browsers report a full storage allowance. */
export function isQuotaError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false
  return (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    // Safari can surface quota failures as an unknown error on large writes.
    (error.name === 'UnknownError' && /quota|space|disk/i.test(error.message))
  )
}

export interface StorageEstimate {
  usageBytes: number
  quotaBytes: number
}

/** Browser-reported usage for this site. Values are estimates and can be rounded by the browser. */
export async function getStorageEstimate(): Promise<StorageEstimate | null> {
  if (!navigator.storage?.estimate) return null
  try {
    const { usage, quota } = await navigator.storage.estimate()
    if (usage === undefined || quota === undefined) return null
    return { usageBytes: usage, quotaBytes: quota }
  } catch {
    return null
  }
}
