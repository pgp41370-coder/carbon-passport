import type { ReactNode } from 'react'
import { Icon, type IconName } from '../../components/Icon'
import { switchRole, type RoleId } from '../../features/roles/roles'

/**
 * Future scope: what the prototype does today against the eight-layer product in
 * the deck (appendix A1), where Claude is used, then the plan after the Ludhiana
 * proof. The deck (slide 05) names the phases, and the final report's persona table, revenue streams and
 * roadmap give what is in each. Every number is a target or a quote, never a
 * result, and Phases 2 and 3 are not built: the role previews only show the idea.
 */

interface Phase {
  phase: string
  title: string
  line: string
  rows: { label: string; body: ReactNode }[]
  preview: { role: RoleId; label: string }
}

const PHASES: Phase[] = [
  {
    phase: 'Phase 2',
    title: 'Expert network',
    line: 'Consultants serve MSMEs for a fee',
    rows: [
      { label: 'For', body: 'CBAM consultants and verifiers who look after many exporters.' },
      { label: 'Their problem today', body: 'Data is collected by hand, with no standard format.' },
      {
        label: 'What they get',
        body: (
          <ul className="list-disc space-y-1 pl-4">
            <li>One case view across all their MSME clients</li>
            <li>Every value with its source, every open problem, and what still blocks a carbon number</li>
            <li>Only what each client chooses to share</li>
          </ul>
        ),
      },
      {
        label: 'Shared once, used many times',
        body: 'A job-worker shares a record once, with consent, with every MSME it serves. Optionally the industry association runs this cluster vault; it never owns the data.',
      },
      { label: 'How it earns', body: 'Consultant seats (paid by consultants) and a cluster licence (paid by the association). Neither is counted in our 3-year numbers.' },
      { label: 'Our role', body: 'We do not replace the consultant. We cut the paper-chasing; the consultant still does the final calculation and verification.' },
    ],
    preview: { role: 'consultant', label: 'Preview the consultant view' },
  },
  {
    phase: 'Phase 3',
    title: 'Importer workspace',
    line: 'EU buyers track their suppliers',
    rows: [
      { label: 'For', body: 'EU importers buying steel goods from Indian MSMEs.' },
      { label: 'Their problem today', body: 'Inconsistent data from suppliers and many follow-ups.' },
      {
        label: 'What they get',
        body: (
          <ul className="list-disc space-y-1 pl-4">
            <li>Every Indian supplier’s passport in one place</li>
            <li>Draft facts and status only, never the supplier’s internal notes</li>
            <li>Read-only links that expire</li>
            <li>Each batch’s estimate beside the EU default, and the four verifier questions</li>
          </ul>
        ),
      },
      { label: 'Stays independent', body: 'A verifier is never a user. It only receives the evidence pack.' },
      { label: 'How it earns', body: 'Not priced yet. Importers already pay for CBAM software today.' },
    ],
    preview: { role: 'buyer', label: 'Preview the EU buyer view' },
  },
]

type Status = 'built' | 'partly' | 'next'

const STATUS: Record<Status, { label: string; chip: string; dot: string }> = {
  built: { label: 'Built', chip: 'bg-forest-50 text-forest-800 ring-forest-200', dot: 'bg-forest-500' },
  partly: { label: 'Partly built', chip: 'bg-status-review/10 text-status-review-ink ring-status-review/30', dot: 'bg-status-review' },
  next: { label: 'Next', chip: 'bg-canvas text-ink-600 ring-line', dot: 'bg-ink-400' },
}

