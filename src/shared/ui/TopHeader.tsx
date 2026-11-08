import React from 'react';

export interface TopHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumb?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  title,
  subtitle,
  breadcrumb,
  actions,
  className = '',
}) => {
  return (
    <div className={`bg-white border-b border-[#DCE3EC] px-4 sm:px-6 py-3 shadow-xs ${className}`}>
      {breadcrumb && <div className="mb-1">{breadcrumb}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base sm:text-lg font-bold text-[#17263A] tracking-tight truncate">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs text-[#8491A3] mt-0.5 leading-normal">
              {subtitle}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopHeader;
