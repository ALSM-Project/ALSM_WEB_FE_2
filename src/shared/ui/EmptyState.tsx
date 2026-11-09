import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

export interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No records found',
  description = 'There are no items to display at this moment.',
  icon: Icon = Inbox,
  action,
  className = '',
}) => {
  return (
    <div
      className={`bg-white border border-[#DCE3EC] rounded-lg p-8 sm:p-12 text-center flex flex-col items-center justify-center shadow-xs ${className}`}
    >
      <div className="w-10 h-10 rounded-md bg-[#EEF1F6] text-[#8491A3] flex items-center justify-center mb-3">
        <Icon className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-[#17263A] tracking-tight">{title}</h3>
      {description && <p className="text-xs text-[#8491A3] mt-1 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
};

export default EmptyState;
