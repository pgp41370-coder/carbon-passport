import { Icon } from '../../components/Icon'

interface SampleDataDisclaimerProps {
  /** True when every document behind the figures is from the synthetic sample pack. */
  illustrative: boolean
  hasDocuments: boolean
}

export function SampleDataDisclaimer({ illustrative, hasDocuments }: SampleDataDisclaimerProps) {
  return (
    <aside
      aria-labelledby="sample-disclaimer-title"
      className="flex gap-3 rounded-2xl border border-status-review/30 bg-status-review/[0.07] p-4 sm:p-5"
    >
      <Icon name="info" className="mt-0.5 size-5 shrink-0 text-status-review-ink" />
      <div className="text-sm text-ink-700">
        <p id="sample-disclaimer-title" className="font-semibold text-ink-900">
          {illustrative ? 'Demonstration with the synthetic sample pack' : 'Draft evidence workspace'}
        </p>
        <p className="mt-1">
          {!hasDocuments
            ? 'No documents are stored yet, so nothing below is filled in. '
            : illustrative
              ? 'Every figure below is read from fictional sample documents for a demonstration batch. '
              : 'Figures below are read from the documents stored in this browser. '}
          This is not a verified carbon certificate or third-party assurance, and no carbon footprint is calculated. Every
          passport this tool produces is a draft that requires human review.
        </p>
      </div>
    </aside>
  )
}
