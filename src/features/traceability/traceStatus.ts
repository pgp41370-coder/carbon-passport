import type { IconName } from '../../components/Icon'
import type { TraceStatus } from '../../types/traceability'

export const TRACE_STATUS: Record<TraceStatus, { label: string; meaning: string; icon: IconName; chip: string; line: string }> = {
  supported: {
    label: 'Found in source',
    meaning: 'A processed document contains the value, with a page, line or cell you can inspect. Not independently verified.',
    icon: 'check-circle',
    chip: 'bg-forest-50 text-forest-700 ring-forest-200',
    line: 'bg-forest-500',
  },
  needs_review: {
    label: 'Needs check',
    meaning: 'Evidence exists but disagrees, is uncertain or does not prove the link on its own.',
    icon: 'alert',
    chip: 'bg-status-review/10 text-status-review-ink ring-status-review/30',
    line: 'bg-status-review',
  },
  missing: {
    label: 'Missing',
    meaning: 'No processed document supports this. Nothing is assumed in its place.',
    icon: 'x-circle',
    chip: 'bg-status-missing/10 text-status-missing ring-status-missing/30',
    line: 'bg-status-missing',
  },
  proposed: {
    label: 'Proposed by user',
    meaning: 'Entered by a person with a note. Not backed by any source document.',
    icon: 'info',
    chip: 'bg-canvas text-ink-700',
    line: 'bg-ink-400',
  },
}
