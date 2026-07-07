import React from 'react'

interface State { hasError: boolean; message: string }

export class WidgetBoundary extends React.Component<
  { label: string; children: React.ReactNode },
  State
> {
  state: State = { hasError: false, message: '' }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          <strong>{this.props.label}</strong> — {this.state.message || 'An error occurred'}
        </div>
      )
    }
    return this.props.children
  }
}
