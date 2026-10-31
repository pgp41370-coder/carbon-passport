# Carbon Passport

**From MSME documents to buyer-ready carbon evidence.**

Carbon Passport is an MVP built for the IIM Lucknow EYP case competition. It helps a small manufacturer turn
everyday documents (invoices, electricity bills, production logs, job-work challans) into a structured, reviewable
draft of product-level carbon evidence for a buyer. The pilot scenario is one steel-fastener batch whose heat
treatment is outsourced to a job-worker.

> **Status:** all six screens are built: Dashboard, Upload documents, Check documents, Supply chain, the draft
> Carbon Passport and Download. Every figure is derived from the documents stored in
> the browser. No carbon footprint is calculated and nothing is certified.

## Workflow

1. **Upload documents** (or try the synthetic sample pack). Files are stored in IndexedDB and **read automatically**
   in the browser straight after upload; there is no separate processing step.
2. **Check documents**: see what was read from each document, open its source, and review problems.
3. **Supply chain**: follow the batch from steel mill to finished batch; add review notes or clearly labelled proposed
   links.
4. **Carbon Passport**: the evidence-linked draft, including what is missing and why no calculation is possible.
5. **Download**: save the draft as HTML and JSON, or print the HTML to PDF.

Every screen ends with one **Continue** button to the next step. Long reference sections (evidence register,
methodology, status legend, stage details, full document text, how each field was read) stay collapsed behind
**Show details** but are never removed.

Everywhere in the app, evidence has one of three plain statuses: **Found** (a document contains the value, with a
page, line or cell you can open), **Needs check** (uncertain, conflicting or proposed by a person) or **Missing**.

The **Dashboard** summarises the same derived model used by Supply chain, the Passport and Download
(`usePassport` → `buildPassport` → `buildTrace` + `runValidation`), so batch identity, statuses, issues and gaps always
agree. With an empty workspace it offers **Try with sample documents** (loads and reads the sample pack in one click)
and **Upload my documents**. Its **What we found** card groups everything into Problems, Missing, Needs check and Found,
each item with a **Show source** button that opens the exact line or cell. These are counts, not a score, and review
notes never change them.

### How to fix

Every Problem, Missing and Needs-check item has a **How to fix** button (`src/features/fixes/`). It says who to ask,
which document is needed and what it must show, lists the steps, and offers a ready **request message** in English
and Hindi to copy into WhatsApp or email (the app never sends anything). Then:

- **Upload the document**: it is saved, read in the browser and everything is checked again. A banner shows what
  changed, e.g. *Problems 2 → 1 · Missing 4 → 3*.
- **Replace** a cited document with a corrected copy: the new file is added, the old one removed, and the checks run
  again. The app never decides which of two conflicting values is right; a person does.
- **Open Supply chain** for evidence the app cannot read yet (stockist record, return challan, finished output): record
  the reference on the hand-off as a proposed link, which shows as *Needs check*.

The app never edits a value or fills a gap itself. Every fix is a real document, and the passport stays a draft. With no documents, or with documents that are not processed yet, every screen says so instead of showing
figures.

## Principles

- **Browser-only processing.** Files are read and parsed on the user's device. There is no backend and no upload.
- **Local storage under the user's control.** Data is kept in the browser's IndexedDB and can be deleted by the user.
- **No paid APIs, API keys or mandatory external AI services.**
- **Human review is mandatory.** The app never invents missing evidence and never labels a draft as certified or
  verified by a third party.

## Tech stack

| Concern              | Choice                                                                 |
| -------------------- | ---------------------------------------------------------------------- |
| UI                   | React 19 + TypeScript, built with Vite                                 |
| Styling              | Tailwind CSS v4 via `@tailwindcss/vite`, forest-green tokens in `src/index.css` |
| Text-based PDFs      | PDF.js (`pdfjs-dist`)                                                  |
| Scanned PDFs, images | Tesseract.js (OCR in a Web Worker)                                     |
| CSV                  | Papa Parse                                                             |
| Excel                | SheetJS (`xlsx` 0.20.3, installed from the official SheetJS CDN)       |
| Persistence          | IndexedDB via `idb`                                                    |
| Font                 | Inter, self-hosted via `@fontsource-variable/inter` (no Google Fonts call) |
| Hosting              | Vercel static hosting                                                  |

## Supported file types

