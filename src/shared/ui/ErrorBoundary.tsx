import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, ChevronRight } from 'lucide-react';
import { Button } from './Button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component tree:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-[500px] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#DFE3E8] rounded-2xl p-6 shadow-md text-center space-y-4">
            <div className="w-12 h-12 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-bold text-[#172B4D]">
                Something went wrong
              </h2>
              <p className="text-xs text-[#5E6C84]">
                An unexpected application error occurred while rendering this view. Your session and data remain secure.
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={this.handleReset}
                className="text-xs"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                <span>Try Again</span>
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  window.location.href = '/';
                }}
                className="bg-[#0652CC] hover:bg-[#0543A8] text-white text-xs"
              >
                <Home className="w-3.5 h-3.5 mr-1.5" />
                <span>Dashboard</span>
              </Button>
            </div>

            {this.state.error && (
              <div className="pt-2 border-t border-[#DFE3E8] text-left">
                <button
                  type="button"
                  onClick={() => this.setState({ showDetails: !this.state.showDetails })}
                  className="flex items-center text-[11px] font-semibold text-[#5E6C84] hover:text-[#172B4D] cursor-pointer"
                >
                  <ChevronRight
                    className={`w-3.5 h-3.5 transition-transform ${
                      this.state.showDetails ? 'rotate-90' : ''
                    }`}
                  />
                  <span>Technical Diagnostic Details</span>
                </button>

                {this.state.showDetails && (
                  <div className="mt-2 p-3 bg-[#F7F9FC] border border-[#DFE3E8] rounded-xl font-mono text-[10px] text-rose-700 overflow-x-auto max-h-40 whitespace-pre-wrap">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
