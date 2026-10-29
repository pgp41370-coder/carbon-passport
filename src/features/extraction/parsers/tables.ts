import type { ExtractedRow, ExtractedTable } from '../../../types/extraction'

/** Rows kept per table. Enough for document evidence; very large exports are truncated. */
export const MAX_ROWS_PER_TABLE = 2000

export const cellText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) return value.toISOString().slice(0, 10)
  return String(value).trim()
}

/**
 * Picks the first row that looks like column headings: at least two non-empty
 * cells, all text, not a comment line. Title rows above it are kept as-is.
 */
function findHeaderIndex(rows: string[][]): number | null {
  for (const [i, row] of rows.entries()) {
    const filled = row.filter((cell) => cell !== '')
    if (filled.length < 2 || filled[0]!.startsWith('#')) continue
    if (filled.every((cell) => Number.isNaN(Number(cell.replace(/,/g, ''))))) return i
    return null
  }
  return null
}

export function toTable(rawRows: string[][], firstRowNumber: number, sheet?: string): ExtractedTable {
  const totalRows = rawRows.length
  const kept = rawRows.slice(0, MAX_ROWS_PER_TABLE)
  const headerIndex = findHeaderIndex(kept)
  const rows: ExtractedRow[] = kept.map((cells, i) => ({ rowNumber: firstRowNumber + i, cells }))
  return {
    sheet,
    headerRow: headerIndex === null ? null : firstRowNumber + headerIndex,
    columns: headerIndex === null ? [] : kept[headerIndex]!,
    rows,
    totalRows,
    truncated: totalRows > kept.length,
  }
}
