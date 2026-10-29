import type { SourceRef } from '../../types/extraction'

/** "page 1, line 9" / "sheet “Production log”, row 5, column “Batch”" / "row 4, column “batch_id”" */
export function describeSource(ref: SourceRef): string {
  const parts: string[] = []
  if (ref.page !== undefined) parts.push(`page ${ref.page}`)
  if (ref.line !== undefined) parts.push(`line ${ref.line}`)
  if (ref.sheet !== undefined) parts.push(`sheet “${ref.sheet}”`)
  if (ref.row !== undefined) parts.push(`row ${ref.row}`)
  if (ref.column !== undefined) parts.push(`column “${ref.column}”`)
  return parts.join(', ')
}

/** DOM id of the raw-content element a reference points at, or null if it has no location. */
export function sourceAnchorId(ref: SourceRef): string | null {
  const doc = `src-${ref.documentId}`
  if (ref.page !== undefined && ref.line !== undefined) return `${doc}-p${ref.page}-l${ref.line}`
  if (ref.row !== undefined) return `${doc}-t${encodeURIComponent(ref.sheet ?? 'csv')}-r${ref.row}`
  return null
}
