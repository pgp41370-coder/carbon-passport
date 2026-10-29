import { useState } from 'react'
import { Card } from '../../components/Card'
import { Icon, type IconName } from '../../components/Icon'
import type {
  CheckOutcome,
  CheckResult,
  IssueReview,
  IssueSeverity,
  ReviewAction,
  SourceRef,
  ValidationIssue,
} from '../../types/extraction'
import { describeSource } from '../extraction/sourceRef'

const OUTCOME: Record<CheckOutcome, { label: string; icon: IconName; className: string }> = {
  issue: { label: 'Issue found', icon: 'alert', className: 'text-status-missing' },
  passed: { label: 'No issue found', icon: 'check-circle', className: 'text-status-verified' },
  not_applicable: { label: 'Not checked', icon: 'info', className: 'text-ink-500' },
}

const SEVERITY: Record<IssueSeverity, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-status-missing/10 text-status-missing' },
  medium: { label: 'Medium', className: 'bg-status-review/10 text-status-review-ink' },
  low: { label: 'Low', className: 'bg-forest-50 text-forest-700' },
}

const REVIEW_ACTIONS: Record<ReviewAction, { label: string; needsNote: boolean }> = {
  follow_up: { label: 'Discrepancy confirmed in the source: follow-up needed', needsNote: false },
  explained: { label: 'Explanation recorded (see note)', needsNote: true },
  extraction_error: { label: 'Reading looks wrong: the source says something else', needsNote: true },
}

const SEVERITY_ORDER: IssueSeverity[] = ['high', 'medium', 'low']

interface ValidationPanelProps {
  checks: readonly CheckResult[]
  issues: readonly ValidationIssue[]
  reviews: Record<string, IssueReview>
  hasResults: boolean
  onInspect: (ref: SourceRef) => void
  onSaveReview: (review: IssueReview) => Promise<void>
  onClearReview: (issueId: string) => Promise<void>
}

