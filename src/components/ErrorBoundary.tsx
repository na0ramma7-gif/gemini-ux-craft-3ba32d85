import React from 'react';

/**
 * Top-level error boundary so a single render error doesn't white-screen
 * the whole app. Falls back to a recoverable error card with a reload CTA.
 */
interface Props {
  children: React.ReactNode;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  handleReload = () => {
    this.setState({ error: null });
    if (typeof window !== 'undefined') window.location.reload();
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;
    return (
      <div
        role="alert"
        className="min-h-screen flex items-center justify-center bg-background p-6"
      >
        <div className="max-w-md w-full bg-card border border-border rounded-xl shadow-[var(--shadow-card)] p-6 space-y-4">
          <h1 className="text-xl font-semibold text-foreground">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">
            The app hit an unexpected error. Your data is still saved — try
            reloading the page.
          </p>
          <details className="text-xs text-muted-foreground bg-muted/40 rounded-md p-3">
            <summary className="cursor-pointer font-medium">
              Technical details
            </summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">
              {error.message}
            </pre>
          </details>
          <button
            type="button"
            onClick={this.handleReload}
            className="w-full inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground h-10 px-4 text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
