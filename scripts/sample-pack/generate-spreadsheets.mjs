// Generates the SYNTHETIC production-log spreadsheet for demo batch CP-LDH-2026-001.
// Every company and figure is fictional. Dev-only tool; the output is committed.
// With --complete it writes the copy for the complete pack (public/samples/complete/), which adds a
// monthly summary of the whole plant's output so the electricity bill can be shared out by weight.
// Usage: node scripts/sample-pack/generate-spreadsheets.mjs [--complete]
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as XLSX from 'xlsx'

const complete = process.argv.includes('--complete')
const outDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'samples', ...(complete ? ['complete'] : []))
const banner = 'SYNTHETIC SAMPLE DOCUMENT - FICTIONAL DATA FOR DEMONSTRATION - NOT A REAL BUSINESS RECORD'

const log = [
  [banner],
  ['In-house production log - Sample Fasteners Pvt. Ltd. (fictional) - batch CP-LDH-2026-001'],
  [],
  ['Date', 'Batch', 'Heat No.', 'Operation', 'Machine', 'Input (kg)', 'Output (kg)', 'Scrap (kg)', 'Run hours'],
  ['2026-01-12', 'CP-LDH-2026-001', '24A-1187', 'Wire drawing', 'WD-01', 13000, 12870, 130, 9.5],
  ['2026-01-13', 'CP-LDH-2026-001', '24A-1187', 'Cold heading', 'CH-02', 6500, 6240, 260, 11],
  ['2026-01-14', 'CP-LDH-2026-001', '24A-1187', 'Cold heading', 'CH-02', 6370, 6110, 260, 11],
  ['2026-01-16', 'CP-LDH-2026-001', '24A-1187', 'Thread rolling', 'TR-01', 12350, 12300, 50, 10],
  ['2026-01-17', 'CP-LDH-2026-001', '24A-1187', 'Inspection & sorting', 'QC', 12300, 12150, 150, 6],
  ['2026-01-22', 'CP-LDH-2026-001', '24A-1187', 'Sent for heat treatment (job work)', '-', 12150, null, null, null],
]

const about = [
  ['About this file'],
  [banner],
  ['All parties, batch figures and machine IDs are fictional and were created for the Carbon Passport demo.'],
  ['Heat treatment is outsourced to a fictional job-worker; see the sample job-work challan.'],
]

const workbook = XLSX.utils.book_new()
const logSheet = XLSX.utils.aoa_to_sheet(log)
logSheet['!cols'] = [12, 18, 10, 32, 9, 11, 11, 10, 10].map((wch) => ({ wch }))
XLSX.utils.book_append_sheet(workbook, logSheet, 'Production log')
if (complete) {
  const summary = [
    ['Month', 'Plant output (kg)', 'Covers'],
    ['January 2026', 48600, 'All batches made in the plant this month, before heat treatment'],
  ]
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(summary), 'Monthly summary')
}
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(about), 'About (synthetic)')
workbook.Props = { Title: 'Synthetic sample - production log', Subject: 'Not a real business record' }

mkdirSync(outDir, { recursive: true })
const file = join(outDir, 'CP-LDH-2026-001_SAMPLE_production-log.xlsx')
writeFileSync(file, XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true }))
console.log(`wrote ${file}`)
