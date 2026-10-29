import type { ReactNode } from 'react'
import { Icon, type IconName } from '../../components/Icon'
import { findSampleFile } from '../../data/samplePack'
import type { DocumentFormat, StoredDocument } from '../../types/document'
import { FORMAT_SPECS, formatBytes } from './fileTypes'
import type { PendingFile } from './useDocuments'

const FORMAT_ICON: Record<DocumentFormat, IconName> = {
  pdf: 'file-text',
  png: 'file-image',
  jpeg: 'file-image',
  csv: 'file-sheet',
  xlsx: 'file-sheet',
  xls: 'file-sheet',
}

const FORMAT_SHORT: Record<DocumentFormat, string> = {
  pdf: 'PDF',
  png: 'PNG',
  jpeg: 'JPEG',
  csv: 'CSV',
  xlsx: 'XLSX',
  xls: 'XLS',
}

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

// Shared column template so the header lines up with the rows on wider screens.
const ROW_GRID =
  'grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-1 @4xl:grid-cols-[auto_minmax(0,1fr)_4.5rem_4.5rem_11rem_8rem_5.5rem] @4xl:items-center'

interface DocumentListProps {
  documents: readonly StoredDocument[]
  pending: readonly PendingFile[]
  disabled: boolean
  onRemove: (document: StoredDocument) => void
  onDownload: (document: StoredDocument) => void
}

export function DocumentList({ documents, pending, disabled, onRemove, onDownload }: DocumentListProps) {
  const userDocuments = documents.filter((doc) => doc.origin === 'user')
  const sampleDocuments = documents.filter((doc) => doc.origin === 'sample')

  return (
    <div className="@container space-y-6">
      <div
        aria-hidden="true"
        className={`${ROW_GRID} hidden border-b border-line px-4 pb-2 text-xs font-medium text-ink-500 @4xl:grid`}
      >
        <span className="col-span-2">Document</span>
        <span>Type</span>
        <span>Size</span>
        <span>Added</span>
        <span>Storage</span>
        <span className="text-right">Actions</span>
      </div>

      {(userDocuments.length > 0 || pending.length > 0) && (
        <DocumentGroup title="Your uploads" count={userDocuments.length}>
          {pending.map((file) => (
            <PendingRow key={file.key} file={file} />
          ))}
          {userDocuments.map((doc) => (
            <DocumentRow key={doc.id} document={doc} disabled={disabled} onRemove={onRemove} onDownload={onDownload} />
          ))}
        </DocumentGroup>
      )}

      {sampleDocuments.length > 0 && (
        <DocumentGroup
          title="Synthetic sample pack"
          count={sampleDocuments.length}
          note="Fictional documents created for the demo. Not real business records."
          tone="sample"
        >
          {sampleDocuments.map((doc) => (
            <DocumentRow key={doc.id} document={doc} disabled={disabled} onRemove={onRemove} onDownload={onDownload} />
          ))}
        </DocumentGroup>
      )}
    </div>
  )
}

interface DocumentGroupProps {
  title: string
  count: number
  note?: string
  tone?: 'user' | 'sample'
  children: ReactNode
}

function DocumentGroup({ title, count, note, tone = 'user', children }: DocumentGroupProps) {
  const headingId = `group-${tone}`
  return (
    <section aria-labelledby={headingId}>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 px-1">
        <h3 id={headingId} className="text-sm font-semibold text-ink-900">
          {title}
        </h3>
        <span className="text-xs text-ink-500 tabular-nums">{count}</span>
        {note && <span className="text-xs text-status-review-ink">· {note}</span>}
      </div>
      <ul
        className={`divide-y divide-line overflow-hidden rounded-xl border ${
          tone === 'sample' ? 'border-status-review/30' : 'border-line'
        }`}
      >
        {children}
      </ul>
    </section>
  )
}

function OriginTag({ origin }: { origin: StoredDocument['origin'] }) {
  return origin === 'sample' ? (
    <span className="inline-flex shrink-0 items-center rounded-full border border-status-review/30 bg-status-review/10 px-2 py-0.5 text-[11px] font-semibold text-status-review-ink">
      Synthetic sample
    </span>
  ) : (
    <span className="inline-flex shrink-0 items-center rounded-full bg-forest-50 px-2 py-0.5 text-[11px] font-semibold text-forest-700 ring-1 ring-forest-100">
      Your upload
    </span>
  )
}

interface DocumentRowProps {
  document: StoredDocument
  disabled: boolean
  onRemove: (document: StoredDocument) => void
  onDownload: (document: StoredDocument) => void
}