// The eight layers of the target architecture and what the prototype does today (deck appendix A1).
const LAYERS: { n: string; name: string; does: string; today: string; next: string; status: Status }[] = [
  { n: '8', name: 'Trust layer', does: 'Consent-based sharing, prices hidden, audit log, encryption', today: 'Data stays on this device; “Reset and start over” clears it', next: 'Sign-ins (Cognito), encryption keys (KMS), firewall (WAF), secrets, monitoring', status: 'partly' },
  { n: '7', name: 'Workspaces', does: 'Owner’s orders, supplier network, verifier view, buyer link', today: 'Home, orders, six role views, Challenge this batch, Evidence map', next: 'Each person signs in on their own device (CloudFront, ECS Fargate)', status: 'built' },
  { n: '6', name: 'Calculation', does: 'Emissions from code with sourced factors; never from AI', today: 'Electricity × CEA factor; batch estimate at the EU default once every paper is in', next: 'Versioned factor and rule library', status: 'built' },
  { n: '5', name: 'Evidence graph', does: 'Papers → values → heat number → batch; every link keeps file, page and line', today: 'Source link on every value, stored in this browser', next: 'PostgreSQL with a standby copy, and file storage, in AWS Mumbai', status: 'built' },
  { n: '4', name: 'Human approval', does: 'Nothing is sent, shared or final without the owner', today: 'The owner presses send; the app never sends', next: 'Same rule, for every agent', status: 'built' },
  { n: '3', name: 'Agents', does: 'Intake, Reconcile, Request, Follow-up, Verifier-prep; they only propose', today: 'Rules draft the request in English and Hindi', next: 'Claude Sonnet 5.5 on Amazon Bedrock', status: 'partly' },
  { n: '2', name: 'Document AI', does: 'Reads each paper; a value needs its page, line and quote', today: 'OCR (Tesseract), PDF.js and rules, in the browser', next: 'Claude Haiku 5.5 on Amazon Bedrock', status: 'partly' },
  { n: '1', name: 'Capture', does: 'Upload, phone photo, WhatsApp, email, Tally / ERP export', today: 'Upload files and photos; WhatsApp as a ready link', next: 'WhatsApp Business API, email intake (SES), Tally / ERP export', status: 'partly' },
  { n: '–', name: 'Staging', does: 'A test copy that checks every release before customers see it', today: 'Release script with automatic end-to-end checks', next: 'A full test copy of the app on AWS', status: 'partly' },
]

// How Claude is used in the product (deck appendix A1).
const CLAUDE: { model: string; job: string; detail: string }[] = [
  { model: 'Claude Haiku 5.5', job: 'Reads every paper', detail: 'Invoices, certificates, challans, bills and logs, including phone photos. Every value it returns must quote its page and line.' },
  { model: 'Claude Sonnet 5.5', job: 'Five agents that propose the next step', detail: 'Intake, Reconcile, Request, Follow-up and Verifier-prep. They draft and suggest; they never send or decide.' },
]

const CLAUDE_RULES = [
  ['Show your proof', 'Every value points to its page and line; a value without a source quote is rejected.'],
  ['AI never decides', 'If two papers disagree, both are shown; the app never picks one or fills a gap.'],
  ['A person approves', 'Agents draft; only the owner sends.'],
  ['No AI carbon numbers', 'Emissions are plain code with sourced factors.'],
]

// One batch through the product: who acts at each step. Claude proposes, code checks, the owner decides.
type Actor = 'haiku' | 'sonnet' | 'code' | 'owner'

const ACTOR: Record<Actor, { label: string; icon: IconName; chip: string }> = {
  haiku: { label: 'Claude Haiku 5.5', icon: 'sparkle', chip: 'bg-forest-950 text-white' },
  sonnet: { label: 'Claude Sonnet 5.5', icon: 'sparkle', chip: 'bg-forest-700 text-white' },
  code: { label: 'Code', icon: 'validate', chip: 'bg-canvas text-ink-700 ring-1 ring-line' },
  owner: { label: 'Owner', icon: 'views', chip: 'bg-status-review/10 text-status-review-ink ring-1 ring-status-review/30' },
}

const FLOW: { stage: string; goal: string; steps: { actor: Actor; title: string; does: string; today?: string }[]; loop?: string }[] = [
  {
    stage: 'Read',
    goal: 'Papers in, every value with its source',
    steps: [
      { actor: 'sonnet', title: 'Intake agent', does: 'Collects papers from upload, WhatsApp and email, and files each to its batch.', today: 'Upload' },
      { actor: 'haiku', title: 'Document AI', does: 'Reads each paper; every value must quote its page and line.', today: 'OCR + rules' },
      { actor: 'code', title: 'Rules check', does: 'Rejects a value without a source; matches heat numbers, quantities and batch IDs.', today: 'Built' },
    ],
  },
  {
    stage: 'Resolve',
    goal: 'Close each gap with the right person',
    steps: [
      { actor: 'sonnet', title: 'Reconcile agent', does: 'Explains each conflict or gap, and who can fix it.', today: 'Rules' },
      { actor: 'sonnet', title: 'Request agent', does: 'Drafts the request to the supplier in Hindi or English.', today: 'Rules' },
      { actor: 'owner', title: 'Owner approves', does: 'Reads, edits and sends. Nothing goes out without the owner.', today: 'Built' },
      { actor: 'sonnet', title: 'Follow-up agent', does: 'Reminds the supplier until the corrected paper arrives.' },
    ],
    loop: 'The reply goes back to the Intake agent and is read and checked again.',
  },
  {
    stage: 'Report',
    goal: 'A draft the verifier can check',
    steps: [
      { actor: 'code', title: 'Calculation', does: 'Emissions from sourced factors, in plain code; never from AI.', today: 'Built' },
      { actor: 'sonnet', title: 'Verifier-prep agent', does: 'Assembles the evidence pack, every number with its source.', today: 'Download' },
      { actor: 'owner', title: 'Owner shares', does: 'Sends the draft to the buyer or the verifier, by consent.', today: 'Built' },
    ],
  },
]

