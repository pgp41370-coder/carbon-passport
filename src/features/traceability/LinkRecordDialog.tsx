import { useEffect, useRef, useState } from 'react'
import type { TraceLink, TraceRecord } from '../../types/traceability'
import type { RecordInput } from './useTraceability'

interface LinkRecordDialogProps {
  link: TraceLink | null
  existing: TraceRecord | undefined
  onCancel: () => void
  onSave: (input: RecordInput) => Promise<boolean>
}

/**
 * Records a review note on a hand-off, or (only where evidence is missing) a
 * user-proposed link. A note is always required; neither makes a link "supported".
 */
export function LinkRecordDialog({ link, existing, onCancel, onSave }: LinkRecordDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (link && !dialog.open) dialog.showModal()
    if (!link && dialog.open) dialog.close()
  }, [link])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="link-record-title"
      onClose={onCancel}
      className="m-auto w-[min(32rem,calc(100vw-2rem))] rounded-2xl bg-surface p-0 text-ink-900 shadow-2xl backdrop:bg-forest-950/50"
    >
      {link && (
        <RecordForm key={`${link.id}:${existing?.recordedAt ?? 'new'}`} link={link} existing={existing} onCancel={onCancel} onSave={onSave} />
      )}
    </dialog>
  )
}

interface RecordFormProps {
  link: TraceLink
  existing: TraceRecord | undefined
  onCancel: () => void
  onSave: (input: RecordInput) => Promise<boolean>
}

function RecordForm({ link, existing, onCancel, onSave }: RecordFormProps) {
  const canPropose = link.status === 'missing' || existing?.kind === 'proposal'
  const [kind, setKind] = useState<TraceRecord['kind']>(existing?.kind ?? 'review')
  const [reference, setReference] = useState(existing?.proposedReference ?? '')
  const [note, setNote] = useState(existing?.note ?? '')
  const [reviewer, setReviewer] = useState(existing?.reviewer ?? '')
  const [error, setError] = useState<string | null>(null)

  return (
        <form
          className="space-y-4 p-6"
          onSubmit={(event) => {
            event.preventDefault()
            if (!note.trim()) return setError('A note is required.')
            if (kind === 'proposal' && !reference.trim()) return setError('Enter the reference you believe links these stages.')
            void onSave({
              linkId: link.id,
              kind,
              note: note.trim(),
              reviewer: reviewer.trim() || undefined,
              proposedReference: kind === 'proposal' ? reference.trim() : undefined,
            }).then((ok) => {
              if (ok) onCancel()
              else setError('The evidence for this hand-off changed while you were editing. Close and try again.')
            })
          }}
        >
          <div>
            <h2 id="link-record-title" className="text-lg font-semibold">
              {link.title}
            </h2>
            <p className="mt-1 text-sm text-ink-600">{link.reference}</p>
          </div>

          {canPropose && (
            <fieldset>
              <legend className="text-sm font-semibold">What are you recording?</legend>
              <div className="mt-2 space-y-1.5 text-sm text-ink-700">
                <label className="flex items-start gap-2">
                  <input type="radio" name="record-kind" checked={kind === 'review'} onChange={() => setKind('review')} className="mt-1 accent-forest-700" />
                  A review note only (the link stays as it is)
                </label>
                <label className="flex items-start gap-2">
                  <input type="radio" name="record-kind" checked={kind === 'proposal'} onChange={() => setKind('proposal')} className="mt-1 accent-forest-700" />
                  A proposed link I believe exists but cannot yet support with a document
                </label>
              </div>
            </fieldset>
          )}

          {kind === 'proposal' && (
            <label className="block text-sm">
              <span className="font-medium">Proposed reference</span>
              <span className="block text-xs text-ink-500">e.g. a trader’s name and invoice number, or a return challan number</span>
              <input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-forest-500 focus:outline-none"
              />
            </label>
          )}

          <label className="block text-sm">
            <span className="font-medium">Note (required)</span>
            <textarea
              value={note}
              onChange={(e) => {
                setNote(e.target.value)
                setError(null)
              }}
              rows={3}
              className="mt-1 w-full rounded-lg border border-line px-3 py-2 text-sm focus:border-forest-500 focus:outline-none"
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium">Your name (optional)</span>
            <input
              value={reviewer}
              onChange={(e) => setReviewer(e.target.value)}
              className="mt-1 w-full max-w-xs rounded-lg border border-line px-3 py-2 text-sm focus:border-forest-500 focus:outline-none"
            />
          </label>

          <p className="rounded-lg bg-canvas p-3 text-xs text-ink-600">
            This is stored in this browser only. It records your judgement; it does not verify the link, and a proposed link
            is always shown as “Proposed by user”, never as supported. If the evidence changes, the note stops applying.
          </p>
          {error && (
            <p role="alert" className="text-xs font-medium text-status-missing">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-ink-700 ring-1 ring-line hover:bg-canvas">
              Cancel
            </button>
            <button type="submit" className="rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-forest-800">
              Save note
            </button>
          </div>
        </form>
  )
}
