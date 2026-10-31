import { useCallback, useState } from 'react'
import { toErrorMessage } from '../../lib/errors'
import { loadSamplePackIntoStorage } from '../../features/documents/samplePackLoader'
import { documentsToRead, readDocuments, type ReadProgress } from '../../features/extraction/processDocuments'

export type QuickStartState =
  | { status: 'idle' }
  | { status: 'loading-samples' }
  | { status: 'reading'; progress: ReadProgress | null }
  | { status: 'error'; message: string }

/** Dashboard shortcuts: load the sample pack and/or read stored documents, all in this browser. */
export function useQuickStart(onDone: () => void) {
  const [state, setState] = useState<QuickStartState>({ status: 'idle' })

  const run = useCallback(
    async (withSamples: boolean) => {
      try {
        if (withSamples) {
          setState({ status: 'loading-samples' })
          await loadSamplePackIntoStorage()
        }
        const docs = await documentsToRead()
        setState({ status: 'reading', progress: null })
        if (docs.length) await readDocuments(docs, (progress) => setState({ status: 'reading', progress }))
        setState({ status: 'idle' })
      } catch (error) {
        setState({
          status: 'error',
          message:
            error instanceof TypeError
              ? 'The sample files could not be downloaded from this site. Check your connection and try again.'
              : toErrorMessage(error),
        })
      }
      onDone()
    },
    [onDone],
  )

  return {
    state,
    busy: state.status === 'loading-samples' || state.status === 'reading',
    trySample: () => void run(true),
    readStored: () => void run(false),
  }
}
