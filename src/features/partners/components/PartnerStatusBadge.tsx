import React from 'react';

interface PartnerStatusBadgeProps {
  status: string;
  type?: 'partner' | 'project' | 'item' | 'validation';
}

export const PartnerStatusBadge: React.FC<PartnerStatusBadgeProps> = ({ status }) => {
  const norm = (status || '').toUpperCase();

  let bg = 'bg-gray-100 text-gray-700 border-gray-200';
  let dot = 'bg-gray-400';
  let label = status;

  switch (norm) {
    case 'ACTIVE':
    case 'COMPLETED':
    case 'PASSED':
    case 'SENT':
      bg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
      dot = 'bg-emerald-500';
      label = norm === 'COMPLETED' ? 'Completed' : norm === 'ACTIVE' ? 'Active' : norm === 'PASSED' ? 'Passed' : 'Sent';
      break;
    case 'IN_PROGRESS':
    case 'PROCESSING':
      bg = 'bg-blue-50 text-[#0652CC] border-blue-200';
      dot = 'bg-[#0652CC] animate-pulse';
      label = 'In Progress';
      break;
    case 'READY_FOR_EXPORT':
      bg = 'bg-indigo-50 text-indigo-700 border-indigo-200';
      dot = 'bg-indigo-500';
      label = 'Ready for Export';
      break;
    case 'TRIAL':
    case 'WARNINGS':
    case 'PENDING':
    case 'QUEUED':
      bg = 'bg-amber-50 text-amber-700 border-amber-200';
      dot = 'bg-amber-500';
      label = norm === 'WARNINGS' ? 'Warnings' : norm === 'TRIAL' ? 'Trial' : norm === 'QUEUED' ? 'Queued' : 'Pending';
      break;
    case 'FAILED':
    case 'SUSPENDED':
    case 'DEAD_LETTER':
      bg = 'bg-rose-50 text-rose-700 border-rose-200';
      dot = 'bg-rose-500';
      label = norm === 'DEAD_LETTER' ? 'Dead Letter' : norm === 'SUSPENDED' ? 'Suspended' : 'Failed';
      break;
    case 'CONFIRMED':
      bg = 'bg-teal-50 text-teal-700 border-teal-200';
      dot = 'bg-teal-500';
      label = 'Confirmed';
      break;
    case 'NOT_APPLICABLE':
      bg = 'bg-slate-100 text-slate-600 border-slate-200';
      dot = 'bg-slate-400';
      label = 'N/A';
      break;
    default:
      label = status;
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${bg}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
};
