import { useEffect, useRef } from 'react'
import { Icon } from '../../components/Icon'
import type { ExtractionResult, SourceRef } from '../../types/extraction'
import { getDocumentFile } from '../documents/documentStore'
import { RawContentView } from '../extraction/RawContentView'
import { describeSource, sourceAnchorId } from '../extraction/sourceRef'

interface SourceInspectorProps {
  source: SourceRef | null
  result: ExtractionResult | undefined
  onClose: () => void
}

/** Side sheet showing the raw extracted content of a source document, scrolled to the cited line or cell. */
export function SourceInspector({ source, result, onClose }: SourceInspectorProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (source && !dialog.open) dialog.showModal()
    if (!source && dialog.open) dialog.close()
  }, [source])

  useEffect(() => {
    if (!source) return
    const timer = window.setTimeout(() => {
      const id = sourceAnchorId(source)
      const element = id ? document.getElementById(id) : null
      const target = element?.querySelector('[data-source-highlight]') ?? element
      target?.scrollIntoView({ block: 'center', inline: 'center' })
    }, 50)
    return () => window.clearTimeout(timer)
  }, [source, result])

  const openOriginal = async () => {
    if (!source) return
    const blob = await getDocumentFile(source.documentId)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="inspector-title"
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-2xl bg-surface p-0 text-ink-900 shadow-2xl backdrop:bg-forest-950/40"
    >
      {source && (
        <div className="flex h-full flex-col">
          <div className="flex items-start gap-3 border-b border-line p-4 sm:p-5">
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold tracking-wide text-forest-600 uppercase">Source inspection</p>
              <h2 id="inspector-title" className="mt-1 text-base font-semibold break-all">
                {source.fileName}
              </h2>
              <p className="mt-0.5 text-sm text-ink-600">{describeSource(source) || 'Whole document'}</p>
              {result?.origin === 'sample' && (
                <p className="mt-1 text-xs font-medium text-status-review-ink">Synthetic sample document, not a real business record.</p>
              )}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-9 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-canvas hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-forest-500"
            >
              <Icon name="close" />
              <span className="sr-only">Close source inspection</span>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-4 sm:p-5">
            {result && result.status !== 'failed' ? (
              <>
                <p className="mb-2 text-xs text-ink-500">Raw content as read by the parser. The cited line or cell is highlighted.</p>
                <RawContentView result={result} highlight={source} />
              </>
            ) : (
              <p className="text-sm text-status-missing">
                This document has no current extraction result. It may have been removed or not processed yet.
              </p>
            )}
          </div>
          <div className="flex justify-end border-t border-line p-4">
            <button
              type="button"
              onClick={() => void openOriginal()}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-forest-700 ring-1 ring-forest-200 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-forest-500"
            >
              <Icon name="file-text" className="size-3.5" />
              Open original file
            </button>
          </div>
        </div>
      )}
    </dialog>
  )
}
