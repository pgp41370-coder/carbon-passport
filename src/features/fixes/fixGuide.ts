import type { SampleFixKey } from '../../data/samplePack'
import type { CarbonPassport } from '../../types/passport'
import type { Finding } from '../passport/findings'

/**
 * Plain "how to fix" guidance for each finding. The app never edits a value or
 * fills a gap itself: every fix is a real document from the right person, which
 * is then read and checked again like any other upload.
 */

export type FixAction =
  /** Upload the missing document; it is read and checked automatically. */
  | { kind: 'upload' }
  /** Replace one of the cited documents with a corrected copy. */
  | { kind: 'replace' }
  /** The app cannot read this document type yet: record it on a supply-chain hand-off. */
  | { kind: 'supply-chain'; handoff: string }
  /** Nothing to upload: open the source and confirm the value. */
  | { kind: 'check-source' }

export interface FixGuide {
  summary: string
  who?: string
  document?: string
  mustShow?: string[]
  steps: string[]
  action: FixAction
  message?: { en: string; hi: string }
  /** Synthetic document that demonstrates this fix with the sample pack. */
  sampleFix?: SampleFixKey
}

export interface FixContext {
  batchId: string
  challanNo?: string
  jobWorker?: string
}

/** Pulls the references a request message needs from the passport, when they were read. */
export function fixContext(passport: CarbonPassport): FixContext {
  const evidence = passport.stages.flatMap((s) => s.requirements.flatMap((r) => r.evidence))
  const value = (label: string) => evidence.find((e) => e.label === label && e.value)?.value
  return { batchId: passport.batchId, challanNo: value('Challan no.'), jobWorker: value('Job-worker') }
}

const order = (ctx: FixContext) => (ctx.challanNo ? ` (challan ${ctx.challanNo})` : '')
const orderHi = (ctx: FixContext) => (ctx.challanNo ? ` (चालान ${ctx.challanNo})` : '')

