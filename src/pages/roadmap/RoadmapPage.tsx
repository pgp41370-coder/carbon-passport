import { Icon, type IconName } from '../../components/Icon'
import { switchRole, type RoleId } from '../../features/roles/roles'

/**
 * Future scope, kept visual: how the agents will run one batch (a swimlane
 * chart), the eight layers of the product with what the prototype does today,
 * and the plan after the Ludhiana proof. Taken from the deck (slide 05 and
 * appendix A1) and the final report. Phases 2 and 3 are not built; the role
 * previews only show the idea.
 */

// ── The agents flow ─────────────────────────────────────────────────────────
type Lane = 'claude' | 'code' | 'owner'
type Model = 'haiku' | 'sonnet'

interface Step {
  title: string
  /** The title as it is broken in the chart's narrow boxes. */
  lines: string[]
  /** Last line in the box: the model or who acts. */
  by: string
  lane: Lane
  model?: Model
  /** Already in the prototype, in some form. */
  today?: boolean
  /** Full wording for screen readers and the phone list. */
  full: string
}

const STEPS: Step[] = [
  { title: 'Intake', lines: ['Intake'], by: 'Sonnet agent', lane: 'claude', model: 'sonnet', today: true, full: 'Intake agent collects papers from upload, WhatsApp and email' },
  { title: 'Read papers', lines: ['Read', 'papers'], by: 'Haiku', lane: 'claude', model: 'haiku', today: true, full: 'Claude Haiku 5.5 reads each paper and quotes the page and line of every value' },
  { title: 'Check sources', lines: ['Check', 'sources'], by: 'Code', lane: 'code', today: true, full: 'Code rejects any value without a source and matches papers against each other' },
  { title: 'Reconcile', lines: ['Reconcile'], by: 'Sonnet agent', lane: 'claude', model: 'sonnet', today: true, full: 'Reconcile agent explains each conflict or gap and who can fix it' },
  { title: 'Draft request', lines: ['Draft', 'request'], by: 'Sonnet agent', lane: 'claude', model: 'sonnet', today: true, full: 'Request agent drafts the message in Hindi or English' },
  { title: 'Approve & send', lines: ['Approve', '& send'], by: 'Owner', lane: 'owner', today: true, full: 'Owner approves and sends; nothing goes out without the owner' },
  { title: 'Follow up', lines: ['Follow up'], by: 'Sonnet agent', lane: 'claude', model: 'sonnet', full: 'Follow-up agent reminds the supplier until the corrected paper arrives' },
  { title: 'Calculate', lines: ['Calculate'], by: 'Code', lane: 'code', today: true, full: 'Code works out emissions from sourced factors; never AI' },
  { title: 'Evidence pack', lines: ['Evidence', 'pack'], by: 'Sonnet agent', lane: 'claude', model: 'sonnet', today: true, full: 'Verifier-prep agent assembles the evidence pack, every number with its source' },
  { title: 'Share', lines: ['Share'], by: 'Owner', lane: 'owner', today: true, full: 'Owner shares the draft with the buyer or verifier, by consent' },
]

const LANES: { id: Lane; label: string; sub: string }[] = [
  { id: 'claude', label: 'Claude', sub: 'proposes' },
  { id: 'code', label: 'Code', sub: 'checks' },
  { id: 'owner', label: 'Owner', sub: 'decides' },
]

const STAGES = [
  { label: 'Read', from: 0, to: 2 },
  { label: 'Resolve', from: 3, to: 6 },
  { label: 'Report', from: 7, to: 9 },
]

// Chart geometry (SVG units).
const W = 1000
const LEFT = 104
const COL = (W - LEFT - 8) / STEPS.length
const BOX_W = COL - 12
const BOX_H = 60
const TOP = 66
const LANE_H = 78
const laneY = (lane: Lane) => TOP + LANES.findIndex((l) => l.id === lane) * LANE_H
const boxX = (i: number) => LEFT + i * COL + 6
const boxCY = (s: Step) => laneY(s.lane) + LANE_H / 2
const H = TOP + LANES.length * LANE_H + 34

