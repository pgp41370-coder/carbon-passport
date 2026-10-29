import { getDb, type CarbonPassportDB } from '../../lib/db'
import type { DocumentFormat, DocumentOrigin, StoredDocument } from '../../types/document'
import type { IDBPTransaction } from 'idb'
import { uniqueFileName } from './fileNames'

/**
 * Persistence for uploaded documents. Metadata and file contents live in two
 * object stores and are always written and deleted together in one transaction.
 */

export interface NewDocument {
  originalFileName: string
  format: DocumentFormat
  mimeType: string
  blob: Blob
  origin: DocumentOrigin
  sampleKey?: string
}

export interface AddedDocument {
  document: StoredDocument
  /** Name of an already stored document with identical contents, if any. */
  duplicateContentOf?: string
}

/** Every store that holds data derived from a document, so deletes can cascade. */
type DocumentStoreName = 'documents' | 'documentFiles' | 'extractions' | 'validationIssues' | 'issueReviews' | 'traceRecords'
const DOCUMENT_STORES: DocumentStoreName[] = ['documents', 'documentFiles', 'extractions', 'validationIssues', 'issueReviews', 'traceRecords']

type DocumentsTransaction = IDBPTransaction<CarbonPassportDB, DocumentStoreName[], 'readwrite'>

/**
 * Deletes documents together with their stored bytes, extraction results and any
 * validation issue or traceability note that cites them, so no stale evidence
 * outlives its source.
 */
async function deleteDocumentsCascade(tx: DocumentsTransaction, ids: readonly string[]) {
  const issues = tx.objectStore('validationIssues')
  const traceRecords = tx.objectStore('traceRecords')
  for (const id of ids) {
    await tx.objectStore('documents').delete(id)
    await tx.objectStore('documentFiles').delete(id)
    await tx.objectStore('extractions').delete(id)
    for (const issueId of await issues.index('by-document').getAllKeys(id)) {
      await issues.delete(issueId)
      await tx.objectStore('issueReviews').delete(issueId)
    }
    for (const recordId of await traceRecords.index('by-document').getAllKeys(id)) await traceRecords.delete(recordId)
  }
}

function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

async function sha256Hex(blob: Blob): Promise<string | undefined> {
  // Web Crypto is only available in secure contexts (HTTPS or localhost).
  if (typeof crypto === 'undefined' || !crypto.subtle) return undefined
  const digest = await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

/** Newest first. */
export async function listDocuments(): Promise<StoredDocument[]> {
  const db = await getDb()
  const documents = await db.getAllFromIndex('documents', 'by-addedAt')
  return documents.reverse()
}

export async function getDocumentFile(id: string): Promise<Blob | undefined> {
  const db = await getDb()
  return (await db.get('documentFiles', id))?.blob
}

/**
 * Writes documents inside an open transaction. Names are made unique against
 * everything already stored, so an existing document is never overwritten.
 */
async function putDocuments(
  tx: DocumentsTransaction,
  inputs: readonly (NewDocument & { sha256?: string })[],
): Promise<AddedDocument[]> {
  const documents = tx.objectStore('documents')
  const files = tx.objectStore('documentFiles')
  const existing = await documents.getAll()
  const takenNames = existing.map((doc) => doc.fileName)
  const added: AddedDocument[] = []

  for (const input of inputs) {
    const fileName = uniqueFileName(input.originalFileName, takenNames)
    takenNames.push(fileName)
    const duplicate = input.sha256
      ? [...existing, ...added.map((a) => a.document)].find((doc) => doc.sha256 === input.sha256)
      : undefined

    const document: StoredDocument = {
      id: createId(),
      fileName,
      originalFileName: input.originalFileName,
      format: input.format,
      mimeType: input.mimeType,
      sizeBytes: input.blob.size,
      // Spread over milliseconds so batch-added documents keep a stable order.
      addedAt: new Date(Date.now() + added.length).toISOString(),
      sha256: input.sha256,
      origin: input.origin,
      sampleKey: input.sampleKey,
    }
    // `add` (not `put`) fails rather than replaces if an id ever collided.
    await files.add({ id: document.id, blob: input.blob })
    await documents.add(document)
    added.push({ document, duplicateContentOf: duplicate?.fileName })
  }
  return added
}

export async function addDocument(input: NewDocument): Promise<AddedDocument> {
  const sha256 = await sha256Hex(input.blob)
  const db = await getDb()
  const tx = db.transaction(DOCUMENT_STORES, 'readwrite')
  const [added] = await Promise.all([putDocuments(tx, [{ ...input, sha256 }]), tx.done])
  return added[0]
}

/**
 * Replaces any previously loaded sample documents with a fresh copy. User
 * uploads are untouched. Runs in one transaction, so a failure keeps the old samples.
 */
export async function replaceSampleDocuments(inputs: readonly NewDocument[]): Promise<StoredDocument[]> {
  const hashed = await Promise.all(inputs.map(async (input) => ({ ...input, sha256: await sha256Hex(input.blob) })))
  const db = await getDb()
  const tx = db.transaction(DOCUMENT_STORES, 'readwrite')

  const write = async () => {
    const samples = (await tx.objectStore('documents').getAll()).filter((doc) => doc.origin === 'sample')
    await deleteDocumentsCascade(
      tx,
      samples.map((doc) => doc.id),
    )
    return putDocuments(tx, hashed)
  }

  const [added] = await Promise.all([write(), tx.done])
  return added.map((a) => a.document)
}

/** Removes a document, its stored bytes, its extraction result and issues that cite it. */
export async function removeDocument(id: string): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(DOCUMENT_STORES, 'readwrite')
  await Promise.all([deleteDocumentsCascade(tx, [id]), tx.done])
}

/** Empties every document-derived store, including review notes and traceability records. */
export async function clearAllDocuments(): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(DOCUMENT_STORES, 'readwrite')
  await Promise.all([...DOCUMENT_STORES.map((name) => tx.objectStore(name).clear()), tx.done])
}

