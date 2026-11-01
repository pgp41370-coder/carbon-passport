import { Icon } from '../../components/Icon'
import type { StoredDocument } from '../../types/document'
import type { ExtractionResult, SourceRef } from '../../types/extraction'
import { KIND_LABELS } from './classify'
import { describeSource } from './sourceRef'

/**
 * Every value read from the stored papers in one table, each with the page,
 * line or cell it came from. Values are read by OCR and rules, not AI, so the
 * table says "read", never "extracted by AI".
 */

interface EvidenceTableProps {
  documents: readonly StoredDocument[]
  results: Record<string, ExtractionResult | undefined>
  onInspect: (source: SourceRef) => void
}

// Short enough to sit in one table cell; the full location is in the tooltip and the inspector.
function shortSource(ref: SourceRef): string {
  if (ref.page !== undefined) return ref.line !== undefined ? `Page ${ref.page}, line ${ref.line}` : `Page ${ref.page}`
  if (ref.row !== undefined) return `Row ${ref.row}`
  return 'Source'
}

export function EvidenceTable({ documents, results, onInspect }: EvidenceTableProps) {
  const rows = documents.flatMap((doc) => {
    const r = results[doc.id]
    if (!r || r.status === 'failed') return []
    return r.fields
      .filter((f) => f.status !== 'not_detected' && f.value)
      .map((f) => ({ doc, kind: KIND_LABELS[r.detectedType.kind], f }))
  })
  if (rows.length === 0) return null

  return (
    <section aria-labelledby="evidence-table-title" className="rounded-2xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="evidence-table-title" className="text-base font-semibold text-ink-900">
          Values read from your papers
        </h2>
        <p className="text-xs text-ink-600">
          {rows.length} values · each one opens to its page and line
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs text-ink-600">
              <th className="py-2 pr-3 font-semibold">Paper</th>
              <th className="py-2 pr-3 font-semibold">Value</th>
              <th className="py-2 pr-3 font-semibold">Read as</th>
              <th className="py-2 pr-3 font-semibold">Status</th>
              <th className="py-2 font-semibold">
                <span className="sr-only">Source</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ doc, kind, f }, i) => (
              <tr key={`${doc.id}-${f.key}-${i}`} className="border-b border-line last:border-0">
                <td className="py-2 pr-3 text-ink-700">{kind}</td>
                <td className="py-2 pr-3 text-ink-700">{f.label}</td>
                <td className="min-w-40 py-2 pr-3 font-mono font-semibold break-words text-ink-900">
                  {f.value}
                  {f.unit && !f.value!.toLowerCase().includes(f.unit.toLowerCase()) ? ` ${f.unit}` : ''}
                </td>
                <td className="py-2 pr-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${
                      f.status === 'detected' ? 'bg-forest-50 text-forest-800 ring-forest-200' : 'bg-status-review/10 text-status-review-ink ring-status-review/30'
                    }`}
                  >
                    {f.status === 'detected' ? 'Found' : 'Needs check'}
                  </span>
                </td>
                <td className="py-2 text-right">
                  {f.source && (
                    <button
                      type="button"
                      onClick={() => onInspect(f.source!)}
                      title={describeSource(f.source)}
                      className="inline-flex min-h-9 cursor-pointer items-center gap-1 text-xs font-semibold whitespace-nowrap text-forest-700 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-forest-500"
                    >
                      <Icon name="file-text" className="size-4" />
                      {shortSource(f.source)}
                      <span className="sr-only"> in {doc.fileName}</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
