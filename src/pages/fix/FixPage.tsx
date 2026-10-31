import { useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { findSampleFile } from '../../data/samplePack'
import { ACCEPT_ATTRIBUTE } from '../../features/documents/fileTypes'
import { fixContext, fixGuideFor, type FixGuide } from '../../features/fixes/fixGuide'
import { useFixActions, type FixRequest } from '../../features/fixes/useFixActions'
import { countFindings, groupFindings, type Finding } from '../../features/passport/findings'
import { usePassport } from '../../features/passport/usePassport'
import { FixStatus } from '../../features/passport/WhatWeFound'
import { SourceInspector } from '../../features/traceability/SourceInspector'
import { useHashLocation } from '../../lib/router'
import { pageHref } from '../../lib/routes'
import type { SourceRef } from '../../types/extraction'

/**
 * One thing per page: a single problem, what each document says, who to ask
 * and one main action. The app never decides which document is right; it only
 * shows the values side by side with their sources.
 */

type Kind = 'problem' | 'check' | 'missing'

const KIND: Record<Kind, { tag: string; tone: string }> = {
  problem: { tag: 'Doesn’t match', tone: 'bg-status-missing/[0.08] text-status-missing ring-status-missing/25' },
  check: { tag: 'Check this', tone: 'bg-status-review/[0.1] text-status-review-ink ring-status-review/30' },
  missing: { tag: 'Still needed', tone: 'bg-canvas text-ink-700 ring-line' },
}

const bigButton =
  'inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-5 text-base font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500 disabled:cursor-not-allowed disabled:opacity-50'
const primary = `${bigButton} bg-forest-700 text-white hover:bg-forest-800`
const secondary = `${bigButton} bg-white text-forest-800 ring-1 ring-forest-200 hover:bg-forest-50`
const quiet =
  'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-ink-700 transition-colors duration-150 hover:bg-canvas focus-visible:outline-2 focus-visible:outline-forest-500 disabled:cursor-not-allowed disabled:opacity-40'

export function FixPage() {
  const { loadState, passport, resultsById, reload } = usePassport()
  const fix = useFixActions(reload)
  const { params } = useHashLocation()
  const [inspect, setInspect] = useState<SourceRef | null>(null)
  const [position, setPosition] = useState<number | null>(null)

  if (loadState.status !== 'ready') return <p className="text-sm text-ink-600">{loadState.status === 'loading' ? 'Loading…' : loadState.message}</p>

  if (!passport)
    return (
      <Done
        title="Nothing to fix yet"
        body="Add your documents first. Problems show up here one at a time."
        href={pageHref('dashboard')}
        action="Go to Home"
      />
    )

  const groups = groupFindings(passport)
  const counts = countFindings(groups)
  const items: { finding: Finding; kind: Kind }[] = [
    ...groups.problems.map((finding) => ({ finding, kind: 'problem' as const })),
    ...groups.check.map((finding) => ({ finding, kind: 'check' as const })),
    ...groups.missing.map((finding) => ({ finding, kind: 'missing' as const })),
  ]

  if (items.length === 0)
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <FixStatus state={fix.state} counts={counts} onDismiss={fix.dismiss} />
        <Done title="Nothing left to fix" body="Every required item was found in a document. The passport is still a draft for a person to review." href={pageHref('passport')} action="Open passport" />
      </div>
    )

  // Start at the first missing item when Home's "Get missing papers" task was used.
  const firstMissing = items.findIndex((i) => i.kind === 'missing')
  const start = params.get('show') === 'missing' && firstMissing >= 0 ? firstMissing : 0
  const index = Math.min(position ?? start, items.length - 1)
  const { finding, kind } = items[index]
  const guide = fixGuideFor(finding, fixContext(passport))

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <FixStatus state={fix.state} counts={counts} onDismiss={fix.dismiss} />

      <article className="rounded-2xl border border-line bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-ink-600 tabular-nums">
            {index + 1} of {items.length}
          </p>
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${KIND[kind].tone}`}>{KIND[kind].tag}</span>
        </div>
        <h1 id="page-title" tabIndex={-1} className="mt-2 text-2xl font-semibold tracking-tight text-ink-900 outline-none">
          {finding.title}
        </h1>

        <Values finding={finding} kind={kind} guide={guide} onInspect={setInspect} />

        <p className="mt-5 text-base text-ink-700">{guide.summary}</p>

        <Actions key={finding.key} finding={finding} guide={guide} illustrative={passport.illustrative} busy={fix.busy} onApply={(request) => fix.apply(request, counts)} />

        {guide.steps.length > 0 && (
          <details className="mt-5 rounded-xl bg-canvas px-4 py-3">
            <summary className="min-h-8 cursor-pointer text-sm font-semibold text-ink-700">Show all steps</summary>
            <ol className="mt-3 space-y-2">
              {guide.steps.map((step, i) => (
                <li key={step} className="flex gap-3 text-sm text-ink-700">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-ink-700 ring-1 ring-line tabular-nums">
                    {i + 1}
                  </span>
                  <span className="pt-0.5">{step}</span>
                </li>
              ))}
            </ol>
          </details>
        )}
      </article>

      <nav aria-label="Problems" className="flex items-center justify-between gap-2">
        <button type="button" disabled={index === 0} onClick={() => setPosition(index - 1)} className={quiet}>
          <Icon name="arrow-left" className="size-4" />
          Previous
        </button>
        {index < items.length - 1 ? (
          <button type="button" onClick={() => setPosition(index + 1)} className={quiet}>
            Skip for now
            <Icon name="arrow-right" className="size-4" />
          </button>
        ) : (
          <a href={pageHref('dashboard')} className={quiet}>
            Back to Home
            <Icon name="arrow-right" className="size-4" />
          </a>
        )}
      </nav>

      <SourceInspector source={inspect} result={inspect ? resultsById[inspect.documentId] : undefined} onClose={() => setInspect(null)} />
    </div>
  )
}

/** What each document says, side by side. For a missing item: what is needed and from whom. */
function Values({ finding, kind, guide, onInspect }: { finding: Finding; kind: Kind; guide: FixGuide; onInspect: (s: SourceRef) => void }) {
  const withValues = finding.sources.filter((s) => s.value)
  // Side-by-side values only make sense for a real disagreement (two or more different values)
  // or a single value to check; a problem about something absent shows what is needed instead.
  const distinct = new Set(withValues.map((s) => s.value)).size
  if (kind === 'missing' || withValues.length === 0 || (kind === 'problem' && distinct < 2))
    return (
      <dl className="mt-5 grid gap-3 rounded-xl bg-canvas p-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs font-medium text-ink-600">Needed</dt>
          <dd className="mt-0.5 text-base font-semibold text-ink-900">{guide.document ?? finding.title}</dd>
        </div>
        {guide.who && (
          <div>
            <dt className="text-xs font-medium text-ink-600">Ask</dt>
            <dd className="mt-0.5 text-base font-semibold text-ink-900">{guide.who}</dd>
          </div>
        )}
      </dl>
    )
  return (
    <ul className="mt-5 grid gap-3 sm:grid-cols-2">
      {withValues.slice(0, 4).map((s, i) => (
        <li key={i} className={`rounded-xl p-4 ring-1 ${kind === 'problem' ? 'bg-status-missing/[0.04] ring-status-missing/25' : 'bg-canvas ring-line'}`}>
          <p className="truncate text-xs font-medium text-ink-600">{documentName(s.source.fileName)}</p>
          <p className="mt-1 font-mono text-xl font-semibold text-ink-900">{s.value}</p>
          <button
            type="button"
            onClick={() => onInspect(s.source)}
            className="mt-2 inline-flex min-h-9 cursor-pointer items-center gap-1 text-sm font-semibold text-forest-700 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-forest-500"
          >
            <Icon name="file-text" className="size-4" />
            Show source<span className="sr-only"> for {s.label} in {s.source.fileName}</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

interface ActionsProps {
  finding: Finding
  guide: FixGuide
  illustrative: boolean
  busy: boolean
  onApply: (request: FixRequest) => void
}

/** WhatsApp request first when there is one, then the upload that closes the loop. */
function Actions({ finding, guide, illustrative, busy, onApply }: ActionsProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const replaceTarget = useRef<string | undefined>(undefined)
  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const documents = [...new Map(finding.sources.map((s) => [s.source.documentId, s.source.fileName])).entries()]
  const sample = guide.sampleFix && illustrative ? findSampleFile(guide.sampleFix) : undefined
  const pick = (replaceDocumentId?: string) => {
    replaceTarget.current = replaceDocumentId
    fileInput.current?.click()
  }
  const uploadIsMain = !guide.message

  return (
    <div className="mt-5 space-y-3">
      {guide.message && (
        <>
          <div role="group" aria-label="Message language" className="inline-flex rounded-lg bg-canvas p-0.5">
            {(['en', 'hi'] as const).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={lang === code}
                onClick={() => setLang(code)}
                className={`min-h-9 cursor-pointer rounded-md px-3 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-forest-500 ${
                  lang === code ? 'bg-white text-forest-800 shadow-sm' : 'text-ink-600 hover:text-ink-900'
                }`}
              >
                {code === 'en' ? 'English' : 'हिंदी'}
              </button>
            ))}
          </div>
          <a href={`https://wa.me/?text=${encodeURIComponent(guide.message[lang])}`} target="_blank" rel="noopener noreferrer" className={primary}>
            <Icon name="message" className="size-5" />
            Ask on WhatsApp
            <span className="sr-only">(opens WhatsApp in a new tab with the message filled in)</span>
          </a>
          <details className="text-sm text-ink-600">
            <summary className="min-h-8 cursor-pointer font-medium">See the message</summary>
            <p lang={lang} className="mt-2 rounded-xl bg-canvas p-3 text-ink-900">
              {guide.message[lang]}
            </p>
          </details>
        </>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {guide.action.kind === 'upload' && (
          <button type="button" disabled={busy} onClick={() => pick()} className={uploadIsMain ? primary : secondary}>
            <Icon name="upload" className="size-5" />
            Upload the reply
          </button>
        )}
        {(guide.action.kind === 'replace' || guide.action.kind === 'check-source') &&
          documents.map(([id, fileName]) => (
            <button key={id} type="button" disabled={busy} onClick={() => pick(id)} className={secondary} title={`Replace ${fileName}`}>
              <Icon name="replace" className="size-5" />
              <span className="max-w-60 truncate">Replace {documentName(fileName)}</span>
            </button>
          ))}
        {guide.action.kind === 'supply-chain' && (
          <a href={pageHref('traceability')} className={uploadIsMain ? primary : secondary}>
            Add a note in Supply chain
            <Icon name="arrow-right" className="size-5" />
          </a>
        )}
      </div>

      {sample && (
        <button
          type="button"
          disabled={busy}
          onClick={() => onApply({ findingKey: finding.key, sampleKey: guide.sampleFix })}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-status-review/10 px-4 text-sm font-semibold text-status-review-ink ring-1 ring-status-review/30 transition-colors duration-150 hover:bg-status-review/20 focus-visible:outline-2 focus-visible:outline-forest-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Icon name="sparkle" className="size-4" />
          Demo: pretend they replied
        </button>
      )}

      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]
          event.target.value = ''
          if (files.length) onApply({ findingKey: finding.key, files, replaceDocumentId: replaceTarget.current })
        }}
      />
    </div>
  )
}

function Done({ title, body, href, action }: { title: string; body: string; href: string; action: string }) {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl border border-line bg-surface p-7 text-center">
      <Icon name="check-circle" className="mx-auto size-10 text-forest-600" />
      <h1 id="page-title" tabIndex={-1} className="mt-3 text-2xl font-semibold text-ink-900 outline-none">
        {title}
      </h1>
      <p className="mt-2 text-base text-ink-600">{body}</p>
      <a href={href} className={`${primary} mt-5`}>
        {action}
        <Icon name="arrow-right" className="size-5" />
      </a>
    </section>
  )
}

/** "CP-LDH-2026-001_SAMPLE_job-work-challan.jpg" → "Job work challan". */
function documentName(fileName: string) {
  const base = fileName.replace(/^CP-LDH-\d{4}-\d{3}_SAMPLE_/, '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ')
  return base.charAt(0).toUpperCase() + base.slice(1)
}
