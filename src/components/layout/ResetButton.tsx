import { useState } from 'react'
import { clearAllDocuments } from '../../features/documents/documentStore'
import { setRole } from '../../features/roles/roles'
import { toErrorMessage } from '../../lib/errors'
import { ConfirmDialog } from '../ConfirmDialog'
import { Icon } from '../Icon'

/**
 * Starts over: removes every document, reading result and note from this
 * browser and returns to the owner's Home, so a demo can be run again from the
 * beginning. The original files on the device are not touched.
 */
export function ResetButton() {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const reset = async () => {
    setOpen(false)
    try {
      await clearAllDocuments()
      setRole('owner')
      window.location.hash = '#/'
      // Every screen re-reads storage on load, so a fresh start is one reload away.
      window.location.reload()
    } catch (e) {
      setError(toErrorMessage(e))
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mx-3 flex min-h-10 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm font-medium text-forest-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-300"
      >
        <Icon name="replace" className="size-[18px] shrink-0" />
        Reset and start over
      </button>
      {error && (
        <p role="alert" className="mx-3 mt-1 px-3 text-xs text-red-200">
          {error}
        </p>
      )}
      <ConfirmDialog open={open} title="Reset and start over?" confirmLabel="Reset" onCancel={() => setOpen(false)} onConfirm={() => void reset()}>
        <p>Every document, reading result and note in this browser is removed, and the app returns to the owner’s Home. Files on your device are not affected.</p>
      </ConfirmDialog>
    </>
  )
}
