/** Button styles shared by the verifier review and the evidence map, matching the Fix screen. */
const base =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500 disabled:cursor-not-allowed disabled:opacity-50'

export const primaryButton = `${base} min-h-12 px-5 text-base bg-forest-700 text-white hover:bg-forest-800`
export const secondaryButton = `${base} min-h-11 px-4 text-sm bg-white text-forest-800 ring-1 ring-forest-200 hover:bg-forest-50`
export const quietButton = `${base} min-h-10 px-3 text-sm text-ink-700 hover:bg-canvas`
export const sourceLink =
  'inline-flex min-h-9 cursor-pointer items-center gap-1 text-sm font-semibold text-forest-700 hover:text-forest-900 focus-visible:outline-2 focus-visible:outline-forest-500'
