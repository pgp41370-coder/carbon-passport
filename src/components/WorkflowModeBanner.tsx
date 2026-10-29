import type { ReactNode } from 'react'
import type { WorkflowMode } from '../types/navigation'
import { Icon } from './Icon'

interface WorkflowModeBannerProps {
  mode: WorkflowMode
  children: ReactNode
}

const TITLES: Record<WorkflowMode, string> = {
  demo: 'Guided demo',
  workflow: 'Carbon passport workflow',
}

/** Shown when the user arrives from a dashboard call-to-action. */
export function WorkflowModeBanner({ mode, children }: WorkflowModeBannerProps) {
  return (
    <div role="status" className="flex gap-3 rounded-2xl border border-forest-200 bg-forest-50 p-4 sm:p-5">
      <Icon name={mode === 'demo' ? 'play' : 'check'} className="mt-0.5 size-5 shrink-0 text-forest-700" />
      <div className="text-sm">
        <p className="font-semibold text-forest-900">{TITLES[mode]}</p>
        <div className="mt-1 text-forest-800">{children}</div>
      </div>
    </div>
  )
}