function DocumentRow({ document, disabled, onRemove, onDownload }: DocumentRowProps) {
  const isSample = document.origin === 'sample'
  const sample = findSampleFile(document.sampleKey)
  const addedAt = new Date(document.addedAt)
  const renamed = document.fileName !== document.originalFileName

  return (
    <li className={`${ROW_GRID} px-4 py-3 ${isSample ? 'bg-status-review/[0.03]' : 'bg-surface'}`}>
      <span
        className={`grid size-9 place-items-center rounded-lg ${
          isSample ? 'bg-status-review/10 text-status-review-ink' : 'bg-forest-50 text-forest-700'
        }`}
      >
        <Icon name={FORMAT_ICON[document.format]} className="size-[18px]" />
      </span>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <p className="min-w-0 truncate text-sm font-medium text-ink-900" title={document.fileName}>
            {document.fileName}
          </p>
          <OriginTag origin={document.origin} />
        </div>
        {sample && <p className="mt-0.5 text-xs text-ink-500">{sample.description}</p>}
        {renamed && (
          <p className="mt-0.5 text-xs text-status-review-ink">
            Renamed from “{document.originalFileName}” because that name was already stored
          </p>
        )}
        {/* Compact metadata for small screens; wider screens use the columns. */}
        <p className="mt-1 text-xs text-ink-500 @4xl:hidden">
          {FORMAT_SHORT[document.format]} · {formatBytes(document.sizeBytes)} ·{' '}
          <time dateTime={document.addedAt}>{dateFormatter.format(addedAt)}</time>
        </p>
        <p className="mt-1 @4xl:hidden">
          <StoredStatus />
        </p>
      </div>

      <span className="hidden text-sm text-ink-700 @4xl:block" title={FORMAT_SPECS[document.format].label}>
        <span className="sr-only">Type: </span>
        {FORMAT_SHORT[document.format]}
      </span>
      <span className="hidden text-sm text-ink-700 tabular-nums @4xl:block">
        <span className="sr-only">Size: </span>
        {formatBytes(document.sizeBytes)}
      </span>
      <span className="hidden text-sm text-ink-700 @4xl:block">
        <span className="sr-only">Added: </span>
        <time dateTime={document.addedAt}>{dateFormatter.format(addedAt)}</time>
      </span>
      <span className="hidden @4xl:block">
        <StoredStatus />
      </span>

      <div className="flex justify-end gap-1">
        <IconButton
          icon="download"
          label={`Download stored copy of ${document.fileName}`}
          disabled={disabled}
          onClick={() => onDownload(document)}
        />
        <IconButton
          icon="trash"
          label={`Remove ${document.fileName}`}
          disabled={disabled}
          onClick={() => onRemove(document)}
          danger
        />
      </div>
    </li>
  )
}

function StoredStatus() {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-status-verified">
      <Icon name="check-circle" className="size-4" />
      Stored locally
    </span>
  )
}

function PendingRow({ file }: { file: PendingFile }) {
  return (
    <li className={`${ROW_GRID} bg-surface px-4 py-3`} aria-busy="true">
      <span className="grid size-9 place-items-center rounded-lg bg-canvas text-ink-400">
        <Icon name="loader" className="size-[18px] animate-spin" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-ink-700">{file.fileName}</p>
        <p className="mt-1 text-xs text-ink-500 @4xl:hidden">
          {formatBytes(file.sizeBytes)} · {file.state === 'checking' ? 'Checking file…' : 'Saving…'}
        </p>
      </div>
      <span className="hidden @4xl:block" />
      <span className="hidden text-sm text-ink-500 tabular-nums @4xl:block">{formatBytes(file.sizeBytes)}</span>
      <span className="hidden @4xl:block" />
      <span className="hidden text-xs font-medium text-ink-500 @4xl:block">
        {file.state === 'checking' ? 'Checking file…' : 'Saving…'}
      </span>
      <span />
    </li>
  )
}

interface IconButtonProps {
  icon: IconName
  label: string
  onClick: () => void
  disabled: boolean
  danger?: boolean
}

function IconButton({ icon, label, onClick, disabled, danger }: IconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className={`grid size-9 place-items-center rounded-lg text-ink-500 transition-colors focus-visible:outline-2 focus-visible:outline-forest-500 disabled:cursor-not-allowed disabled:opacity-40 ${
        danger ? 'hover:bg-status-missing/10 hover:text-status-missing' : 'hover:bg-forest-50 hover:text-forest-700'
      }`}
    >
      <Icon name={icon} className="size-[18px]" />
      <span className="sr-only">{label}</span>
    </button>
  )
}
