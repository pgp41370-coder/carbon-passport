import { useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { usePassport } from '../../features/passport/usePassport'
import { buildEvidenceMap, MAP_NODE_ORDER, type Conflict, type MapNodeId } from '../../features/review/evidenceMap'
import { EvidenceMapView } from '../../features/review/EvidenceMapView'
import { SimulatedNote } from '../../features/review/mapStatus'
import { primaryButton, quietButton, sourceLink } from '../../features/review/ui'
import { documentName } from '../../features/documents/documentName'
import { SourceInspector } from '../../features/traceability/SourceInspector'
import { useHashLocation } from '../../lib/router'
import { pageHref, pageLink } from '../../lib/routes'
import type { SourceRef } from '../../types/extraction'

/**
 * Which paper holds which point of the chain, and what depends on it. Opened
 * from the verifier review with `?issue=` to outline one discrepancy, or with
 * `?node=` to open one point. Rebuilt from storage on every visit, so a fix
 * made on the Fix screen shows here straight away.
 */
export function EvidenceMapPage() {
  const { loadState, passport, resultsById } = usePassport()
  const { params } = useHashLocation()
  const [inspect, setInspect] = useState<SourceRef | null>(null)
  const map = useMemo(() => (passport ? buildEvidenceMap(passport, resultsById) : null), [passport, resultsById])
  const from = params.get('from')
  const issueKey = params.get('issue')
  const focus = map?.conflicts.find((c) => c.finding.key === issueKey)
  const nodeParam = params.get('node') as MapNodeId | null
  // Opened from the review: a fix returns straight there, which is where the user started.
  const fixFrom = from === 'review' ? 'review' : 'map'

  return (
    <div className="space-y-6">
      <a href={from === 'review' ? pageHref('review') : pageHref('passport')} className={`${quietButton} -ml-3`}>
        <Icon name="arrow-left" className="size-4" />
        {from === 'review' ? 'Back to the verifier review' : 'Back to the passport'}
      </a>

      <header className="max-w-3xl">
        <h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight text-ink-900 outline-none sm:text-3xl">
          Evidence map
        </h1>
        <p className="mt-2 text-base text-ink-600">
          Each point of the chain and the paper that proves it. If one paper is missing or wrong, the points after it lose their link back to the steel.
        </p>
      </header>

      {loadState.status === 'loading' && <p className="text-sm text-ink-600">Loading…</p>}
      {loadState.status === 'unavailable' && (
        <p role="alert" className="rounded-2xl border border-status-missing/30 bg-status-missing/[0.06] p-4 text-sm">
          {loadState.message}
        </p>
      )}
      {loadState.status === 'ready' && !passport && (
        <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center">
          <p className="font-semibold text-ink-900">No batch yet</p>
          <p className="mt-1 text-sm text-ink-600">Add and read the documents for one batch first.</p>
          <a href={pageHref('dashboard')} className={`${primaryButton} mt-4`}>
            Go to Home
          </a>
        </div>
      )}

      {passport && map && (
        <>
          {map.simulated.length > 0 && <SimulatedNote files={map.simulated} />}
          {focus ? (
            <ConflictBanner conflict={focus} onInspect={setInspect} fixFrom={fixFrom} />
          ) : issueKey ? (
            <p role="status" className="flex items-start gap-2 rounded-2xl bg-forest-50 p-4 text-sm text-forest-800 ring-1 ring-forest-200">
              <Icon name="check-circle" className="mt-0.5 size-4 shrink-0" />
              This discrepancy is no longer in the documents. The map below shows the batch as it stands now.
            </p>
          ) : map.conflicts.length ? (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-700">
              <Icon name="x-circle" className="size-4 text-status-missing" />
              {map.conflicts.length === 1 ? 'One discrepancy between documents.' : `${map.conflicts.length} discrepancies between documents.`}
              <a href={pageLink('map', { issue: map.conflicts[0]!.finding.key, from: from ?? undefined })} className={sourceLink}>
                Trace it on the map
                <Icon name="arrow-right" className="size-4" />
              </a>
            </p>
          ) : null}

          <MapScreen
            key={`${issueKey}|${nodeParam}`}
            map={map}
            batchId={passport.batchId}
            focus={focus}
            initial={nodeParam && MAP_NODE_ORDER.includes(nodeParam) ? nodeParam : (focus?.nodeIds.at(-1) ?? null)}
            onInspect={setInspect}
            fixFrom={fixFrom}
          />

          {passport.illustrative && <p className="text-sm text-ink-600">Built from sample documents (fictional). Nothing here is verified or certified.</p>}
        </>
      )}

      <SourceInspector source={inspect} result={inspect ? resultsById[inspect.documentId] : undefined} onClose={() => setInspect(null)} />
    </div>
  )
}

function MapScreen({
  map,
  batchId,
  focus,
  initial,
  onInspect,
  fixFrom,
}: {
  map: NonNullable<ReturnType<typeof buildEvidenceMap>>
  batchId: string
  focus?: Conflict
  initial: MapNodeId | null
  onInspect: (s: SourceRef) => void
  fixFrom: 'map' | 'review'
}) {
  const [selected, setSelected] = useState<MapNodeId | null>(initial)
  return <EvidenceMapView map={map} batchId={batchId} selected={selected} onSelect={setSelected} focus={focus} onInspect={onInspect} fixFrom={fixFrom} />
}

/** The traced discrepancy: the two values, where each comes from, who to ask, and the one way to fix it. */
function ConflictBanner({ conflict, onInspect, fixFrom }: { conflict: Conflict; onInspect: (s: SourceRef) => void; fixFrom: 'map' | 'review' }) {
  return (
    <section aria-labelledby="trace-title" className="rounded-2xl bg-status-missing/[0.04] p-5 ring-1 ring-status-missing/25 sm:p-6">
      <p className="text-xs font-semibold tracking-wide text-status-missing uppercase">Tracing a discrepancy</p>
      <h2 id="trace-title" className="mt-1 text-lg font-semibold text-ink-900">
        {conflict.issue.title}
      </h2>
      <ul className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-stretch">
        {conflict.values.map((v, i) => (
          <li key={`${v.label}-${v.value}-${i}`} className="flex flex-1 items-center gap-3">
            {i > 0 && (
              <span aria-hidden="true" className="hidden size-7 shrink-0 place-items-center rounded-full bg-status-missing text-sm font-bold text-white sm:grid">
                ≠
              </span>
            )}
            <div className="flex-1 rounded-xl bg-white p-4 ring-1 ring-status-missing/20">
              <p className="truncate text-xs font-medium text-ink-600">{v.source ? documentName(v.source.fileName) : v.label}</p>
              <p className="mt-1 font-mono text-xl font-semibold text-ink-900">{v.value}</p>
              {v.source && (
                <button type="button" onClick={() => onInspect(v.source!)} className={sourceLink}>
                  <Icon name="file-text" className="size-4" />
                  Show source<span className="sr-only"> for {v.label}</span>
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm text-ink-700">{conflict.issue.detail}</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-700">
          Ask: <span className="font-semibold text-ink-900">{conflict.who ?? 'The issuer of the wrong document'}</span>
        </p>
        <a href={pageLink('fix', { item: conflict.finding.key, from: fixFrom })} className={primaryButton}>
          <Icon name="wrench" className="size-5" />
          Fix this issue
        </a>
      </div>
    </section>
  )
}
