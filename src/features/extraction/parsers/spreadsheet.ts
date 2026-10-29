import { read, utils, type WorkSheet } from 'xlsx'
import type { ExtractedTable } from '../../../types/extraction'
import { ParseError } from './errors'
import { cellText, toTable } from './tables'

export function parseWorkbook(data: ArrayBuffer): ExtractedTable[] {
  let workbook
  try {
    workbook = read(new Uint8Array(data), { type: 'array', cellDates: true, dense: true })
  } catch (error) {
    const message = (error as Error)?.message ?? ''
    if (/password|encrypt/i.test(message)) throw new ParseError('password', 'The workbook is password-protected.')
    throw new ParseError('unreadable', `The workbook could not be read (${message || 'unknown error'}).`)
  }
  return workbook.SheetNames.map((name) => sheetToTable(workbook.Sheets[name]!, name))
}

function sheetToTable(sheet: WorkSheet, name: string): ExtractedTable {
  if (!sheet['!ref']) return toTable([], 1, name)
  const range = utils.decode_range(sheet['!ref'])
  const rows = utils
    .sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: true, defval: '', raw: false, dateNF: 'yyyy-mm-dd' })
    .map((row) => row.map(cellText))
  while (rows.length && rows[rows.length - 1]!.every((c) => c === '')) rows.pop()
  // sheet_to_json starts at the first row of the used range, which may not be row 1.
  return toTable(rows, range.s.r + 1, name)
}