const NODE_STYLE: Record<Lane | Model, { box: string; title: string; by: string }> = {
  haiku: { box: 'fill-forest-950', title: 'fill-white', by: 'fill-moss-400' },
  sonnet: { box: 'fill-forest-700', title: 'fill-white', by: 'fill-forest-100' },
  claude: { box: 'fill-forest-700', title: 'fill-white', by: 'fill-forest-100' },
  code: { box: 'fill-white stroke-ink-400', title: 'fill-ink-900', by: 'fill-ink-500' },
  owner: { box: 'fill-[#fdf3e0] stroke-status-review', title: 'fill-ink-900', by: 'fill-status-review-ink' },
}

function AgentsChart() {
  const loopFrom = 6
  const loopX1 = boxX(loopFrom) + BOX_W / 2
  const loopX2 = boxX(0) + BOX_W / 2
  const loopY = laneY('claude') + (LANE_H - BOX_H) / 2
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="hidden h-auto w-full lg:block" aria-hidden="true">
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" className="fill-ink-400" />
        </marker>
        <marker id="arrow-loop" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 10 5 0 10z" className="fill-forest-600" />
        </marker>
      </defs>

      {STAGES.map((st) => {
        const x1 = boxX(st.from)
        const x2 = boxX(st.to) + BOX_W
        return (
          <g key={st.label}>
            <line x1={x1} x2={x2} y1={14} y2={14} className="stroke-forest-200" strokeWidth={2} />
            <text x={(x1 + x2) / 2} y={9} textAnchor="middle" className="fill-forest-700 text-[12px] font-semibold tracking-wide uppercase">
              {st.label}
            </text>
          </g>
        )
      })}

      {LANES.map((lane, i) => (
        <g key={lane.id}>
          <rect x={0} y={TOP + i * LANE_H} width={W} height={LANE_H} rx={10} className={i % 2 ? 'fill-white' : 'fill-canvas'} />
          <text x={14} y={TOP + i * LANE_H + LANE_H / 2 - 3} className="fill-ink-900 text-[14px] font-semibold">
            {lane.label}
          </text>
          <text x={14} y={TOP + i * LANE_H + LANE_H / 2 + 14} className="fill-ink-500 text-[12px]">
            {lane.sub}
          </text>
        </g>
      ))}

      {STEPS.slice(0, -1).map((s, i) => {
        const n = STEPS[i + 1]!
        const x1 = boxX(i) + BOX_W
        const x2 = boxX(i + 1)
        const y1 = boxCY(s)
        const y2 = boxCY(n)
        const mid = (x1 + x2) / 2
        const d = y1 === y2 ? `M${x1} ${y1} H${x2 - 2}` : `M${x1} ${y1} H${mid} V${y2} H${x2 - 2}`
        return <path key={s.title} d={d} fill="none" className="stroke-ink-400" strokeWidth={1.6} markerEnd="url(#arrow)" />
      })}

      {/* The loop: a supplier's reply goes back to Intake and is read and checked again. */}
      <path
        d={`M${loopX1} ${loopY} V${TOP - 14} Q${loopX1} ${TOP - 26} ${loopX1 - 12} ${TOP - 26} H${loopX2 + 12} Q${loopX2} ${TOP - 26} ${loopX2} ${TOP - 14} V${loopY - 2}`}
        fill="none"
        className="stroke-forest-600"
        strokeWidth={1.6}
        strokeDasharray="5 4"
        markerEnd="url(#arrow-loop)"
      />
      <rect x={(loopX1 + loopX2) / 2 - 128} y={TOP - 36} width={256} height={20} rx={10} className="fill-white" />
      <text x={(loopX1 + loopX2) / 2} y={TOP - 22} textAnchor="middle" className="fill-forest-700 text-[11.5px] font-medium">
        ↺ reply comes back, read and checked again
      </text>

      {STEPS.map((s, i) => {
        const style = NODE_STYLE[s.model ?? s.lane]
        const x = boxX(i)
        const y = laneY(s.lane) + (LANE_H - BOX_H) / 2
        return (
          <g key={s.title}>
            <rect x={x} y={y} width={BOX_W} height={BOX_H} rx={9} className={style.box} strokeWidth={1.2} />
            {s.lines.map((line, k) => (
              <text
                key={line}
                x={x + BOX_W / 2}
                y={y + (s.lines.length === 1 ? 26 : 19) + k * 14}
                textAnchor="middle"
                className={`${style.title} text-[12.5px] font-semibold`}
              >
                {line}
              </text>
            ))}
            <text x={x + BOX_W / 2} y={y + (s.lines.length === 1 ? 44 : 50)} textAnchor="middle" className={`${style.by} text-[10.5px]`}>
              {s.by}
            </text>
            {s.today && (
              <g>
                <circle cx={x + BOX_W - 2} cy={y + 2} r={7} className="fill-forest-500 stroke-white" strokeWidth={1.5} />
                <path d={`M${x + BOX_W - 5.5} ${y + 2} l2.4 2.4 4.4-4.6`} fill="none" className="stroke-white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              </g>
            )}
          </g>
        )
      })}

      <text x={LEFT} y={H - 10} className="fill-ink-500 text-[11px]">
        Calculate starts once every paper is in.
      </text>
    </svg>
  )
}

