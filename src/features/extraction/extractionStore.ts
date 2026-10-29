import { getDb } from '../../lib/db'
import type { ExtractionResult, IssueReview, ValidationIssue } from '../../types/extraction'

/** Persistence for extraction results, validation issues and review records. */

export async function listExtractions(): Promise<ExtractionResult[]> {
  return (await getDb()).getAll('extractions')
}

/**
 * Saves a result only if its document still exists, so a document removed while
 * it was being processed cannot leave a stale result behind.
 */
export async function saveExtraction(result: ExtractionResult): Promise<boolean> {
  const db = await getDb()
  const tx = db.transaction(['documents', 'extractions'], 'readwrite')
  const exists = (await tx.objectStore('documents').getKey(result.documentId)) !== undefined
  if (exists) await tx.objectStore('extractions').put(result)
  await tx.done
  return exists
}

/** Deletes extraction results whose document no longer exists. Returns how many were removed. */
export async function purgeOrphanExtractions(): Promise<number> {
  const db = await getDb()
  const tx = db.transaction(['documents', 'extractions'], 'readwrite')
  const documentIds = new Set(await tx.objectStore('documents').getAllKeys())
  let removed = 0
  for (const id of await tx.objectStore('extractions').getAllKeys()) {
    if (documentIds.has(id)) continue
    await tx.objectStore('extractions').delete(id)
    removed++
  }
  await tx.done
  return removed
}

/**
 * Replaces the stored issue set with a freshly computed one. Reviews are kept
 * only for issues that still exist with the same underlying values.
 */
export async function replaceIssues(issues: readonly ValidationIssue[]): Promise<IssueReview[]> {
  const db = await getDb()
  const tx = db.transaction(['validationIssues', 'issueReviews'], 'readwrite')
  const issueStore = tx.objectStore('validationIssues')
  const reviewStore = tx.objectStore('issueReviews')
  await issueStore.clear()
  for (const issue of issues) await issueStore.put(issue)

  const byId = new Map(issues.map((issue) => [issue.id, issue]))
  const kept: IssueReview[] = []
  for (const review of await reviewStore.getAll()) {
    if (byId.get(review.issueId)?.fingerprint === review.fingerprint) kept.push(review)
    else await reviewStore.delete(review.issueId)
  }
  await tx.done
  return kept
}

export async function saveReview(review: IssueReview): Promise<void> {
  await (await getDb()).put('issueReviews', review)
}

export async function deleteReview(issueId: string): Promise<void> {
  await (await getDb()).delete('issueReviews', issueId)
}

export async function listIssueReviews(): Promise<IssueReview[]> {
  return (await getDb()).getAll('issueReviews')
}
