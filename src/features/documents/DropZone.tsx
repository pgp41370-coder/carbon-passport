import { useEffect, useRef, useState, type DragEvent } from 'react'
import { Icon } from '../../components/Icon'
import { MAX_FILE_SIZE_MB } from './config'
import { ACCEPT_ATTRIBUTE, SUPPORTED_FORMATS_TEXT } from './fileTypes'

interface DropZoneProps {
  onFiles: (files: File[]) => void
  disabled: boolean
  /** Progress text shown while files are being checked and saved. */
  busyLabel?: string
}

function hasFiles(event: DragEvent) {
  return Array.from(event.dataTransfer.types).includes('Files')
}

export function DropZone({ onFiles, disabled, busyLabel }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepth = useRef(0)
  const [isDragging, setIsDragging] = useState(false)

  // Stop the browser from opening a file that is dropped just outside the zone.
  useEffect(() => {
    const prevent = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) event.preventDefault()
    }
    window.addEventListener('dragover', prevent)
    window.addEventListener('drop', prevent)
    return () => {
      window.removeEventListener('dragover', prevent)
      window.removeEventListener('drop', prevent)
    }
  }, [])

  const reset = () => {
    dragDepth.current = 0
    setIsDragging(false)
  }

  return (
    <div
      onDragEnter={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        dragDepth.current++
        setIsDragging(true)
      }}
      onDragOver={(event) => {
        if (!hasFiles(event)) return
        event.preventDefault()
        event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
      }}
      onDragLeave={() => {
        dragDepth.current--
        if (dragDepth.current <= 0) reset()
      }}
      onDrop={(event) => {
        event.preventDefault()
        reset()
        if (!disabled) onFiles(Array.from(event.dataTransfer.files))
      }}
      className={`relative flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors sm:py-14 ${
        isDragging && !disabled
          ? 'border-forest-500 bg-forest-50'
          : 'border-forest-200 bg-surface hover:border-forest-300'
      }`}
    >
      <span
        className={`grid size-14 place-items-center rounded-2xl transition-colors ${
          isDragging ? 'bg-forest-600 text-white' : 'bg-forest-50 text-forest-700'
        }`}
      >
        <Icon name={busyLabel ? 'loader' : 'upload'} className={`size-7 ${busyLabel ? 'animate-spin' : ''}`} />
      </span>

      {busyLabel ? (
        <p className="mt-4 text-base font-semibold text-forest-950" aria-live="polite">
          {busyLabel}
        </p>
      ) : (
        <>
          <p className="mt-4 text-base font-semibold text-forest-950">
            {isDragging ? 'Drop to add files' : 'Drag and drop documents here'}
          </p>
          <p className="mt-1 text-sm text-ink-500">or</p>
        </>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="mt-3 inline-flex items-center gap-2 rounded-xl bg-forest-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name="file-text" className="size-4" />
        Browse files
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          // Reset so choosing the same file again still fires a change event.
          event.target.value = ''
          onFiles(files)
        }}
      />

      <p className="mt-5 text-xs text-ink-500">
        {SUPPORTED_FORMATS_TEXT} · up to {MAX_FILE_SIZE_MB} MB per file · multiple files allowed
      </p>
    </div>
  )
}