// ── The eight layers ────────────────────────────────────────────────────────
type Status = 'built' | 'partly'

const STATUS: Record<Status, { label: string; dot: string }> = {
  built: { label: 'Built', dot: 'bg-forest-500' },
  partly: { label: 'Partly built', dot: 'bg-status-review' },
}

// Deck appendix A1: what the prototype does today and what comes next, per layer.
const LAYERS: { n: string; name: string; today: string; next: string; status: Status; icon: IconName }[] = [
  { n: '8', name: 'Trust', today: 'Data stays on this device', next: 'Sign-ins, encryption, audit log', status: 'partly', icon: 'lock' },
  { n: '7', name: 'Workspaces', today: 'Home, orders, six role views', next: 'Own sign-in for each person', status: 'built', icon: 'views' },
  { n: '6', name: 'Calculation', today: 'Electricity and batch estimate', next: 'Versioned factor library', status: 'built', icon: 'emissions' },
  { n: '5', name: 'Evidence graph', today: 'Every value linked to its source', next: 'Database in AWS Mumbai', status: 'built', icon: 'map' },
  { n: '4', name: 'Human approval', today: 'Owner presses send', next: 'Same rule for every agent', status: 'built', icon: 'check-circle' },
  { n: '3', name: 'Agents', today: 'Rules draft the requests', next: 'Claude Sonnet 5.5', status: 'partly', icon: 'sparkle' },
  { n: '2', name: 'Document AI', today: 'OCR and rules in the browser', next: 'Claude Haiku 5.5', status: 'partly', icon: 'file-text' },
  { n: '1', name: 'Capture', today: 'Upload files and photos', next: 'WhatsApp, email, Tally', status: 'partly', icon: 'upload' },
]

const RULES: { icon: IconName; label: string; title: string }[] = [
  { icon: 'file-text', label: 'Show your proof', title: 'Every value points to its page and line; a value without a source quote is rejected.' },
  { icon: 'alert', label: 'AI never decides', title: 'If two papers disagree, both are shown; the app never picks one or fills a gap.' },
  { icon: 'check-circle', label: 'A person approves', title: 'Agents draft; only the owner sends.' },
  { icon: 'emissions', label: 'No AI carbon numbers', title: 'Emissions are plain code with sourced factors.' },
]

