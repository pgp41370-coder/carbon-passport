import type { CarbonPassport, Claim } from '../../types/passport'
import { TRACE_STATUS } from '../traceability/traceStatus'
import { CLAIM_LABELS, PASSPORT_DISCLAIMER, sourceText, STATUS_LABELS } from './passportLabels'

/**
 * Exports render the same CarbonPassport object as the screen, so statuses,
 * sources, assumptions and gaps cannot differ between them. Generated entirely
 * in the browser; nothing is uploaded.
 */

export const EXPORT_FORMAT = 'carbon-passport-draft'
export const EXPORT_VERSION = 1

export function exportFileName(passport: CarbonPassport, extension: 'json' | 'html') {
  return `carbon-passport-DRAFT_${passport.batchId}_${passport.generatedAt.slice(0, 10)}.${extension}`
}

export function passportToJson(passport: CarbonPassport): string {
  return JSON.stringify(
    {
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      draft: true,
      certified: false,
      verified: false,
      disclaimer: PASSPORT_DISCLAIMER,
      statusLabels: passport.statuses.map((s) => STATUS_LABELS[s]),
      ...passport,
    },
    null,
    2,
  )
}

const escape = (value: unknown) =>
  String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

function claimRows(claims: readonly Claim[]): string {
  return claims
    .map(
      (c) => `<tr>
  <th scope="row">${escape(c.label)}</th>
  <td class="value">${c.value ? escape(c.value) : '<em>Not established</em>'}</td>
  <td><span class="kind kind-${c.kind}">${escape(CLAIM_LABELS[c.kind].label)}</span></td>
  <td>${c.sources.length ? c.sources.map((s) => `<div>${escape(sourceText(s))}</div>`).join('') : '—'}${c.note ? `<div class="note">${escape(c.note)}</div>` : ''}</td>
</tr>`,
    )
    .join('\n')
}

const claimTable = (claims: readonly Claim[]) => `<table>
<thead><tr><th>Item</th><th>Value</th><th>Status</th><th>Source and notes</th></tr></thead>
<tbody>${claimRows(claims)}</tbody>
</table>`

const list = (items: readonly string[]) => `<ul>${items.map((i) => `<li>${escape(i)}</li>`).join('')}</ul>`

