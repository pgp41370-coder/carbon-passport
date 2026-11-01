export type PageId = 'dashboard' | 'fix' | 'views' | 'upload' | 'validate' | 'traceability' | 'passport' | 'emissions' | 'export'

/** How the user entered the workflow: the guided demo or the real passport flow. */
export type WorkflowMode = 'demo' | 'workflow'

export interface PageRoute {
  id: PageId
  /** Hash path, e.g. `/upload` → `#/upload`. */
  path: string
  label: string
  /** One-line description of what the screen is for. */
  summary: string
  /** "main" screens are always in the sidebar; "more" screens sit under a smaller "More" heading. */
  nav: 'main' | 'more'
  /** Present for screens that are a step of Upload → Validate → Trace → Passport → Export. */
  step?: {
    number: number
    label: string
  }
}