// ── The phases ──────────────────────────────────────────────────────────────
const PHASES: { phase: string; title: string; line: string; points: string[]; earns: string; preview: { role: RoleId; label: string } }[] = [
  {
    phase: 'Phase 2',
    title: 'Expert network',
    line: 'Consultants serve MSMEs for a fee',
    points: ['One view of all their clients', 'Every value with its source', 'Only what each client shares', 'A job-worker shares once, for all'],
    earns: 'Consultant seats and a cluster licence (not in our numbers)',
    preview: { role: 'consultant', label: 'Preview the consultant view' },
  },
  {
    phase: 'Phase 3',
    title: 'Importer workspace',
    line: 'EU buyers track their suppliers',
    points: ['All Indian suppliers in one place', 'Facts only, no internal notes', 'Read-only links that expire', 'Estimate beside the EU default'],
    earns: 'Not priced yet; importers already buy CBAM software',
    preview: { role: 'buyer', label: 'Preview the EU buyer view' },
  },
]

// Stage-gate targets at 12–18 months (Replicate), from the team's success scorecard.
const GATE: [string, string][] = [
  ['≥ 150', 'paying subscribers'],
  ['≥ 60%', 'pilot users pay'],
  ['≥ 85%', 'one passport a month'],
  ['≥ 60%', 'renew each year'],
  ['≥ 80%', 'suppliers send data'],
]

const card = 'rounded-2xl border border-line bg-surface p-5 shadow-[0_1px_2px_rgb(21_26_24/0.04)] sm:p-6'

