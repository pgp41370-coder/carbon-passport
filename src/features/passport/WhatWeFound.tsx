import { useState } from 'react'
import { Icon, type IconName } from '../../components/Icon'
import type { SourceRef } from '../../types/extraction'
import type { CarbonPassport } from '../../types/passport'
import { describeSource } from '../extraction/sourceRef'
import { fixContext, fixGuideFor } from '../fixes/fixGuide'
import { FixPanel } from '../fixes/FixPanel'
import type { FixRequest, FixState } from '../fixes/useFixActions'
import { countFindings, FINDING_ORDER, groupFindings, type FindingGroup } from './findings'

const GROUPS: Record<FindingGroup, { label: string; icon: IconName; tone: string; bar: string; empty: string }> = {
  problems: {
    label: 'Problems',
    icon: 'x-circle',
    tone: 'text-status-missing',
    bar: 'bg-status-missing',
    empty: 'No conflicts between documents were found.',
  },
  missing: {
    label: 'Missing',
    icon: 'x-circle',
    tone: 'text-status-missing',
    bar: 'bg-status-missing/60',
    empty: 'Nothing required is missing.',
  },
  check: {
    label: 'Needs check',
    icon: 'alert',
    tone: 'text-status-review-ink',
    bar: 'bg-status-review',
    empty: 'Nothing needs a manual check.',
  },
  found: {
    label: 'Found',
    icon: 'check-circle',
    tone: 'text-forest-700',
    bar: 'bg-forest-500',
    empty: 'Nothing has been found in the documents yet.',
  },
}

interface WhatWeFoundProps {
  passport: CarbonPassport
  onInspect: (source: SourceRef) => void
  fix: { state: FixState; busy: boolean; apply: (request: FixRequest, before: Record<FindingGroup, number>) => void; dismiss: () => void }
}

