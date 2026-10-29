import { useEffect } from 'react'
import { Icon, type IconName } from '../../components/Icon'
import type { DocumentFormat, StoredDocument } from '../../types/document'
import type { ExtractionMethod, ExtractionResult, SourceRef } from '../../types/extraction'
import { KIND_LABELS } from './classify'
import { FieldList } from './FieldList'
import { RawContentView } from './RawContentView'
import { sourceAnchorId } from './sourceRef'
import { needsProcessing, type RunState } from './useExtraction'

const FORMAT_ICON: Record<DocumentFormat, IconName> = {
  pdf: 'file-text',
  png: 'file-image',
  jpeg: 'file-image',
  csv: 'file-sheet',
  xlsx: 'file-sheet',
  xls: 'file-sheet',
}

const METHOD_LABEL: Record<ExtractionMethod, string> = {
  'pdf-text': 'PDF text layer (PDF.js)',
  'pdf-ocr': 'Scanned PDF, read with OCR (PDF.js + Tesseract.js)',
  'pdf-mixed': 'PDF text layer plus OCR for scanned pages',
  'image-ocr': 'Image, read with OCR (Tesseract.js)',
  csv: 'CSV rows (Papa Parse)',
  spreadsheet: 'Workbook sheets (SheetJS)',
}

type CardStatus = { label: string; className: string; icon: IconName; spin?: boolean }

function statusFor(result: ExtractionResult | undefined, isRunning: boolean, isQueued: boolean): CardStatus {
  if (isRunning) return { label: 'Processing', className: 'bg-forest-50 text-forest-700', icon: 'loader', spin: true }
  if (isQueued) return { label: 'Queued', className: 'bg-canvas text-ink-600', icon: 'loader' }
  if (!result) return { label: 'Not processed', className: 'bg-canvas text-ink-600', icon: 'info' }
  if (needsProcessing(result)) return { label: 'Outdated result', className: 'bg-status-review/10 text-status-review-ink', icon: 'alert' }
  if (result.status === 'failed') return { label: 'Failed', className: 'bg-status-missing/10 text-status-missing', icon: 'x-circle' }
  if (result.status === 'warning') return { label: 'Extracted · review', className: 'bg-status-review/10 text-status-review-ink', icon: 'alert' }
  return { label: 'Extracted', className: 'bg-forest-50 text-forest-700', icon: 'check-circle' }
}

interface DocumentResultCardProps {
  document: StoredDocument
  result: ExtractionResult | undefined
  run: RunState | null
  queued: boolean
  expanded: boolean
  highlight: SourceRef | null
  disabled: boolean
  onToggle: () => void
  onProcess: () => void
  onOpenOriginal: () => void
  onInspect: (ref: SourceRef) => void
}

