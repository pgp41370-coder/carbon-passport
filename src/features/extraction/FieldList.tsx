import { Icon } from '../../components/Icon'
import type { ExtractedField, FieldStatus, SourceRef } from '../../types/extraction'
import { describeSource } from './sourceRef'

const STATUS: Record<FieldStatus, { label: string; className: string }> = {
  detected: { label: 'Found', className: 'bg-forest-50 text-forest-700 ring-forest-100' },
  needs_review: { label: 'Needs check', className: 'bg-status-review/10 text-status-review-ink ring-status-review/30' },
  not_detected: { label: 'Missing', className: 'bg-canvas text-ink-500 ring-line' },
}

interface FieldListProps {
  fields: readonly ExtractedField[]
  onInspect: (ref: SourceRef) => void
}

export function FieldList({ fields, onInspect }: FieldListProps) {
  if (fields.length === 0) return <p className="text-sm text-ink-500">No fields are mapped for this document type.</p>

  return (
    <ul className="divide-y divide-line rounded-xl border border-line">
      {fields.map((field) => {
        const status = STATUS[field.status]
        return (
          <li key={field.key} className="grid gap-2 px-4 py-3 sm:grid-cols-[10rem_minmax(0,1fr)_auto] sm:items-start">
            <div>
              <p className="text-sm font-medium text-ink-900">{field.label}</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${status.className}`}>
                {status.label}
              </span>
            </div>

            <div className="min-w-0 text-sm">
              {field.value ? (
                <p className="font-mono text-[13px] break-words text-ink-900">
                  {field.value}
                  {field.unit && !field.value.toLowerCase().includes(field.unit.toLowerCase()) && (
                    <span className="ml-1 font-sans text-ink-500">{field.unit}</span>
                  )}
                </p>
              ) : (
                <p className="text-ink-500">No value found in the extracted content.</p>
              )}
              {field.source && <p className="mt-0.5 text-xs text-ink-500">Source: {describeSource(field.source)}</p>}
              {field.method && (
                <details className="mt-0.5 text-xs text-ink-500">
                  <summary className="cursor-pointer select-none hover:text-ink-700">How it was read</summary>
                  <p className="mt-0.5">{field.method}</p>
                </details>
              )}
              {field.reviewReason && <p className="mt-1 text-xs font-medium text-status-review-ink">{field.reviewReason}</p>}
              {field.alternatives?.map((alt) => (
                <p key={alt.value} className="mt-1 text-xs text-status-review-ink">
                  Also found: <span className="font-mono">{alt.value}</span> ({describeSource(alt.source)}){' '}
                  <button type="button" onClick={() => onInspect(alt.source)} className="font-semibold underline underline-offset-2">
                    Show source
                  </button>
                </p>
              ))}
            </div>

            {field.source && (
              <button
                type="button"
                onClick={() => onInspect(field.source!)}
                className="inline-flex items-center gap-1.5 justify-self-start min-h-10 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-forest-700 ring-1 ring-forest-200 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-forest-500"
              >
                <Icon name="arrow-right" className="size-3.5" />
                Show source
              </button>
            )}
          </li>
        )
      })}
    </ul>
  )
}
