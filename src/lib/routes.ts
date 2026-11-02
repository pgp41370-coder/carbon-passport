import type { PageId, PageRoute, WorkflowMode } from '../types/navigation'
import { toHref } from './router'

export const PAGES: readonly PageRoute[] = [
  {
    id: 'dashboard',
    path: '/',
    label: 'Home',
    summary: 'What is ready, what to fix next, and the four tasks for one batch.',
  },
  {
    id: 'fix',
    path: '/fix',
    label: 'Fix problems',
    summary: 'One problem at a time: what does not match or is missing, and who to ask.',
  },
  {
    id: 'upload',
    path: '/upload',
    label: 'Upload documents',
    summary:
      'Add invoices, mill certificates, job-work challans, bills and logs as PDF, image, CSV or Excel files. Files will be read in your browser only.',
    step: { number: 1, label: 'Upload' },
  },
  {
    id: 'validate',
    path: '/validate',
    label: 'Check documents',
    summary:
      'Review the values extracted from each document, confirm or correct them, and see which checks pass or need attention.',
    step: { number: 2, label: 'Check' },
  },
  {
    id: 'traceability',
    path: '/traceability',
    label: 'Supply chain',
    summary:
      'Follow the batch from the steel heat number through in-house production and the outsourced heat-treatment job-worker.',
    step: { number: 3, label: 'Supply chain' },
  },
  {
    id: 'passport',
    path: '/passport',
    label: 'Passport',
    summary:
      'Assemble a draft carbon passport for the batch, with each figure linked to its source evidence and review status.',
    step: { number: 4, label: 'Passport' },
  },
  {
    id: 'review',
    path: '/review',
    label: 'Challenge this batch',
    summary: 'The four questions a buyer or verifier asks, answered from the documents read so far. An evidence review, not a certification.',
  },
  {
    id: 'map',
    path: '/map',
    label: 'Evidence map',
    summary: 'How each paper links the steel to the finished batch, and what depends on each point if a paper is missing or wrong.',
  },
  {
    id: 'emissions',
    path: '/emissions',
    label: 'Emissions preview',
    summary: 'Electricity a bill states, times India’s official grid factor. Illustrative, never part of the passport.',
  },
  {
    id: 'export',
    path: '/export',
    label: 'Download',
    summary:
      'Download the reviewed draft and its evidence index to share with a buyer, clearly marked as not certified.',
    step: { number: 5, label: 'Download' },
  },
  {
    id: 'roadmap',
    path: '/next',
    label: 'Phase 2 & 3 plan',
    summary: 'What comes after the Ludhiana proof: an expert network for consultants, then a workspace for EU importers.',
  },
]

export const WORKFLOW_PAGES = PAGES.filter((page) => page.step !== undefined)

export const WORKFLOW_STEP_COUNT = WORKFLOW_PAGES.length

export function getPage(id: PageId): PageRoute {
  const page = PAGES.find((candidate) => candidate.id === id)
  if (!page) throw new Error(`Unknown page: ${id}`)
  return page
}

/** Unknown paths fall back to the dashboard. */
export function findPageByPath(path: string): PageRoute {
  return PAGES.find((page) => page.path === path) ?? getPage('dashboard')
}

export function parseWorkflowMode(value: string | null): WorkflowMode | null {
  return value === 'demo' || value === 'workflow' ? value : null
}

export function pageHref(id: PageId, mode?: WorkflowMode): string {
  return toHref(getPage(id).path, mode ? { mode } : undefined)
}

/** A page link with query parameters, e.g. the Fix screen opened at one problem. */
export function pageLink(id: PageId, params: Record<string, string | undefined>): string {
  const defined = Object.fromEntries(Object.entries(params).filter((entry): entry is [string, string] => entry[1] !== undefined))
  return toHref(getPage(id).path, defined)
}
