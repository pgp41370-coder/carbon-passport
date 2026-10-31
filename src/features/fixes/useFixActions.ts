import { useCallback, useState } from 'react'
import { findSampleFile, samplePackUrl, type SampleFixKey } from '../../data/samplePack'
import { isQuotaError } from '../../lib/db'
import { toErrorMessage } from '../../lib/errors'
import { addDocument, listDocuments, removeDocument, type NewDocument } from '../documents/documentStore'
import { validateFile } from '../documents/fileTypes'
import { documentsToRead, readDocuments, revalidateStoredResults, type ReadProgress } from '../extraction/processDocuments'
import type { FindingGroup } from '../passport/findings'

/** Which sample document a synthetic fix document stands in for. */
const SAMPLE_FIX_REPLACES: Partial<Record<SampleFixKey, string>> = {
  'fix-job-work-challan-revised': 'job-work-challan',
}

export interface FixRequest {
  /** The finding being fixed, so the result can be shown next to it. */
  findingKey: string
  files?: readonly File[]
  sampleKey?: SampleFixKey
  /** Stored document to remove once the new one is saved. */
  replaceDocumentId?: string
}

export type FixState =
  | { status: 'idle' }
  | { status: 'working'; findingKey: string; message: string; progress: ReadProgress | null }
  | { status: 'done'; findingKey: string; before: Record<FindingGroup, number>; added: string[]; removed?: string }
  | { status: 'error'; findingKey: string; message: string }

/**
 * Adds a document for a fix (and optionally removes the one it replaces), then
 * reads and checks everything again. Nothing is edited in place.
 */
export function useFixActions(reload: () => Promise<void>) {
  const [state, setState] = useState<FixState>({ status: 'idle' })

  const apply = useCallback(
    async (request: FixRequest, before: Record<FindingGroup, number>) => {
      const { findingKey } = request
      const working = (message: string, progress: ReadProgress | null = null) =>
        setState({ status: 'working', findingKey, message, progress })
      try {
        working('Saving the document in this browser…')
        const inputs: NewDocument[] = []
        let replaceId = request.replaceDocumentId

        if (request.sampleKey) {
          const file = findSampleFile(request.sampleKey)
          if (!file) throw new Error('This sample document is not available.')
          const response = await fetch(samplePackUrl(file))
          if (!response.ok) throw new Error(`${file.fileName} could not be fetched (HTTP ${response.status}).`)
          const blob = await response.blob()
          inputs.push({ originalFileName: file.fileName, format: file.format, mimeType: file.mimeType, blob: new Blob([blob], { type: file.mimeType }), origin: 'sample', sampleKey: file.key })
          const replacesKey = SAMPLE_FIX_REPLACES[request.sampleKey]
          if (replacesKey) replaceId ??= (await listDocuments()).find((d) => d.sampleKey === replacesKey)?.id
        }
        for (const file of request.files ?? []) {
          const check = await validateFile(file)
          if (!check.ok) throw new Error(`${file.name}: ${check.reason}`)
          inputs.push({ originalFileName: file.name, format: check.format, mimeType: check.mimeType, blob: new Blob([await file.arrayBuffer()], { type: check.mimeType }), origin: 'user' })
        }
        if (inputs.length === 0) throw new Error('No document was chosen.')

        const added: string[] = []
        for (const input of inputs) added.push((await addDocument(input)).document.fileName)

        let removed: string | undefined
        if (replaceId) {
          removed = (await listDocuments()).find((d) => d.id === replaceId)?.fileName
          await removeDocument(replaceId)
        }

        const toRead = await documentsToRead()
        working('Reading the new document…')
        if (toRead.length) await readDocuments(toRead, (p) => working('Reading the new document…', p))
        else await revalidateStoredResults()

        await reload()
        setState({ status: 'done', findingKey, before, added, removed })
      } catch (error) {
        const message = isQuotaError(error)
          ? 'Browser storage is full. Remove some documents, then try again.'
          : error instanceof TypeError
            ? 'The sample document could not be downloaded from this site. Check your connection and try again.'
            : toErrorMessage(error)
        await reload()
        setState({ status: 'error', findingKey, message })
      }
    },
    [reload],
  )

  return {
    state,
    busy: state.status === 'working',
    apply,
    dismiss: () => setState({ status: 'idle' }),
  }
}
