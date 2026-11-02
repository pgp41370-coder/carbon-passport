import { Fragment, useState, type ReactNode } from 'react'
import { Icon } from '../../components/Icon'
import { pageLink } from '../../lib/routes'
import type { SourceRef } from '../../types/extraction'
import { documentName } from '../documents/documentName'
import { TRACE_STATUS } from '../traceability/traceStatus'
import { downstreamOf, MAP_NODE_ORDER, upstreamOf, type Conflict, type EvidenceMap, type MapEdge, type MapNode, type MapNodeId } from './evidenceMap'
import { MapLegend, MapStatusChip } from './mapStatus'
import { MAP_STATUS } from './mapStatusMeta'
import { quietButton, secondaryButton, sourceLink } from './ui'

/**
 * The chain as a row of points (a column on phones). Each point is a button:
 * hover or focus shows one line about it, a click opens what it rests on and
 * what depends on it. A traced conflict outlines the two points that disagree
 * and the link where the values stop matching.
 */

interface EvidenceMapViewProps {
  map: EvidenceMap
  batchId: string
  selected: MapNodeId | null
  onSelect: (id: MapNodeId | null) => void
  focus?: Conflict
  onInspect: (source: SourceRef) => void
  /** Where the Fix screen's back link should return to. */
  fixFrom: 'map' | 'review'
}

export function EvidenceMapView({ map, batchId, selected, onSelect, focus, onInspect, fixFrom }: EvidenceMapViewProps) {
  const [hovered, setHovered] = useState<MapNodeId | null>(null)
  const active = selected ?? hovered
  const index = (id: MapNodeId) => MAP_NODE_ORDER.indexOf(id)
  const selectedNode = map.nodes.find((n) => n.id === selected)
  // Downstream points are marked only when the selected point is not supported, so "depends on" means "is affected".
  const affected = new Set(selectedNode && selectedNode.status !== 'supported' ? downstreamOf(map, selectedNode.id).map((n) => n.id) : [])
  const focusNodes = new Set(focus?.nodeIds ?? [])
  const isFocusEdge = (e: MapEdge) => focusNodes.has(e.to) && e.status === 'conflict'
  const isActiveEdge = (e: MapEdge) => !!active && (e.from === active || e.to === active)

  return (
    <div className="space-y-4">
      <section aria-labelledby="map-title" className="rounded-2xl border border-line bg-surface p-4 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="map-title" className="text-sm font-semibold text-ink-900">
            From steel to finished batch · <span className="font-mono whitespace-nowrap">{batchId}</span>
          </h2>
          <MapLegend />
        </div>

        <ol aria-label="Evidence chain, from steel mill to finished batch" className="mt-6 flex flex-col xl:flex-row xl:items-stretch">
          {map.nodes.map((node, i) => {
            const edge = map.edges[i]
            return (
              <Fragment key={node.id}>
                <li className="xl:min-w-0 xl:flex-1">
                  <NodeButton
                    node={node}
                    step={i + 1}
                    selected={selected === node.id}
                    neighbour={!!active && active !== node.id && Math.abs(index(active) - i) === 1}
                    affected={affected.has(node.id)}
                    focused={focusNodes.has(node.id)}
                    dimmed={!!focus && !focusNodes.has(node.id) && selected !== node.id}
                    onSelect={() => onSelect(selected === node.id ? null : node.id)}
                    onHover={(on) => setHovered(on ? node.id : null)}
                  />
                </li>
                {edge && <EdgeMark edge={edge} emphasised={isFocusEdge(edge) || isActiveEdge(edge)} quiet={(!!focus || !!active) && !isFocusEdge(edge) && !isActiveEdge(edge)} />}
              </Fragment>
            )
          })}
        </ol>

        <p className="mt-5 text-sm text-ink-600">
          {selectedNode ? 'Showing what this point rests on and what depends on it.' : 'Select a point to see its papers and what depends on it.'}
        </p>
      </section>

      {selectedNode && <NodeDetail map={map} node={selectedNode} onInspect={onInspect} onClear={() => onSelect(null)} fixFrom={fixFrom} />}
    </div>
  )
}

interface NodeButtonProps {
  node: MapNode
  step: number
  selected: boolean
  neighbour: boolean
  affected: boolean
  focused: boolean
  dimmed: boolean
  onSelect: () => void
  onHover: (on: boolean) => void
}

