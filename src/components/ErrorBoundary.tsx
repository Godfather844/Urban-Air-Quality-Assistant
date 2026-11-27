import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Catches unexpected React render errors and presents an accessible recovery view. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Unhandled application render error:', error.message, info.componentStack);
  }

  private handleReset = (): void => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
          <div
            role="alert"
            className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6"
          >
            <h1 className="font-display text-lg font-semibold text-slate-950">
              Something went wrong
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              The Urban Air Quality Assistant encountered an unexpected display error. You can
              reset the view below.
            </p>
            <button
              type="button"
              onClick={this.handleReset}
              className="mt-4 inline-flex min-h-[40px] cursor-pointer items-center justify-center rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700 focus-visible:ring-offset-2"
            >
              Reload View
            </button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
