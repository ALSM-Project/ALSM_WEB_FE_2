import React from 'react';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  badge,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
      <div className="min-w-0">
        <div className="flex items-center flex-wrap gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A]">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1 text-xs sm:text-sm text-[#64748B] leading-relaxed max-w-3xl">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-center">{actions}</div>}
    </div>
  );
};

export default PageHeader;
