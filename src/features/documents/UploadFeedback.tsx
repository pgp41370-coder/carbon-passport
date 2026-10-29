import { Icon, type IconName } from '../../components/Icon'
import type { Feedback, FeedbackNote, FeedbackTone } from './useDocuments'

const TONE: Record<FeedbackTone, { icon: IconName; box: string; iconColor: string }> = {
  success: { icon: 'check-circle', box: 'border-forest-200 bg-forest-50', iconColor: 'text-forest-700' },
  warning: { icon: 'alert', box: 'border-status-review/30 bg-status-review/[0.07]', iconColor: 'text-status-review-ink' },
  error: { icon: 'x-circle', box: 'border-status-missing/30 bg-status-missing/[0.06]', iconColor: 'text-status-missing' },
}

const NOTE_LABEL: Record<FeedbackNote['kind'], { label: string; className: string }> = {
  rejected: { label: 'Rejected', className: 'text-status-missing' },
  failed: { label: 'Not saved', className: 'text-status-missing' },
  renamed: { label: 'Renamed', className: 'text-status-review-ink' },
  duplicate: { label: 'Duplicate content', className: 'text-status-review-ink' },
}

interface UploadFeedbackProps {
  feedback: Feedback
  onDismiss: () => void
}

export function UploadFeedback({ feedback, onDismiss }: UploadFeedbackProps) {
  const tone = TONE[feedback.tone]
  return (
    <div
      role={feedback.tone === 'error' ? 'alert' : 'status'}
      className={`flex gap-3 rounded-2xl border p-4 sm:p-5 ${tone.box}`}
    >
      <Icon name={tone.icon} className={`mt-0.5 size-5 shrink-0 ${tone.iconColor}`} />
      <div className="min-w-0 flex-1 text-sm">
        <p className="font-semibold text-ink-900">{feedback.title}</p>
        {feedback.notes.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {feedback.notes.map((note, i) => (
              <li key={`${note.fileName}-${i}`} className="text-ink-700">
                <span className={`font-semibold ${NOTE_LABEL[note.kind].className}`}>{NOTE_LABEL[note.kind].label}: </span>
                <span className="font-medium break-all text-ink-900">{note.fileName}</span>
                <span> — {note.message}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-500 hover:bg-black/5 hover:text-ink-900 focus-visible:outline-2 focus-visible:outline-forest-500"
      >
        <Icon name="close" className="size-4" />
        <span className="sr-only">Dismiss message</span>
      </button>
    </div>
  )
}