function NodeButton({ node, step, selected, neighbour, affected, focused, dimmed, onSelect, onHover }: NodeButtonProps) {
  const meta = MAP_STATUS[node.status]
  const hint = node.findings[0]?.title ?? meta.meaning
  const heat = /^Heat (.+)$/.exec(node.headline)?.[1]
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className={`group relative flex h-full w-full cursor-pointer flex-col rounded-xl bg-white p-3 text-left ring-1 transition duration-150 hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500 motion-reduce:transition-none motion-reduce:hover:translate-y-0 ${
        selected
          ? 'shadow-md ring-2 ring-forest-700'
          : focused
            ? 'ring-2 ring-status-missing/70'
            : affected
              ? 'ring-1 ring-ink-400'
              : neighbour
                ? 'ring-forest-300'
                : meta.node
      } ${dimmed ? 'opacity-55 hover:opacity-100' : ''}`}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-ink-500 tabular-nums">{step}</span>
        <Icon name={meta.icon} className={`size-4 ${meta.text}`} />
      </span>
      <span className="mt-1 text-sm leading-snug font-semibold text-ink-900">{node.title}</span>
      {heat ? (
        // The heat number is the material's identity along the chain, so it gets its own line.
        <span className="mt-1 text-xs text-ink-500">
          Heat no.
          <span className="block font-mono text-sm font-semibold text-ink-900">{heat}</span>
        </span>
      ) : (
        <span className="mt-1 truncate text-xs text-ink-700">{node.headline}</span>
      )}
      <span className={`mt-auto pt-2 text-xs font-semibold ${meta.text}`}>{meta.label}</span>
      {affected && <span className="text-xs text-ink-500">Affected</span>}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-full left-1/2 z-20 mt-2 hidden w-56 -translate-x-1/2 rounded-lg bg-ink-900 px-3 py-2 text-xs leading-relaxed text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 xl:block"
      >
        <span className="font-semibold">{node.paper}.</span> {hint}
      </span>
    </button>
  )
}

/** The link between two points: solid when a paper backs it, dashed when it is unproven, marked ≠ where values disagree. */
function EdgeMark({ edge, emphasised, quiet }: { edge: MapEdge; emphasised: boolean; quiet: boolean }) {
  const meta = MAP_STATUS[edge.status]
  return (
    <li className={`relative flex shrink-0 items-center justify-center py-1 pl-6 xl:w-7 xl:py-0 xl:pl-0 ${quiet ? 'opacity-40' : ''}`} title={`${edge.label}: ${edge.detail}`}>
      <span aria-hidden="true" className={`block h-6 border-l-2 xl:h-0 xl:w-full xl:border-t-2 xl:border-l-0 ${meta.edge} ${emphasised ? 'xl:border-t-[3px]' : ''}`} />
      {edge.status === 'conflict' && (
        <span aria-hidden="true" className="absolute grid size-5 place-items-center rounded-full bg-status-missing text-xs font-bold text-white ring-2 ring-white">
          ≠
        </span>
      )}
      <span className="sr-only">
        Link “{edge.label}”: {meta.label}. {edge.detail}
      </span>
    </li>
  )
}

