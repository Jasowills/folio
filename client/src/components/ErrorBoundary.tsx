import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="card bg-white p-6 text-center">
            <p className="text-muted text-sm">This section hit an unexpected error.</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="text-teal text-xs mt-2 hover:underline"
            >
              Try again
            </button>
          </div>
        )
      )
    }
    return this.props.children
  }
}
