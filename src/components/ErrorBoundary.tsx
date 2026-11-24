import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected application error occurred.',
    };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo): void {
    console.error('DataTrust Gate ErrorBoundary caught:', error, info);
  }

  override render() {
    if (this.state.hasError) {
      let friendly = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message) as { error?: string; operationType?: string; path?: string };
        if (parsed.error) {
          friendly = `Firestore ${parsed.operationType || 'operation'} on "${parsed.path || 'unknown'}" failed: ${parsed.error}`;
        }
      } catch {
        // non-JSON message
      }

      return (
        <div className="min-h-screen bg-[#F7F6F2] text-[#0F1C2E] flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-white border border-[#E2E0D8] rounded-lg p-6 space-y-4">
            <h1 className="font-display text-lg font-semibold text-[#0F1C2E]">
              Workspace Interrupted
            </h1>
            <p className="text-sm text-[#3B495C] leading-relaxed break-words">
              {friendly}
            </p>
            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium bg-[#0F1C2E] text-white rounded-md hover:bg-[#1A2D47] transition-colors cursor-pointer"
              >
                Reload Workspace
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
