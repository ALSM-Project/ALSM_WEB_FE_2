import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { useNavigation } from '@/hooks/useNavigation';
import { BreadcrumbNode } from './breadcrumbUtils';

export interface BreadcrumbProps {
  customItems?: BreadcrumbNode[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ customItems, className = '' }) => {
  const { breadcrumbs } = useNavigation();

  const items = customItems || breadcrumbs;

  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className={`flex items-center space-x-1.5 text-xs font-medium text-slate-600 overflow-x-auto py-0.5 whitespace-nowrap scrollbar-none ${className}`}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-hidden="true" />}
            {item.path && !isLast ? (
              <Link
                to={item.path}
                title={item.label}
                className="hover:text-[#244A70] text-slate-600 transition-colors truncate max-w-[140px] sm:max-w-[200px]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                title={item.label}
                aria-current={isLast ? 'page' : undefined}
                className={`truncate max-w-[160px] sm:max-w-[260px] ${
                  isLast ? 'text-[#17263A] font-semibold' : 'text-slate-600'
                }`}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
