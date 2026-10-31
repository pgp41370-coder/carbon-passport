import { useState } from 'react'
import type { ExtractedTable, ExtractionResult, SourceRef } from '../../types/extraction'
import { sourceAnchorId } from './sourceRef'

/** Rows rendered per table; the highlighted row is always included. */
const VISIBLE_ROWS = 300
const LOW_LINE_CONFIDENCE = 70

interface RawContentViewProps {
  result: ExtractionResult
  highlight: SourceRef | null
}

/** Shows content exactly as the parser read it, with line or row numbers for source references. */
export function RawContentView({ result, highlight }: RawContentViewProps) {
  const highlightId = highlight ? sourceAnchorId(highlight) : null

  if (result.pages?.length) {
    return (
      <div className="max-h-[28rem] space-y-4 overflow-auto rounded-xl border border-line bg-canvas/60 p-3">
        {result.pages.map((page) => (
          <section key={page.pageNumber} aria-label={`Page ${page.pageNumber}`}>
            <p className="sticky -top-3 z-10 -mx-3 mb-1 bg-canvas px-4 py-1.5 text-xs font-semibold text-ink-600">
              Page {page.pageNumber} ·{' '}
              {page.method === 'ocr' ? `Read from image · ${page.confidence ?? '–'}% confidence` : 'PDF text'}
            </p>
            <ol className="font-mono text-[12px] leading-relaxed">
              {page.lines.map((line) => {
                const id = sourceAnchorId({ documentId: result.documentId, fileName: result.fileName, page: page.pageNumber, line: line.number })
                const isHighlighted = id === highlightId
                const lowConfidence = line.confidence !== undefined && line.confidence < LOW_LINE_CONFIDENCE
                return (
                  <li
                    key={line.number}
                    id={id ?? undefined}
                    tabIndex={isHighlighted ? -1 : undefined}
                    className={`flex gap-3 rounded px-1 outline-none ${isHighlighted ? 'bg-moss-400/30 ring-2 ring-moss-500' : ''}`}
                  >
                    <span className="w-7 shrink-0 text-right text-ink-500 select-none tabular-nums">{line.number}</span>
                    <span
                      className={`min-w-0 break-words whitespace-pre-wrap ${lowConfidence ? 'text-status-review-ink' : 'text-ink-900'}`}
                      title={line.confidence !== undefined ? `Reading confidence ${line.confidence}%` : undefined}
                    >
                      {line.text}
                      {lowConfidence && <span className="ml-2 text-xs font-sans font-semibold">low confidence ({line.confidence}%)</span>}
                    </span>
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>
    )
  }

  if (result.tables?.length) return <TablesView result={result} tables={result.tables} highlight={highlight} highlightId={highlightId} />
  return <p className="text-sm text-ink-500">No raw content was stored for this document.</p>
}

interface TablesViewProps {
  result: ExtractionResult
  tables: ExtractedTable[]
  highlight: SourceRef | null
  highlightId: string | null
}

function TablesView({ result, tables, highlight, highlightId }: TablesViewProps) {
  const highlightedIndex = highlight?.sheet ? tables.findIndex((t) => t.sheet === highlight.sheet) : -1
  const [chosen, setChosen] = useState(0)
  const active = highlightedIndex >= 0 ? highlightedIndex : Math.min(chosen, tables.length - 1)
  const table = tables[active]!
  const columnIndex = highlight?.column ? table.columns.indexOf(highlight.column) : -1
  const width = Math.max(table.columns.length, ...table.rows.map((row) => row.cells.length))
  const rows = table.rows.filter((row, i) => i < VISIBLE_ROWS || row.rowNumber === highlight?.row)

  return (
    <div className="space-y-2">
      {tables.length > 1 && (
        <div role="tablist" aria-label="Worksheets" className="flex flex-wrap gap-1">
          {tables.map((t, i) => (
            <button
              key={t.sheet ?? i}
              type="button"
              role="tab"
              aria-selected={i === active}
              onClick={() => setChosen(i)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                i === active ? 'bg-forest-700 text-white' : 'bg-canvas text-ink-700 ring-1 ring-line hover:bg-forest-50'
              }`}
            >
              {t.sheet ?? 'Sheet'}
            </button>
          ))}
        </div>
      )}
      <div className="max-h-[28rem] overflow-auto rounded-xl border border-line">
        <table className="w-full border-collapse font-mono text-[12px]">
          <caption className="sr-only">
            {table.sheet ? `Sheet ${table.sheet}` : 'CSV rows'}, with original row numbers
          </caption>
          <tbody>
            {rows.map((row) => {
              const id = sourceAnchorId({ documentId: result.documentId, fileName: result.fileName, sheet: table.sheet, row: row.rowNumber })
              const isHeader = row.rowNumber === table.headerRow
              const isHighlighted = id === highlightId
              return (
                <tr
                  key={row.rowNumber}
                  id={id ?? undefined}
                  tabIndex={isHighlighted ? -1 : undefined}
                  className={`outline-none ${isHighlighted ? 'bg-moss-400/25' : isHeader ? 'bg-forest-50' : 'odd:bg-canvas/50'}`}
                >
                  <th scope="row" className="sticky left-0 w-10 border-r border-line bg-surface px-2 py-1 text-right font-normal text-ink-400 tabular-nums">
                    {row.rowNumber}
                  </th>
                  {Array.from({ length: width }, (_, c) => (
                    <td
                      key={c}
                      data-source-highlight={isHighlighted && c === columnIndex ? '' : undefined}
                      title={(row.cells[c]?.length ?? 0) > 28 ? row.cells[c] : undefined}
                      className={`max-w-[14rem] truncate border-r border-line/60 px-2 py-1 whitespace-nowrap ${isHeader ? 'font-semibold text-forest-900' : 'text-ink-900'} ${
                        isHighlighted && c === columnIndex ? 'ring-2 ring-moss-500 ring-inset' : ''
                      }`}
                    >
                      {row.cells[c] ?? ''}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-500">
        {table.headerRow ? `Header row ${table.headerRow}. ` : 'No header row detected. '}
        {table.rows.length > VISIBLE_ROWS ? `Showing ${VISIBLE_ROWS} of ${table.rows.length} rows. ` : ''}
        {table.truncated ? `The file has ${table.totalRows} rows; ${table.rows.length} were kept.` : ''}
      </p>
    </div>
  )
}
