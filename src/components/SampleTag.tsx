interface SampleTagProps {
  label?: string
}

/** Marks a value as illustrative sample data, not something read from documents. */
export function SampleTag({ label = 'Illustrative sample' }: SampleTagProps) {
  return (
    <span className="inline-flex items-center rounded-full border border-status-review/30 bg-status-review/10 px-2 py-0.5 text-xs font-medium text-status-review-ink">
      {label}
    </span>
  )
}
