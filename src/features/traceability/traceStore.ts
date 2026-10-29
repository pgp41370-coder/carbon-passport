import { getDb } from '../../lib/db'
import type { TraceRecord } from '../../types/traceability'

/** Persistence for user notes and proposed links on traceability hand-offs. */

export async function listTraceRecords(): Promise<TraceRecord[]> {
  return (await getDb()).getAll('traceRecords')
}

/**
 * Saves a record only if every document it rests on still exists, so a note
 * cannot be attached to evidence that was removed in the meantime.
 */
export async function saveTraceRecord(record: TraceRecord): Promise<boolean> {
  const db = await getDb()
  const tx = db.transaction(['documents', 'traceRecords'], 'readwrite')
  const documents = tx.objectStore('documents')
  const present = await Promise.all(record.documentIds.map((id) => documents.getKey(id)))
  const ok = present.every((key) => key !== undefined)
  if (ok) await tx.objectStore('traceRecords').put(record)
  await tx.done
  return ok
}

export async function deleteTraceRecord(id: string): Promise<void> {
  await (await getDb()).delete('traceRecords', id)
}
