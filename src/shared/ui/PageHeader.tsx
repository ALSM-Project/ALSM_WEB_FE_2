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
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <div>
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold tracking-tight text-[#091E42]">{title}</h1>
          {badge}
        </div>
        {subtitle && <p className="mt-1 text-sm text-[#42526E]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center space-x-3 shrink-0">{actions}</div>}
    </div>
  );
};

export default PageHeader;
