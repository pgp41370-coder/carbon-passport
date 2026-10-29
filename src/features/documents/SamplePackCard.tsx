import { Card } from '../../components/Card'
import { Icon } from '../../components/Icon'
import { SampleTag } from '../../components/SampleTag'
import { SAMPLE_PACK_BATCH_ID, SAMPLE_PACK_FILES, SAMPLE_PACK_OMISSION } from '../../data/samplePack'

interface SamplePackCardProps {
  isLoaded: boolean
  isLoading: boolean
  disabled: boolean
  onLoad: () => void
}

export function SamplePackCard({ isLoaded, isLoading, disabled, onLoad }: SamplePackCardProps) {
  return (
    <Card title="Synthetic sample pack" aside={<SampleTag label="Synthetic" />}>
      <p className="text-sm text-ink-600">
        {SAMPLE_PACK_FILES.length} fictional documents for steel-fastener batch{' '}
        <span className="font-mono text-xs font-medium text-ink-900">{SAMPLE_PACK_BATCH_ID}</span>, with an outsourced
        heat-treatment job-worker. Each file is marked “synthetic sample” and is not a real business record.
      </p>

      <ul className="mt-4 space-y-2">
        {SAMPLE_PACK_FILES.map((file) => (
          <li key={file.key} className="flex items-start gap-2 text-sm">
            <Icon name="check" className="mt-0.5 size-4 shrink-0 text-forest-500" />
            <span className="text-ink-700">{file.title}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-ink-500">{SAMPLE_PACK_OMISSION}</p>

      <button
        type="button"
        onClick={onLoad}
        disabled={disabled}
        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-forest-950 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Icon name={isLoading ? 'loader' : 'package'} className={`size-4 ${isLoading ? 'animate-spin' : 'text-moss-400'}`} />
        {isLoading ? 'Loading sample pack…' : isLoaded ? 'Reload Sample Pack' : 'Load Sample Pack'}
      </button>
      {isLoaded && !isLoading && (
        <p className="mt-2 text-center text-xs text-ink-500">Reloading replaces the sample copies only. Your uploads stay.</p>
      )}
    </Card>
  )
}
