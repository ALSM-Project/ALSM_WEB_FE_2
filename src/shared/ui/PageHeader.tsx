import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  badge,
  className = '',
}) => {
  return (
    <div className={`w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 ${className}`}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center flex-wrap gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#17263A]">{title}</h1>
          {badge}
        </div>
        {subtitle && (
          <p className="mt-1 text-xs sm:text-sm text-[#8491A3] leading-relaxed max-w-4xl lg:max-w-5xl">
            {subtitle}
          </p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">{actions}</div>}
    </div>
  );
};

export default PageHeader;
