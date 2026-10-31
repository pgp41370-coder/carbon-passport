import { useRef, useState } from 'react'
import { Icon } from '../../components/Icon'
import { findSampleFile } from '../../data/samplePack'
import { pageHref } from '../../lib/routes'
import { ACCEPT_ATTRIBUTE } from '../documents/fileTypes'
import type { Finding } from '../passport/findings'
import type { FixGuide } from './fixGuide'
import type { FixRequest } from './useFixActions'

interface FixPanelProps {
  finding: Finding
  guide: FixGuide
  /** True when the workspace holds only the synthetic sample pack. */
  illustrative: boolean
  busy: boolean
  onApply: (request: FixRequest) => void
}

const button =
  'inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500 disabled:cursor-not-allowed disabled:opacity-50'
const primary = `${button} bg-forest-700 text-white hover:bg-forest-800`
const secondary = `${button} bg-white text-forest-800 ring-1 ring-forest-200 hover:bg-forest-50`

export function FixPanel({ finding, guide, illustrative, busy, onApply }: FixPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const replaceTarget = useRef<string | undefined>(undefined)
  const [lang, setLang] = useState<'en' | 'hi'>('en')
  const [copied, setCopied] = useState(false)

  // One Replace button per cited document (a document can be cited for several values).
  const documents = [...new Map(finding.sources.map((s) => [s.source.documentId, s.source.fileName])).entries()]
  const sample = guide.sampleFix && illustrative ? findSampleFile(guide.sampleFix) : undefined

  const pick = (replaceDocumentId?: string) => {
    replaceTarget.current = replaceDocumentId
    fileInput.current?.click()
  }

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="mt-3 space-y-4 rounded-xl bg-forest-50/70 p-4 ring-1 ring-forest-200">
      <p className="flex items-start gap-2 text-sm font-semibold text-forest-950">
        <Icon name="wrench" className="mt-0.5 size-4 shrink-0 text-forest-700" />
        {guide.summary}
      </p>

      {(guide.who || guide.document) && (
        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          {guide.who && (
            <div>
              <dt className="text-xs font-semibold tracking-wide text-ink-600 uppercase">Ask</dt>
              <dd className="mt-0.5 text-ink-900">{guide.who}</dd>
            </div>
          )}
          {guide.document && (
            <div>
              <dt className="text-xs font-semibold tracking-wide text-ink-600 uppercase">Document needed</dt>
              <dd className="mt-0.5 text-ink-900">{guide.document}</dd>
            </div>
          )}
          {guide.mustShow && (
            <div className="sm:col-span-2">
              <dt className="text-xs font-semibold tracking-wide text-ink-600 uppercase">It must show</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {guide.mustShow.map((item) => (
                  <span key={item} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-ink-700 ring-1 ring-line">
                    {item}
                  </span>
                ))}
              </dd>
            </div>
          )}
        </dl>
      )}

      <ol className="space-y-2">
        {guide.steps.map((step, i) => (
          <li key={step} className="flex gap-3 text-sm text-ink-700">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-forest-700 text-xs font-semibold text-white tabular-nums">
              {i + 1}
            </span>
            <span className="pt-0.5">{step}</span>
          </li>
        ))}
      </ol>

      {guide.message && (
        <div className="rounded-xl bg-white p-3 ring-1 ring-line">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-ink-700">
              <Icon name="message" className="size-3.5" />
              Request message
            </p>
            <div role="group" aria-label="Message language" className="inline-flex rounded-lg bg-canvas p-0.5">
              {(['en', 'hi'] as const).map((code) => (
                <button
                  key={code}
                  type="button"
                  aria-pressed={lang === code}
                  onClick={() => setLang(code)}
                  className={`min-h-8 cursor-pointer rounded-md px-3 text-xs font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-forest-500 ${
                    lang === code ? 'bg-white text-forest-800 shadow-sm' : 'text-ink-600 hover:text-ink-900'
                  }`}
                >
                  {code === 'en' ? 'English' : 'हिंदी'}
                </button>
              ))}
            </div>
          </div>
          <p lang={lang} className="mt-2 text-sm leading-relaxed text-ink-900">
            {guide.message[lang]}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={whatsappHref(guide.message[lang])} target="_blank" rel="noopener noreferrer" className={secondary}>
              <Icon name="external" className="size-4" />
              Open in WhatsApp
              <span className="sr-only">(opens WhatsApp in a new tab)</span>
            </a>
            <button type="button" onClick={() => void copy(guide.message![lang])} className={secondary}>
              <Icon name={copied ? 'check' : 'copy'} className="size-4" />
              {copied ? 'Copied' : 'Copy message'}
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-600">
            The app never sends anything. WhatsApp opens with this message filled in; you choose the contact and press send.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {guide.action.kind === 'upload' && (
          <button type="button" disabled={busy} onClick={() => pick()} className={primary}>
            <Icon name="upload" className="size-4" />
            Upload the document
          </button>
        )}
        {(guide.action.kind === 'replace' || guide.action.kind === 'check-source') &&
          documents.map(([id, fileName]) => (
            <button key={id} type="button" disabled={busy} onClick={() => pick(id)} className={secondary} title={`Replace ${fileName}`}>
              <Icon name="replace" className="size-4" />
              <span className="max-w-56 truncate">Replace {shortName(fileName)}</span>
            </button>
          ))}
        {guide.action.kind === 'supply-chain' && (
          <a href={pageHref('traceability')} className={primary}>
            Open Supply chain
            <Icon name="arrow-right" className="size-4" />
          </a>
        )}
        {sample && (
          <button
            type="button"
            disabled={busy}
            onClick={() => onApply({ findingKey: finding.key, sampleKey: guide.sampleFix })}
            className={`${button} bg-status-review/10 text-status-review-ink ring-1 ring-status-review/30 hover:bg-status-review/20`}
          >
            <Icon name="sparkle" className="size-4" />
            Demo: use the sample {sample.title.toLowerCase()}
          </button>
        )}
      </div>
      {sample && (
        <p className="text-xs text-ink-600">
          The demo button adds a fictional document ({sample.description.toLowerCase()}), as if the other party had replied.
        </p>
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

/**
 * WhatsApp click-to-chat link with the message prefilled. With no phone number,
 * WhatsApp asks the user to pick the contact, and the user still presses send.
 */
function whatsappHref(text: string) {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

/** Drops the batch prefix of sample file names so buttons stay short. */
function shortName(fileName: string) {
  return fileName.replace(/^CP-LDH-\d{4}-\d{3}_SAMPLE_/, '')
}
