import { Icon } from '../../components/Icon'
import type { TraceStatus } from '../../types/traceability'
import { TRACE_STATUS } from './traceStatus'

export function TraceStatusChip({ status, size = 'md' }: { status: TraceStatus; size?: 'sm' | 'md' }) {
  const meta = TRACE_STATUS[status]
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full font-semibold ring-1 ${meta.chip} ${
        status === 'proposed' ? 'border border-dashed border-ink-400 ring-0' : ''
      } ${size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs'}`}
    >
      <Icon name={meta.icon} className={size === 'sm' ? 'size-3' : 'size-3.5'} />
      {meta.label}
    </span>
  )
}

export function IllustrativeTag() {
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-status-review/30 bg-status-review/10 px-1.5 py-0.5 text-[11px] font-semibold text-status-review-ink">
      Illustrative sample
    </span>
  )
}