function NodeDetail({ map, node, onInspect, onClear, fixFrom }: { map: EvidenceMap; node: MapNode; onInspect: (s: SourceRef) => void; onClear: () => void; fixFrom: 'map' | 'review' }) {
  const upstream = upstreamOf(map, node.id)
  const inbound = map.edges.find((e) => e.to === node.id)
  const downstream = downstreamOf(map, node.id)
  const step = MAP_NODE_ORDER.indexOf(node.id) + 1
  const finding = node.findings[0]

  return (
    <section aria-labelledby="node-title" className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-ink-500">
            Point {step} of {map.nodes.length} · {node.paper}
          </p>
          <h2 id="node-title" className="mt-1 flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight text-ink-900">
            {node.title}
            <MapStatusChip status={node.status} />
          </h2>
        </div>
        <button type="button" onClick={onClear} className={quietButton}>
          <Icon name="close" className="size-4" />
          Clear selection
        </button>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div className="space-y-5">
          <Block title="What the papers say">
            {node.values.length ? (
              <ul className="divide-y divide-line rounded-xl ring-1 ring-line">
                {node.values.slice(0, 6).map((v) => (
                  <li key={`${v.label}-${v.value}-${v.source?.documentId}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2">
                    <span className="w-full text-xs text-ink-600 sm:w-36">{v.label}</span>
                    <span className={`min-w-0 flex-1 text-sm font-semibold break-words text-ink-900 ${/\d/.test(v.value) ? 'font-mono' : ''}`}>{v.value}</span>
                    {v.source && (
                      <button type="button" onClick={() => onInspect(v.source!)} className={sourceLink}>
                        <Icon name="file-text" className="size-4" />
                        Source<span className="sr-only"> for {v.label}</span>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-600">No value has been read for this point.</p>
            )}
          </Block>

          <Block title="Documents">
            {node.documents.length ? (
              <ul className="space-y-1">
                {node.documents.map((d) => (
                  <li key={d.documentId}>
                    <button type="button" onClick={() => onInspect({ documentId: d.documentId, fileName: d.fileName })} className={sourceLink}>
                      <Icon name="file-text" className="size-4" />
                      {documentName(d.fileName)}
                      {d.origin === 'sample' && <span className="font-normal text-ink-500">· sample</span>}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ink-600">No document for this point yet.</p>
            )}
          </Block>

          <Block title="Checks on this point">
            <ul className="space-y-1.5">
              {node.requirements.map((r) => (
                <li key={r.id}>
                  <details className="group">
                    <summary className="flex min-h-9 cursor-pointer items-center gap-2 text-sm text-ink-900">
                      <Icon name={TRACE_STATUS[r.status].icon} className={`size-4 shrink-0 ${MAP_STATUS[r.status === 'supported' ? 'supported' : r.status === 'missing' ? 'missing' : 'review'].text}`} />
                      <span className="flex-1">{r.label}</span>
                      <span className="text-xs text-ink-500 group-open:hidden">Why</span>
                    </summary>
                    <p className="mt-1 mb-2 ml-6 text-sm text-ink-600">{r.detail}</p>
                  </details>
                </li>
              ))}
            </ul>
          </Block>
        </div>

        <div className="space-y-5">
          <Block title="Comes from">
            {upstream && inbound ? (
              <p className="flex flex-wrap items-center gap-2 text-sm text-ink-900">
                <span className="font-semibold">{upstream.title}</span>
                <MapStatusChip status={inbound.status} label={inbound.status === 'supported' ? 'Linked' : inbound.status === 'conflict' ? 'Values differ' : MAP_STATUS[inbound.status].label} />
                <span className="w-full text-ink-600">{inbound.detail}</span>
              </p>
            ) : (
              <p className="text-sm text-ink-600">This is where the chain starts.</p>
            )}
          </Block>

          <Block title={node.status === 'supported' ? 'Points after this one' : 'Affected if this point is wrong or missing'}>
            {downstream.length ? (
              <>
                {node.status !== 'supported' && <p className="mb-2 text-sm text-ink-600">These lose their documented link back to the steel until this point is fixed.</p>}
                <ul className="flex flex-wrap gap-1.5">
                  {downstream.map((n) => (
                    <li key={n.id} className="rounded-full bg-canvas px-2.5 py-1 text-xs font-medium text-ink-700 ring-1 ring-line">
                      {n.title}
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-sm text-ink-600">Nothing comes after the finished batch.</p>
            )}
          </Block>

          <dl className="space-y-3 rounded-xl bg-canvas p-4">
            <div>
              <dt className="text-xs font-medium text-ink-600">Who corrects it</dt>
              <dd className="mt-0.5 text-sm font-semibold text-ink-900">{node.responsible}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium text-ink-600">Next step</dt>
              <dd className="mt-0.5 text-sm text-ink-900">{node.nextAction}</dd>
            </div>
          </dl>

          {finding && (
            <a href={pageLink('fix', { item: finding.key, from: fixFrom })} className={secondaryButton}>
              <Icon name="wrench" className="size-5" />
              Fix this: {finding.title.charAt(0).toLowerCase() + finding.title.slice(1)}
            </a>
          )}
        </div>
      </div>
    </section>
  )
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold tracking-wide text-ink-600 uppercase">{title}</h3>
      {children}
    </div>
  )
}
