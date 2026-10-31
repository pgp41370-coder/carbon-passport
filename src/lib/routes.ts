import type { PageId, PageRoute, WorkflowMode } from '../types/navigation'
import { toHref } from './router'

export const PAGES: readonly PageRoute[] = [
  {
    id: 'dashboard',
    path: '/',
    label: 'Home',
    summary: 'What is ready, what to fix next, and the four tasks for one batch.',
    nav: 'main',
  },
  {
    id: 'fix',
    path: '/fix',
    label: 'Fix problems',
    summary: 'One problem at a time: what does not match or is missing, and who to ask.',
    nav: 'main',
  },
  {
    id: 'upload',
    path: '/upload',
    label: 'Upload documents',
    nav: 'more',
    summary:
      'Add invoices, mill certificates, job-work challans, bills and logs as PDF, image, CSV or Excel files. Files will be read in your browser only.',
    step: { number: 1, label: 'Upload' },
  },
  {
    id: 'validate',
    path: '/validate',
    label: 'Check documents',
    nav: 'more',
    summary:
      'Review the values extracted from each document, confirm or correct them, and see which checks pass or need attention.',
    step: { number: 2, label: 'Check' },
  },
  {
    id: 'traceability',
    path: '/traceability',
    label: 'Supply chain',
    nav: 'more',
    summary:
      'Follow the batch from the steel heat number through in-house production and the outsourced heat-treatment job-worker.',
    step: { number: 3, label: 'Supply chain' },
  },
  {
    id: 'passport',
    path: '/passport',
    label: 'Passport',
    nav: 'main',
    summary:
      'Assemble a draft carbon passport for the batch, with each figure linked to its source evidence and review status.',
    step: { number: 4, label: 'Passport' },
  },
  {
    id: 'export',
    path: '/export',
    label: 'Download',
    nav: 'more',
    summary:
      'Download the reviewed draft and its evidence index to share with a buyer, clearly marked as not certified.',
    step: { number: 5, label: 'Download' },
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
