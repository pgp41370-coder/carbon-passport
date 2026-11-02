import type { IconName } from '../../components/Icon'
import type { MapStatus } from './evidenceMap'

/**
 * One palette for the review and the map. Each state also has its own icon and
 * word, so nothing is read from colour alone. Red is kept for two documents that
 * disagree; a paper that is simply absent is grey.
 */
export const MAP_STATUS: Record<
  MapStatus,
  { label: string; meaning: string; icon: IconName; text: string; chip: string; dot: string; node: string; edge: string }
> = {
  supported: {
    label: 'Supported',
    meaning: 'A document backs this, with a line or cell you can open.',
    icon: 'check-circle',
    text: 'text-forest-700',
    chip: 'bg-forest-50 text-forest-700 ring-forest-200',
    dot: 'bg-forest-500',
    node: 'ring-forest-200',
    edge: 'border-forest-400',
  },
  review: {
    label: 'Needs review',
    meaning: 'A document exists, but a person has to confirm it.',
    icon: 'alert',
    text: 'text-status-review-ink',
    chip: 'bg-status-review/10 text-status-review-ink ring-status-review/30',
    dot: 'bg-status-review',
    node: 'ring-status-review/40',
    edge: 'border-status-review/70 border-dashed',
  },
  conflict: {
    label: 'Discrepancy',
    meaning: 'Two documents give different values.',
    icon: 'x-circle',
    text: 'text-status-missing',
    chip: 'bg-status-missing/[0.07] text-status-missing ring-status-missing/30',
    dot: 'bg-status-missing',
    node: 'ring-status-missing/50',
    edge: 'border-status-missing',
  },
  missing: {
    label: 'Missing',
    meaning: 'No document yet. Nothing is assumed in its place.',
    icon: 'circle-dashed',
    text: 'text-ink-600',
    chip: 'bg-canvas text-ink-600 ring-line',
    dot: 'bg-ink-400',
    node: 'ring-line',
    edge: 'border-ink-400/60 border-dashed',
  },
}
