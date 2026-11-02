/** "CP-LDH-2026-001_SAMPLE_job-work-challan.jpg" → "Job work challan". */
export function documentName(fileName: string) {
  const base = fileName.replace(/^CP-LDH-\d{4}-\d{3}_SAMPLE_/, '').replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ')
  return base.charAt(0).toUpperCase() + base.slice(1)
}
