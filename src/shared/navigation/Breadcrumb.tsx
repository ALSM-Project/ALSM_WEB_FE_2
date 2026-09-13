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
      className={`flex items-center space-x-1.5 text-xs font-medium text-[#6B778C] overflow-x-auto py-1 ${className}`}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-[#D9E2EC] shrink-0" />}
            {item.path && !isLast ? (
              <Link
                to={item.path}
                className="hover:text-[#0652CC] text-[#42526E] transition-colors truncate max-w-[160px]"
              >
                {item.label}
              </Link>
            ) : (
              <span
                className={`truncate max-w-[200px] ${
                  isLast ? 'text-[#091E42] font-semibold' : 'text-[#42526E]'
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
