import { Icon } from '../../components/Icon'
import { pageHref } from '../../lib/routes'
import type { ReadOutcome, ReadProgress } from '../extraction/processDocuments'

interface ReadingPanelProps {
  reading: ReadProgress | null
  result: (ReadOutcome & { error?: string }) | null
}

/** Shows documents being read automatically after upload, then a plain summary. */
export function ReadingPanel({ reading, result }: ReadingPanelProps) {
  if (reading) {
    const overall = Math.round(((reading.index + (reading.progress ?? 0.3)) / reading.total) * 100)
    return (
      <div role="status" aria-live="polite" className="rounded-2xl border border-forest-200 bg-forest-50 p-4 sm:p-5">
        <p className="flex items-center gap-2 text-sm font-semibold text-forest-950">
          <Icon name="loader" className="size-4 animate-spin text-forest-700" />
          Reading documents in this browser: {reading.index + 1} of {reading.total}
        </p>
        <p className="mt-1 truncate text-xs text-ink-600">
          {reading.fileName} · {reading.message}
        </p>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-forest-600 transition-[width]" style={{ width: `${overall}%` }} />
        </div>
      </div>
    )
  }
  if (!result) return null

  const ok = !result.error && result.failed === 0
  return (
    <div role="status" className={`rounded-2xl border p-4 sm:p-5 ${ok ? 'border-forest-200 bg-forest-50' : 'border-status-review/30 bg-status-review/[0.07]'}`}>
      <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
        <Icon name={ok ? 'check-circle' : 'alert'} className={`size-5 ${ok ? 'text-forest-700' : 'text-status-review-ink'}`} />
        {result.error
          ? 'Reading stopped before it finished'
          : `${result.read} document${result.read === 1 ? '' : 's'} read · ${result.problems} problem${result.problems === 1 ? '' : 's'} found`}
      </p>
      <p className="mt-1 text-sm text-ink-700">
        {result.error
          ? result.error
          : result.failed
            ? `${result.failed} could not be read; open Check documents to see why.`
            : 'Everything was read in this browser. Nothing was uploaded.'}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a href={pageHref('dashboard')} className="inline-flex items-center gap-2 rounded-xl bg-forest-700 px-4 py-2 text-sm font-semibold text-white hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500">
          See what we found
          <Icon name="arrow-right" className="size-4" />
        </a>
        <a href={pageHref('validate')} className="inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold text-forest-700 ring-1 ring-forest-200 hover:bg-white focus-visible:outline-2 focus-visible:outline-forest-500">
          Check each document
        </a>
      </div>
    </div>
  )
}
