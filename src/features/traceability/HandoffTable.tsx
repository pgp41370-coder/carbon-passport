import type { SourceRef } from '../../types/extraction'
import type { LinkId, TraceLink } from '../../types/traceability'
import type { LinkRecordState } from './buildTrace'
import { EvidenceList } from './EvidenceList'
import { IllustrativeTag, TraceStatusChip } from './TraceStatusChip'

interface HandoffTableProps {
  links: readonly TraceLink[]
  records: Partial<Record<LinkId, LinkRecordState>>
  highlighted: LinkId | null
  onInspect: (ref: SourceRef) => void
  onAddRecord: (link: TraceLink) => void
  onDeleteRecord: (id: string) => void
}

export function HandoffTable({ links, records, highlighted, onInspect, onAddRecord, onDeleteRecord }: HandoffTableProps) {
  return (
    <>
      {/* Wide screens: a real table. */}
      <div className="hidden overflow-x-auto rounded-xl border border-line xl:block">
        <table className="w-full table-fixed text-left text-sm">
          <caption className="sr-only">Hand-offs between supply-chain stages, with their evidence</caption>
          <colgroup>
            <col className="w-[15%]" />
            <col className="w-[24%]" />
            <col className="w-[27%]" />
            <col className="w-[15%]" />
            <col className="w-[19%]" />
          </colgroup>
          <thead className="bg-canvas text-xs text-ink-500">
            <tr>
              <th scope="col" className="px-3 py-2 font-medium">Stage hand-off</th>
              <th scope="col" className="px-3 py-2 font-medium">Source-backed reference</th>
              <th scope="col" className="px-3 py-2 font-medium">Source document</th>
              <th scope="col" className="px-3 py-2 font-medium">Evidence status</th>
              <th scope="col" className="px-3 py-2 font-medium">Next action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {links.map((link) => (
              <tr
                key={link.id}
                id={`handoff-${link.id}`}
                className={`align-top ${highlighted === link.id ? 'bg-moss-400/15' : ''}`}
              >
                <th scope="row" className="px-3 py-3 font-semibold text-ink-900">
                  {link.title}
                </th>
                <td className="px-3 py-3 text-ink-700">{link.reference}</td>
                <td className="px-3 py-3">
                  <EvidenceList evidence={link.evidence} onInspect={onInspect} />
                </td>
                <td className="space-y-1.5 px-3 py-3">
                  <TraceStatusChip status={link.status} size="sm" />
                  {link.illustrative && (
                    <div>
                      <IllustrativeTag />
                    </div>
                  )}
                  <RecordSummary link={link} state={records[link.id]} onAdd={onAddRecord} onDelete={onDeleteRecord} />
                </td>
                <td className="px-3 py-3 text-xs text-ink-700">{link.nextAction}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Narrow screens: one card per hand-off. */}
      <ul className="space-y-3 xl:hidden">
        {links.map((link) => (
          <li
            key={link.id}
            id={`handoff-card-${link.id}`}
            className={`rounded-xl border border-line p-4 ${highlighted === link.id ? 'bg-moss-400/15' : 'bg-surface'}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <TraceStatusChip status={link.status} size="sm" />
              {link.illustrative && <IllustrativeTag />}
            </div>
            <h3 className="mt-2 text-sm font-semibold text-ink-900">{link.title}</h3>
            <dl className="mt-2 space-y-2 text-sm">
              <div>
                <dt className="text-xs font-medium text-ink-500">Source-backed reference</dt>
                <dd className="text-ink-700">{link.reference}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink-500">Source document</dt>
                <dd className="mt-1">
                  <EvidenceList evidence={link.evidence} onInspect={onInspect} />
                </dd>
              </div>
              <div>
                <dt className="text-xs font-medium text-ink-500">Next action</dt>
                <dd className="text-xs text-ink-700">{link.nextAction}</dd>
              </div>
            </dl>
            <div className="mt-2">
              <RecordSummary link={link} state={records[link.id]} onAdd={onAddRecord} onDelete={onDeleteRecord} />
            </div>
          </li>
        ))}
      </ul>
    </>
  )
}

interface RecordSummaryProps {
  link: TraceLink
  state: LinkRecordState | undefined
  onAdd: (link: TraceLink) => void
  onDelete: (id: string) => void
}

function RecordSummary({ link, state, onAdd, onDelete }: RecordSummaryProps) {
  if (state && !state.active) {
    return (
      <div className="rounded-lg bg-status-review/10 p-2 text-[11px] text-status-review-ink">
        A note recorded earlier no longer applies: the evidence for this hand-off has changed.{' '}
        <button type="button" onClick={() => onDelete(state.record.id)} className="font-semibold underline">
          Delete note
        </button>
      </div>
    )
  }
  if (state) {
    const { record } = state
    return (
      <div className="rounded-lg bg-canvas p-2 text-[11px] text-ink-700">
        <p className="font-semibold text-ink-900">
          {record.kind === 'proposal' ? 'Proposed link (not source-backed)' : 'Review note'}
          {record.proposedReference ? `: ${record.proposedReference}` : ''}
        </p>
        <p className="mt-0.5 whitespace-pre-wrap">“{record.note}”</p>
        <p className="mt-0.5 text-ink-500">
          {record.reviewer ? `${record.reviewer} · ` : ''}
          {new Date(record.recordedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
        <div className="mt-1 flex gap-2">
          <button type="button" onClick={() => onAdd(link)} className="font-semibold text-forest-700 underline">
            Edit
          </button>
          <button type="button" onClick={() => onDelete(record.id)} className="font-semibold text-status-missing underline">
            Delete
          </button>
        </div>
      </div>
    )
  }
  if (link.status === 'supported') return null
  return (
    <button
      type="button"
      onClick={() => onAdd(link)}
      className="rounded-lg px-2 py-1 text-[11px] font-semibold text-forest-700 ring-1 ring-forest-200 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-forest-500"
    >
      {link.status === 'missing' ? 'Add note or propose link' : 'Add review note'}
    </button>
  )
}
