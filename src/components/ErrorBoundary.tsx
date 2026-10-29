import { Component, type ErrorInfo, type ReactNode } from 'react'
import { toErrorMessage } from '../lib/errors'

interface Props {
  children: ReactNode
}

interface State {
  error: unknown
}

/**
 * Catches render errors so a failure in one screen shows a recoverable message
 * instead of a blank page. Data in IndexedDB is not touched.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: unknown): State {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Unhandled UI error', error, info.componentStack)
  }

  render() {
    if (this.state.error === null) return this.props.children

    return (
      <div role="alert" className="mx-auto mt-24 max-w-lg rounded-2xl border border-line bg-surface p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-ink-900">Something went wrong</h1>
        <p className="mt-2 text-sm text-ink-600">
          The page hit an unexpected error. Your saved documents stay in this browser.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-lg bg-canvas p-3 text-xs text-status-missing">
          {toErrorMessage(this.state.error)}
        </pre>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="mt-6 rounded-lg bg-forest-700 px-4 py-2 text-sm font-medium text-white hover:bg-forest-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest-500"
        >
          Reload
        </button>
      </div>
    )
  }
}