export function RoadmapPage() {
  return (
    <div className="space-y-6">
      <header>
        <h1 id="page-title" tabIndex={-1} className="text-2xl font-semibold tracking-tight text-ink-900 outline-none sm:text-3xl">
          Future scope
        </h1>
        <p className="mt-1 text-base text-ink-600">What is built, what comes next, and where Claude fits.</p>
      </header>

      <section aria-labelledby="flow-title" className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="flow-title" className="text-base font-semibold text-ink-900">
            How the agents work · one batch
          </h2>
          <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-600">
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-forest-950" />
              Claude Haiku 5.5
            </li>
            <li className="flex items-center gap-1.5">
              <span className="size-3 rounded bg-forest-700" />
              Claude Sonnet 5.5
            </li>
            <li className="flex items-center gap-1.5">
              <span className="grid size-3.5 place-items-center rounded-full bg-forest-500 text-white">
                <Icon name="check" className="size-2.5" />
              </span>
              In the prototype today
            </li>
          </ul>
        </div>

        <div className="mt-5">
          <AgentsChart />
          {/* The same flow as a list: the phone layout, and the text screen readers get. */}
          <ol className="space-y-2 lg:sr-only">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2.5">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs font-semibold tabular-nums ${
                    s.model === 'haiku'
                      ? 'bg-forest-950 text-white'
                      : s.lane === 'claude'
                        ? 'bg-forest-700 text-white'
                        : s.lane === 'owner'
                          ? 'bg-status-review/15 text-status-review-ink'
                          : 'bg-white text-ink-700 ring-1 ring-line'
                  }`}
                >
                  {i + 1}
                </span>
                <span className="min-w-0 flex-1 text-sm text-ink-900">
                  <span className="font-semibold">{s.title}</span> <span className="text-ink-600">· {s.by}</span>
                  <span className="sr-only">. {s.full}.</span>
                </span>
                {s.today && <Icon name="check-circle" className="size-4 shrink-0 text-forest-600" />}
              </li>
            ))}
          </ol>
        </div>

        <ul className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {RULES.map((r) => (
            <li key={r.label} title={r.title} className="flex items-center gap-2 rounded-xl bg-forest-50 px-3 py-2.5 text-sm font-semibold text-forest-800">
              <Icon name={r.icon} className="size-4 shrink-0" />
              {r.label}
              <span className="sr-only">: {r.title}</span>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="layers-title" className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="layers-title" className="text-base font-semibold text-ink-900">
            Built today vs next · eight layers
          </h2>
          <ul aria-label="Legend" className="flex gap-4 text-xs text-ink-600">
            {(Object.keys(STATUS) as Status[]).map((k) => (
              <li key={k} className="flex items-center gap-1.5">
                <span className={`size-2.5 rounded-full ${STATUS[k].dot}`} />
                {STATUS[k].label}
              </li>
            ))}
          </ul>
        </div>
        <ol className="mt-4 grid gap-2 md:grid-cols-2">
          {LAYERS.map((l) => (
            <li key={l.name} className="flex items-center gap-3 rounded-xl bg-canvas px-3 py-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-forest-700 ring-1 ring-line">
                <Icon name={l.icon} className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-sm font-semibold text-ink-900">
                  <span className="text-xs font-medium text-ink-500 tabular-nums">{l.n}</span>
                  {l.name}
                  <span className={`size-2 rounded-full ${STATUS[l.status].dot}`} />
                  <span className="sr-only">{STATUS[l.status].label}</span>
                </p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-ink-600">
                  <span className="text-ink-900">{l.today}</span>
                  <Icon name="arrow-right" className="size-3 text-ink-400" />
                  <span className="font-medium text-forest-700">{l.next}</span>
                </p>
              </div>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-ink-500">Today → next. Files and the database will stay in AWS Mumbai; AI reading runs on Amazon Bedrock.</p>
      </section>

      <section aria-labelledby="phase-1" className="rounded-2xl bg-forest-950 p-5 text-white sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="phase-1" className="text-base font-semibold">
            Phase 1 · Ludhiana proof
          </h2>
          <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold">Now · 0–18 months</span>
        </div>
        <ol className="mt-4 grid gap-2 sm:grid-cols-3">
          {[
            ['Validate', '3–6 months', '5 exporters, real papers'],
            ['Commercialise', '6–12 months', '50 paying subscribers'],
            ['Replicate', '12–18 months', 'Playbook for new clusters'],
          ].map(([stage, when, goal]) => (
            <li key={stage} className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
              <p className="text-xs text-forest-200">
                {stage} · {when}
              </p>
              <p className="mt-1 text-sm font-semibold">{goal}</p>
            </li>
          ))}
        </ol>
        <div className="mt-5 border-t border-white/10 pt-4">
          <h3 className="text-xs font-semibold tracking-wide text-moss-400 uppercase">Gate before Phase 2 · targets at 12–18 months</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
            {GATE.map(([value, label]) => (
              <div key={label}>
                <dt className="sr-only">{label}</dt>
                <dd className="text-xl font-semibold tabular-nums">{value}</dd>
                <dd className="text-xs text-forest-200">{label}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {PHASES.map((p) => (
          <section key={p.phase} aria-labelledby={`${p.phase}-title`} className={`${card} flex flex-col`}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold tracking-wide text-forest-700 uppercase">{p.phase}</p>
              <span className="rounded-full bg-canvas px-2.5 py-1 text-xs font-semibold text-ink-600 ring-1 ring-line">Planned, not built</span>
            </div>
            <h2 id={`${p.phase}-title`} className="mt-2 text-xl font-semibold tracking-tight text-ink-900">
              {p.title}
            </h2>
            <p className="mt-0.5 text-sm text-ink-600">{p.line}</p>
            <ul className="mt-4 grid flex-1 gap-2 sm:grid-cols-2">
              {p.points.map((point) => (
                <li key={point} className="flex items-start gap-2 rounded-xl bg-canvas px-3 py-2.5 text-sm text-ink-900">
                  <Icon name="check" className="mt-0.5 size-4 shrink-0 text-forest-600" />
                  {point}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-ink-600">
              <span className="font-semibold text-ink-900">Earns:</span> {p.earns}
            </p>
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

      <p className="text-xs text-ink-500">Sources: deck slide 05 and appendix A1; final report. Targets, not results.</p>
    </div>
  )
}
