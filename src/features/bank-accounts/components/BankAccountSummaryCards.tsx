import React from 'react';
import { Landmark, CheckCircle2, Star, Ban } from 'lucide-react';
import { StatCard } from '@/shared/ui/StatCard';
import { BankAccountsSummary } from '../types/bankAccount.types';

interface BankAccountSummaryCardsProps {
  summary?: BankAccountsSummary;
  activeStatusFilter?: 'active' | 'inactive' | 'all';
  onSelectStatus?: (status: 'active' | 'inactive' | 'all') => void;
  isLoading?: boolean;
}

export const BankAccountSummaryCards: React.FC<BankAccountSummaryCardsProps> = ({
  summary = { total: 0, active: 0, inactive: 0, defaultCount: 0 },
  activeStatusFilter = 'all',
  onSelectStatus,
  isLoading = false,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
      <StatCard
        label="Total Accounts"
        value={isLoading ? '—' : summary.total}
        subtext="Configured company bank accounts"
        icon={Landmark}
        onClick={onSelectStatus ? () => onSelectStatus('all') : undefined}
        className={`h-full ${activeStatusFilter === 'all' ? 'ring-2 ring-[#244A70]/20 border-[#244A70]' : ''}`}
      />
      <StatCard
        label="Active Accounts"
        value={isLoading ? '—' : summary.active}
        subtext="Available for payment receiving"
        icon={CheckCircle2}
        onClick={onSelectStatus ? () => onSelectStatus('active') : undefined}
        className={`h-full ${activeStatusFilter === 'active' ? 'ring-2 ring-emerald-500/20 border-emerald-500' : ''}`}
      />
      <StatCard
        label="Default Receiving"
        value={isLoading ? '—' : summary.defaultCount}
        subtext="Primary receiving per currency"
        icon={Star}
        className="h-full border-[#DCE3EC]"
      />
      <StatCard
        label="Inactive Accounts"
        value={isLoading ? '—' : summary.inactive}
        subtext="Deactivated receiving accounts"
        icon={Ban}
        onClick={onSelectStatus ? () => onSelectStatus('inactive') : undefined}
        className={`h-full ${activeStatusFilter === 'inactive' ? 'ring-2 ring-slate-400/20 border-slate-400' : ''}`}
      />
    </div>
  );
};
