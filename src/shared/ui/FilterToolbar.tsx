import React from 'react';

export interface FilterToolbarProps {
  children?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const FilterToolbar: React.FC<FilterToolbarProps> = ({
  children,
  actions,
  className = '',
}) => {
  return (
    <div
      className={`bg-white border border-[#DCE3EC] rounded-lg p-3 sm:p-3.5 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${className}`}
    >
      <div className="flex items-center flex-wrap gap-2.5 flex-1 min-w-0">
        {children}
      </div>
      {actions && (
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
          {actions}
        </div>
      )}
    </div>
  );
};

export default FilterToolbar;
