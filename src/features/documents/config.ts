/**
 * Upload limits. Files are processed in the browser, so very large scans make
 * OCR slow and use up the browser's storage allowance.
 */
export const MAX_FILE_SIZE_MB = 25
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024
