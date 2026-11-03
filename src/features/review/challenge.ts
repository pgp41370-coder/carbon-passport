import type { ExtractionResult } from '../../types/extraction'
import type { CarbonPassport } from '../../types/passport'
import { fixContext, fixGuideFor } from '../fixes/fixGuide'
import { batchEstimate } from '../passport/batchEstimate'
import { groupFindings, type Finding } from '../passport/findings'
import { buildEvidenceMap, type Conflict, type EvidenceMap, type MapNode, type MapStatus } from './evidenceMap'

/**
 * The four questions a buyer or verifier asks of a batch, answered only from
 * the documents read and the checks already run. This is an evidence review:
 * it never says verified, certified or compliant, because the app cannot know that.
 */

export interface ChecklistItem {
  key: string
  stage: string
  label: string
  status: MapStatus
  detail: string
}

export interface RelianceReason {
  text: string
  tone: MapStatus
}

/** Every answer carries a status and the short word shown for it. */
interface Answer {
  status: MapStatus
  label: string
}

export interface Challenge {
  map: EvidenceMap
  origin: Answer & { trail: MapNode[]; answer: string }
  completeness: Answer & { items: ChecklistItem[]; found: number; check: number; missing: number; total: number; answer: string }
  contradictions: Answer & { conflicts: Conflict[]; otherProblems: Finding[]; answer: string }
  reliance: Answer & { verdict: string; reasons: RelianceReason[]; prerequisitesMet: number; prerequisitesTotal: number }
  summary: {
    brokenLinks: number
    totalLinks: number
    next: { text: string; findingKey?: string }
  }
}

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const list = (items: string[]) => (items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`)
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function buildChallenge(passport: CarbonPassport, resultsById: Record<string, ExtractionResult>): Challenge {
  const map = buildEvidenceMap(passport, resultsById)
  const findings = groupFindings(passport)
  const ctx = fixContext(passport)

  // 1 · Where did this steel come from? The chain up to the job-worker.
  const trail = map.nodes.filter((n) => n.id !== 'finished')
  const heat = map.nodes.find((n) => n.id === 'certificate')?.values.find((v) => v.label === 'Heat no.')?.value
  const breaks = trail.filter((n) => n.status === 'conflict' && n.id !== 'certificate')
  const gaps = trail.filter((n) => n.status === 'missing')
  // A point with no paper at all, versus one that has papers but still lacks a required one.
  const empty = gaps.filter((n) => n.documents.length === 0)
  const partial = gaps.filter((n) => n.documents.length > 0)
  const checks = trail.filter((n) => n.status === 'review')
  const originParts = [
    heat ? `Mill certificate gives heat no. ${heat}.` : 'No heat number has been read from a mill certificate.',
    breaks.length ? `The trail breaks at ${list(breaks.map((n) => lower(n.title)))}, where the paper gives a different heat number.` : '',
    empty.length ? `No paper yet for ${list(empty.map((n) => lower(n.title)))}.` : '',
    ...partial.map(
      (n) => `${n.title} still lacks ${list(n.requirements.filter((r) => r.status === 'missing').map((r) => lower(r.label)))}.`,
    ),
    !breaks.length && !gaps.length && checks.length ? `${list(checks.map((n) => n.title))} still need${checks.length === 1 ? 's' : ''} a person to check.` : '',
    heat && !breaks.length && !gaps.length && !checks.length ? 'Every step carries the same heat number.' : '',
  ]

  // 2 · Is the batch evidence complete? Every traceability requirement, as already counted on Home.
  const items: ChecklistItem[] = [
    ...findings.found.map((f) => item(f, 'supported')),
    ...findings.check.map((f) => item(f, 'review')),
    ...findings.missing.map((f) => item(f, 'missing')),
  ]
  const order = passport.stages.map((s) => s.title)
  items.sort((a, b) => order.indexOf(a.stage) - order.indexOf(b.stage))
  const total = items.length
  const found = findings.found.length
  const check = findings.check.length
  const missing = findings.missing.length

  // 3 · Is any evidence contradictory? Only documents that actually disagree.
  const conflictKeys = new Set(map.conflicts.map((c) => c.finding.key))
  const otherProblems = findings.problems.filter((f) => !conflictKeys.has(f.key))

  // 4 · Can it be relied on for actual emissions data?
  const prerequisites = passport.calculation.prerequisites
  const met = prerequisites.filter((p) => p.met).length
  const reasons: RelianceReason[] = []
  if (map.conflicts.length)
    reasons.push({ tone: 'conflict', text: `Traceability needs review: ${plural(map.conflicts.length, 'pair')} of documents disagree (${list(map.conflicts.map((c) => lower(c.issue.title)))}).` })
  const missingNames = findings.missing.map((f) => lower(f.title))
  if (missing)
    reasons.push({ tone: 'missing', text: `Supporting documents missing: ${list(missing > 3 ? [...missingNames.slice(0, 3), `${missing - 3} more`] : missingNames)}.` })
  // A check that only repeats a missing item (e.g. no job-worker energy record) is already counted above.
  const missingTopics = new Set(findings.missing.map((f) => f.topic))
  const extraProblems = otherProblems.filter((f) => !missingTopics.has(f.topic))
  if (extraProblems.length) reasons.push({ tone: 'review', text: `${plural(extraProblems.length, 'other problem')} raised by the checks: ${list(extraProblems.map((f) => lower(f.title)))}.` })
  if (check) reasons.push({ tone: 'review', text: `${plural(check, 'item')} need${check === 1 ? 's' : ''} a person to check before it can be relied on.` })
  const estimate = batchEstimate(passport)
  if (estimate.total !== undefined)
    reasons.push({
      tone: 'supported',
      text: `Carbon estimate worked out: ${estimate.total} tCO₂e${estimate.perTonne !== undefined ? ` (${estimate.perTonne} per tonne)` : ''}, from the papers, the EU default value for the steel and the CEA grid factor. It is an estimate, not verified.`,
    })
  else reasons.push({ tone: 'missing', text: `No carbon estimate yet for this batch: ${met} of ${prerequisites.length} things it needs are in place.` })

  const blocked = map.conflicts.length > 0 || missing > 0 || otherProblems.length > 0
  const reliance = {
    verdict: blocked
      ? 'Not yet. The evidence is incomplete.'
      : check
        ? 'Not yet. Some evidence still needs a person to check it.'
        : 'The papers are complete for a draft. An independent verifier still has to check them.',
    status: (map.conflicts.length ? 'conflict' : blocked ? 'missing' : check ? 'review' : 'supported') as MapStatus,
    label: blocked || check ? 'Not yet' : 'Ready for review',
    reasons,
    prerequisitesMet: met,
    prerequisitesTotal: prerequisites.length,
  }

  // Summary: what to do first. A disagreement before a missing paper before a check.
  const first = map.conflicts[0]?.finding ?? otherProblems[0] ?? findings.missing[0] ?? findings.check[0]
  const brokenLinks = map.edges.filter((e) => e.status === 'conflict' || e.status === 'missing').length

  return {
    map,
    origin: {
      trail,
      answer: originParts.filter(Boolean).join(' '),
      status: breaks.length ? 'conflict' : gaps.length ? 'missing' : checks.length ? 'review' : 'supported',
      label: breaks.length ? 'Trail breaks' : gaps.length ? 'Gaps in trail' : checks.length ? 'Needs review' : 'Traced',
    },
    completeness: {
      items,
      found,
      check,
      missing,
      total,
      answer: `${found} of ${total} required items are backed by a document${check ? ` · ${check} to check` : ''}${missing ? ` · ${missing} missing` : ''}.`,
      status: missing ? 'missing' : check ? 'review' : 'supported',
      label: missing ? 'Incomplete' : check ? 'Needs review' : 'Complete',
    },
    contradictions: {
      conflicts: map.conflicts,
      otherProblems,
      answer: map.conflicts.length
        ? `Yes. ${plural(map.conflicts.length, 'contradiction')} between documents: ${list(map.conflicts.map((c) => lower(c.issue.title)))}.`
        : 'No two documents read so far give different values for the same thing.',
      status: map.conflicts.length ? 'conflict' : 'supported',
      label: map.conflicts.length ? `${map.conflicts.length} found` : 'None found',
    },
    reliance,
    summary: {
      brokenLinks,
      totalLinks: map.edges.length,
      next: first
        ? { text: fixGuideFor(first, ctx).summary, findingKey: first.key }
        : { text: 'Download the draft and send it for an independent review.' },
    },
  }
}

function item(f: Finding, status: MapStatus): ChecklistItem {
  return { key: f.key, stage: f.where ?? '', label: f.title, status, detail: f.detail }
}
