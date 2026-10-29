/**
 * Returns `name` if it is free, otherwise the first free "name (2).ext",
 * "name (3).ext", … Comparison ignores case, because most file systems do.
 */
export function uniqueFileName(name: string, takenNames: Iterable<string>): string {
  const taken = new Set(Array.from(takenNames, (n) => n.toLowerCase()))
  if (!taken.has(name.toLowerCase())) return name

  const dot = name.lastIndexOf('.')
  const base = dot > 0 ? name.slice(0, dot) : name
  const extension = dot > 0 ? name.slice(dot) : ''
  for (let n = 2; ; n++) {
    const candidate = `${base} (${n})${extension}`
    if (!taken.has(candidate.toLowerCase())) return candidate
  }
}
