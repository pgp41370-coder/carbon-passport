export type DocumentFormat = 'pdf' | 'png' | 'jpeg' | 'csv' | 'xlsx' | 'xls'

/** Where a stored document came from. Samples are synthetic and must stay visibly distinct. */
export type DocumentOrigin = 'user' | 'sample'

/** Metadata for a document whose file contents are stored in IndexedDB. */
export interface StoredDocument {
  id: string
  /** Unique display name. Gains a " (2)" style suffix when the original name was already taken. */
  fileName: string
  /** Name of the file as selected by the user, before de-duplication. */
  originalFileName: string
  format: DocumentFormat
  /** MIME type reported by the browser, or inferred from the extension when the browser reports none. */
  mimeType: string
  sizeBytes: number
  /** ISO 8601 timestamp of when the file was stored. */
  addedAt: string
  /** Hex SHA-256 of the file contents; undefined when Web Crypto is unavailable. */
  sha256?: string
  origin: DocumentOrigin
  /** Key into the sample-pack manifest, for sample documents only. */
  sampleKey?: string
}
