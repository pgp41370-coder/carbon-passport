import Papa from 'papaparse'
import type { ExtractedTable } from '../../../types/extraction'
import { cellText, toTable } from './tables'

export function parseCsv(text: string): ExtractedTable {
  const result = Papa.parse<string[]>(text, { skipEmptyLines: false })
  // Drop the trailing empty record Papa returns for a final newline.
  const rows = result.data.map((row) => row.map(cellText))
  while (rows.length && rows[rows.length - 1]!.every((c) => c === '')) rows.pop()
  // Papa returns records in file order; with no multi-line quoted cells this equals the line number.
  return toTable(rows, 1)
}
