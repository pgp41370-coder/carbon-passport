import { useState } from 'react'
import { Card } from '../../components/Card'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { Icon, type IconName } from '../../components/Icon'
import { WorkflowModeBanner } from '../../components/WorkflowModeBanner'
import { MAX_FILE_SIZE_MB } from '../../features/documents/config'
import { DocumentList } from '../../features/documents/DocumentList'
import { DropZone } from '../../features/documents/DropZone'
import { formatBytes } from '../../features/documents/fileTypes'
import { SamplePackCard } from '../../features/documents/SamplePackCard'
import { UploadFeedback } from '../../features/documents/UploadFeedback'
import { useDocuments } from '../../features/documents/useDocuments'
import { getPage, pageHref, WORKFLOW_STEP_COUNT } from '../../lib/routes'
import type { WorkflowMode } from '../../types/navigation'

const page = getPage('upload')

const FACTS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'lock',
    title: 'Files stay on this device',
    body: 'Documents are saved in this browser’s local storage (IndexedDB). Nothing is sent to a server.',
  },
  {
    icon: 'hard-drive',
    title: `Up to ${MAX_FILE_SIZE_MB} MB per file`,
    body: 'Large scans are slow to read in the browser and use up its storage allowance. Split or compress bigger files.',
  },
  {
    icon: 'file-text',
    title: 'Stored, not read yet',
    body: 'Files are kept exactly as uploaded. Reading and extracting values happens in the next step, which is not built yet.',
  },
  {
    icon: 'alert',
    title: 'Keep your originals',
    body: 'Clearing browser data or using a private window can remove stored documents.',
  },
]

interface DocumentUploadPageProps {
  mode: WorkflowMode | null
}

export function DocumentUploadPage({ mode }: DocumentUploadPageProps) {
  const docs = useDocuments()
  const [confirmClear, setConfirmClear] = useState(false)

  const isReady = docs.loadState.status === 'ready'
  const hasSamples = docs.documents.some((doc) => doc.origin === 'sample')
  const totalBytes = docs.documents.reduce((sum, doc) => sum + doc.sizeBytes, 0)
  const controlsDisabled = !isReady || docs.busy !== null

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-semibold tracking-wide text-forest-600 uppercase">
          Step {page.step?.number} of {WORKFLOW_STEP_COUNT} · {page.step?.label}
        </p>
        <h1 id="page-title" tabIndex={-1} className="mt-1 text-2xl font-semibold tracking-tight text-forest-950 outline-none sm:text-3xl">
          {page.label}
        </h1>
        <p className="mt-2 max-w-2xl text-ink-600">
          Add the invoices, certificates, challans, bills and logs for your batch. Files are stored in this browser
          only.
        </p>
      </header>

      {mode === 'demo' && (
        <WorkflowModeBanner mode="demo">
          Start by loading the <strong>synthetic sample pack</strong> for batch CP-LDH-2026-001. The walkthrough uses
          these fictional documents.
        </WorkflowModeBanner>
      )}
      {mode === 'workflow' && (
        <WorkflowModeBanner mode="workflow">
          Add the documents for your batch below, or load the synthetic sample pack to explore with fictional data.
        </WorkflowModeBanner>
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <DropZone
            onFiles={docs.addFiles}
            disabled={controlsDisabled}
            busyLabel={
              docs.busy === 'upload'
                ? `Checking and saving ${docs.pending.length} file${docs.pending.length === 1 ? '' : 's'}…`
                : undefined
            }
          />
          <ul className="grid gap-4 sm:grid-cols-2">
            {FACTS.map((fact) => (
              <li key={fact.title} className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-forest-50 text-forest-700">
                  <Icon name={fact.icon} className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">{fact.title}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-600">{fact.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <SamplePackCard
          isLoaded={hasSamples}
          isLoading={docs.busy === 'samples'}
          disabled={controlsDisabled}
          onLoad={docs.loadSamplePack}
        />
      </div>

      {docs.feedback && <UploadFeedback feedback={docs.feedback} onDismiss={docs.dismissFeedback} />}

      <Card
        title="Stored documents"
        aside={
          isReady &&
          docs.documents.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-ink-500 tabular-nums">
                {docs.documents.length} · {formatBytes(totalBytes)}
              </span>
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                disabled={controlsDisabled}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-status-missing ring-1 ring-status-missing/30 transition-colors hover:bg-status-missing/10 focus-visible:outline-2 focus-visible:outline-status-missing disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon name="trash" className="size-3.5" />
                Clear all
              </button>
            </div>
          )
        }
      >
        {docs.loadState.status === 'loading' && <LoadingRows />}

        {docs.loadState.status === 'unavailable' && (
          <div role="alert" className="flex gap-3 rounded-xl border border-status-missing/30 bg-status-missing/[0.06] p-4">
            <Icon name="x-circle" className="mt-0.5 size-5 shrink-0 text-status-missing" />
            <div className="text-sm">
              <p className="font-semibold text-ink-900">Browser storage is unavailable</p>
              <p className="mt-1 text-ink-700">{docs.loadState.message}</p>
            </div>
          </div>
        )}

        {isReady && docs.documents.length === 0 && docs.pending.length === 0 && (
          <div className="rounded-xl border border-dashed border-line px-6 py-10 text-center">
            <span className="mx-auto grid size-11 place-items-center rounded-xl bg-canvas text-ink-400">
              <Icon name="file-text" className="size-5" />
            </span>
            <p className="mt-3 text-sm font-semibold text-ink-900">No documents stored yet</p>
            <p className="mt-1 text-sm text-ink-500">Upload your files or load the synthetic sample pack to get started.</p>
          </div>
        )}

        {isReady && (docs.documents.length > 0 || docs.pending.length > 0) && (
          <DocumentList
            documents={docs.documents}
            pending={docs.pending}
            disabled={docs.busy !== null}
            onRemove={docs.remove}
            onDownload={docs.download}
          />
        )}

        {docs.storage && isReady && (
          <p className="mt-4 text-xs text-ink-500">
            This site is using about {formatBytes(docs.storage.usageBytes)} of browser storage, out of roughly{' '}
            {formatBytes(docs.storage.quotaBytes)} the browser allows. Both figures are browser estimates, and space
            freed by deletions can take a while to show.
          </p>
        )}
      </Card>

      {isReady && docs.documents.length > 0 && (
        <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-line bg-surface p-5 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-semibold text-ink-900">Next: Extraction &amp; Validation</p>
            <p className="mt-0.5 text-sm text-ink-600">
              Read the stored documents in this browser and check them for gaps and conflicts.
            </p>
          </div>
          <a
            href={pageHref('validate', mode ?? undefined)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-forest-700 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
          >
            Continue
            <Icon name="arrow-right" className="size-4" />
          </a>
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        title={`Delete all ${docs.documents.length} stored documents?`}
        confirmLabel="Delete all"
        onCancel={() => setConfirmClear(false)}
        onConfirm={() => {
          setConfirmClear(false)
          void docs.clearAll()
        }}
      >
        <p>
          This permanently removes every stored copy from this browser, including the synthetic sample pack. The
          original files on your device are not affected.
        </p>
      </ConfirmDialog>
    </div>
  )
}

function LoadingRows() {
  return (
    <div aria-busy="true" aria-label="Loading stored documents" className="space-y-2">
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 rounded-xl border border-line px-4 py-3">
          <span className="size-9 rounded-lg bg-canvas" />
          <span className="h-3 flex-1 rounded bg-canvas" />
          <span className="h-3 w-16 rounded bg-canvas" />
        </div>
      ))}
    </div>
  )
}
