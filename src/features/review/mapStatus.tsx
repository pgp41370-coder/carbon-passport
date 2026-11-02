import { Icon } from '../../components/Icon'
import type { MapStatus } from './evidenceMap'
import { MAP_STATUS } from './mapStatusMeta'
import { documentName } from '../documents/documentName'

export function MapStatusChip({ status, label }: { status: MapStatus; label?: string }) {
  const meta = MAP_STATUS[status]
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${meta.chip}`}>
      <Icon name={meta.icon} className="size-3.5" />
      {label ?? meta.label}
    </span>
  )
}

export function MapLegend({ className = '' }: { className?: string }) {
  return (
    <ul aria-label="Legend" className={`flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-ink-600 ${className}`}>
      {(Object.keys(MAP_STATUS) as MapStatus[]).map((s) => (
        <li key={s} className="flex items-center gap-1.5" title={MAP_STATUS[s].meaning}>
          <Icon name={MAP_STATUS[s].icon} className={`size-3.5 ${MAP_STATUS[s].text}`} />
          {MAP_STATUS[s].label}
        </li>
      ))}
    </ul>
  )
}

/** The demo's "pretend they replied" loads sample documents; say so wherever the result is shown. */
export function SimulatedNote({ files }: { files: string[] }) {
  return (
    <p className="flex items-start gap-2 rounded-xl bg-status-review/[0.07] px-4 py-3 text-sm text-ink-700 ring-1 ring-status-review/30">
      <Icon name="sparkle" className="mt-0.5 size-4 shrink-0 text-status-review-ink" />
      <span>
        <span className="font-semibold text-ink-900">Simulated reply in use.</span> {files.map(documentName).join(' and ')}{' '}
        {files.length === 1 ? 'is a sample document' : 'are sample documents'} loaded by the demo, not a real reply from a supplier.
      </span>
    </p>
  )
}
