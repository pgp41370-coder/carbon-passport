import type { SourceRef } from '../../types/extraction'
import type { TraceEvidence } from '../../types/traceability'
import { describeSource } from '../extraction/sourceRef'

interface EvidenceListProps {
  evidence: readonly TraceEvidence[]
  onInspect: (ref: SourceRef) => void
  empty?: string
}

/** Values as read, each with its source location and an Inspect action. */
export function EvidenceList({ evidence, onInspect, empty = 'No supporting document.' }: EvidenceListProps) {
  if (evidence.length === 0) return <p className="text-xs text-ink-500">{empty}</p>
  return (
    <ul className="space-y-1.5">
      {evidence.map((item, i) => (
        <li key={`${item.label}-${i}`} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs">
          <span className="text-ink-500">{item.label}:</span>
          {item.value && <span className="font-mono text-[12px] font-semibold break-all text-ink-900">{item.value}</span>}
          {item.fieldStatus === 'needs_review' && <span className="font-semibold text-status-review-ink">(value needs review)</span>}
          {item.source ? (
            <span className="text-ink-500">
              <span className="break-all">{item.source.fileName}</span>
              {describeSource(item.source) && `, ${describeSource(item.source)}`}
              {item.origin === 'sample' && <span className="text-status-review-ink"> · synthetic</span>}{' '}
              <button
                type="button"
                onClick={() => onInspect(item.source!)}
                className="font-semibold text-forest-700 underline underline-offset-2 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-forest-500"
              >
                Show source<span className="sr-only"> for {item.label} in {item.source.fileName}</span>
              </button>
            </span>
          ) : (
            !item.value && <span className="text-ink-500">no source</span>
          )}
        </li>
      ))}
    </ul>
  )
}
