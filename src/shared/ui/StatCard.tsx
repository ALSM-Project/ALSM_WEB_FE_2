import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: React.ReactNode;
  icon?: LucideIcon;
  trend?: {
    value: string | number;
    direction?: 'up' | 'down' | 'neutral';
    label?: string;
  };
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  icon: Icon,
  trend,
  onClick,
  className = '',
}) => {
  const isClickable = Boolean(onClick);

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick?.() : undefined}
      className={`bg-white border border-[#DCE3EC] rounded-lg p-4 sm:p-5 transition-all duration-150 shadow-xs ${
        isClickable ? 'hover:border-[#B8C7D9] hover:shadow-sm cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-600 truncate">
          {label}
        </span>
        {Icon && (
          <div className="w-8 h-8 rounded-md bg-[#EEF1F6] text-[#244A70] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <p className="text-2xl font-bold text-[#17263A] mt-2 tracking-tight">
        {value}
      </p>

      {(subtext || trend) && (
        <div className="flex items-center justify-between text-xs text-slate-600 mt-2.5 pt-2 border-t border-[#EEF1F6] flex-wrap gap-1">
          {trend ? (
            <span
              className={`font-semibold inline-flex items-center gap-1 ${
                trend.direction === 'up'
                  ? 'text-emerald-700'
                  : trend.direction === 'down'
                  ? 'text-rose-700'
                  : 'text-slate-600'
              }`}
            >
              {trend.direction === 'up' && '↑'}
              {trend.direction === 'down' && '↓'}
              {trend.value}
              {trend.label && <span className="font-normal text-slate-600 ml-1">{trend.label}</span>}
            </span>
          ) : (
            <span>{subtext}</span>
          )}
          {isClickable && (
            <span className="text-[#244A70] text-xs font-medium ml-auto">
              &rarr;
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default StatCard;
