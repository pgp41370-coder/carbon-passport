import type { PassportStatus } from '../../types/passport'
import { STATUS_LABELS } from './passportLabels'

// Solid light fills so the badges stay legible on both dark and light backgrounds.
const STATUS_STYLE: Record<PassportStatus, string> = {
  draft: 'bg-white text-forest-950 ring-1 ring-line',
  evidence_incomplete: 'bg-[#fde8e6] text-status-missing',
  needs_human_review: 'bg-[#fbf0dc] text-status-review-ink',
  calculation_unavailable: 'bg-canvas text-ink-700 ring-1 ring-line',
  ready_for_independent_review: 'bg-forest-50 text-forest-700',
}

export function PassportStatusBadges({ statuses, illustrative }: { statuses: readonly PassportStatus[]; illustrative?: boolean }) {
  return (
    <span className="flex flex-wrap items-center gap-2">
      {statuses.map((status) => (
        <span key={status} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[status]}`}>
          {STATUS_LABELS[status]}
        </span>
      ))}
      {illustrative && (
        <span className="rounded-full bg-[#fbf0dc] px-2.5 py-1 text-xs font-semibold text-status-review-ink">Illustrative sample data</span>
      )}
    </span>
  )
}