export function DocumentResultCard({
  document,
  result,
  run,
  queued,
  expanded,
  highlight,
  disabled,
  onToggle,
  onProcess,
  onOpenOriginal,
  onInspect,
}: DocumentResultCardProps) {
  const isRunning = run?.current.documentId === document.id
  const status = statusFor(result, isRunning, queued && !isRunning)
  const isSample = document.origin === 'sample'
  const bodyId = `result-${document.id}`

  // Bring an inspected source line or row into view once it is rendered.
  useEffect(() => {
    if (!expanded || !highlight) return
    const id = sourceAnchorId(highlight)
    const element = id ? window.document.getElementById(id) : null
    // For tables, centre the exact cell so wide sheets scroll sideways too.
    const target = element?.querySelector('[data-source-highlight]') ?? element
    target?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' })
    element?.focus({ preventScroll: true })
  }, [expanded, highlight])

  return (
    <article
      id={`doc-${document.id}`}
      className={`rounded-2xl border bg-surface shadow-[0_1px_2px_rgb(21_26_24/0.04)] ${isSample ? 'border-status-review/30' : 'border-line'}`}
    >
      <div className="flex flex-wrap items-start gap-3 p-4 sm:p-5">
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ${isSample ? 'bg-status-review/10 text-status-review-ink' : 'bg-forest-50 text-forest-700'}`}
        >
          <Icon name={FORMAT_ICON[document.format]} className="size-5" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-sm font-semibold text-ink-900" title={document.fileName}>
              {document.fileName}
            </h3>
            <span
              className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                isSample ? 'bg-status-review/10 text-status-review-ink ring-1 ring-status-review/30' : 'bg-forest-50 text-forest-700 ring-1 ring-forest-100'
              }`}
            >
              {isSample ? 'Synthetic sample' : 'Your upload'}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-500">
            {result && result.status !== 'failed' ? (
              <>
                Looks like: <span className="font-medium text-ink-700">{KIND_LABELS[result.detectedType.kind]}</span>
                {result.detectedType.matchedKeywords.length > 0 && (
                  <span title={`Matched keywords: ${result.detectedType.matchedKeywords.join(', ')}`}>
                    {' '}
                    · keyword match ({result.detectedType.matchedKeywords.slice(0, 3).join(', ')}
                    {result.detectedType.matchedKeywords.length > 3 ? '…' : ''})
                  </span>
                )}
              </>
            ) : (
              <>{document.format.toUpperCase()} · type not determined yet</>
            )}
          </p>
          {isRunning && run && (
            <div className="mt-2" aria-live="polite">
              <p className="text-xs text-forest-700">{run.current.message}</p>
              {run.current.progress !== undefined && (
                <div className="mt-1 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-forest-50">
                  <div className="h-full rounded-full bg-forest-500 transition-[width]" style={{ width: `${Math.round(run.current.progress * 100)}%` }} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
            <Icon name={status.icon} className={`size-3.5 ${status.spin ? 'animate-spin' : ''}`} />
            {status.label}
          </span>
          <button
            type="button"
            onClick={onProcess}
            disabled={disabled}
            className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-forest-700 ring-1 ring-forest-200 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-forest-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {result ? 'Reprocess' : 'Process'}
          </button>
          {result && (
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={expanded}
              aria-controls={bodyId}
              className="inline-flex items-center gap-1 rounded-lg bg-forest-950 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
            >
              {expanded ? 'Hide results' : 'View results'}
            </button>
          )}
        </div>
      </div>

      {result && expanded && (
        <div id={bodyId} className="space-y-5 border-t border-line p-4 sm:p-5">
          {result.status === 'failed' && result.error && (
            <div role="alert" className="flex gap-3 rounded-xl border border-status-missing/30 bg-status-missing/[0.06] p-4 text-sm">
              <Icon name="x-circle" className="mt-0.5 size-5 shrink-0 text-status-missing" />
              <div>
                <p className="font-semibold text-ink-900">Extraction failed</p>
                <p className="mt-1 text-ink-700">{result.error.message}</p>
                <p className="mt-1 text-xs text-ink-500">No fields were mapped and no values were assumed for this document.</p>
              </div>
            </div>
          )}
          {result.warnings.length > 0 && (
            <ul className="space-y-1 rounded-xl border border-status-review/30 bg-status-review/[0.06] p-3 text-xs text-ink-700">
              {result.warnings.map((warning) => (
                <li key={warning} className="flex gap-2">
                  <Icon name="alert" className="mt-0.5 size-3.5 shrink-0 text-status-review-ink" />
                  {warning}
                </li>
              ))}
            </ul>
          )}

          {result.status !== 'failed' && (
            <section aria-labelledby={`${bodyId}-fields`}>
              <h4 id={`${bodyId}-fields`} className="text-sm font-semibold text-ink-900">
                Detected fields
              </h4>
              <p className="mb-2 text-xs text-ink-500">
                Inferred from the raw content by label and position rules. These are not verified facts; inspect each source.
              </p>
              <FieldList fields={result.fields} onInspect={onInspect} />
            </section>
          )}

          {result.status !== 'failed' && (
            <section aria-labelledby={`${bodyId}-raw`}>
              <h4 id={`${bodyId}-raw`} className="text-sm font-semibold text-ink-900">
                Extracted content (raw)
              </h4>
              <p className="mb-2 text-xs text-ink-500">Exactly as read by the parser, with page and line or row numbers.</p>
              <RawContentView result={result} highlight={highlight} />
            </section>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4 text-xs text-ink-500">
            <p>
              {result.method ? METHOD_LABEL[result.method] : 'Not read'} · {(result.durationMs / 1000).toFixed(1)} s ·{' '}
              {new Date(result.extractedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            <button
              type="button"
              onClick={onOpenOriginal}
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 font-semibold text-forest-700 ring-1 ring-forest-200 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-forest-500"
            >
              <Icon name="file-text" className="size-3.5" />
              Open original file
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