| Type                 | Extensions               | How it is read                               |
| -------------------- | ------------------------ | -------------------------------------------- |
| Text-based PDF       | `.pdf`                   | PDF.js text extraction                        |
| Scanned PDF          | `.pdf`                   | PDF.js renders pages, then Tesseract.js OCR   |
| Image                | `.png`, `.jpg`, `.jpeg`  | Tesseract.js OCR                              |
| CSV                  | `.csv`                   | Papa Parse                                    |
| Excel                | `.xlsx`, `.xls`          | SheetJS                                       |

OCR quality depends on scan quality. Every extracted value is shown with its source for human review.

## Extraction and validation

All parsing runs in the browser; parsers are lazy-loaded per format.

- **Raw content** is kept with references: PDF page + line, CSV row, or Excel sheet + row + column. PDF pages with no
  text layer are rendered and read with OCR. Tesseract runs with automatic page segmentation (mode 3), because its
  default single-block mode garbles bordered tables.
- **Document type** is a keyword-based guess, shown with the matched keywords.
- **Detected fields** (heat number, batch ID, quantities, kWh, billing period, supplier and job-worker references…) are
  found by label and position rules in `src/features/extraction/fields.ts`. Each is *Found*, *Needs check* (low
  OCR confidence, several values, or a layout guess) or *Missing*. Values are copied, never corrected or filled in.
  Lines of the synthetic-sample banner are ignored as evidence.
- **Checks** (`src/features/evidence/validation.ts`): mill-certificate vs challan heat number; job-worker energy
  evidence (missing energy is never assumed to be zero); required batch IDs and quantities; conflicting batch IDs.
- **Reviews** record a person's judgement on an issue. They are not verification; the issue stays listed, and a
  review is dropped automatically if the underlying values change.
- **Storage:** results, issues and reviews are saved in IndexedDB. Reprocessing replaces a document's result and the
  issue set (issue ids are deterministic). Removing a document deletes its result, any issue citing it, the reviews of
  those issues and any traceability note resting on it.
- **Failures** (password-protected or damaged files, files with no readable text, OCR errors) are recorded as failed
  results with the reason; nothing is mapped from them.

## Document upload and storage

- **Limit:** 25 MB per file (`MAX_FILE_SIZE_MB` in `src/features/documents/config.ts`), multiple files at once.
- **Checks before saving:** extension, reported MIME type (when the browser provides one), empty files, size, and the
  file's leading bytes (so a renamed text file cannot pose as a PDF). These checks do not parse the contents.
- **Storage:** file contents and metadata are saved in IndexedDB (`carbon-passport` database: `documents` for
  metadata, `documentFiles` for the bytes) and restored after a refresh. A SHA-256 hash of each file is recorded.
- **Duplicates:** a file whose name is already stored is saved as `name (2).ext` and the rename is shown. Identical
  contents are flagged, but both copies are kept.
- **Deletion:** removing a document deletes its stored bytes and everything derived from it in the same transaction.
  **Clear all** asks for confirmation and empties every store (documents, files, extraction results, issues, reviews
  and traceability notes).
- **Storage full:** uploads that would exceed the browser's reported allowance, or that fail with a quota error, are
  refused with an explanation; nothing partial is saved.

## Synthetic sample pack

`public/samples/` holds six **fictional** documents for demo batch `CP-LDH-2026-001` (steel fasteners, heat treatment
outsourced to a job-worker). Every file carries a visible "synthetic sample, not a real business record" banner, and
all parties are named "Sample … (fictional)".

| File                         | Format                 | Notes                                            |
| ---------------------------- | ---------------------- | ------------------------------------------------ |
| Wire rod purchase invoice    | Text-based PDF         | Heat no. 24A-1187                                |
| Mill test certificate        | Text-based PDF         | Heat no. 24A-1187                                |
| In-house production log      | XLSX                   | Wire drawing to inspection                       |
| Job-work challan             | Scanned-style JPG      | Lists heat no. 24A-1178 (deliberate mismatch)    |
| Plant electricity bill       | Scanned-style PNG      | January 2026                                     |
| Dispatch record              | CSV                    | Two dispatches totalling 12,000 kg               |

Job-worker furnace energy records are intentionally absent to demonstrate a missing-evidence gap. Two synthetic
**fix documents** in `public/samples/fixes/` (a revised challan with the corrected heat number, and the job-worker's
furnace energy statement) demonstrate the How-to-fix flow; with the sample pack loaded, each fix guide offers a
**Demo: use the sample …** button. They are generated by `generate_documents.py --fixes`. **Try with sample
documents** (Dashboard) or **Load Sample Pack** (Upload documents) copies these files into IndexedDB and reads them as sample documents, kept visually separate from user uploads.
Reloading replaces only the sample copies.

