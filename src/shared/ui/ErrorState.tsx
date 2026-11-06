import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Failed to load data',
  message = 'An unexpected error occurred while processing your request.',
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`bg-white border border-rose-200 rounded-lg p-6 sm:p-8 text-center flex flex-col items-center justify-center shadow-xs ${className}`}
    >
      <div className="w-10 h-10 rounded-md bg-rose-50 text-rose-700 flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-[#17263A] tracking-tight">{title}</h3>
      <p className="text-xs text-[#8491A3] mt-1 max-w-sm leading-relaxed">{message}</p>
      {onRetry && (
        <div className="mt-4">
          <Button variant="outline" size="sm" onClick={onRetry} className="gap-1.5 text-xs">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry</span>
          </Button>
        </div>
      )}
    </div>
  );
};

export default ErrorState;
