import React from 'react';

interface ProgressBarProps {
  screensCompleted?: number;
  screensTotal?: number;
  programsCompleted?: number;
  programsTotal?: number;
  showLabels?: boolean;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  screensCompleted = 0,
  screensTotal = 0,
  programsCompleted = 0,
  programsTotal = 0,
  showLabels = true,
  className = '',
}) => {
  const totalItems = screensTotal + programsTotal;
  const completedItems = screensCompleted + programsCompleted;
  const overallPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const screensPct = screensTotal > 0 ? Math.round((screensCompleted / screensTotal) * 100) : 0;
  const programsPct = programsTotal > 0 ? Math.round((programsCompleted / programsTotal) * 100) : 0;

  return (
    <div className={`space-y-2 ${className}`}>
      {showLabels && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#17263A]">Overall Conversion Progress</span>
          <span className="font-bold text-[#244A70]">{overallPct}% ({completedItems}/{totalItems} items)</span>
        </div>
      )}

      {/* Main Bar */}
      <div className="w-full bg-[#DCE3EC] rounded-full h-2.5 overflow-hidden flex">
        {totalItems > 0 ? (
          <div
            className="bg-[#244A70] h-full transition-all duration-500 rounded-full"
            style={{ width: `${overallPct}%` }}
          />
        ) : (
          <div className="w-full h-full bg-gray-200" />
        )}
      </div>

      {/* Dual metric sub-bars if both or either exist */}
      {showLabels && (screensTotal > 0 || programsTotal > 0) && (
        <div className="flex flex-wrap items-center gap-x-6 gap-y-1 pt-1 text-xs text-[#526071]">
          {screensTotal > 0 && (
            <div className="flex items-center gap-2">
              <span>Screens:</span>
              <span className="font-semibold text-[#17263A]">
                {screensCompleted}/{screensTotal} ({screensPct}%)
              </span>
            </div>
          )}
          {programsTotal > 0 && (
            <div className="flex items-center gap-2">
              <span>COBOL:</span>
              <span className="font-semibold text-[#17263A]">
                {programsCompleted}/{programsTotal} ({programsPct}%)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
