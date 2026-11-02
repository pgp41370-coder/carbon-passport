export type PageId = 'dashboard' | 'fix' | 'upload' | 'validate' | 'traceability' | 'passport' | 'emissions' | 'export' | 'review' | 'map' | 'roadmap'

/** How the user entered the workflow: the guided demo or the real passport flow. */
export type WorkflowMode = 'demo' | 'workflow'

export interface PageRoute {
  id: PageId
  /** Hash path, e.g. `/upload` → `#/upload`. */
  path: string
  label: string
  /** One-line description of what the screen is for. */
  summary: string
  /** Present for screens that are a step of Upload → Validate → Trace → Passport → Export. */
  step?: {
    number: number
    label: string
  }
}
