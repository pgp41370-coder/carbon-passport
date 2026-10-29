/**
 * Small stable hash (djb2) of a set of strings, order-independent. Used to tell
 * whether the evidence behind an issue or link has changed since a person
 * reviewed it; it is not a security hash.
 */
export function fingerprint(parts: readonly string[]): string {
  let hash = 5381
  for (const char of [...parts].sort().join('|')) hash = ((hash << 5) + hash + char.charCodeAt(0)) | 0
  return (hash >>> 0).toString(16)
}