The files are generated by dev-only scripts and committed:

```bash
python3 scripts/sample-pack/generate_documents.py   # PDFs, JPG, PNG, CSV (needs Pillow + macOS fonts)
node scripts/sample-pack/generate-spreadsheets.mjs  # XLSX
```

## Supply-chain traceability

The traceability page follows one batch through five stages in order: steel mill → stockist/trader → MSME factory →
heat-treatment job-worker → finished batch. It is built in `src/features/traceability/buildTrace.ts` from the current
extraction results every time the page opens; the trace itself is never stored.

- **Statuses:** *Found in source* (a processed document contains the value, with an inspectable page/line or cell),
  *Needs check*, *Missing*, *Proposed by user*, plus an *Illustrative sample* tag when every supporting
  document is synthetic. There is no "verified" status.
- **Rules worth knowing:** the stockist/trader link stays unconfirmed unless a document supports it (none of the
  current document types can); the heat number is compared across certificate, production log and challan; the
  production log's 12,150 kg is shown as intermediate output before heat treatment; finished output, job-worker
  energy and the return of goods are reported as missing, and missing activity data is never treated as zero.
- **Source inspection:** every value links to the raw extracted content, scrolled to and highlighting the cited line or
  cell.
- **Human records:** a review note or (where evidence is missing) a proposed link can be added to a hand-off; a note is
  required. Records are stored in IndexedDB (`traceRecords`, one per batch and hand-off). Each stores a fingerprint of
  the hand-off's evidence and applies only while it still matches; removing a document the record rests on deletes the
  record. A proposal is always shown as "Proposed by user", never as supported.
- **Limits:** batch scoping uses the detected batch ID; documents without one (certificates, bills) are included by
  document type. Stockist documents, return challans and finished-output records are not recognised automatically yet.
  The trace does not calculate emissions or allocate plant energy to the batch.

## Draft Carbon Passport

`src/features/passport/buildPassport.ts` assembles the passport from stored documents, extraction results, validation
issues (recomputed), issue reviews and traceability records. Like the trace, it is rebuilt on every load and never
stored, so removing a document removes every claim that rested on it.

- **Sections:** batch identity, supply chain, quantities and boundary, energy/activity data, calculation status, issues
  and gaps with reviewer actions, an evidence register, and methodology/assumptions/limitations.
- **Claim kinds:** *Found in source*, *Needs check*, *Calculated from sources* (method shown), *Proposed by user*,
  *Assumption*, *Missing*. Nothing is filled in from sample constants.
- **Guardrails:** no carbon footprint or intensity is calculated. The page shows "Calculation incomplete — insufficient
  verified inputs" and lists the prerequisites: confirmed finished output, job-worker energy, a documented electricity
  allocation, a traceable steel input, sourced emission factors, and a declared boundary/unit/method. The plant bill is
  never allocated to the batch, missing energy is never zero, and the production log's 12,150 kg is shown as output
  before heat treatment; finished output reads "Not established from available evidence."
- **Status badges:** Draft, Evidence incomplete, Needs human review, Calculation unavailable. "Ready for independent
  review" appears only if every prerequisite is met, which this prototype cannot currently achieve.
- **Exports** (Passport page and the Download page): *HTML* is a self-contained, printable document; *JSON*
  is the same model with `draft: true`, `certified: false`, `verified: false`; *Print / Save as PDF* prints exactly
  the HTML export from a hidden frame. All are generated in the browser from the same object as the screen. Before
  downloading, the Download page lists every open issue, gap, missing calculation input and unused document. A verified
  certificate and a carbon footprint report are shown as blocked, with the reason.

## Local setup

Requirements: Node.js 22.12 or newer (Vite 8 requirement) and npm. The SheetJS package is installed from
`cdn.sheetjs.com` (pinned with an integrity hash in `package-lock.json`), so installation needs internet access.

```bash
npm ci               # clean install from the lockfile (or: npm install)
npm run dev          # start the dev server at http://localhost:5173
```

Production build, served locally:

```bash
npm run build        # typecheck, then build into dist/
npm run preview      # serve dist/ at http://localhost:4173
```

