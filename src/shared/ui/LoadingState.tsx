import React from 'react';
import { RefreshCw } from 'lucide-react';

export interface LoadingStateProps {
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading data...',
  className = '',
}) => {
  return (
    <div
      className={`bg-white border border-[#DCE3EC] rounded-lg p-8 sm:p-12 text-center flex flex-col items-center justify-center shadow-xs ${className}`}
    >
      <RefreshCw className="w-5 h-5 animate-spin text-[#244A70] mb-2" />
      <span className="text-xs text-[#8491A3] font-medium">{message}</span>
    </div>
  );
};

export default LoadingState;