export function passportToHtml(passport: CarbonPassport): string {
  const generated = new Date(passport.generatedAt).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' })
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>DRAFT Carbon Passport ${escape(passport.batchId)}</title>
<style>
  :root { --forest: #1b553b; --ink: #151a18; --muted: #4d5652; --line: #e3e7e2; --amber: #8a5a12; --red: #b42318; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 14px/1.5 system-ui, -apple-system, 'Segoe UI', sans-serif; color: var(--ink); background: #f7f8f5; }
  main { max-width: 960px; margin: 0 auto; padding: 32px 20px 64px; background: #fff; }
  h1 { margin: 0; font-size: 26px; color: #081c15; }
  h2 { margin: 32px 0 8px; font-size: 17px; color: var(--forest); border-bottom: 2px solid var(--line); padding-bottom: 4px; }
  .banner { border: 2px solid var(--red); color: var(--red); background: #fdf3f2; padding: 10px 14px; border-radius: 8px; font-weight: 700; margin: 16px 0; }
  .disclaimer { color: var(--muted); }
  .badges span { display: inline-block; margin: 0 6px 6px 0; padding: 2px 10px; border-radius: 999px; border: 1px solid var(--line); font-size: 12px; font-weight: 600; }
  table { width: 100%; border-collapse: collapse; margin: 8px 0; font-size: 13px; }
  th, td { text-align: left; vertical-align: top; padding: 6px 8px; border-bottom: 1px solid var(--line); }
  thead th { background: #eef7f1; font-size: 12px; color: var(--muted); }
  .value { font-family: ui-monospace, Menlo, monospace; font-weight: 600; }
  .note { color: var(--muted); font-size: 12px; margin-top: 2px; }
  .kind { font-size: 11px; font-weight: 700; padding: 1px 8px; border-radius: 999px; white-space: nowrap; }
  .kind-extracted, .kind-supported { background: #eef7f1; color: var(--forest); }
  .kind-needs_review { background: #fbf3e4; color: var(--amber); }
  .kind-derived, .kind-assumption, .kind-proposed { background: #f1f2f0; color: var(--muted); }
  .kind-missing { background: #fdf0ef; color: var(--red); }
  .calc { border: 2px solid var(--amber); background: #fbf6ec; padding: 12px 14px; border-radius: 8px; }
  .calc strong { color: var(--amber); }
  .sample { color: var(--amber); font-weight: 600; }
  @media print { body { background: #fff; } main { padding: 0; } .banner { break-inside: avoid; } }
</style>
</head>
<body>
<main>
<p class="sample">${passport.illustrative ? 'ILLUSTRATIVE: every supporting document is from the synthetic sample pack (fictional data).' : ''}</p>
<h1>Carbon Passport (DRAFT) · Batch ${escape(passport.batchId)}</h1>
<p>Generated ${escape(generated)} in the Carbon Passport prototype.</p>
<div class="banner">DRAFT, NOT CERTIFIED. No carbon footprint has been calculated.</div>
<p class="disclaimer">${escape(PASSPORT_DISCLAIMER)}</p>
<div class="badges">${passport.statuses.map((s) => `<span>${escape(STATUS_LABELS[s])}</span>`).join('')}</div>

<h2>1. Batch identity and product</h2>
${claimTable(passport.identity)}

<h2>2. Supply-chain stages and hand-offs</h2>
<table><thead><tr><th>Stage</th><th>Status</th><th>Summary</th></tr></thead><tbody>
${passport.stages.map((s) => `<tr><th scope="row">${s.order}. ${escape(s.title)}</th><td><span class="kind">${escape(TRACE_STATUS[s.status].label)}</span></td><td>${escape(s.headline)}${s.requirements.map((r) => `<div class="note">${escape(r.label)}: ${escape(TRACE_STATUS[r.status].label)}. ${escape(r.detail)}</div>`).join('')}</td></tr>`).join('\n')}
</tbody></table>
<table><thead><tr><th>Hand-off</th><th>Status</th><th>Reference</th><th>Sources</th><th>Next action</th></tr></thead><tbody>
${passport.links.map((l) => `<tr><th scope="row">${escape(l.title)}</th><td><span class="kind">${escape(TRACE_STATUS[l.status].label)}</span></td><td>${escape(l.reference)}</td><td>${l.evidence.map((e) => `<div>${escape(e.label)}: <span class="value">${escape(e.value ?? '')}</span>${e.source ? ` · ${escape(sourceText({ ...e.source, origin: e.origin }))}` : ''}</div>`).join('') || '—'}</td><td>${escape(l.nextAction)}</td></tr>`).join('\n')}
</tbody></table>

<h2>3. Production quantity and reporting boundary</h2>
${claimTable(passport.quantities)}
${claimTable(passport.boundary)}

<h2>4. Energy and activity data</h2>
${claimTable(passport.energy)}

<h2>5. Carbon calculation status</h2>
<div class="calc"><strong>${escape(passport.calculation.headline)}</strong>
<p>Required before any batch footprint can be calculated:</p>
<ul>${passport.calculation.prerequisites.map((p) => `<li>${p.met ? 'Met' : 'Not met'}: ${escape(p.label)}. ${escape(p.detail)}</li>`).join('')}</ul></div>

<h2>6. Open issues, gaps and reviewer actions</h2>
${passport.issues.length ? passport.issues.map((i) => `<h3>${escape(i.severity.toUpperCase())}: ${escape(i.title)}</h3><p>${escape(i.detail)}</p>${claimTable(i.evidence)}${i.review ? `<p class="note">Review recorded (not verification): ${escape(i.review.action)}. ${escape(i.review.note)}</p>` : '<p class="note">No review recorded.</p>'}`).join('\n') : '<p>No open validation issues.</p>'}
<h3>What is still missing</h3>
${passport.gaps.length ? list(passport.gaps.map((g) => `${TRACE_STATUS[g.status].label}: ${g.text}`)) : '<p>No gaps found.</p>'}
<h3>Reviewer actions</h3>
${passport.reviewerActions.length ? list(passport.reviewerActions.map((a) => `${a.scope}: ${a.kind === 'trace_proposal' ? 'proposed link (not source-backed)' : 'review note'}${a.reference ? ` "${a.reference}"` : ''}: "${a.note}"${a.reviewer ? `, ${a.reviewer}` : ''}${a.applies ? '' : ' [NO LONGER APPLIES: evidence changed]'}`)) : '<p>None recorded.</p>'}
${passport.excludedDocuments.length ? `<h3>Documents not used</h3>${list(passport.excludedDocuments.map((d) => `${d.fileName}: ${d.reason}`))}` : ''}

<h2>7. Evidence register</h2>
${passport.evidence.map((row) => `<h3>${escape(row.fileName)} · ${escape(row.documentType)}${row.origin === 'sample' ? ' · synthetic sample' : ''}</h3>${claimTable(row.claims)}`).join('\n')}

<h2>8. Methodology, assumptions and limitations</h2>
<h3>How this draft was produced</h3>${list(passport.methodology)}
<h3>Assumptions</h3>${passport.assumptions.length ? list(passport.assumptions) : '<p>None.</p>'}
<h3>Limitations</h3>${list(passport.limitations)}
<div class="banner">DRAFT, NOT CERTIFIED · Batch ${escape(passport.batchId)} · ${escape(generated)}</div>
</main>
</body>
</html>
`
}

/** Saves a generated export to the user's device. The file is built locally; nothing is uploaded. */
export function downloadText(content: string, fileName: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/**
 * Opens the browser's print dialog for the HTML export (choose "Save as PDF"),
 * using a hidden same-origin iframe so exactly the exported document is printed.
 */
export function printPassportHtml(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe')
    frame.setAttribute('aria-hidden', 'true')
    frame.tabIndex = -1
    Object.assign(frame.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' })
    frame.onload = () => {
      const win = frame.contentWindow
      if (!win) {
        frame.remove()
        reject(new Error('The print preview could not be prepared.'))
        return
      }
      win.addEventListener('afterprint', () => setTimeout(() => frame.remove(), 500))
      win.focus()
      win.print()
      resolve()
    }
    frame.srcdoc = html
    document.body.appendChild(frame)
  })
}
