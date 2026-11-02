import { COMPLETE_PACK_FILES, SAMPLE_PACK_FILES, samplePackUrl, type SamplePack } from '../../data/samplePack'
import { replaceSampleDocuments, type NewDocument } from './documentStore'

/**
 * Copies a synthetic sample pack from this site into browser storage, replacing
 * any earlier sample copies (user uploads are untouched). "problems" is the pack
 * with a mismatch and missing papers; "complete" has every paper. Returns how many were stored.
 */
export async function loadSamplePackIntoStorage(pack: SamplePack = 'problems'): Promise<number> {
  const inputs = await Promise.all(
    (pack === 'complete' ? COMPLETE_PACK_FILES : SAMPLE_PACK_FILES).map(async (file): Promise<NewDocument> => {
      const response = await fetch(samplePackUrl(file))
      if (!response.ok) throw new Error(`${file.fileName} could not be fetched (HTTP ${response.status}).`)
      const blob = await response.blob()
      return {
        originalFileName: file.fileName,
        format: file.format,
        mimeType: file.mimeType,
        blob: new Blob([blob], { type: file.mimeType }),
        origin: 'sample',
        sampleKey: file.key,
      }
    }),
  )
  await replaceSampleDocuments(inputs)
  return inputs.length
}