export function WhatWeFound({ passport, onInspect, fix }: WhatWeFoundProps) {
  const groups = groupFindings(passport)
  const counts = countFindings(groups)
  const ctx = fixContext(passport)
  const [open, setOpen] = useState<FindingGroup>(() => FINDING_ORDER.find((g) => groups[g].length > 0) ?? 'found')
  const [fixing, setFixing] = useState<string | null>(null)
  const items = groups[open]
  const requirementTotal = counts.missing + counts.check + counts.found
  const toFix = counts.problems + counts.missing + counts.check

  return (
    <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-sm text-ink-700">
            <span className="text-2xl font-semibold text-ink-900 tabular-nums">{counts.found}</span> of {requirementTotal} required items
            found in your documents
          </p>
          <p className="text-sm font-medium text-ink-700">
            {toFix ? `${toFix} thing${toFix === 1 ? '' : 's'} to fix` : 'Nothing left to fix'}
          </p>
        </div>
        <div className="mt-2 flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-canvas" aria-hidden="true">
          {(['found', 'check', 'missing'] as const).map((g) =>
            counts[g] ? <span key={g} className={`${GROUPS[g].bar} transition-[flex-grow] duration-500`} style={{ flexGrow: counts[g] }} /> : null,
          )}
        </div>
      </div>

      <FixStatus state={fix.state} counts={counts} onDismiss={fix.dismiss} />

      <div role="tablist" aria-label="Findings" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {FINDING_ORDER.map((group) => {
          const meta = GROUPS[group]
          const selected = group === open
          return (
            <button
              key={group}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setOpen(group)}
              className={`cursor-pointer rounded-xl p-3 text-left ring-1 transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-forest-500 ${
                selected ? 'bg-forest-50 ring-forest-300' : 'bg-canvas ring-transparent hover:ring-line'
              }`}
            >
              <span className={`flex items-center gap-1.5 text-xs font-semibold ${meta.tone}`}>
                <Icon name={meta.icon} className="size-3.5" />
                {meta.label}
              </span>
              <span className="mt-1 block text-2xl font-semibold text-ink-900 tabular-nums">{counts[group]}</span>
            </button>
          )
        })}
      </div>

      <div role="tabpanel" aria-label={GROUPS[open].label}>
        {items.length === 0 ? (
          <p className="rounded-xl bg-canvas px-4 py-3 text-sm text-ink-600">{GROUPS[open].empty}</p>
        ) : (
          <ul className="divide-y divide-line rounded-xl border border-line">
            {items.map((item) => {
              const expanded = fixing === item.key
              const panelId = `fix-${item.key.replace(/[^a-z0-9-]/gi, '-')}`
              return (
                <li key={item.key} className="px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink-900">
                        {item.title}
                        {item.where && <span className="ml-2 text-xs font-normal text-ink-600">{item.where}</span>}
                      </p>
                      <p className="mt-0.5 text-sm text-ink-600">{item.detail}</p>
                    </div>
                    {open !== 'found' && (
                      <button
                        type="button"
                        aria-expanded={expanded}
                        aria-controls={panelId}
                        onClick={() => setFixing(expanded ? null : item.key)}
                        className={`inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500 ${
                          expanded ? 'bg-forest-700 text-white hover:bg-forest-800' : 'bg-forest-50 text-forest-800 ring-1 ring-forest-200 hover:bg-forest-100'
                        }`}
                      >
                        <Icon name="wrench" className="size-4" />
                        {expanded ? 'Hide steps' : 'How to fix'}
                      </button>
                    )}
                  </div>
                  {item.sources.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-2">
                      {item.sources.map((s, i) => (
                        <li key={i} className="max-w-full">
                          <button
                            type="button"
                            onClick={() => onInspect(s.source)}
                            className="inline-flex min-h-9 max-w-full cursor-pointer items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-left text-xs text-ink-700 ring-1 ring-line transition-colors duration-150 hover:ring-forest-300 focus-visible:outline-2 focus-visible:outline-forest-500"
                          >
                            <Icon name="file-text" className="size-3.5 shrink-0 text-forest-700" />
                            <span className="min-w-0 truncate">
                              {s.value ? <span className="font-mono font-semibold text-ink-900">{s.value}</span> : s.label}
                              <span className="text-ink-600">
                                {' '}
                                · {s.source.fileName}
                                {describeSource(s.source) && `, ${describeSource(s.source)}`}
                              </span>
                            </span>
                            <span className="shrink-0 font-semibold text-forest-700">
                              Show source<span className="sr-only"> for {s.label}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {expanded && (
                    <div id={panelId}>
                      <FixPanel
                        finding={item}
                        guide={fixGuideFor(item, ctx)}
                        illustrative={passport.illustrative}
                        busy={fix.busy}
                        onApply={(request) => fix.apply(request, counts)}
                      />
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function FixStatus({ state, counts, onDismiss }: { state: FixState; counts: Record<FindingGroup, number>; onDismiss: () => void }) {
  if (state.status === 'idle') return null
  if (state.status === 'working') {
    const p = state.progress
    return (
      <div role="status" aria-live="polite" className="rounded-xl bg-forest-50 p-4 ring-1 ring-forest-200">
        <p className="flex items-center gap-2 text-sm font-semibold text-forest-950">
          <Icon name="loader" className="size-4 animate-spin text-forest-700" />
          {state.message}
        </p>
        {p && <p className="mt-0.5 truncate text-xs text-ink-600">{p.fileName} · {p.message}</p>}
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
          <div
            className="h-full rounded-full bg-forest-600 transition-[width] duration-300"
            style={{ width: `${p ? Math.round(((p.index + (p.progress ?? 0.3)) / p.total) * 100) : 10}%` }}
          />
        </div>
      </div>
    )
  }
  if (state.status === 'error')
    return (
      <div role="alert" className="flex items-start justify-between gap-3 rounded-xl bg-status-missing/[0.06] p-4 ring-1 ring-status-missing/30">
        <p className="text-sm text-ink-900">
          <span className="font-semibold">The fix could not be applied.</span> {state.message}
        </p>
        <DismissButton onDismiss={onDismiss} />
      </div>
    )

  const changes = FINDING_ORDER.filter((g) => state.before[g] !== counts[g])
  const improved = state.before.problems + state.before.missing + state.before.check > counts.problems + counts.missing + counts.check
  return (
    <div role="status" aria-live="polite" className={`flex items-start justify-between gap-3 rounded-xl p-4 ring-1 ${improved ? 'bg-forest-50 ring-forest-200' : 'bg-status-review/[0.07] ring-status-review/30'}`}>
      <div className="text-sm">
        <p className="flex items-center gap-2 font-semibold text-ink-900">
          <Icon name={improved ? 'check-circle' : 'alert'} className={`size-5 ${improved ? 'text-forest-700' : 'text-status-review-ink'}`} />
          {improved ? 'Checked again: fewer things to fix' : 'Checked again: nothing was fixed by this document'}
        </p>
        <p className="mt-1 text-ink-700">
          {changes.length
            ? changes.map((g) => `${GROUPS[g].label} ${state.before[g]} → ${counts[g]}`).join(' · ')
            : 'The counts did not change. Open Check documents to see what was read from it.'}
        </p>
        <p className="mt-1 text-xs text-ink-600">
          Added {state.added.join(', ')}
          {state.removed && ` · removed ${state.removed}`}
        </p>
      </div>
      <DismissButton onDismiss={onDismiss} />
    </div>
  )
}

function DismissButton({ onDismiss }: { onDismiss: () => void }) {
  return (
    <button
      type="button"
      onClick={onDismiss}
      className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-ink-500 hover:bg-white hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-forest-500"
    >
      <Icon name="close" className="size-4" />
      <span className="sr-only">Dismiss</span>
    </button>
  )
}