## Demo quick start

1. Open the app with clean browser storage; the dashboard shows "No batch identified yet".
2. Click **Try with sample documents**. Six fictional documents (clearly labelled synthetic) are loaded and read in
   the browser, about 20 seconds. The first OCR run downloads about 5 MB of English language data, so keep internet
   access available, or run the demo once beforehand so the data is cached.
3. In **What we found**, open the heat-number problem and click **Show source** on 24A-1187 and 24A-1178.
4. Press **How to fix** on the mismatch, then **Demo: use the sample revised job-work challan**: Problems 2 → 1. Do the
   same for the missing job-worker energy: Problems 1 → 0, Missing 4 → 3.
5. Press **Continue** through Check documents, Supply chain, Carbon Passport and Download.
6. **Upload documents → Clear all** resets the workspace for the next audience.

Other scripts:

```bash
npm run typecheck    # TypeScript project check (tsc -b)
npm run lint         # oxlint
npm run check        # typecheck + lint
```

## Project structure

```
src/
  components/              Shared UI building blocks (layout, cards, icons, dialogs…)
  pages/                   One folder per screen (dashboard, upload, validate, trace, passport, export)
  features/
    documents/             File validation, IndexedDB document store, upload UI
    extraction/            Parsers (PDF.js, Tesseract.js, Papa Parse, SheetJS), field rules, raw-content views
    evidence/              Deterministic validation checks and issue reviews
    traceability/          Supply-chain trace, hand-offs and user notes
    passport/              Draft passport model, exports, dashboard readiness
  lib/                     Framework-agnostic helpers (IndexedDB access, routing, errors, hashing)
  types/                   Shared TypeScript types
  data/                    Synthetic sample-pack manifest (no real customer data, no emission factors)
public/
  samples/                 Synthetic sample documents for the demo batch
scripts/
  sample-pack/             Dev-only generators for the synthetic sample documents
```

## Privacy and limitations

- **Documents never leave the browser.** No document content is sent to any server by this app.
- **OCR language data comes from a CDN.** The OCR worker and WASM engine are bundled with the app. The English
  language data (about 5 MB, `eng.traineddata.gz`) is downloaded once from `cdn.jsdelivr.net` and cached by the
  browser. That request contains no document data; images are recognised locally in a Web Worker. OCR therefore
  needs internet access the first time it runs; PDF text, CSV and Excel parsing do not.
- **The passport has no emission factors or calculation method.** It documents evidence and gaps only.
- **Downloads in embedded browsers:** some embedded webviews (including the preview pane used during development) do
  not save downloads to disk. Use a regular browser such as Chrome for HTML/JSON downloads and print-to-PDF.
- **Extraction is rule-based.** Field rules are tuned to common Indian MSME document layouts and the sample pack;
  unfamiliar layouts may yield "Not detected". Very large spreadsheets are truncated to 2,000 rows per sheet.
- **IndexedDB is per-browser and per-device.** Data does not sync. Clearing site data, private/incognito windows,
  or browser storage eviction can remove it. Users should keep their original documents.
- **Storage persistence is best-effort.** The app does not request persistent storage, so under storage pressure
  the browser may evict saved documents.
- **IndexedDB is not encrypted by the app.** Anyone with access to the same browser profile can read stored data.
  Avoid shared or public computers.
- **Not a certification.** Outputs are drafts for human review, not verified carbon footprints or certificates.

## Data hygiene for contributors

- Never commit real MSME documents, uploads, credentials or secrets. `.gitignore` blocks common document and
  spreadsheet formats repo-wide; only `src/data/` and `public/samples/` are allow-listed, and they must contain
  synthetic data only.
- This project uses no environment variables or secrets.

## Deploying to Vercel

The app is a static site, so it fits within Vercel's free Hobby plan for a project of this size, subject to Vercel's
current usage limits.

1. Push the repository to GitHub.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Vercel detects Vite automatically. `vercel.json` sets the build command to `npm run build` and the output
   directory to `dist`.
4. Deploy. No environment variables are required. Routing uses URL hashes (`#/upload`), so no rewrite rules are needed.
5. Optional: set the Node.js version to 22.x or 24.x in the project settings to match `engines` in `package.json`.

Vercel's Hobby plan is intended for personal, non-commercial use; check that it fits how the demo will be shared.

Alternatively, with the Vercel CLI: `npx vercel` (preview) and `npx vercel --prod` (production).
