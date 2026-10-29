import type { SourceRef } from '../../types/extraction'
import type { Claim, ClaimKind } from '../../types/passport'
import { describeSource } from '../extraction/sourceRef'
import { CLAIM_LABELS } from './passportLabels'

const KIND_STYLE: Record<ClaimKind, string> = {
  extracted: 'bg-forest-50 text-forest-700 ring-forest-200',
  needs_review: 'bg-status-review/10 text-status-review-ink ring-status-review/30',
  derived: 'bg-canvas text-ink-700 ring-line',
  proposed: 'bg-canvas text-ink-700 ring-ink-400',
  assumption: 'bg-canvas text-ink-700 ring-line',
  missing: 'bg-status-missing/10 text-status-missing ring-status-missing/30',
}

export function ClaimKindChip({ kind }: { kind: ClaimKind }) {
  return (
    <span title={CLAIM_LABELS[kind].meaning} className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ${KIND_STYLE[kind]}`}>
      {CLAIM_LABELS[kind].label}
    </span>
  )
}

interface ClaimListProps {
  claims: readonly Claim[]
  onInspect: (ref: SourceRef) => void
}

/** Label / value / kind / sources, with an Inspect action for every source location. */
export function ClaimList({ claims, onInspect }: ClaimListProps) {
  return (
    <dl className="divide-y divide-line rounded-xl border border-line">
      {claims.map((claim, index) => (
        <div key={`${claim.label}-${index}`} className="grid gap-1.5 px-4 py-3 sm:grid-cols-[13rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-sm font-medium text-ink-900">{claim.label}</dt>
          <dd className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`font-mono text-[13px] font-semibold break-words ${claim.value ? 'text-ink-900' : 'text-status-missing'}`}>
                {claim.value ?? 'Not established'}
              </span>
              <ClaimKindChip kind={claim.kind} />
            </div>
            {claim.sources.map((source, i) => (
              <p key={i} className="text-xs text-ink-500">
                <span className="break-all">{source.fileName}</span>
                {describeSource(source) && `, ${describeSource(source)}`}
                {source.origin === 'sample' && <span className="text-status-review-ink"> · synthetic</span>}{' '}
                <button
                  type="button"
                  onClick={() => onInspect(source)}
                  className="font-semibold text-forest-700 underline underline-offset-2 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-forest-500"
                >
                  Inspect<span className="sr-only"> {claim.label} in {source.fileName}</span>
                </button>
              </p>
            ))}
            {claim.note && <p className="text-xs text-ink-600">{claim.note}</p>}
          </dd>
        </div>
      ))}
    </dl>
  )
}