// Stage-gate targets at 12–18 months (Replicate), from the team's success scorecard.
const GATE: [string, string][] = [
  ['≥ 150', 'paying and active subscribers'],
  ['≥ 60%', 'pilot users who pay'],
  ['≥ 85%', 'make one passport a month'],
  ['≥ 60%', 'renew each year'],
  ['≥ 80%', 'suppliers sending data'],
]


export function RoadmapPage() {
  return (
    <div className="space-y-8">
      <header className="max-w-2xl">
        <h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight text-ink-900 outline-none sm:text-3xl">
          Future scope
        </h1>
        <p className="mt-2 text-base text-ink-600">What the prototype already does, what the product adds next, and where Claude comes in. Phases 2 and 3 start only after the Ludhiana stage gate is met.</p>
      </header>

      <section aria-labelledby="layers-title" className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="layers-title" className="text-base font-semibold text-ink-900">
            Built today vs next · eight layers
          </h2>
          <ul aria-label="Legend" className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-600">
            {(Object.keys(STATUS) as Status[]).map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span className={`size-2.5 rounded-full ${STATUS[k].dot}`} />
                {STATUS[k].label}
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-4 hidden grid-cols-[2.2fr_2.4fr_2.4fr] gap-4 border-b border-line pb-2 text-xs font-semibold text-ink-600 lg:grid">
          <span>Layer</span>
          <span>In the prototype today</span>
          <span>Next, in the product</span>
        </div>
        <ol className="divide-y divide-line">
          {LAYERS.map((l) => (
            <li key={l.name} className="grid gap-2 py-3 lg:grid-cols-[2.2fr_2.4fr_2.4fr] lg:gap-4">
              <div>
                <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-ink-900">
                  <span className="text-xs text-ink-500 tabular-nums">{l.n}</span>
                  {l.name}
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${STATUS[l.status].chip}`}>{STATUS[l.status].label}</span>
                </p>
                <p className="mt-0.5 text-xs text-ink-600">{l.does}</p>
              </div>
              <p className="flex items-start gap-1.5 text-sm text-ink-900">
                <Icon name="check" className="mt-0.5 size-4 shrink-0 text-forest-600" />
                <span>
                  <span className="text-xs font-semibold text-ink-600 lg:hidden">Today: </span>
                  {l.today}
                </span>
              </p>
              <p className="flex items-start gap-1.5 text-sm text-ink-700">
                <Icon name="arrow-right" className="mt-0.5 size-4 shrink-0 text-ink-400" />
                <span>
                  <span className="text-xs font-semibold text-ink-600 lg:hidden">Next: </span>
                  {l.next}
                </span>
              </p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="claude-title" className="rounded-2xl bg-forest-950 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="claude-title" className="text-base font-semibold">
            Where Claude comes in
          </h2>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">Next · not in the prototype yet</span>
        </div>
        <p className="mt-1 text-sm text-forest-200">Today the prototype reads with OCR and rules, with no AI. In the product, Claude runs on Amazon Bedrock.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {CLAUDE.map((c) => (
            <div key={c.model} className="rounded-xl bg-white/5 p-4 ring-1 ring-white/10">
              <p className="text-xs font-semibold text-moss-400">{c.model}</p>
              <p className="mt-1 text-base font-semibold">{c.job}</p>
              <p className="mt-1 text-xs text-forest-200">{c.detail}</p>
            </div>
          ))}
        </div>
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          {CLAUDE_RULES.map(([rule, text]) => (
            <div key={rule}>
              <dt className="text-sm font-semibold">{rule}</dt>
              <dd className="text-xs text-forest-200">{text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs text-forest-200">Files and the database stay in AWS Mumbai; AI reading uses Bedrock global inference.</p>
      </section>

      <section aria-labelledby="flow-title" className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="flow-title" className="text-base font-semibold text-ink-900">
            How the agents work · one batch
          </h2>
          <p className="text-sm font-semibold text-forest-700">Claude proposes · Code checks · Owner decides</p>
        </div>
        <ul aria-label="Who acts" className="mt-3 flex flex-wrap gap-2">
          {(Object.keys(ACTOR) as Actor[]).map((a) => (
            <li key={a} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${ACTOR[a].chip}`}>
              <Icon name={ACTOR[a].icon} className="size-3.5" />
              {ACTOR[a].label}
            </li>
          ))}
          <li className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-ink-600 ring-1 ring-line">
            <Icon name="check" className="size-3.5 text-forest-600" />
            In the prototype today
          </li>
        </ul>

        <ol className="mt-5 space-y-5">
          {FLOW.map((group, g) => (
            <li key={group.stage} className="grid gap-3 lg:grid-cols-[9rem_1fr] lg:gap-5">
              <div className="lg:pt-3">
                <p className="text-xs font-semibold tracking-wide text-forest-700 uppercase">
                  {g + 1} · {group.stage}
                </p>
                <p className="mt-0.5 text-sm text-ink-600">{group.goal}</p>
              </div>
              <div>
                <ol className="flex flex-col gap-2 md:flex-row md:items-stretch">
                  {group.steps.map((step, i) => (
                    <li key={step.title} className="flex flex-col gap-2 md:min-w-0 md:flex-1 md:flex-row md:items-center">
                      <div className="flex h-full flex-1 flex-col rounded-xl bg-canvas p-3 ring-1 ring-line">
                        <span className={`inline-flex items-center gap-1 self-start rounded-full px-2 py-0.5 text-xs font-semibold ${ACTOR[step.actor].chip}`}>
                          <Icon name={ACTOR[step.actor].icon} className="size-3" />
                          {ACTOR[step.actor].label}
                        </span>
                        <p className="mt-2 text-sm font-semibold text-ink-900">{step.title}</p>
                        <p className="mt-0.5 flex-1 text-xs text-ink-700">{step.does}</p>
                        {step.today && (
                          <p className="mt-2 flex items-center gap-1 text-xs font-medium text-forest-700">
                            <Icon name="check" className="size-3.5" />
                            Today: {step.today}
                          </p>
                        )}
                      </div>
                      {i < group.steps.length - 1 && (
                        <span aria-hidden="true" className="flex justify-center text-ink-400">
                          <Icon name="arrow-right" className="size-4 rotate-90 md:rotate-0" />
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
                {group.loop && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ink-700">
                    <Icon name="replace" className="size-3.5 text-forest-600" />
                    {group.loop}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="phase-1" className="rounded-2xl bg-forest-950 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold tracking-wide text-moss-400 uppercase">Phase 1 · 0 – 18 months</p>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">Now</span>
        </div>
        <h2 id="phase-1" className="mt-2 text-xl font-semibold tracking-tight">
          Ludhiana proof · steel-fastener exporters in one cluster
        </h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            ['Validate · 3–6 months', 'Pilot on real papers with 5 exporters'],
            ['Commercialise · 6–12 months', '50 paying and active subscribers'],
            ['Replicate · 12–18 months', 'A playbook for new clusters'],
          ].map(([stage, goal]) => (
            <li key={stage} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <p className="text-xs font-semibold text-forest-200">{stage}</p>
              <p className="mt-1 text-sm text-white">{goal}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="gate-title" className="rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-6">
        <h2 id="gate-title" className="text-base font-semibold text-ink-900">
          The gate before Phase 2 · targets at 12 – 18 months
        </h2>
        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-5">
          {GATE.map(([value, label]) => (
            <div key={label}>
              <dt className="sr-only">{label}</dt>
              <dd className="text-2xl font-semibold text-ink-900 tabular-nums">{value}</dd>
              <dd className="mt-0.5 text-xs text-ink-600">{label}</dd>
            </div>
          ))}
        </dl>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {PHASES.map((p) => (
          <section key={p.phase} aria-labelledby={`${p.phase}-title`} className="flex flex-col rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-6">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-wide text-forest-700 uppercase">{p.phase}</p>
              <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-ink-600 ring-1 ring-line">Planned, not built</span>
            </div>
            <h2 id={`${p.phase}-title`} className="mt-2 text-xl font-semibold tracking-tight text-ink-900">
              {p.title}
            </h2>
            <p className="mt-1 text-sm text-ink-600">{p.line}</p>
            <dl className="mt-4 flex-1 divide-y divide-line">
              {p.rows.map((row) => (
                <div key={row.label} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                  <dt className="text-xs font-semibold text-ink-600">{row.label}</dt>
                  <dd className="text-sm text-ink-900">{row.body}</dd>
                </div>
              ))}
            </dl>
            <button
              type="button"
              onClick={() => switchRole(p.preview.role)}
              className="mt-4 inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 self-start rounded-xl px-4 text-sm font-semibold text-forest-800 ring-1 ring-forest-200 transition-colors duration-150 hover:bg-forest-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
            >
              {p.preview.label}
              <Icon name="arrow-right" className="size-4" />
            </button>
          </section>
        ))}
      </div>


      <p className="text-xs text-ink-600">
        Sources: architecture and AI design (deck, appendix A1); team go-to-market plan and stage-gate targets (deck, slide 05); final report: persona table, revenue streams, roadmap
        and competitor table. Targets, not results.
      </p>
    </div>
  )
}