const GUIDES: Record<string, (ctx: FixContext, finding: Finding) => FixGuide> = {
  'heat-number-match': (ctx, finding) => {
    const values = [...new Set(finding.sources.map((s) => s.value).filter(Boolean))].join(' and ')
    return {
      summary: 'Find out which heat number is right, then replace the document that is wrong.',
      who: 'Job-worker and steel supplier',
      document: 'A corrected copy of the wrong document',
      mustShow: ['The same heat number as the material tag', `Batch ${ctx.batchId}`],
      steps: [
        `Press “Show source” on both values above and compare ${values || 'the two values'}.`,
        'Check the heat number stamped on the coil tag or bundle label in your store.',
        'Ask whoever issued the wrong document for a corrected copy.',
        'Press “Replace” on the wrong document and choose the corrected copy. The app checks again by itself.',
      ],
      action: { kind: 'replace' },
      message: {
        en: `Hello, for batch ${ctx.batchId}${order(ctx)} our documents show different heat numbers (${values}). Please check the heat number on the material and send a corrected copy if yours is wrong. Thank you.`,
        hi: `नमस्ते, बैच ${ctx.batchId}${orderHi(ctx)} के हमारे कागज़ों में हीट नंबर अलग-अलग हैं (${values})। कृपया माल पर लगा हीट नंबर जाँच लें, और अगर आपके कागज़ में गलती है तो सुधरी हुई कॉपी भेज दें। धन्यवाद।`,
      },
      sampleFix: 'fix-job-work-challan-revised',
    }
  },
  'job-worker-energy': (ctx) => ({
    summary: 'Ask the job-worker for the furnace energy record of this job and upload it.',
    who: ctx.jobWorker ? `Job-worker: ${ctx.jobWorker}` : 'Heat-treatment job-worker',
    document: 'Furnace electricity or fuel record for this job',
    mustShow: [`Batch ${ctx.batchId} or the challan number`, 'Dates of the job', 'kWh, or fuel quantity', 'Meter or sub-meter readings'],
    steps: [
      'Send the request message below to the job-worker.',
      'When they reply, upload the record here. It is read in this browser and checked again.',
      'Energy is never assumed to be zero while this is missing.',
    ],
    action: { kind: 'upload' },
    message: {
      en: `Hello, you heat-treated our batch ${ctx.batchId}${order(ctx)}. Please share the furnace electricity or fuel record for this job: dates, kWh (or fuel quantity) and meter or sub-meter readings. Our buyer needs it for the batch carbon record. Thank you.`,
      hi: `नमस्ते, आपने हमारे बैच ${ctx.batchId}${orderHi(ctx)} का हीट-ट्रीटमेंट किया था। कृपया इस काम का फर्नेस बिजली या ईंधन रिकॉर्ड भेज दें: तारीखें, kWh (या ईंधन की मात्रा) और मीटर/सब-मीटर रीडिंग। यह हमारे खरीदार को बैच के कार्बन रिकॉर्ड के लिए चाहिए। धन्यवाद।`,
    },
    sampleFix: 'fix-job-worker-energy',
  }),
  'stockist-record': (ctx) => ({
    summary: 'Confirm whether the steel came straight from the mill or through a trader.',
    who: 'Steel supplier or trader',
    document: 'Trader invoice, lot transfer or dispatch note',
    mustShow: ['Heat number of the steel', 'Quantity and date'],
    steps: [
      'Ask the seller named on your purchase invoice for the document.',
      'Upload the lot transfer here. It is read in this browser and its heat number is matched to the mill certificate.',
      'If the steel came straight from the mill, add a note on the “Steel mill → Stockist / trader” hand-off in Supply chain instead.',
    ],
    action: { kind: 'upload' },
    message: {
      en: `Hello, for the steel supplied for our batch ${ctx.batchId}, please confirm whether it came directly from the mill or through a trader, and share the lot transfer or trader invoice showing the heat number. Thank you.`,
      hi: `नमस्ते, हमारे बैच ${ctx.batchId} के लिए आपने जो स्टील दिया, कृपया बताएँ कि वह सीधे मिल से आया या किसी ट्रेडर के ज़रिए, और हीट नंबर वाला लॉट ट्रांसफ़र या ट्रेडर इनवॉइस भेज दें। धन्यवाद।`,
    },
  }),
  'return-record': (ctx) => ({
    summary: 'Get the return challan for the goods that came back from heat treatment.',
    who: ctx.jobWorker ? `Job-worker: ${ctx.jobWorker}` : 'Heat-treatment job-worker',
    document: 'Return challan or goods-received note',
    mustShow: ['Challan number it returns against', 'Quantity returned', 'Date'],
    steps: [
      'Find the return challan in your stores records, or ask the job-worker for a copy.',
      'Upload it here. Its batch and heat number are matched to this batch, and the quantity returned becomes the finished output.',
    ],
    action: { kind: 'upload' },
    message: {
      en: `Hello, please send a copy of the return challan for our batch ${ctx.batchId}${order(ctx)} with the quantity returned and the date. Thank you.`,
      hi: `नमस्ते, कृपया हमारे बैच ${ctx.batchId}${orderHi(ctx)} का रिटर्न चालान भेज दें, जिसमें लौटाई गई मात्रा और तारीख हो। धन्यवाद।`,
    },
  }),
  'finished-output': () => ({
    summary: 'Record how much finished product came out after heat treatment.',
    who: 'Your own stores or quality team',
    document: 'Return challan with the quantity returned',
    mustShow: ['Quantity returned after heat treatment', 'Batch number', 'Date'],
    steps: [
      'Upload the job-worker’s return challan. The quantity it returns is read as the finished output.',
      'A final inspection or weighing report is not read automatically yet; add it on the “Heat-treatment job-worker → Finished batch” hand-off in Supply chain.',
      'The dispatch record is not used instead: dispatched is not the same as produced.',
    ],
    action: { kind: 'upload' },
  }),
  'mill-identity': () => ({
    summary: 'Confirm the name of the mill that issued the certificate.',
    steps: [
      'Open the certificate and read the issuing mill at the top.',
      'If it is right, add a review note on the “Steel mill → Stockist / trader” hand-off in Supply chain.',
    ],
    action: { kind: 'supply-chain', handoff: 'Steel mill → Stockist / trader' },
  }),
}

/** Fallback for any other finding: the missing or unclear document, from the right person. */
function genericGuide(finding: Finding): FixGuide {
  if (finding.status === 'missing')
    return {
      summary: `Upload the document for “${finding.title}”.`,
      steps: ['Find the document in your records, or ask the party who issued it.', 'Upload it here. It is read and checked automatically.'],
      action: { kind: 'upload' },
    }
  if (finding.sources.length)
    return {
      summary: 'Check the value against its source.',
      steps: [
        'Press “Show source” and compare the value with the document.',
        'If the scan is unclear or the value is wrong, replace the document with a clearer or corrected copy.',
      ],
      action: { kind: 'replace' },
    }
  return {
    summary: 'Upload a clearer or corrected document.',
    steps: ['Open Check documents to see what was read.', 'Upload a clearer or corrected copy; it is checked again automatically.'],
    action: { kind: 'upload' },
  }
}

export function fixGuideFor(finding: Finding, ctx: FixContext): FixGuide {
  return GUIDES[finding.topic]?.(ctx, finding) ?? genericGuide(finding)
}