export function ValidationPanel({ checks, issues, reviews, hasResults, onInspect, onSaveReview, onClearReview }: ValidationPanelProps) {
  const sorted = [...issues].sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity))

  return (
    <Card
      title="Validation checks"
      aside={
        hasResults && (
          <span className="rounded-full bg-ink-900 px-2.5 py-0.5 text-xs font-semibold text-white tabular-nums">
            {issues.length} issue{issues.length === 1 ? '' : 's'}
          </span>
        )
      }
    >
      {!hasResults ? (
        <p className="text-sm text-ink-500">Checks run once at least one document has been processed.</p>
      ) : (
        <div className="space-y-5">
          <p className="text-xs text-ink-500">
            Deterministic rules applied to the extracted values. A check can only compare what was read; it does not correct
            values or fill gaps.
          </p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {checks.map((check) => {
              const outcome = OUTCOME[check.outcome]
              return (
                <li key={check.checkId} className="flex gap-3 rounded-xl border border-line p-3">
                  <Icon name={outcome.icon} className={`mt-0.5 size-5 shrink-0 ${outcome.className}`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink-900">{check.title}</p>
                    <p className={`text-xs font-semibold ${outcome.className}`}>{outcome.label}</p>
                    <p className="mt-0.5 text-xs text-ink-600">{check.summary}</p>
                  </div>
                </li>
              )
            })}
          </ul>

          {sorted.length > 0 && (
            <ul className="space-y-4">
              {sorted.map((issue) => (
                <IssueCard
                  key={issue.id}
                  issue={issue}
                  review={reviews[issue.id]}
                  onInspect={onInspect}
                  onSaveReview={onSaveReview}
                  onClearReview={onClearReview}
                />
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  )
}

interface IssueCardProps {
  issue: ValidationIssue
  review: IssueReview | undefined
  onInspect: (ref: SourceRef) => void
  onSaveReview: (review: IssueReview) => Promise<void>
  onClearReview: (issueId: string) => Promise<void>
}

function IssueCard({ issue, review, onInspect, onSaveReview, onClearReview }: IssueCardProps) {
  const [editing, setEditing] = useState(false)
  const severity = SEVERITY[issue.severity]
  const usesSamples = issue.evidence.some((e) => e.origin === 'sample')

  return (
    <li className="rounded-xl border border-line bg-canvas/50 p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${severity.className}`}>{severity.label} priority</span>
        {usesSamples && (
          <span className="rounded-full border border-status-review/30 bg-status-review/10 px-2 py-0.5 text-[11px] font-semibold text-status-review-ink">
            From synthetic sample documents
          </span>
        )}
        {review && (
          <span className="rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-semibold text-forest-700 ring-1 ring-forest-100">
            Reviewed · still open
          </span>
        )}
      </div>
      <h3 className="mt-2 font-semibold text-ink-900">{issue.title}</h3>
      <p className="mt-1 text-sm text-ink-700">{issue.detail}</p>

      {issue.evidence.length > 0 && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-sm">
            <caption className="sr-only">Source values for this issue</caption>
            <thead>
              <tr className="text-xs text-ink-500">
                <th scope="col" className="py-1.5 pr-3 font-medium">Evidence</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Value as read</th>
                <th scope="col" className="py-1.5 pr-3 font-medium">Source</th>
                <th scope="col" className="py-1.5 font-medium">
                  <span className="sr-only">Inspect</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line border-t border-line">
              {issue.evidence.map((item, i) => (
                <tr key={i}>
                  <td className="py-2 pr-3 text-ink-700">{item.label}</td>
                  <td className="py-2 pr-3 font-mono text-[13px] font-semibold text-ink-900">{item.value ?? '—'}</td>
                  <td className="py-2 pr-3 text-xs text-ink-600">
                    {item.source ? (
                      <>
                        <span className="break-all">{item.source.fileName}</span>
                        {describeSource(item.source) && <span className="block">{describeSource(item.source)}</span>}
                      </>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td className="py-2 text-right">
                    {item.source && (
                      <button
                        type="button"
                        onClick={() => onInspect(item.source!)}
                        className="rounded-lg px-2.5 py-1 text-xs font-semibold text-forest-700 ring-1 ring-forest-200 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-forest-500"
                      >
                        Inspect
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-4 border-t border-line pt-4">
        {review && !editing ? (
          <div className="text-sm">
            <p className="font-semibold text-ink-900">Review recorded: {REVIEW_ACTIONS[review.action].label}</p>
            {review.note && <p className="mt-1 whitespace-pre-wrap text-ink-700">“{review.note}”</p>}
            <p className="mt-1 text-xs text-ink-500">
              {review.reviewer ? `${review.reviewer} · ` : ''}
              {new Date(review.reviewedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
            </p>
            <p className="mt-2 text-xs text-ink-500">
              A review records a person’s judgement. It is not independent verification, and the issue stays listed.
            </p>
            <div className="mt-2 flex gap-2">
              <button type="button" onClick={() => setEditing(true)} className="text-xs font-semibold text-forest-700 underline underline-offset-2">
                Edit review
              </button>
              <button
                type="button"
                onClick={() => void onClearReview(issue.id)}
                className="text-xs font-semibold text-status-missing underline underline-offset-2"
              >
                Remove review
              </button>
            </div>
          </div>
        ) : editing ? (
          <ReviewForm
            issue={issue}
            initial={review}
            onCancel={() => setEditing(false)}
            onSave={async (next) => {
              await onSaveReview(next)
              setEditing(false)
            }}
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-forest-700 ring-1 ring-forest-200 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-forest-500"
          >
            Record review
          </button>
        )}
      </div>
    </li>
  )
}

interface ReviewFormProps {
  issue: ValidationIssue
  initial: IssueReview | undefined
  onCancel: () => void
  onSave: (review: IssueReview) => Promise<void>
}

function ReviewForm({ issue, initial, onCancel, onSave }: ReviewFormProps) {
  const [action, setAction] = useState<ReviewAction>(initial?.action ?? 'follow_up')
  const [note, setNote] = useState(initial?.note ?? '')
  const [reviewer, setReviewer] = useState(initial?.reviewer ?? '')
  const [error, setError] = useState<string | null>(null)
  const needsNote = REVIEW_ACTIONS[action].needsNote

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault()
        if (needsNote && !note.trim()) {
          setError('Add a note explaining this review.')
          return
        }
        void onSave({
          issueId: issue.id,
          fingerprint: issue.fingerprint,
          action,
          note: note.trim(),
          reviewer: reviewer.trim() || undefined,
          reviewedAt: new Date().toISOString(),
        }).catch((e: unknown) => setError(`The review could not be saved: ${(e as Error)?.message ?? e}`))
      }}
    >
      <fieldset>
        <legend className="text-sm font-semibold text-ink-900">Record a review</legend>
        <p className="text-xs text-ink-500">This notes your judgement. It does not verify the evidence or close the issue.</p>
        <div className="mt-2 space-y-1.5">
          {(Object.keys(REVIEW_ACTIONS) as ReviewAction[]).map((key) => (
            <label key={key} className="flex items-start gap-2 text-sm text-ink-700">
              <input
                type="radio"
                name={`action-${issue.id}`}
                value={key}
                checked={action === key}
                onChange={() => setAction(key)}
                className="mt-1 accent-forest-700"
              />
              {REVIEW_ACTIONS[key].label}
            </label>
          ))}
        </div>
      </fieldset>
      <label className="block text-sm">
        <span className="font-medium text-ink-900">Note{needsNote ? '' : ' (optional)'}</span>
        <textarea
          value={note}
          onChange={(e) => {
            setNote(e.target.value)
            setError(null)
          }}
          rows={3}
          className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-forest-500 focus:outline-none"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-ink-900">Reviewer (optional)</span>
        <input
          value={reviewer}
          onChange={(e) => setReviewer(e.target.value)}
          className="mt-1 w-full max-w-xs rounded-lg border border-line bg-surface px-3 py-2 text-sm focus:border-forest-500 focus:outline-none"
        />
      </label>
      {error && (
        <p role="alert" className="text-xs font-medium text-status-missing">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded-lg bg-forest-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
        >
          Save review
        </button>
        <button type="button" onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-700 ring-1 ring-line hover:bg-canvas">
          Cancel
        </button>
      </div>
    </form>
  )
}
