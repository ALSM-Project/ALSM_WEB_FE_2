import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = 'primary', className = '' }) => {
  const styles = {
    primary: 'bg-[#EEF1F6] text-[#244A70] border-[#DCE3EC]',
    secondary: 'bg-[#F4F7FB] text-[#17263A] border-[#DCE3EC]',
    success: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    danger: 'bg-rose-50 text-rose-800 border-rose-200',
    info: 'bg-blue-50 text-[#244A70] border-blue-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold border ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: string; className?: string }> = ({ status, className = '' }) => {
  let variant: BadgeProps['variant'] = 'secondary';
  const lower = status.toLowerCase();
  if (['completed', 'passed', 'active', 'ready', 'success', 'converted'].some((s) => lower.includes(s))) {
    variant = 'success';
  } else if (['processing', 'uploading', 'converting', 'analyzing', 'validating', 'queued', 'in_progress'].some((s) => lower.includes(s))) {
    variant = 'info';
  } else if (['review', 'required', 'warning', 'pending', 'attention'].some((s) => lower.includes(s))) {
    variant = 'warning';
  } else if (['failed', 'error', 'danger', 'fatal', 'dead_letter'].some((s) => lower.includes(s))) {
    variant = 'danger';
  } else if (['draft', 'not_started'].some((s) => lower.includes(s))) {
    variant = 'secondary';
  }

  return (
    <Badge variant={variant} className={className}>
      {status}
    </Badge>
  );
};

export default Badge;
