import { useEffect, useRef } from 'react'
import { AppShell } from './components/layout/AppShell'
import { findPageByPath, parseWorkflowMode } from './lib/routes'
import { useHashLocation } from './lib/router'
import { ComingNextPage } from './pages/ComingNextPage'
import { DashboardPage } from './pages/dashboard/DashboardPage'
import { DocumentUploadPage } from './pages/upload/DocumentUploadPage'
import { ExtractionValidationPage } from './pages/validate/ExtractionValidationPage'
import { TraceabilityPage } from './pages/trace/TraceabilityPage'
import { CarbonPassportPage } from './pages/passport/CarbonPassportPage'
import { ExportPage } from './pages/export/ExportPage'

function App() {
  const { path, params } = useHashLocation()
  const page = findPageByPath(path)
  const mode = parseWorkflowMode(params.get('mode'))
  const routeKey = `${page.id}:${mode ?? ''}`

  useEffect(() => {
    document.title =
      page.id === 'dashboard'
        ? 'Carbon Passport'
        : page.id === 'passport'
          ? 'Draft passport · Carbon Passport'
          : `${page.label} · Carbon Passport`
  }, [page])

  // On route change, move focus to the new page heading so screen readers announce it.
  const previousRouteKey = useRef(routeKey)
  useEffect(() => {
    if (previousRouteKey.current === routeKey) return
    previousRouteKey.current = routeKey
    window.scrollTo({ top: 0 })
    document.getElementById('page-title')?.focus({ preventScroll: true })
  }, [routeKey])

  return (
    <AppShell currentPageId={page.id}>
      {page.id === 'dashboard' ? (
        <DashboardPage />
      ) : page.id === 'upload' ? (
        <DocumentUploadPage mode={mode} />
      ) : page.id === 'validate' ? (
        <ExtractionValidationPage mode={mode} />
      ) : page.id === 'traceability' ? (
        <TraceabilityPage />
      ) : page.id === 'passport' ? (
        <CarbonPassportPage />
      ) : page.id === 'export' ? (
        <ExportPage />
      ) : (
        <ComingNextPage page={page} />
      )}
    </AppShell>
  )
}

export default App
